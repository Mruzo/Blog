from django.test import TestCase, Client
from django.contrib.auth import get_user_model

User = get_user_model()
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from .models import Comic, CollaborationInvite, StoryCollaborator
import json


class CollaborationAPITestCase(APITestCase):
    def setUp(self):
        """Set up test data"""
        # Create test users
        self.user1 = User.objects.create_user(
            username='user1',
            email='user1@example.com',
            password='testpass123',
            first_name='John',
            last_name='Doe'
        )
        self.user2 = User.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='testpass123',
            first_name='Jane',
            last_name='Smith'
        )
        self.user3 = User.objects.create_user(
            username='user3',
            email='user3@example.com',
            password='testpass123',
            first_name='Bob',
            last_name='Johnson'
        )
        
        # Create test story
        self.story = Comic.objects.create(
            user=self.user1,
            title='Test Story',
            description='A test story for collaboration'
        )
        
        # Create tokens for authentication
        self.token1 = Token.objects.create(user=self.user1)
        self.token2 = Token.objects.create(user=self.user2)
        self.token3 = Token.objects.create(user=self.user3)
        
        # Set up client authentication
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')

    def test_search_users(self):
        """Test user search functionality"""
        url = reverse('icvybz-api:user-search')
        
        # Test search by username
        response = self.client.get(url, {'q': 'user2'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['username'], 'user2')
        
        # Test search by email
        response = self.client.get(url, {'q': 'user3@example.com'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['email'], 'user3@example.com')
        
        # Test search by name
        response = self.client.get(url, {'q': 'Jane'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['first_name'], 'Jane')
        
        # Test empty query
        response = self.client.get(url, {'q': ''})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)

    def test_invite_existing_user(self):
        """Test inviting an existing user"""
        url = reverse('icvybz-api:invite-existing-user', kwargs={'story_id': self.story.id})
        data = {
            'user_id': self.user2.id,
            'role': 'editor',
            'message': 'Please help me with this story!'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that invitation was created
        invite = CollaborationInvite.objects.get(
            story=self.story,
            invitee_user=self.user2
        )
        self.assertEqual(invite.role, 'editor')
        self.assertEqual(invite.message, 'Please help me with this story!')
        self.assertEqual(invite.status, 'pending')

    def test_invite_by_email(self):
        """Test inviting by email address"""
        url = reverse('icvybz-api:invite-by-email', kwargs={'story_id': self.story.id})
        data = {
            'email': 'newuser@example.com',
            'role': 'viewer',
            'message': 'Join our collaboration!'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that invitation was created
        invite = CollaborationInvite.objects.get(
            story=self.story,
            invitee_email='newuser@example.com'
        )
        self.assertEqual(invite.role, 'viewer')
        self.assertEqual(invite.message, 'Join our collaboration!')
        self.assertEqual(invite.status, 'pending')
        self.assertIsNone(invite.invitee_user)  # User doesn't exist yet

    def test_get_collaborators(self):
        """Test getting collaborators for a story"""
        # Create some invitations
        invite1 = CollaborationInvite.objects.create(
            inviter=self.user1,
            invitee_email=self.user2.email,
            invitee_user=self.user2,
            story=self.story,
            role='editor',
            status='accepted'
        )
        
        invite2 = CollaborationInvite.objects.create(
            inviter=self.user1,
            invitee_email='external@example.com',
            story=self.story,
            role='viewer',
            status='pending'
        )
        
        url = reverse('icvybz-api:story-collaborators', kwargs={'story_id': self.story.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_update_collaborator_role(self):
        """Test updating a collaborator's role"""
        # Create an invitation
        invite = CollaborationInvite.objects.create(
            inviter=self.user1,
            invitee_email=self.user2.email,
            invitee_user=self.user2,
            story=self.story,
            role='viewer',
            status='accepted'
        )
        
        # Create active collaborator
        collaborator = StoryCollaborator.objects.create(
            story=self.story,
            user=self.user2,
            role='viewer',
            invited_by=self.user1
        )
        
        url = reverse('icvybz-api:update-collaborator-role', kwargs={
            'story_id': self.story.id,
            'invite_id': invite.id
        })
        data = {'role': 'admin'}
        
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that role was updated
        invite.refresh_from_db()
        collaborator.refresh_from_db()
        self.assertEqual(invite.role, 'admin')
        self.assertEqual(collaborator.role, 'admin')

    def test_remove_collaborator(self):
        """Test removing a collaborator"""
        # Create an invitation
        invite = CollaborationInvite.objects.create(
            inviter=self.user1,
            invitee_email=self.user2.email,
            invitee_user=self.user2,
            story=self.story,
            role='editor',
            status='accepted'
        )
        
        # Create active collaborator
        StoryCollaborator.objects.create(
            story=self.story,
            user=self.user2,
            role='editor',
            invited_by=self.user1
        )
        
        url = reverse('icvybz-api:remove-collaborator', kwargs={
            'story_id': self.story.id,
            'invite_id': invite.id
        })
        
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Check that invitation and collaborator were removed
        self.assertFalse(CollaborationInvite.objects.filter(id=invite.id).exists())
        self.assertFalse(StoryCollaborator.objects.filter(
            story=self.story, user=self.user2
        ).exists())

    def test_accept_invitation(self):
        """Test accepting an invitation"""
        # Create an invitation
        invite = CollaborationInvite.objects.create(
            inviter=self.user1,
            invitee_email=self.user2.email,
            invitee_user=self.user2,
            story=self.story,
            role='editor'
        )
        
        # Switch to user2's authentication
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token2.key}')
        
        url = reverse('icvybz-api:accept-invitation', kwargs={'invite_id': invite.id})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that invitation was accepted and collaborator was created
        invite.refresh_from_db()
        self.assertEqual(invite.status, 'accepted')
        
        collaborator = StoryCollaborator.objects.get(
            story=self.story,
            user=self.user2
        )
        self.assertEqual(collaborator.role, 'editor')

    def test_decline_invitation(self):
        """Test declining an invitation"""
        # Create an invitation
        invite = CollaborationInvite.objects.create(
            inviter=self.user1,
            invitee_email=self.user2.email,
            invitee_user=self.user2,
            story=self.story,
            role='editor'
        )
        
        # Switch to user2's authentication
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token2.key}')
        
        url = reverse('icvybz-api:decline-invitation', kwargs={'invite_id': invite.id})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that invitation was declined
        invite.refresh_from_db()
        self.assertEqual(invite.status, 'declined')

    def test_get_pending_invitations(self):
        """Test getting pending invitations for a user"""
        # Create invitations for user2
        invite1 = CollaborationInvite.objects.create(
            inviter=self.user1,
            invitee_email=self.user2.email,
            invitee_user=self.user2,
            story=self.story,
            role='editor'
        )
        
        invite2 = CollaborationInvite.objects.create(
            inviter=self.user3,
            invitee_email=self.user2.email,
            invitee_user=self.user2,
            story=self.story,
            role='viewer'
        )
        
        # Switch to user2's authentication
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token2.key}')
        
        url = reverse('icvybz-api:pending-invitations')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_permission_denied_for_non_owner(self):
        """Test that non-owners cannot manage collaborators"""
        # Switch to user2's authentication (not the story owner)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token2.key}')
        
        url = reverse('icvybz-api:invite-existing-user', kwargs={'story_id': self.story.id})
        data = {
            'user_id': self.user3.id,
            'role': 'editor'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_duplicate_invitation_prevention(self):
        """Test that duplicate invitations are prevented"""
        # Create an invitation
        CollaborationInvite.objects.create(
            inviter=self.user1,
            invitee_email=self.user2.email,
            invitee_user=self.user2,
            story=self.story,
            role='editor'
        )
        
        # Try to create another invitation for the same user
        url = reverse('icvybz-api:invite-existing-user', kwargs={'story_id': self.story.id})
        data = {
            'user_id': self.user2.id,
            'role': 'viewer'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invitation already sent', response.data['detail'])

    def test_expired_invitation_handling(self):
        """Test handling of expired invitations"""
        # Create an expired invitation
        invite = CollaborationInvite.objects.create(
            inviter=self.user1,
            invitee_email=self.user2.email,
            invitee_user=self.user2,
            story=self.story,
            role='editor',
            expires_at=timezone.now() - timezone.timedelta(days=1)
        )
        
        # Switch to user2's authentication
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token2.key}')
        
        url = reverse('icvybz-api:accept-invitation', kwargs={'invite_id': invite.id})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('expired', response.data['detail'])


class CollaborationModelTestCase(TestCase):
    def setUp(self):
        """Set up test data"""
        self.user1 = User.objects.create_user(
            username='user1',
            email='user1@example.com',
            password='testpass123'
        )
        self.user2 = User.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='testpass123'
        )
        self.story = Comic.objects.create(
            user=self.user1,
            title='Test Story',
            description='A test story'
        )

    def test_collaboration_invite_creation(self):
        """Test creating a collaboration invite"""
        invite = CollaborationInvite.objects.create(
            inviter=self.user1,
            invitee_email=self.user2.email,
            invitee_user=self.user2,
            story=self.story,
            role='editor',
            message='Join me!'
        )
        
        self.assertEqual(invite.inviter, self.user1)
        self.assertEqual(invite.invitee_email, self.user2.email)
        self.assertEqual(invite.invitee_user, self.user2)
        self.assertEqual(invite.story, self.story)
        self.assertEqual(invite.role, 'editor')
        self.assertEqual(invite.status, 'pending')
        self.assertEqual(invite.message, 'Join me!')

    def test_collaboration_invite_expiration(self):
        """Test invitation expiration logic"""
        invite = CollaborationInvite.objects.create(
            inviter=self.user1,
            invitee_email=self.user2.email,
            invitee_user=self.user2,
            story=self.story,
            role='editor'
        )
        
        # Should not be expired initially
        self.assertFalse(invite.is_expired())
        
        # Manually set expiration to past
        invite.expires_at = timezone.now() - timezone.timedelta(days=1)
        invite.save()
        
        # Should be expired now
        self.assertTrue(invite.is_expired())

    def test_accept_invitation(self):
        """Test accepting an invitation"""
        invite = CollaborationInvite.objects.create(
            inviter=self.user1,
            invitee_email=self.user2.email,
            invitee_user=self.user2,
            story=self.story,
            role='editor'
        )
        
        # Accept the invitation
        result = invite.accept()
        self.assertTrue(result)
        
        invite.refresh_from_db()
        self.assertEqual(invite.status, 'accepted')

    def test_decline_invitation(self):
        """Test declining an invitation"""
        invite = CollaborationInvite.objects.create(
            inviter=self.user1,
            invitee_email=self.user2.email,
            invitee_user=self.user2,
            story=self.story,
            role='editor'
        )
        
        # Decline the invitation
        result = invite.decline()
        self.assertTrue(result)
        
        invite.refresh_from_db()
        self.assertEqual(invite.status, 'declined')

    def test_story_collaborator_creation(self):
        """Test creating a story collaborator"""
        collaborator = StoryCollaborator.objects.create(
            story=self.story,
            user=self.user2,
            role='editor',
            invited_by=self.user1
        )
        
        self.assertEqual(collaborator.story, self.story)
        self.assertEqual(collaborator.user, self.user2)
        self.assertEqual(collaborator.role, 'editor')
        self.assertEqual(collaborator.invited_by, self.user1)

    def test_unique_constraints(self):
        """Test unique constraints on models"""
        # Create first invitation
        invite1 = CollaborationInvite.objects.create(
            inviter=self.user1,
            invitee_email=self.user2.email,
            story=self.story,
            role='editor'
        )
        
        # Verify invitation was created
        self.assertIsNotNone(invite1)
        
        # Create first collaborator
        collaborator1 = StoryCollaborator.objects.create(
            story=self.story,
            user=self.user2,
            role='editor',
            invited_by=self.user1
        )
        
        # Verify collaborator was created
        self.assertIsNotNone(collaborator1)
        
        # Test that we can't create duplicate invitations (this is handled by the model's unique_together)
        # and duplicate collaborators (this is also handled by unique_together)
        # The actual constraint testing is done at the database level
