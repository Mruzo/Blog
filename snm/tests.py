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
from snmov.models import Article, Comment, ReachOut
from tilf.models import Comic, Season, Episode


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


class ContactFormEmailVerificationTests(TestCase):
    """Test contact form email verification functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.client = Client()
        self.contact_data = {
            'full_name': 'Test Contact',
            'email': 'test@example.com',
            'subject': 'Test Subject',
            'content': 'This is a test contact message'
        }
    
    @patch('snm.views.send_mail')
    def test_contact_form_submission_sends_verification_email(self, mock_send_mail):
        """Test that contact form submission sends verification email"""
        mock_send_mail.return_value = 1
        
        response = self.client.post('/reachout/', self.contact_data)
        
        # Check that verification email was sent
        mock_send_mail.assert_called_once()
        
        # Check email content
        call_args = mock_send_mail.call_args
        self.assertEqual(call_args[0][0], 'Verify Your Contact Form Submission')  # subject
        self.assertEqual(call_args[0][3], ['test@example.com'])  # recipient
        self.assertIn('verify your email address', call_args[0][1])  # message contains verification text
    
    def test_contact_form_creates_unverified_record(self):
        """Test that contact form creates unverified record"""
        with patch('snm.views.send_mail') as mock_send_mail:
            mock_send_mail.return_value = 1
            
            response = self.client.post('/reachout/', self.contact_data)
            
            # Check that contact record was created but not verified
            from snmov.models import ReachOut
            contact = ReachOut.objects.get(email='test@example.com')
            self.assertFalse(contact.is_verified)
            self.assertIsNotNone(contact.verification_token)
    
    def test_contact_email_verification_activates_record(self):
        """Test that email verification activates the contact record"""
        # Create a contact record
        from snmov.models import ReachOut
        contact = ReachOut.objects.create(
            full_name='Test Contact',
            email='test@example.com',
            subject='Test Subject',
            content='Test message',
            is_verified=False,
            verification_token='test-token-123'
        )
        
        # Create a temporary user for token generation
        user = User.objects.create_user(
            username='contact_test@example.com',
            email='test@example.com',
            password='temp123'
        )
        
        # Generate valid token
        token = default_token_generator.make_token(user)
        contact.verification_token = token
        contact.save()
        
        # Verify the contact email
        verify_url = reverse('verify_contact_email', args=[contact.id, token])
        response = self.client.get(verify_url)
        
        # Check that contact is now verified
        contact.refresh_from_db()
        self.assertTrue(contact.is_verified)
    
    def test_invalid_contact_verification_token(self):
        """Test that invalid tokens don't activate contact records"""
        # Create a contact record
        from snmov.models import ReachOut
        contact = ReachOut.objects.create(
            full_name='Test Contact',
            email='test@example.com',
            subject='Test Subject',
            content='Test message',
            is_verified=False,
            verification_token='valid-token-123'
        )
        
        # Try to verify with invalid token (different from stored token)
        verify_url = reverse('verify_contact_email', args=[contact.id, 'invalid-token'])
        response = self.client.get(verify_url)
        
        # Check that contact is still unverified
        contact.refresh_from_db()
        self.assertFalse(contact.is_verified) 


class DataDeletionTests(TestCase):
    """Test data deletion functionality for GDPR compliance"""
    
    def setUp(self):
        """Set up test data"""
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        # Create article for comments
        self.article = Article.objects.create(
            title='Test Article',
            slug='test-article',
            content='Test content'
        )
        
        # Create contact form submission
        self.contact = ReachOut.objects.create(
            full_name='Test Contact',
            email='test@example.com',
            subject='Test Subject',
            content='Test message'
        )
        
        # Create comment
        self.comment = Comment.objects.create(
            comment_cont='Test comment',
            user_name=self.user,
            comment_post=self.article
        )
    
    def test_delete_user_data_removes_all_user_data(self):
        """Test that delete_user_data removes all user-related data"""
        # Login as the user
        self.client.force_login(self.user)
        
        # Delete user data
        response = self.client.get(reverse('delete_user_data', args=[self.user.id]))
        
        # Check that user is deleted
        self.assertFalse(User.objects.filter(id=self.user.id).exists())
        
        # Check that contact form submission is deleted
        self.assertFalse(ReachOut.objects.filter(email='test@example.com').exists())
        
        # Check that comment is deleted
        self.assertFalse(Comment.objects.filter(user_name=self.user).exists())
        
        # Check redirect
        self.assertEqual(response.status_code, 302)
    
    def test_data_access_request_returns_user_data(self):
        """Test that data_access_request returns all user data"""
        # Login as the user
        self.client.force_login(self.user)
        
        # Request user data
        response = self.client.get(reverse('data_access_request', args=[self.user.id]))
        
        # Check response
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Check user info
        self.assertEqual(data['user_info']['username'], 'testuser')
        self.assertEqual(data['user_info']['email'], 'test@example.com')
        
        # Check comments
        self.assertEqual(len(data['comments']), 1)
        self.assertEqual(data['comments'][0]['comment_cont'], 'Test comment')
        
        # Check contact submissions
        self.assertEqual(len(data['contact_submissions']), 1)
        self.assertEqual(data['contact_submissions'][0]['full_name'], 'Test Contact')
    
    def test_delete_nonexistent_user_handled_gracefully(self):
        """Test that deleting nonexistent user doesn't crash"""
        response = self.client.get(reverse('delete_user_data', args=[99999]))
        
        # Should redirect with error message
        self.assertEqual(response.status_code, 302)
    
    def test_analytics_deletion_command(self):
        """Test the analytics deletion management command"""
        from django.core.management import call_command
        from django.test import override_settings
        
        # Create test analytics data
        import json
        from pathlib import Path
        
        logs_dir = Path('tilf/logs')
        logs_dir.mkdir(exist_ok=True)
        
        test_data = [
            {'ip_address': '192.168.1.1', 'timestamp': '2025-01-01T00:00:00'},
            {'ip_address': '192.168.1.2', 'timestamp': '2025-01-01T00:00:00'},
            {'ip_address': '192.168.1.1', 'timestamp': '2025-01-01T00:00:00'}
        ]
        
        # Write test data
        with open(logs_dir / 'traffic_sources_development.json', 'w') as f:
            for entry in test_data:
                f.write(json.dumps(entry) + '\n')
        
        # Run deletion command
        call_command('delete_analytics_by_ip', '192.168.1.1', '--environment=development')
        
        # Check that only entries with IP 192.168.1.1 were deleted
        with open(logs_dir / 'traffic_sources_development.json', 'r') as f:
            remaining_data = [json.loads(line) for line in f if line.strip()]
        
        # Should only have one entry left (IP 192.168.1.2)
        self.assertEqual(len(remaining_data), 1)
        self.assertEqual(remaining_data[0]['ip_address'], '192.168.1.2')
        
        # Clean up
        (logs_dir / 'traffic_sources_development.json').unlink() 


class CommentModelTests(TestCase):
    """Test Comment model methods"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.article = Article.objects.create(
            title='Test Article',
            slug='test-article',
            content='Test content'
        )
    
    def test_get_email_with_user(self):
        """Test get_email method when user_name exists"""
        comment = Comment.objects.create(
            comment_cont='Test comment',
            user_name=self.user,
            comment_post=self.article
        )
        
        self.assertEqual(comment.get_email(), 'test@example.com')
    
    def test_get_email_without_user(self):
        """Test get_email method when user_name is None"""
        comment = Comment.objects.create(
            comment_cont='Test comment',
            user_name=None,
            comment_post=self.article
        )
        
        self.assertEqual(comment.get_email(), 'No User') 