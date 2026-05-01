"""Integration tests for feedback system with contact form"""
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock

from feedback.models import FeedbackTicket
from snmov.models import ReachOut


class ContactFormIntegrationTest(APITestCase):
    """Test contact form integration with feedback system"""
    
    def setUp(self):
        self.client = APIClient()
    
    @patch('feedback.email_notifications.send_ticket_confirmation_email')
    @patch('snmov.utils.email_notifications.send_feedback_confirmation')
    def test_contact_form_creates_reachout_not_ticket(self, mock_feedback_email, mock_ticket_email):
        """Contact page (/contact/) creates ReachOut but not FeedbackTicket."""
        from django.core.cache import cache
        
        cache.clear()
        
        mock_ticket_email.return_value = True
        mock_feedback_email.return_value = True
        
        data = {
            'full_name': 'Test User',
            'email': 'test@example.com',
            'subject': 'Test Subject',
            'content': 'This is a test message that is long enough',
            'source': 'contact_form',
        }
        
        response = self.client.post('/api/contact/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        
        reach_out = ReachOut.objects.filter(email='test@example.com').first()
        self.assertIsNotNone(reach_out)
        
        ticket = FeedbackTicket.objects.filter(submitted_by_email='test@example.com').first()
        self.assertIsNone(ticket)
        self.assertNotIn('ticket_number', response.data)
        
        mock_ticket_email.assert_not_called()
        mock_feedback_email.assert_called_once()
    
    @patch('feedback.email_notifications.send_ticket_confirmation_email')
    @patch('snmov.utils.email_notifications.send_feedback_confirmation')
    def test_feedback_modal_creates_ticket(self, mock_feedback_email, mock_ticket_email):
        """Floating feedback (source=feedback_modal) creates ReachOut and FeedbackTicket."""
        from django.core.cache import cache
        
        cache.clear()
        
        mock_ticket_email.return_value = True
        mock_feedback_email.return_value = True
        
        data = {
            'full_name': 'Test User',
            'email': 'modal@example.com',
            'subject': 'Test Subject',
            'content': 'This is a test message that is long enough',
            'source': 'feedback_modal',
            '_form_time': '5',
        }
        
        response = self.client.post('/api/contact/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertIn('ticket_number', response.data)
        
        ticket = FeedbackTicket.objects.filter(submitted_by_email='modal@example.com').first()
        self.assertIsNotNone(ticket)
        self.assertEqual(ticket.subject, 'Test Subject')
        self.assertEqual(ticket.source, 'feedback_modal')
        
        mock_ticket_email.assert_called_once()
        mock_feedback_email.assert_called_once()
    
    @patch('feedback.email_notifications.send_ticket_confirmation_email')
    def test_contact_form_category_inference(self, mock_email):
        """Test that category is inferred from subject"""
        from django.core.cache import cache
        cache.clear()
        mock_email.return_value = True
        
        # Test bug category
        data = {
            'full_name': 'Test User',
            'email': 'test@example.com',
            'subject': 'Bug in the system',
            'content': 'This is a test message that is long enough',
            'source': 'feedback_modal',
            '_form_time': '5'
        }
        
        response = self.client.post('/api/contact/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        ticket = FeedbackTicket.objects.filter(submitted_by_email='test@example.com').first()
        self.assertEqual(ticket.category, 'bug')
        
        # Test feature request category
        data['subject'] = 'Feature suggestion'
        data['email'] = 'test2@example.com'
        cache.clear()
        response = self.client.post('/api/contact/', data, format='json')
        ticket = FeedbackTicket.objects.filter(submitted_by_email='test2@example.com').first()
        self.assertEqual(ticket.category, 'feature_request')
    
    @patch('feedback.email_notifications.send_ticket_confirmation_email')
    def test_contact_form_authenticated_user(self, mock_email):
        """Test contact form with authenticated user"""
        mock_email.return_value = True
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=user)
        
        data = {
            'full_name': 'Test User',
            'email': 'test@example.com',
            'subject': 'Test Subject',
            'content': 'This is a test message that is long enough',
            'source': 'feedback_modal',
            '_form_time': '5'
        }
        
        from django.core.cache import cache
        cache.clear()
        response = self.client.post('/api/contact/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        ticket = FeedbackTicket.objects.filter(submitted_by_email='test@example.com').first()
        self.assertEqual(ticket.user, user)
    
    def test_contact_form_rate_limiting(self):
        """Test that rate limiting still works"""
        from django.core.cache import cache
        
        data = {
            'full_name': 'Test User',
            'email': 'test@example.com',
            'subject': 'Test Subject',
            'content': 'This is a test message that is long enough',
            '_form_time': '5'
        }
        
        # Clear cache first
        cache.clear()
        
        # Make 3 requests (should succeed)
        for i in range(3):
            response = self.client.post('/api/contact/', data, format='json')
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # 4th request should be rate limited
        response = self.client.post('/api/contact/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
    
    @patch('feedback.email_notifications.send_ticket_confirmation_email')
    def test_feedback_modal_ticket_email_failure_still_succeeds(self, mock_email):
        """Ticket confirmation email failure does not fail the request."""
        from django.core.cache import cache
        cache.clear()
        mock_email.side_effect = Exception("Email service down")
        
        data = {
            'full_name': 'Test User',
            'email': 'test@example.com',
            'subject': 'Test Subject',
            'content': 'This is a test message that is long enough',
            'source': 'feedback_modal',
            '_form_time': '5'
        }
        
        response = self.client.post('/api/contact/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertIn('ticket_number', response.data)
        self.assertIsNotNone(ReachOut.objects.filter(email='test@example.com').first())
        self.assertIsNotNone(FeedbackTicket.objects.filter(submitted_by_email='test@example.com').first())
