from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from .models import Studio, StudioCollaborator
import uuid


class StudioCollaboratorRoleSelectionTestCase(APITestCase):
    """Test role selection when inviting studio collaborators"""
    
    def setUp(self):
        """Set up test data"""
        # Use unique usernames to avoid conflicts
        unique_suffix = str(uuid.uuid4())[:8]
        self.owner = User.objects.create_user(
            username=f'owner_{unique_suffix}',
            email=f'owner_{unique_suffix}@example.com',
            password='testpass123',
            first_name='Studio',
            last_name='Owner'
        )
        self.user1 = User.objects.create_user(
            username=f'user1_{unique_suffix}',
            email=f'user1_{unique_suffix}@example.com',
            password='testpass123',
            first_name='User',
            last_name='One'
        )
        self.user2 = User.objects.create_user(
            username=f'user2_{unique_suffix}',
            email=f'user2_{unique_suffix}@example.com',
            password='testpass123',
            first_name='User',
            last_name='Two'
        )
        
        self.studio = Studio.objects.create(
            name='Test Studio',
            description='A test studio',
            owner=self.owner,
            is_public=True
        )
        
        self.owner_token = Token.objects.create(user=self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.owner_token.key}')
    
    def test_invite_user_with_writer_role(self):
        """Test inviting a user with writer role"""
        url = reverse('icvybz-api:invite-studio-user', kwargs={'studio_id': self.studio.id})
        data = {
            'user_id': self.user1.id,
            'role': 'writer'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        collaborator = StudioCollaborator.objects.get(studio=self.studio, user=self.user1)
        self.assertEqual(collaborator.role, 'writer')
        self.assertTrue(collaborator.is_active)
    
    def test_invite_user_with_3d_artist_role(self):
        """Test inviting a user with 3D artist role"""
        url = reverse('icvybz-api:invite-studio-user', kwargs={'studio_id': self.studio.id})
        data = {
            'user_id': self.user1.id,
            'role': '3d_artist'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        collaborator = StudioCollaborator.objects.get(studio=self.studio, user=self.user1)
        self.assertEqual(collaborator.role, '3d_artist')
    
    def test_invite_user_with_voice_actor_role(self):
        """Test inviting a user with voice actor role"""
        url = reverse('icvybz-api:invite-studio-user', kwargs={'studio_id': self.studio.id})
        data = {
            'user_id': self.user1.id,
            'role': 'voice_actor'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        collaborator = StudioCollaborator.objects.get(studio=self.studio, user=self.user1)
        self.assertEqual(collaborator.role, 'voice_actor')
    
    def test_invite_user_with_sound_engineer_role(self):
        """Test inviting a user with sound engineer role"""
        url = reverse('icvybz-api:invite-studio-user', kwargs={'studio_id': self.studio.id})
        data = {
            'user_id': self.user1.id,
            'role': 'sound_engineer'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        collaborator = StudioCollaborator.objects.get(studio=self.studio, user=self.user1)
        self.assertEqual(collaborator.role, 'sound_engineer')
    
    def test_invite_user_with_cinematographer_role(self):
        """Test inviting a user with cinematographer role"""
        url = reverse('icvybz-api:invite-studio-user', kwargs={'studio_id': self.studio.id})
        data = {
            'user_id': self.user1.id,
            'role': 'cinematographer'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        collaborator = StudioCollaborator.objects.get(studio=self.studio, user=self.user1)
        self.assertEqual(collaborator.role, 'cinematographer')
    
    def test_invite_by_email_with_role(self):
        """Test inviting by email with specific role"""
        url = reverse('icvybz-api:invite-studio-email', kwargs={'studio_id': self.studio.id})
        data = {
            'email': self.user2.email,
            'role': '3d_artist'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        collaborator = StudioCollaborator.objects.get(studio=self.studio, user=self.user2)
        self.assertEqual(collaborator.role, '3d_artist')
    
    def test_invite_with_invalid_role(self):
        """Test that invalid role is rejected"""
        url = reverse('icvybz-api:invite-studio-user', kwargs={'studio_id': self.studio.id})
        data = {
            'user_id': self.user1.id,
            'role': 'invalid_role'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class RemoveStudioCollaboratorTestCase(APITestCase):
    """Test removing studio collaborators"""
    
    def setUp(self):
        """Set up test data"""
        # Use unique usernames to avoid conflicts
        unique_suffix = str(uuid.uuid4())[:8]
        self.owner = User.objects.create_user(
            username=f'owner_{unique_suffix}',
            email=f'owner_{unique_suffix}@example.com',
            password='testpass123',
            first_name='Studio',
            last_name='Owner'
        )
        self.collaborator_user = User.objects.create_user(
            username=f'collaborator_{unique_suffix}',
            email=f'collab_{unique_suffix}@example.com',
            password='testpass123',
            first_name='Collaborator',
            last_name='User'
        )
        self.other_user = User.objects.create_user(
            username=f'other_{unique_suffix}',
            email=f'other_{unique_suffix}@example.com',
            password='testpass123'
        )
        
        self.studio = Studio.objects.create(
            name='Test Studio',
            description='A test studio',
            owner=self.owner,
            is_public=True
        )
        
        self.collaborator = StudioCollaborator.objects.create(
            studio=self.studio,
            user=self.collaborator_user,
            role='writer',
            is_active=True
        )
        
        self.owner_token = Token.objects.create(user=self.owner)
        self.collaborator_token = Token.objects.create(user=self.collaborator_user)
        self.other_token = Token.objects.create(user=self.other_user)
    
    def test_owner_can_remove_collaborator(self):
        """Test that studio owner can remove a collaborator"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.owner_token.key}')
        url = reverse('icvybz-api:remove-studio-collaborator', kwargs={
            'studio_id': self.studio.id,
            'collaborator_id': self.collaborator.id
        })
        
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('detail', response.data)
        self.assertEqual(response.data['detail'], 'Collaborator removed successfully')
        
        # Verify collaborator is deactivated and removed_at is set
        self.collaborator.refresh_from_db()
        self.assertFalse(self.collaborator.is_active)
        self.assertIsNotNone(self.collaborator.removed_at)
    
    def test_collaborator_cannot_remove_self(self):
        """Test that a collaborator cannot remove themselves"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.collaborator_token.key}')
        url = reverse('icvybz-api:remove-studio-collaborator', kwargs={
            'studio_id': self.studio.id,
            'collaborator_id': self.collaborator.id
        })
        
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Verify collaborator is still active
        self.collaborator.refresh_from_db()
        self.assertTrue(self.collaborator.is_active)
    
    def test_other_user_cannot_remove_collaborator(self):
        """Test that other users cannot remove collaborators"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.other_token.key}')
        url = reverse('icvybz-api:remove-studio-collaborator', kwargs={
            'studio_id': self.studio.id,
            'collaborator_id': self.collaborator.id
        })
        
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Verify collaborator is still active
        self.collaborator.refresh_from_db()
        self.assertTrue(self.collaborator.is_active)
    
    def test_cannot_remove_owner(self):
        """Test that owner cannot be removed"""
        # Create a collaborator entry for the owner (shouldn't happen in practice, but test it)
        owner_collab = StudioCollaborator.objects.create(
            studio=self.studio,
            user=self.owner,
            role='writer',
            is_active=True
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.owner_token.key}')
        url = reverse('icvybz-api:remove-studio-collaborator', kwargs={
            'studio_id': self.studio.id,
            'collaborator_id': owner_collab.id
        })
        
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)
        self.assertIn('Cannot remove the studio owner', response.data['detail'])
    
    def test_remove_nonexistent_collaborator(self):
        """Test removing a collaborator that doesn't exist"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.owner_token.key}')
        url = reverse('icvybz-api:remove-studio-collaborator', kwargs={
            'studio_id': self.studio.id,
            'collaborator_id': 99999
        })
        
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_remove_collaborator_from_nonexistent_studio(self):
        """Test removing a collaborator from a studio that doesn't exist"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.owner_token.key}')
        url = reverse('icvybz-api:remove-studio-collaborator', kwargs={
            'studio_id': 99999,
            'collaborator_id': self.collaborator.id
        })
        
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_removed_collaborator_not_in_list(self):
        """Test that removed collaborator is not returned in collaborators list"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.owner_token.key}')
        
        # Get collaborators list before removal
        list_url = reverse('icvybz-api:studio-collaborators', kwargs={'studio_id': self.studio.id})
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        
        # Remove collaborator
        remove_url = reverse('icvybz-api:remove-studio-collaborator', kwargs={
            'studio_id': self.studio.id,
            'collaborator_id': self.collaborator.id
        })
        self.client.delete(remove_url)
        
        # Get collaborators list after removal
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)
    
    def test_unauthenticated_cannot_remove(self):
        """Test that unauthenticated users cannot remove collaborators"""
        self.client.credentials()
        url = reverse('icvybz-api:remove-studio-collaborator', kwargs={
            'studio_id': self.studio.id,
            'collaborator_id': self.collaborator.id
        })
        
        response = self.client.delete(url)
        # DRF returns 403 Forbidden for unauthenticated users with IsAuthenticated permission
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

