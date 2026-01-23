from django.test import TestCase
from django.contrib.auth.models import User
from django.core import mail
from django.conf import settings
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from unittest.mock import patch, MagicMock
from .models import Comic, CollaborationInvite, StoryCollaborator, Studio, StudioCollaborator, StudioCollaborationRequest


class CollaborationInviteEmailTestCase(APITestCase):
    """Test email notifications for story collaboration invitations"""
    
    def setUp(self):
        """Set up test data"""
        self.user1 = User.objects.create_user(
            username='owner',
            email='owner@example.com',
            password='testpass123',
            first_name='Story',
            last_name='Owner'
        )
        self.user2 = User.objects.create_user(
            username='invitee',
            email='invitee@example.com',
            password='testpass123',
            first_name='Invited',
            last_name='User'
        )
        self.user3 = User.objects.create_user(
            username='external',
            email='external@example.com',
            password='testpass123'
        )
        
        self.story = Comic.objects.create(
            user=self.user1,
            title='Test Story',
            description='A test story'
        )
        
        self.token1 = Token.objects.create(user=self.user1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
    
    def test_invite_existing_user_sends_email(self):
        """Test that inviting an existing user sends an email notification"""
        from django.urls import reverse
        url = reverse('icvybz-api:invite-existing-user', kwargs={'story_id': self.story.id})
        data = {
            'user_id': self.user2.id,
            'role': 'editor',
            'message': 'Please help with this story!'
        }
        
        # Clear mail outbox
        mail.outbox.clear()
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that email was sent
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        
        # Verify email details
        self.assertEqual(email.subject, f'Collaboration Invitation: {self.story.title}')
        self.assertEqual(email.to, [self.user2.email])
        self.assertIn(self.story.title, email.body)
        self.assertIn('Editor', email.body)  # Role is capitalized in get_role_display()
        self.assertIn('Please help with this story!', email.body)
        
        # Verify HTML email was sent
        self.assertIsNotNone(email.alternatives)
        self.assertEqual(len(email.alternatives), 1)
        html_content = email.alternatives[0][0]
        self.assertIn(self.story.title, html_content)
        self.assertIn('Editor', html_content)  # Role is capitalized in get_role_display()
    
    def test_invite_by_email_sends_email_to_existing_user(self):
        """Test that inviting by email sends email to existing user"""
        from django.urls import reverse
        url = reverse('icvybz-api:invite-by-email', kwargs={'story_id': self.story.id})
        data = {
            'email': self.user2.email,
            'role': 'viewer',
            'message': 'Join us!'
        }
        
        mail.outbox.clear()
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 1)
        
        email = mail.outbox[0]
        self.assertEqual(email.to, [self.user2.email])
        self.assertIn(self.story.title, email.body)
    
    def test_invite_by_email_sends_email_to_external_user(self):
        """Test that inviting by email sends email to non-registered user"""
        from django.urls import reverse
        url = reverse('icvybz-api:invite-by-email', kwargs={'story_id': self.story.id})
        data = {
            'email': 'newuser@example.com',
            'role': 'viewer',
            'message': 'Join our platform!'
        }
        
        mail.outbox.clear()
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 1)
        
        email = mail.outbox[0]
        self.assertEqual(email.to, ['newuser@example.com'])
        self.assertIn(self.story.title, email.body)
        self.assertIn('register', email.body.lower())  # Should mention registration
        self.assertIn('Viewer', email.body)  # Role is capitalized in get_role_display()
    
    def test_invite_email_contains_accept_decline_links(self):
        """Test that invitation email contains accept and decline links"""
        from django.urls import reverse
        url = reverse('icvybz-api:invite-existing-user', kwargs={'story_id': self.story.id})
        data = {
            'user_id': self.user2.id,
            'role': 'editor'
        }
        
        mail.outbox.clear()
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        email = mail.outbox[0]
        html_content = email.alternatives[0][0]
        
        # Check for accept and decline URLs in HTML
        self.assertIn('accept', html_content.lower())
        self.assertIn('decline', html_content.lower())
        self.assertIn(str(self.story.id), html_content)
    
    def test_invite_email_failure_doesnt_block_invitation(self):
        """Test that email failure doesn't prevent invitation creation"""
        from django.urls import reverse
        url = reverse('icvybz-api:invite-existing-user', kwargs={'story_id': self.story.id})
        data = {
            'user_id': self.user2.id,
            'role': 'editor'
        }
        
        # Mock send_mail to raise an exception
        with patch('icvybz.models.send_mail') as mock_send:
            mock_send.side_effect = Exception("Email service unavailable")
            
            response = self.client.post(url, data, format='json')
            
            # Invitation should still be created
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertTrue(CollaborationInvite.objects.filter(
                story=self.story,
                invitee_user=self.user2
            ).exists())


class StudioCollaborationRequestEmailTestCase(APITestCase):
    """Test email notifications for studio collaboration requests"""
    
    def setUp(self):
        """Set up test data"""
        self.owner = User.objects.create_user(
            username='studio_owner',
            email='owner@example.com',
            password='testpass123',
            first_name='Studio',
            last_name='Owner'
        )
        self.requester = User.objects.create_user(
            username='requester',
            email='requester@example.com',
            password='testpass123',
            first_name='Request',
            last_name='User'
        )
        
        self.studio = Studio.objects.create(
            owner=self.owner,
            name='Test Studio',
            description='A test studio',
            is_public=True
        )
        
        self.token_requester = Token.objects.create(user=self.requester)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_requester.key}')
    
    def test_create_collaboration_request_sends_email_to_owner(self):
        """Test that creating a collaboration request sends email to studio owner"""
        from django.urls import reverse
        url = reverse('icvybz-api:create-studio-collaboration-request', kwargs={'studio_id': self.studio.id})
        data = {
            'role': 'writer',  # Use valid role from StudioCollaborator.ROLE_CHOICES
            'message': 'I would like to collaborate on your studio!'
        }
        
        mail.outbox.clear()
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that email was sent to studio owner
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        
        # Verify email details
        self.assertEqual(email.subject, f'New Collaboration Request for {self.studio.name}')
        self.assertEqual(email.to, [self.owner.email])
        self.assertIn(self.studio.name, email.body)
        # Email template uses first_name or username
        self.assertTrue(
            self.requester.first_name in email.body or self.requester.username in email.body,
            f"Expected '{self.requester.first_name}' or '{self.requester.username}' in email body"
        )
        self.assertIn('Writer', email.body)  # Role is capitalized in get_role_display()
        self.assertIn('I would like to collaborate', email.body)
        
        # Verify HTML email was sent
        self.assertIsNotNone(email.alternatives)
        html_content = email.alternatives[0][0]
        self.assertIn(self.studio.name, html_content)
        # Email template uses first_name or username
        self.assertTrue(
            self.requester.first_name in html_content or self.requester.username in html_content,
            f"Expected '{self.requester.first_name}' or '{self.requester.username}' in HTML content"
        )
    
    def test_collaboration_request_email_contains_accept_decline_links(self):
        """Test that collaboration request email contains accept and decline links"""
        from django.urls import reverse
        url = reverse('icvybz-api:create-studio-collaboration-request', kwargs={'studio_id': self.studio.id})
        data = {
            'role': 'writer',  # Use valid role from StudioCollaborator.ROLE_CHOICES
            'message': 'Please accept my request!'
        }
        
        mail.outbox.clear()
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        email = mail.outbox[0]
        html_content = email.alternatives[0][0]
        
        # Check for accept and decline URLs in HTML
        self.assertIn('accept', html_content.lower())
        self.assertIn('decline', html_content.lower())
        self.assertIn(str(self.studio.id), html_content)
    
    def test_collaboration_request_email_failure_doesnt_block_request(self):
        """Test that email failure doesn't prevent request creation"""
        from django.urls import reverse
        url = reverse('icvybz-api:create-studio-collaboration-request', kwargs={'studio_id': self.studio.id})
        data = {
            'role': 'writer',  # Use valid role from StudioCollaborator.ROLE_CHOICES
            'message': 'Test message'
        }
        
        # Mock send_mail to raise an exception
        with patch('icvybz.models.send_mail') as mock_send:
            mock_send.side_effect = Exception("Email service unavailable")
            
            response = self.client.post(url, data, format='json')
            
            # Request should still be created
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertTrue(StudioCollaborationRequest.objects.filter(
                studio=self.studio,
                requester=self.requester
            ).exists())


class StudioInviteEmailTestCase(APITestCase):
    """Test email notifications for studio invitations"""
    
    def setUp(self):
        """Set up test data"""
        self.owner = User.objects.create_user(
            username='studio_owner',
            email='owner@example.com',
            password='testpass123',
            first_name='Studio',
            last_name='Owner'
        )
        self.invitee = User.objects.create_user(
            username='invitee',
            email='invitee@example.com',
            password='testpass123',
            first_name='Invited',
            last_name='User'
        )
        
        self.studio = Studio.objects.create(
            owner=self.owner,
            name='Test Studio',
            description='A test studio'
        )
        
        self.token_owner = Token.objects.create(user=self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_owner.key}')
    
    def test_invite_studio_user_sends_email(self):
        """Test that inviting a user to a studio sends an email notification"""
        from django.urls import reverse
        url = reverse('icvybz-api:invite-studio-user', kwargs={'studio_id': self.studio.id})
        data = {
            'user_id': self.invitee.id,
            'role': 'writer'  # Use valid role from StudioCollaborator.ROLE_CHOICES
        }
        
        mail.outbox.clear()
        
        response = self.client.post(url, data, format='json')
        
        # Debug: print response if it fails
        if response.status_code != status.HTTP_201_CREATED:
            print(f"Response status: {response.status_code}")
            print(f"Response data: {response.data}")
            print(f"Request data: {data}")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, f"Response: {response.data}")
        
        # Check that email was sent
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        
        # Verify email details
        self.assertEqual(email.subject, f'Studio Collaboration Invitation: {self.studio.name}')
        self.assertEqual(email.to, [self.invitee.email])
        self.assertIn(self.studio.name, email.body)
        # Email template uses first_name or username, so check for either
        self.assertTrue(
            self.owner.first_name in email.body or self.owner.username in email.body,
            f"Expected '{self.owner.first_name}' or '{self.owner.username}' in email body"
        )
        self.assertIn('Writer', email.body)  # Role is capitalized in get_role_display()
        
        # Verify HTML email was sent
        self.assertIsNotNone(email.alternatives)
        html_content = email.alternatives[0][0]
        self.assertIn(self.studio.name, html_content)
    
    def test_invite_studio_by_email_sends_email(self):
        """Test that inviting by email to a studio sends an email notification"""
        from django.urls import reverse
        url = reverse('icvybz-api:invite-studio-email', kwargs={'studio_id': self.studio.id})
        data = {
            'email': self.invitee.email,
            'role': 'writer'  # Use valid role from StudioCollaborator.ROLE_CHOICES
        }
        
        mail.outbox.clear()
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that email was sent
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        
        self.assertEqual(email.to, [self.invitee.email])
        self.assertIn(self.studio.name, email.body)
        self.assertIn('Writer', email.body)  # Role is capitalized in get_role_display()
    
    def test_studio_invite_email_contains_studio_link(self):
        """Test that studio invitation email contains link to studio"""
        from django.urls import reverse
        url = reverse('icvybz-api:invite-studio-user', kwargs={'studio_id': self.studio.id})
        data = {
            'user_id': self.invitee.id,
            'role': 'writer'
        }
        
        mail.outbox.clear()
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        email = mail.outbox[0]
        html_content = email.alternatives[0][0]
        
        # Check for studio URL in HTML
        self.assertIn(str(self.studio.id), html_content)
        self.assertIn('studio', html_content.lower())
        # Email template uses first_name or username
        self.assertTrue(
            self.owner.first_name in html_content or self.owner.username in html_content,
            f"Expected '{self.owner.first_name}' or '{self.owner.username}' in HTML content"
        )
    
    def test_studio_invite_email_failure_doesnt_block_invitation(self):
        """Test that email failure doesn't prevent studio collaborator creation"""
        from django.urls import reverse
        url = reverse('icvybz-api:invite-studio-user', kwargs={'studio_id': self.studio.id})
        data = {
            'user_id': self.invitee.id,
            'role': 'writer'
        }
        
        # Mock send_mail to raise an exception
        with patch('icvybz.api_views.send_mail') as mock_send:
            mock_send.side_effect = Exception("Email service unavailable")
            
            response = self.client.post(url, data, format='json')
            
            # Collaborator should still be created
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertTrue(StudioCollaborator.objects.filter(
                studio=self.studio,
                user=self.invitee
            ).exists())

