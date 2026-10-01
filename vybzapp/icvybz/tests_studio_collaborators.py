from django.test import override_settings
from django.contrib.auth import get_user_model

User = get_user_model()
from django.core import mail
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from .models import Studio, StudioCollaborator, StudioCollaborationInvite
import uuid


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
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
        mail.outbox.clear()
    
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
    
    def test_invite_user_with_director_role(self):
        url = reverse('icvybz-api:invite-studio-user', kwargs={'studio_id': self.studio.id})
        data = {
            'user_id': self.user1.id,
            'role': 'director'
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        collaborator = StudioCollaborator.objects.get(studio=self.studio, user=self.user1)
        self.assertEqual(collaborator.role, 'director')

    def test_invite_user_with_screenwriter_role(self):
        url = reverse('icvybz-api:invite-studio-user', kwargs={'studio_id': self.studio.id})
        data = {
            'user_id': self.user1.id,
            'role': 'screenwriter'
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        collaborator = StudioCollaborator.objects.get(studio=self.studio, user=self.user1)
        self.assertEqual(collaborator.role, 'screenwriter')

    def test_invite_by_email_unregistered_sends_registration_email(self):
        url = reverse('icvybz-api:invite-studio-email', kwargs={'studio_id': self.studio.id})
        data = {
            'email': 'new.teammate@example.com',
            'role': 'director'
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data.get('pending'))
        self.assertFalse(
            StudioCollaborator.objects.filter(studio=self.studio, role='director').exists()
        )
        invite = StudioCollaborationInvite.objects.get(
            studio=self.studio,
            invitee_email='new.teammate@example.com',
            role='director',
        )
        self.assertEqual(invite.status, 'pending')
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['new.teammate@example.com'])
        self.assertIn('register', mail.outbox[0].body.lower())
        self.assertIn('Director', mail.outbox[0].body)

    def test_register_applies_pending_studio_invite(self):
        from .studio_invites import apply_pending_studio_invites

        StudioCollaborationInvite.objects.create(
            studio=self.studio,
            inviter=self.owner,
            invitee_email='join.me@example.com',
            role='screenwriter',
            status='pending',
        )
        new_user = User.objects.create_user(
            username=f'joiner_{str(uuid.uuid4())[:8]}',
            email='join.me@example.com',
            password='testpass123',
        )
        applied = apply_pending_studio_invites(new_user)
        self.assertEqual(applied, 1)
        self.assertTrue(
            StudioCollaborator.objects.filter(
                studio=self.studio, user=new_user, role='screenwriter', is_active=True
            ).exists()
        )
        invite = StudioCollaborationInvite.objects.get(
            studio=self.studio, invitee_email='join.me@example.com', role='screenwriter'
        )
        self.assertEqual(invite.status, 'accepted')

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

    def test_invite_same_user_with_second_role(self):
        """A teammate can be invited again for a different role."""
        url = reverse('icvybz-api:invite-studio-user', kwargs={'studio_id': self.studio.id})
        first = self.client.post(url, {'user_id': self.user1.id, 'role': 'writer'}, format='json')
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        second = self.client.post(url, {'user_id': self.user1.id, 'role': 'director'}, format='json')
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        roles = set(
            StudioCollaborator.objects.filter(
                studio=self.studio, user=self.user1, is_active=True
            ).values_list('role', flat=True)
        )
        self.assertEqual(roles, {'writer', 'director'})

    def test_invite_reactivates_removed_role(self):
        """Removed roles are inactive, so inviting that role again should restore it."""
        existing = StudioCollaborator.objects.create(
            studio=self.studio,
            user=self.user1,
            role='sound_engineer',
            is_active=False,
        )
        url = reverse('icvybz-api:invite-studio-user', kwargs={'studio_id': self.studio.id})
        response = self.client.post(
            url, {'user_id': self.user1.id, 'role': 'sound_engineer'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        existing.refresh_from_db()
        self.assertTrue(existing.is_active)

    def test_invite_rejects_duplicate_active_role(self):
        StudioCollaborator.objects.create(
            studio=self.studio,
            user=self.user1,
            role='writer',
            is_active=True,
        )
        url = reverse('icvybz-api:invite-studio-user', kwargs={'studio_id': self.studio.id})
        response = self.client.post(
            url, {'user_id': self.user1.id, 'role': 'writer'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'User already has this role')


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
    
    def test_owner_can_remove_own_role(self):
        """Studio owner can drop an extra role they assigned themselves."""
        owner_collab = StudioCollaborator.objects.create(
            studio=self.studio,
            user=self.owner,
            role='sound_engineer',
            is_active=True
        )

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.owner_token.key}')
        url = reverse('icvybz-api:remove-studio-collaborator', kwargs={
            'studio_id': self.studio.id,
            'collaborator_id': owner_collab.id
        })

        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        owner_collab.refresh_from_db()
        self.assertFalse(owner_collab.is_active)
        self.studio.refresh_from_db()
        self.assertEqual(self.studio.owner, self.owner)

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

    def test_collaborators_list_includes_owned_studio_id(self):
        """Each teammate includes the public studio they own, if any."""
        collab_studio = Studio.objects.create(
            name='Collaborator Studio',
            description='Public studio owned by the collaborator',
            owner=self.collaborator_user,
            is_public=True,
        )
        StudioCollaborator.objects.create(
            studio=self.studio,
            user=self.owner,
            role='sound_engineer',
            is_active=True,
        )

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.owner_token.key}')
        url = reverse('icvybz-api:studio-collaborators', kwargs={'studio_id': self.studio.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        by_user = {item['user']['id']: item['owned_studio_id'] for item in response.data['results']}
        self.assertEqual(by_user[self.collaborator_user.id], collab_studio.id)
        self.assertEqual(by_user[self.owner.id], self.studio.id)
    
    def test_unauthenticated_cannot_remove(self):
        """Test that unauthenticated users cannot remove collaborators"""
        self.client.credentials()
        url = reverse('icvybz-api:remove-studio-collaborator', kwargs={
            'studio_id': self.studio.id,
            'collaborator_id': self.collaborator.id
        })
        
        response = self.client.delete(url)
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

