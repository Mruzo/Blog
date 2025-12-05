from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.db.models import Q
from django.utils import timezone
from .models import Comic, CollaborationInvite, StoryCollaborator, Studio, StudioCollaborator
from .serializers import (
    CollaborationInviteSerializer, StoryCollaboratorSerializer,
    InviteUserSerializer, InviteEmailSerializer, UpdateRoleSerializer,
    UserSerializer
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_users(request):
    """Search for users by username, email, or name"""
    query = request.GET.get('q', '').strip()
    
    if not query or len(query) < 2:
        return Response({'results': []})
    
    # Search for active users only (exclude inactive/deactivated accounts)
    users = User.objects.filter(
        Q(username__icontains=query) |
        Q(email__icontains=query) |
        Q(first_name__icontains=query) |
        Q(last_name__icontains=query),
        is_active=True  # Only show active registered users
    ).exclude(id=request.user.id)[:10]  # Exclude current user, limit to 10 results
    
    serializer = UserSerializer(users, many=True)
    return Response({'results': serializer.data})


@api_view(['GET'])
@permission_classes([AllowAny])  # Allow public access for public stories
def get_collaborators(request, story_id):
    """Get all collaborators for a story"""
    story = get_object_or_404(Comic, id=story_id)
    
    # For public stories, allow viewing collaborators without authentication
    # For private stories, check if user is authenticated and has permission
    if not story.is_public:
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        if not (story.user == request.user or 
                StoryCollaborator.objects.filter(story=story, user=request.user).exists()):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get all collaboration invites for this story
    # For authenticated users (on their own stories), show ALL invites (pending + accepted)
    # For unauthenticated users on public stories, only show accepted invites
    if story.is_public and not request.user.is_authenticated:
        # For public stories when not authenticated, only show accepted invites
        invites = CollaborationInvite.objects.filter(story=story, status='accepted').select_related(
            'inviter', 'invitee_user', 'story', 'story__user'
        ).order_by('-created_at')
    else:
        # For authenticated users or private stories, show all invites (including pending)
        invites = CollaborationInvite.objects.filter(story=story).select_related(
            'inviter', 'invitee_user', 'story', 'story__user'
        ).order_by('-created_at')
    invites_serializer = CollaborationInviteSerializer(invites, many=True)
    
    # Get all active collaborators (StoryCollaborator) - always show for public stories
    active_collaborators = StoryCollaborator.objects.filter(story=story, is_active=True).select_related(
        'user', 'story', 'story__user', 'invited_by'
    ).order_by('joined_at')
    collaborators_serializer = StoryCollaboratorSerializer(active_collaborators, many=True)
    
    # Combine both types of collaborators
    results = list(invites_serializer.data) + list(collaborators_serializer.data)
    
    return Response({'results': results})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def invite_existing_user(request, story_id):
    """Invite an existing user to collaborate on a story"""
    story = get_object_or_404(Comic, id=story_id)
    
    # Check if user is the story owner or has admin role
    if story.user != request.user:
        collaborator = StoryCollaborator.objects.filter(
            story=story, user=request.user, role='admin'
        ).first()
        if not collaborator:
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = InviteUserSerializer(data=request.data)
    if serializer.is_valid():
        user_id = serializer.validated_data['user_id']
        role = serializer.validated_data['role']
        message = serializer.validated_data.get('message', '')
        
        # Check if user exists
        try:
            invitee_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is already a collaborator
        if StoryCollaborator.objects.filter(story=story, user=invitee_user).exists():
            return Response({'detail': 'User is already a collaborator'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if there's already a pending invitation
        existing_invite = CollaborationInvite.objects.filter(
            story=story, 
            invitee_email=invitee_user.email,
            status='pending'
        ).first()
        
        if existing_invite:
            return Response({'detail': 'Invitation already sent'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create invitation
        invite = CollaborationInvite.objects.create(
            inviter=request.user,
            invitee_email=invitee_user.email,
            invitee_user=invitee_user,
            story=story,
            role=role,
            message=message
        )
        
        # Send email notification
        invite.send_invitation_email()
        
        serializer = CollaborationInviteSerializer(invite)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def invite_by_email(request, story_id):
    """Invite a user by email address"""
    story = get_object_or_404(Comic, id=story_id)
    
    # Check if user is the story owner or has admin role
    if story.user != request.user:
        collaborator = StoryCollaborator.objects.filter(
            story=story, user=request.user, role='admin'
        ).first()
        if not collaborator:
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = InviteEmailSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        role = serializer.validated_data['role']
        message = serializer.validated_data.get('message', '')
        
        # Check if user with this email exists
        try:
            invitee_user = User.objects.get(email=email)
        except User.DoesNotExist:
            invitee_user = None
        
        # Check if there's already a pending invitation
        existing_invite = CollaborationInvite.objects.filter(
            story=story, 
            invitee_email=email,
            status='pending'
        ).first()
        
        if existing_invite:
            return Response({'detail': 'Invitation already sent'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create invitation
        invite = CollaborationInvite.objects.create(
            inviter=request.user,
            invitee_email=email,
            invitee_user=invitee_user,
            story=story,
            role=role,
            message=message
        )
        
        # Send email notification
        invite.send_invitation_email()
        
        serializer = CollaborationInviteSerializer(invite)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_collaborator_role(request, story_id, invite_id):
    """Update a collaborator's role"""
    story = get_object_or_404(Comic, id=story_id)
    invite = get_object_or_404(CollaborationInvite, id=invite_id, story=story)
    
    # Check if user is the story owner or has admin role
    if story.user != request.user:
        collaborator = StoryCollaborator.objects.filter(
            story=story, user=request.user, role='admin'
        ).first()
        if not collaborator:
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = UpdateRoleSerializer(data=request.data)
    if serializer.is_valid():
        new_role = serializer.validated_data['role']
        invite.role = new_role
        invite.save()
        
        # If the invitation was accepted, update the collaborator role
        if invite.status == 'accepted' and invite.invitee_user:
            collaborator = StoryCollaborator.objects.filter(
                story=story, user=invite.invitee_user
            ).first()
            if collaborator:
                collaborator.role = new_role
                collaborator.save()
        
        serializer = CollaborationInviteSerializer(invite)
        return Response(serializer.data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_collaborator(request, story_id, invite_id):
    """Remove a collaborator from a story"""
    story = get_object_or_404(Comic, id=story_id)
    invite = get_object_or_404(CollaborationInvite, id=invite_id, story=story)
    
    # Check if user is the story owner or has admin role
    if story.user != request.user:
        collaborator = StoryCollaborator.objects.filter(
            story=story, user=request.user, role='admin'
        ).first()
        if not collaborator:
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # If the invitation was accepted, remove from active collaborators
    if invite.status == 'accepted' and invite.invitee_user:
        StoryCollaborator.objects.filter(
            story=story, user=invite.invitee_user
        ).delete()
    
    # Delete the invitation
    invite.delete()
    
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pending_invitations(request):
    """Get pending invitations for the current user"""
    invites = CollaborationInvite.objects.filter(
        invitee_user=request.user,
        status='pending'
    ).select_related('inviter', 'invitee_user', 'story', 'story__user').order_by('-created_at')
    
    serializer = CollaborationInviteSerializer(invites, many=True)
    return Response({'results': serializer.data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_invitation(request, invite_id):
    """Accept a collaboration invitation
    
    Allows both:
    - The invitee to accept their own invitation
    - The story owner to accept invitations for their story
    """
    invite = get_object_or_404(CollaborationInvite, id=invite_id)
    
    # Check if user is the invitee OR the story owner
    is_invitee = invite.invitee_user == request.user
    is_owner = invite.story.user == request.user
    
    if not (is_invitee or is_owner):
        return Response({'detail': 'You do not have permission to accept this invitation'}, status=status.HTTP_403_FORBIDDEN)
    
    if invite.status != 'pending':
        return Response({'detail': 'Invitation is not pending'}, status=status.HTTP_400_BAD_REQUEST)
    
    if invite.is_expired():
        invite.status = 'expired'
        invite.save()
        return Response({'detail': 'Invitation has expired'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Accept the invitation
    if invite.accept():
        # Create active collaborator - use invitee_user if available, otherwise use the user from the request
        collaborator_user = invite.invitee_user if invite.invitee_user else request.user
        
        # Check if collaborator already exists
        collaborator, created = StoryCollaborator.objects.get_or_create(
            story=invite.story,
            user=collaborator_user,
            defaults={
                'role': invite.role,
                'invited_by': invite.inviter
            }
        )
        
        # Update role if collaborator already existed
        if not created:
            collaborator.role = invite.role
            collaborator.is_active = True
            collaborator.save()
        
        serializer = CollaborationInviteSerializer(invite)
        return Response(serializer.data)
    
    return Response({'detail': 'Failed to accept invitation'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def decline_invitation(request, invite_id):
    """Decline a collaboration invitation"""
    invite = get_object_or_404(CollaborationInvite, id=invite_id, invitee_user=request.user)
    
    if invite.status != 'pending':
        return Response({'detail': 'Invitation is not pending'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Decline the invitation
    if invite.decline():
        serializer = CollaborationInviteSerializer(invite)
        return Response(serializer.data)
    
    return Response({'detail': 'Failed to decline invitation'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_studio_collaborators_for_story(request, story_id):
    """Get studio collaborators for a story (based on story owner's studio)"""
    story = get_object_or_404(Comic, id=story_id)
    
    # Check if user is the story owner
    if story.user != request.user:
        return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get the studio for the story owner
    try:
        studio = Studio.objects.get(owner=story.user)
    except Studio.DoesNotExist:
        return Response({'results': []})
    
    # Get active studio collaborators (excluding the owner)
    studio_collaborators = StudioCollaborator.objects.filter(
        studio=studio,
        is_active=True
    ).select_related('user').exclude(user=studio.owner)
    
    # Get current story collaborators
    story_collaborators = StoryCollaborator.objects.filter(
        story=story,
        is_active=True
    ).values_list('user_id', flat=True)
    
    # Serialize studio collaborators and mark which ones are already story collaborators
    results = []
    for collab in studio_collaborators:
        user_data = UserSerializer(collab.user).data
        results.append({
            'id': collab.id,
            'user': user_data,
            'role': collab.role,
            'is_story_collaborator': collab.user.id in story_collaborators
        })
    
    return Response({'results': results})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_assign_story_collaborators(request, story_id):
    """Bulk assign/remove story collaborators from studio collaborators"""
    story = get_object_or_404(Comic, id=story_id)
    
    # Check if user is the story owner
    if story.user != request.user:
        return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get the studio for the story owner
    try:
        studio = Studio.objects.get(owner=story.user)
    except Studio.DoesNotExist:
        return Response({'detail': 'Studio not found for story owner'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get selected user IDs from request
    selected_user_ids = request.data.get('user_ids', [])
    if not isinstance(selected_user_ids, list):
        return Response({'detail': 'user_ids must be a list'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get all active studio collaborators
    studio_collaborators = StudioCollaborator.objects.filter(
        studio=studio,
        is_active=True
    ).select_related('user')
    
    # Get current story collaborators
    current_story_collaborators = StoryCollaborator.objects.filter(
        story=story,
        is_active=True
    )
    
    # Get IDs of users who should be story collaborators
    selected_user_ids_set = set(selected_user_ids)
    
    # Remove story collaborators that are not selected
    for story_collab in current_story_collaborators:
        if story_collab.user.id not in selected_user_ids_set:
            # Check if user is a studio collaborator (only remove if they are)
            if studio_collaborators.filter(user=story_collab.user).exists():
                story_collab.is_active = False
                story_collab.save()
    
    # Add new story collaborators from selected studio collaborators
    for studio_collab in studio_collaborators:
        if studio_collab.user.id in selected_user_ids_set:
            # Create or update story collaborator
            story_collaborator, created = StoryCollaborator.objects.get_or_create(
                story=story,
                user=studio_collab.user,
                defaults={
                    'role': studio_collab.role,
                    'is_active': True
                }
            )
            if not created:
                # Update if already exists
                story_collaborator.role = studio_collab.role
                story_collaborator.is_active = True
                story_collaborator.save()
    
    # Return updated list of story collaborators
    updated_collaborators = StoryCollaborator.objects.filter(
        story=story,
        is_active=True
    ).select_related('user')
    
    serializer = StoryCollaboratorSerializer(updated_collaborators, many=True)
    return Response({'results': serializer.data})
