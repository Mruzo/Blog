from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.conf import settings
from unittest.mock import patch
import re


class EmailValidationTestCase(TestCase):
    def setUp(self):
        """Set up test data"""
        self.client = Client()
        self.register_url = reverse('register')
        self.valid_user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'first_name': 'Test',
            'last_name': 'User',
            'password1': 'testpass123',
            'password2': 'testpass123'
        }

    def test_registration_creates_inactive_user(self):
        """Test that registration creates a user with is_active=False"""
        response = self.client.post(self.register_url, self.valid_user_data)
        
        # Check that user was created
        user = User.objects.get(username='testuser')
        self.assertFalse(user.is_active)
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.first_name, 'Test')
        self.assertEqual(user.last_name, 'User')

    def test_registration_sends_verification_email(self):
        """Test that registration sends a verification email"""
        with patch('snm.views.send_mail') as mock_send_mail:
            response = self.client.post(self.register_url, self.valid_user_data)
            
            # Check that email was sent
            mock_send_mail.assert_called_once()
            
            # Check email content
            call_args = mock_send_mail.call_args
            self.assertEqual(call_args[0][0], 'Verify Your Email')  # subject
            self.assertEqual(call_args[0][3], ['test@example.com'])  # recipient
            self.assertIn('testuser', call_args[0][1])  # message contains username
            self.assertIn('verify', call_args[0][1].lower())  # message contains verification text

    def test_verification_email_contains_correct_url(self):
        """Test that verification email contains the correct URL"""
        with patch('snm.views.send_mail') as mock_send_mail:
            response = self.client.post(self.register_url, self.valid_user_data)
            
            user = User.objects.get(username='testuser')
            token = default_token_generator.make_token(user)
            expected_url = reverse('verify_email', args=[user.id, token])
            
            # Get the email message
            call_args = mock_send_mail.call_args
            email_message = call_args[0][1]
            
            # Check that the URL is in the email
            self.assertIn(str(user.id), email_message)
            self.assertIn(token, email_message)

    def test_successful_email_verification(self):
        """Test that email verification activates the user and logs them in"""
        # Create an inactive user
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            is_active=False
        )
        
        # Generate verification token
        token = default_token_generator.make_token(user)
        
        # Verify email
        verify_url = reverse('verify_email', args=[user.id, token])
        response = self.client.get(verify_url)
        
        # Check that user is now active
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        
        # Check that user is logged in
        self.assertTrue(response.wsgi_request.user.is_authenticated)
        self.assertEqual(response.wsgi_request.user, user)

    def test_invalid_token_verification(self):
        """Test that invalid tokens don't activate the user"""
        # Create an inactive user
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            is_active=False
        )
        
        # Use an invalid token
        invalid_token = 'invalid-token'
        verify_url = reverse('verify_email', args=[user.id, invalid_token])
        response = self.client.get(verify_url)
        
        # Check that user is still inactive
        user.refresh_from_db()
        self.assertFalse(user.is_active)
        
        # Check that user is not logged in
        self.assertFalse(response.wsgi_request.user.is_authenticated)

    def test_nonexistent_user_verification(self):
        """Test that verification with non-existent user ID fails gracefully"""
        # Use a non-existent user ID
        verify_url = reverse('verify_email', args=[99999, 'some-token'])
        response = self.client.get(verify_url)
        
        # Should redirect to homepage with error message
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse('homepage'))

    def test_email_sending_failure_handling(self):
        """Test that email sending failures are handled properly"""
        with patch('snm.views.send_mail', side_effect=Exception('Email sending failed')):
            response = self.client.post(self.register_url, self.valid_user_data)
            
            # Check that no user was created
            self.assertFalse(User.objects.filter(username='testuser').exists())

    def test_registration_form_validation(self):
        """Test that form validation works correctly"""
        # Test with invalid data (mismatched passwords)
        invalid_data = self.valid_user_data.copy()
        invalid_data['password2'] = 'differentpassword'
        
        response = self.client.post(self.register_url, invalid_data)
        
        # Check that no user was created
        self.assertFalse(User.objects.filter(username='testuser').exists())

    def test_duplicate_username_registration(self):
        """Test that duplicate usernames are rejected"""
        # Create a user first
        User.objects.create_user(
            username='testuser',
            email='existing@example.com',
            password='testpass123'
        )
        
        # Try to register with same username
        response = self.client.post(self.register_url, self.valid_user_data)
        
        # Check that no new user was created
        self.assertEqual(User.objects.filter(username='testuser').count(), 1)

    def test_duplicate_email_registration(self):
        """Test that duplicate emails are rejected"""
        # Create a user first
        User.objects.create_user(
            username='existinguser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Try to register with same email
        response = self.client.post(self.register_url, self.valid_user_data)
        
        # Check that no new user was created
        self.assertEqual(User.objects.filter(email='test@example.com').count(), 1)

    def test_token_expiration(self):
        """Test that expired tokens don't work"""
        # Create an inactive user
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            is_active=False
        )
        
        # Generate token
        token = default_token_generator.make_token(user)
        
        # Change user's password to invalidate the token
        user.set_password('newpassword')
        user.save()
        
        # Try to verify with old token
        verify_url = reverse('verify_email', args=[user.id, token])
        response = self.client.get(verify_url)
        
        # Check that user is still inactive
        user.refresh_from_db()
        self.assertFalse(user.is_active)

    def test_registration_success_message(self):
        """Test that success message is shown after registration"""
        with patch('django.core.mail.send_mail'):
            response = self.client.post(self.register_url, self.valid_user_data)
            
            # Check for success message
            messages = list(response.wsgi_request._messages)
            self.assertTrue(any('successful' in str(message) for message in messages))

    def test_verification_success_message(self):
        """Test that success message is shown after verification"""
        # Create an inactive user
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            is_active=False
        )
        
        # Generate verification token
        token = default_token_generator.make_token(user)
        
        # Verify email
        verify_url = reverse('verify_email', args=[user.id, token])
        response = self.client.get(verify_url)
        
        # Check for success message
        messages = list(response.wsgi_request._messages)
        self.assertTrue(any('verified' in str(message) for message in messages))

    def test_invalid_link_redirect(self):
        """Test that invalid verification links redirect to homepage with error"""
        # Create an inactive user
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            is_active=False
        )
        
        # Use an invalid token
        invalid_token = 'invalid-token'
        verify_url = reverse('verify_email', args=[user.id, invalid_token])
        response = self.client.get(verify_url)
        
        # Should redirect to homepage with error message
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse('homepage'))

    def test_registration_without_email(self):
        """Test that registration without email fails"""
        invalid_data = self.valid_user_data.copy()
        invalid_data['email'] = ''
        
        response = self.client.post(self.register_url, invalid_data)
        
        # Check that no user was created
        self.assertFalse(User.objects.filter(username='testuser').exists())

    def test_registration_with_invalid_email(self):
        """Test that registration with invalid email format fails"""
        invalid_data = self.valid_user_data.copy()
        invalid_data['email'] = 'invalid-email'
        
        response = self.client.post(self.register_url, invalid_data)
        
        # Check that no user was created
        self.assertFalse(User.objects.filter(username='testuser').exists())


class EmailValidationIntegrationTestCase(TestCase):
    """Integration tests for the complete email validation flow"""
    
    def setUp(self):
        self.client = Client()
        self.register_url = reverse('register')
        self.valid_user_data = {
            'username': 'integrationuser',
            'email': 'integration@example.com',
            'first_name': 'Integration',
            'last_name': 'User',
            'password1': 'testpass123',
            'password2': 'testpass123'
        }

    def test_complete_registration_and_verification_flow(self):
        """Test the complete flow from registration to verification"""
        # Step 1: Register user
        with patch('snm.views.send_mail') as mock_send_mail:
            response = self.client.post(self.register_url, self.valid_user_data)
            
            # Verify user was created but inactive
            user = User.objects.get(username='integrationuser')
            self.assertFalse(user.is_active)
            
            # Verify email was sent
            mock_send_mail.assert_called_once()
            
            # Extract token from email
            call_args = mock_send_mail.call_args
            email_message = call_args[0][1]
            
            # Generate the same token
            token = default_token_generator.make_token(user)
            
            # Step 2: Verify email
            verify_url = reverse('verify_email', args=[user.id, token])
            response = self.client.get(verify_url)
            
            # Verify user is now active and logged in
            user.refresh_from_db()
            self.assertTrue(user.is_active)
            self.assertTrue(response.wsgi_request.user.is_authenticated)
            self.assertEqual(response.wsgi_request.user, user)

    def test_multiple_registrations_same_email(self):
        """Test that multiple registrations with same email are handled correctly"""
        # First registration
        with patch('snm.views.send_mail'):
            response1 = self.client.post(self.register_url, self.valid_user_data)
            user1 = User.objects.get(username='integrationuser')
            self.assertFalse(user1.is_active)
        
        # Try second registration with same email
        second_user_data = self.valid_user_data.copy()
        second_user_data['username'] = 'integrationuser2'
        
        response2 = self.client.post(self.register_url, second_user_data)
        
        # Should only have one user with that email
        self.assertEqual(User.objects.filter(email='integration@example.com').count(), 1) 