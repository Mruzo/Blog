"""API views for feedback/ticketing system"""
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework import generics
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import FeedbackTicket, TicketComment
from .serializers import (
    FeedbackTicketSerializer, FeedbackTicketListSerializer,
    FeedbackTicketCreateSerializer, TicketCommentSerializer,
    TicketCommentCreateSerializer
)
from .utils import update_ticket_status, check_first_response
from .email_notifications import send_ticket_confirmation_email, send_ticket_resolution_email

# Custom permission for staff-only endpoints
class IsStaff(IsAuthenticated):
    """Permission class that requires user to be staff"""
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.is_staff


# Public endpoints (no auth required)
@api_view(['POST'])
@authentication_classes([])  # Disable authentication (and CSRF) for this endpoint
@permission_classes([AllowAny])
def create_ticket(request):
    """Create a new feedback ticket (public endpoint)"""
    serializer = FeedbackTicketCreateSerializer(data=request.data, context={'request': request})
    
    if serializer.is_valid():
        ticket = serializer.save()
        
        # Send confirmation email
        send_ticket_confirmation_email(ticket, request)
        
        return Response({
            'success': True,
            'ticket_number': ticket.ticket_number,
            'message': 'Your feedback has been received. We\'ll review it and get back to you soon.'
        }, status=status.HTTP_201_CREATED)
    
    return Response({
        'success': False,
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@authentication_classes([])  # Disable authentication (and CSRF) for this endpoint
@permission_classes([AllowAny])
def get_ticket_by_number(request, ticket_number):
    """Get ticket by ticket number (public, but only if user has access)"""
    try:
        ticket = FeedbackTicket.objects.get(ticket_number=ticket_number)
    except FeedbackTicket.DoesNotExist:
        return Response({
            'error': 'Ticket not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check access: user must be the submitter (by email or user account)
    has_access = False
    if request.user.is_authenticated:
        has_access = ticket.user == request.user
    else:
        # Check by email (for non-authenticated users)
        submitted_email = request.GET.get('email', '')
        has_access = ticket.submitted_by_email.lower() == submitted_email.lower()
    
    if not has_access:
        return Response({
            'error': 'You do not have access to this ticket'
        }, status=status.HTTP_403_FORBIDDEN)
    
    serializer = FeedbackTicketSerializer(ticket, context={'request': request})
    return Response(serializer.data)


# Authenticated user endpoints
class UserTicketList(generics.ListAPIView):
    """List tickets for authenticated user"""
    serializer_class = FeedbackTicketListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Filter by user ID or email match (exact match to avoid duplicates)
        return FeedbackTicket.objects.filter(
            Q(user=self.request.user) | 
            (Q(submitted_by_email__iexact=self.request.user.email) & Q(user__isnull=True))
        ).select_related('user', 'assigned_to').distinct().order_by('-created_at')


class UserTicketDetail(generics.RetrieveAPIView):
    """Get ticket detail for authenticated user"""
    serializer_class = FeedbackTicketSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return FeedbackTicket.objects.filter(
            Q(user=self.request.user) | Q(submitted_by_email=self.request.user.email)
        )
    
    def get_object(self):
        queryset = self.get_queryset()
        obj = get_object_or_404(queryset, id=self.kwargs['id'])
        return obj


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_user_comment(request, ticket_id):
    """Add a comment to a ticket (authenticated user)"""
    try:
        ticket = FeedbackTicket.objects.get(id=ticket_id)
    except FeedbackTicket.DoesNotExist:
        return Response({
            'error': 'Ticket not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check access
    if ticket.user != request.user and ticket.submitted_by_email.lower() != request.user.email.lower():
        return Response({
            'error': 'You do not have access to this ticket'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Check if ticket is closed
    if ticket.status == 'closed':
        return Response({
            'error': 'Cannot add comments to closed tickets'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Users cannot add internal comments
    content = request.data.get('content', '')
    if not content:
        return Response({
            'error': 'Content is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Create comment
    comment = TicketComment.objects.create(
        ticket=ticket,
        author=request.user,
        author_name=request.user.username,
        author_email=request.user.email,
        content=content,
        is_internal=False,
        is_staff_response=False
    )
    
    # Update ticket updated_at
    ticket.save(update_fields=['updated_at'])
    
    return Response(TicketCommentSerializer(comment, context={'request': request}).data, status=status.HTTP_201_CREATED)


# Admin/Staff endpoints
class AdminTicketList(generics.ListAPIView):
    """List all tickets (staff only)"""
    serializer_class = FeedbackTicketListSerializer
    permission_classes = [IsStaff]
    
    def get_queryset(self):
        queryset = FeedbackTicket.objects.all().select_related('user', 'assigned_to')
        
        # Filters
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        priority_filter = self.request.query_params.get('priority', None)
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)
        
        category_filter = self.request.query_params.get('category', None)
        if category_filter:
            queryset = queryset.filter(category=category_filter)
        
        assigned_to_filter = self.request.query_params.get('assigned_to', None)
        if assigned_to_filter:
            queryset = queryset.filter(assigned_to_id=assigned_to_filter)
        
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(ticket_number__icontains=search) |
                Q(subject__icontains=search) |
                Q(message__icontains=search) |
                Q(submitted_by_name__icontains=search) |
                Q(submitted_by_email__icontains=search)
            )
        
        return queryset.order_by('-created_at')


class AdminTicketDetail(generics.RetrieveUpdateAPIView):
    """Get/Update ticket detail (staff only)"""
    serializer_class = FeedbackTicketSerializer
    permission_classes = [IsStaff]
    queryset = FeedbackTicket.objects.all()
    lookup_field = 'id'
    
    def update(self, request, *args, **kwargs):
        ticket = self.get_object()
        old_status = ticket.status
        
        # Update ticket
        response = super().update(request, *args, **kwargs)
        
        # If status changed, create history and send email if resolved
        if 'status' in request.data and request.data['status'] != old_status:
            new_status = request.data['status']
            notes = request.data.get('status_change_notes', '')
            update_ticket_status(ticket, new_status, request.user, notes)
            
            # Send resolution email if resolved
            if new_status == 'resolved' and ticket.resolution_notes:
                send_ticket_resolution_email(ticket, request)
        
        return response


@api_view(['POST'])
@permission_classes([IsStaff])
def assign_ticket(request, ticket_id):
    """Assign ticket to staff member"""
    try:
        ticket = FeedbackTicket.objects.get(id=ticket_id)
    except FeedbackTicket.DoesNotExist:
        return Response({
            'error': 'Ticket not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    assigned_to_id = request.data.get('assigned_to')
    if assigned_to_id:
        from django.contrib.auth.models import User
        try:
            assigned_user = User.objects.get(id=assigned_to_id)
            if not assigned_user.is_staff:
                return Response({
                    'error': 'Can only assign to staff members'
                }, status=status.HTTP_400_BAD_REQUEST)
            ticket.assigned_to = assigned_user
        except User.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
    else:
        ticket.assigned_to = None
    
    ticket.save()
    
    serializer = FeedbackTicketSerializer(ticket, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsStaff])
def add_admin_comment(request, ticket_id):
    """Add a comment to a ticket (admin)"""
    try:
        ticket = FeedbackTicket.objects.get(id=ticket_id)
    except FeedbackTicket.DoesNotExist:
        return Response({
            'error': 'Ticket not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Prepare data with author info
    data = request.data.copy()
    if request.user.is_authenticated:
        # Set author info for authenticated staff
        comment = TicketComment.objects.create(
            ticket=ticket,
            author=request.user,
            author_name=request.user.username,
            author_email=request.user.email,
            content=data.get('content', ''),
            is_internal=data.get('is_internal', False),
            is_staff_response=data.get('is_staff_response', False) if not data.get('is_internal', False) else False
        )
        
        # Check for first response
        check_first_response(ticket, comment)
        
        # Update status if needed
        if not comment.is_internal and ticket.status == 'new':
            update_ticket_status(ticket, 'open', request.user)
        
        return Response(TicketCommentSerializer(comment, context={'request': request}).data, status=status.HTTP_201_CREATED)
    
    return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([IsStaff])
def resolve_ticket(request, ticket_id):
    """Mark ticket as resolved"""
    try:
        ticket = FeedbackTicket.objects.get(id=ticket_id)
    except FeedbackTicket.DoesNotExist:
        return Response({
            'error': 'Ticket not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    resolution_notes = request.data.get('resolution_notes', '')
    if not resolution_notes:
        return Response({
            'error': 'Resolution notes are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    ticket.resolution_notes = resolution_notes
    ticket.save()
    
    # Update status
    update_ticket_status(ticket, 'resolved', request.user, 'Ticket resolved')
    
    # Send resolution email
    send_ticket_resolution_email(ticket, request)
    
    serializer = FeedbackTicketSerializer(ticket, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsStaff])
def close_ticket(request, ticket_id):
    """Close a ticket"""
    try:
        ticket = FeedbackTicket.objects.get(id=ticket_id)
    except FeedbackTicket.DoesNotExist:
        return Response({
            'error': 'Ticket not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    update_ticket_status(ticket, 'closed', request.user, 'Ticket closed')
    
    serializer = FeedbackTicketSerializer(ticket, context={'request': request})
    return Response(serializer.data)
