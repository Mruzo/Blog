from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.urls import reverse
from django.contrib.messages.storage.fallback import FallbackStorage
from django.contrib.messages import Message
from django.template.loader import render_to_string
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


class NavbarLayoutTest(TestCase):
    """Test navbar layout to ensure logo and login stay on same row with message between them."""
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_navbar_structure_with_messages(self):
        """Test that navbar has correct structure with messages."""
        # Test with a message - use a simpler approach
        context = {'messages': ['Test message']}
        
        # Get the rendered navbar
        navbar_html = render_to_string('navbar.html', context)
        
        # Check that the main flex container exists
        self.assertIn('d-flex align-items-center justify-content-between w-100', navbar_html)
        
        # Check that logo is present and positioned correctly
        self.assertIn('navbar-brand d-flex align-items-center me-3', navbar_html)
        self.assertIn('id="logo"', navbar_html)
        
        # Check that message container has correct classes
        self.assertIn('flex-grow-1 text-center', navbar_html)
        self.assertIn('id="message-container"', navbar_html)
        
        # Check that login/logout is present and positioned correctly
        self.assertIn('ms-3', navbar_html)
        self.assertIn('nav-link d-flex flex-column align-items-center', navbar_html)
    
    def test_navbar_without_messages(self):
        """Test navbar structure when no messages are present."""
        response = self.client.get('/')
        
        # Render navbar without messages
        navbar_html = render_to_string('navbar.html', {'messages': []})
        
        # Should still have the same structure
        self.assertIn('d-flex align-items-center justify-content-between w-100', navbar_html)
        self.assertIn('navbar-brand d-flex align-items-center me-3', navbar_html)
        self.assertIn('flex-grow-1 text-center', navbar_html)
        self.assertIn('ms-3', navbar_html)
    
    def test_navbar_logged_in_user(self):
        """Test navbar structure for logged-in user."""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get('/')
        
        # Create context with user
        context = {'messages': [], 'user': self.user}
        
        navbar_html = render_to_string('navbar.html', context)
        
        # Should show logout instead of login
        self.assertIn('logout', navbar_html)
        self.assertIn('Lock Icon', navbar_html)  # Lock icon for logged in user
    
    def test_navbar_logged_out_user(self):
        """Test navbar structure for logged-out user."""
        response = self.client.get('/')
        
        # Create context
        context = {'messages': []}
        
        navbar_html = render_to_string('navbar.html', context)
        
        # Should show login
        self.assertIn('login', navbar_html)
        self.assertIn('Unlock Icon', navbar_html)  # Unlock icon for logged out user
    
    def test_message_container_auto_hide(self):
        """Test that message container has auto-hide JavaScript."""
        response = self.client.get('/')
        context = {'messages': []}
        navbar_html = render_to_string('navbar.html', context)
        
        # Check for the auto-hide script
        self.assertIn('setTimeout(function()', navbar_html)
        self.assertIn('message-container', navbar_html)
        self.assertIn('style.display = \'none\'', navbar_html)
        self.assertIn('5000', navbar_html)  # 5 second timeout
    
    def test_navbar_responsive_classes(self):
        """Test that navbar has proper responsive Bootstrap classes."""
        response = self.client.get('/')
        context = {'messages': []}
        navbar_html = render_to_string('navbar.html', context)
        
        # Check for responsive navbar classes
        self.assertIn('navbar-expand-lg', navbar_html)
        self.assertIn('navbar-dark', navbar_html)
        self.assertIn('d-flex', navbar_html)
        self.assertIn('align-items-center', navbar_html)
    
    def test_navbar_logo_link(self):
        """Test that logo links to homepage."""
        response = self.client.get('/')
        context = {'messages': []}
        navbar_html = render_to_string('navbar.html', context)
        
        # Check logo link
        self.assertIn('<a class="navbar-brand', navbar_html)
        self.assertIn('href="/"', navbar_html)
    
    def test_navbar_login_logout_links(self):
        """Test that login/logout links are correct."""
        # Test logged out user
        response = self.client.get('/')
        context = {'messages': []}
        navbar_html = render_to_string('navbar.html', context)
        
        # Should link to login with next parameter
        self.assertIn('href="/login?next=', navbar_html)
        
        # Test logged in user
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get('/')
        context = {'messages': [], 'user': self.user}
        navbar_html = render_to_string('navbar.html', context)
        
        # Should link to logout
        self.assertIn('href="/logout"', navbar_html)
    
    def test_navbar_message_styling(self):
        """Test that message container has correct styling."""
        response = self.client.get('/')
        context = {'messages': []}
        navbar_html = render_to_string('navbar.html', context)
        
        # Check for message styling
        self.assertIn('color: #f9a602', navbar_html)
        self.assertIn('min-width: 0', navbar_html)
        self.assertIn('text-muted', navbar_html) 