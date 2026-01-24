"""Comprehensive tests for feedback/ticketing system"""
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
import uuid

from .models import FeedbackTicket, TicketComment, TicketStatusHistory
from .utils import generate_ticket_number, update_ticket_status, check_first_response


class FeedbackTicketModelTest(TestCase):
    """Test FeedbackTicket model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_ticket_creation(self):
        """Test creating a feedback ticket"""
        ticket = FeedbackTicket.objects.create(
            user=self.user,
            submitted_by_name='Test User',
            submitted_by_email='test@example.com',
            subject='Test Subject',
            message='This is a test message that is long enough',
            category='bug',
            priority='medium',
            status='new'
        )
        
        self.assertIsNotNone(ticket.ticket_number)
        self.assertTrue(ticket.ticket_number.startswith('TKT-'))
        self.assertEqual(ticket.subject, 'Test Subject')
        self.assertEqual(ticket.status, 'new')
        self.assertEqual(ticket.category, 'bug')
    
    def test_ticket_number_generation(self):
        """Test ticket number is auto-generated"""
        ticket1 = FeedbackTicket.objects.create(
            submitted_by_name='User 1',
            submitted_by_email='user1@example.com',
            subject='Test 1',
            message='Test message 1 that is long enough',
        )
        
        ticket2 = FeedbackTicket.objects.create(
            submitted_by_name='User 2',
            submitted_by_email='user2@example.com',
            subject='Test 2',
            message='Test message 2 that is long enough',
        )
        
        # Both should have ticket numbers
        self.assertIsNotNone(ticket1.ticket_number)
        self.assertIsNotNone(ticket2.ticket_number)
        
        # Should be different
        self.assertNotEqual(ticket1.ticket_number, ticket2.ticket_number)
        
        # Should follow format TKT-YYYYMMDD-XXXXX
        self.assertTrue(ticket1.ticket_number.startswith('TKT-'))
        self.assertEqual(len(ticket1.ticket_number.split('-')), 3)
    
    def test_ticket_with_related_objects(self):
        """Test ticket with related story/order"""
        from icvybz.models import Comic
        from snmov.models import Order
        from decimal import Decimal
        
        story = Comic.objects.create(
            user=self.user,
            title='Test Story',
            description='Test description'
        )
        
        order = Order.objects.create(
            customer=self.user,
            status='ORDERED'
        )
        
        ticket = FeedbackTicket.objects.create(
            user=self.user,
            submitted_by_name='Test User',
            submitted_by_email='test@example.com',
            subject='Test Subject',
            message='This is a test message that is long enough',
            related_story=story,
            related_order=order
        )
        
        self.assertEqual(ticket.related_story, story)
        self.assertEqual(ticket.related_order, order)
    
    def test_ticket_properties(self):
        """Test ticket properties"""
        ticket = FeedbackTicket.objects.create(
            submitted_by_name='Test User',
            submitted_by_email='test@example.com',
            subject='Test Subject',
            message='This is a test message that is long enough',
            status='new'
        )
        
        self.assertFalse(ticket.is_resolved)
        self.assertFalse(ticket.is_closed)
        
        ticket.status = 'resolved'
        ticket.save()
        self.assertTrue(ticket.is_resolved)
        self.assertFalse(ticket.is_closed)
        
        ticket.status = 'closed'
        ticket.save()
        self.assertTrue(ticket.is_resolved)
        self.assertTrue(ticket.is_closed)


class TicketCommentModelTest(TestCase):
    """Test TicketComment model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.ticket = FeedbackTicket.objects.create(
            user=self.user,
            submitted_by_name='Test User',
            submitted_by_email='test@example.com',
            subject='Test Subject',
            message='This is a test message that is long enough',
        )
    
    def test_comment_creation(self):
        """Test creating a comment"""
        comment = TicketComment.objects.create(
            ticket=self.ticket,
            author=self.user,
            content='This is a test comment',
            is_internal=False
        )
        
        self.assertEqual(comment.ticket, self.ticket)
        self.assertEqual(comment.author, self.user)
        self.assertFalse(comment.is_internal)
        self.assertIn(comment, self.ticket.comments.all())
    
    def test_internal_comment(self):
        """Test internal comment creation"""
        staff_user = User.objects.create_user(
            username='staff',
            email='staff@example.com',
            password='testpass123',
            is_staff=True
        )
        
        comment = TicketComment.objects.create(
            ticket=self.ticket,
            author=staff_user,
            content='Internal note',
            is_internal=True
        )
        
        self.assertTrue(comment.is_internal)
        self.assertEqual(comment.author, staff_user)


class TicketStatusHistoryTest(TestCase):
    """Test TicketStatusHistory model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.ticket = FeedbackTicket.objects.create(
            user=self.user,
            submitted_by_name='Test User',
            submitted_by_email='test@example.com',
            subject='Test Subject',
            message='This is a test message that is long enough',
            status='new'
        )
    
    def test_status_history_creation(self):
        """Test status history is created on status change"""
        history = TicketStatusHistory.objects.create(
            ticket=self.ticket,
            old_status='new',
            new_status='open',
            changed_by=self.user,
            notes='Status changed to open'
        )
        
        self.assertEqual(history.ticket, self.ticket)
        self.assertEqual(history.old_status, 'new')
        self.assertEqual(history.new_status, 'open')
        self.assertIn(history, self.ticket.status_history.all())


class TicketUtilsTest(TestCase):
    """Test utility functions"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.ticket = FeedbackTicket.objects.create(
            user=self.user,
            submitted_by_name='Test User',
            submitted_by_email='test@example.com',
            subject='Test Subject',
            message='This is a test message that is long enough',
            status='new'
        )
    
    def test_generate_ticket_number(self):
        """Test ticket number generation"""
        ticket_number = generate_ticket_number()
        self.assertTrue(ticket_number.startswith('TKT-'))
        self.assertEqual(len(ticket_number.split('-')), 3)
        
        # Create a ticket with this number to ensure next one is different
        FeedbackTicket.objects.create(
            submitted_by_name='Test',
            submitted_by_email='test@example.com',
            subject='Test',
            message='This is a test message that is long enough',
            ticket_number=ticket_number
        )
        
        # Generate another one on same day - should be sequential
        ticket_number2 = generate_ticket_number()
        self.assertTrue(ticket_number2.startswith('TKT-'))
        # Should be different (sequential)
        self.assertNotEqual(ticket_number, ticket_number2)
        
        # Extract sequence numbers
        seq1 = int(ticket_number.split('-')[-1])
        seq2 = int(ticket_number2.split('-')[-1])
        self.assertEqual(seq2, seq1 + 1)
    
    def test_update_ticket_status(self):
        """Test updating ticket status"""
        old_status = self.ticket.status
        
        updated_ticket = update_ticket_status(
            self.ticket,
            'open',
            self.user,
            'Changed to open'
        )
        
        self.assertEqual(updated_ticket.status, 'open')
        self.assertNotEqual(updated_ticket.status, old_status)
        
        # Check history was created
        history = TicketStatusHistory.objects.filter(ticket=self.ticket).latest('created_at')
        self.assertEqual(history.old_status, old_status)
        self.assertEqual(history.new_status, 'open')
        self.assertEqual(history.changed_by, self.user)
    
    def test_update_status_sets_timestamps(self):
        """Test that status updates set appropriate timestamps"""
        # Test resolved timestamp
        update_ticket_status(self.ticket, 'resolved', self.user)
        self.ticket.refresh_from_db()
        self.assertIsNotNone(self.ticket.resolved_at)
        
        # Test closed timestamp
        update_ticket_status(self.ticket, 'closed', self.user)
        self.ticket.refresh_from_db()
        self.assertIsNotNone(self.ticket.closed_at)
    
    def test_check_first_response(self):
        """Test first response timestamp setting"""
        staff_user = User.objects.create_user(
            username='staff',
            email='staff@example.com',
            password='testpass123',
            is_staff=True
        )
        
        comment = TicketComment.objects.create(
            ticket=self.ticket,
            author=staff_user,
            content='First response',
            is_staff_response=True,
            is_internal=False
        )
        
        check_first_response(self.ticket, comment)
        self.ticket.refresh_from_db()
        self.assertIsNotNone(self.ticket.first_response_at)


class FeedbackTicketAPITest(APITestCase):
    """Test API endpoints for feedback tickets"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.staff_user = User.objects.create_user(
            username='staff',
            email='staff@example.com',
            password='testpass123',
            is_staff=True
        )
    
    @patch('feedback.api_views.send_ticket_confirmation_email')
    def test_create_ticket_public(self, mock_email):
        """Test creating a ticket via public API"""
        mock_email.return_value = True
        
        data = {
            'submitted_by_name': 'Test User',
            'submitted_by_email': 'test@example.com',
            'subject': 'Test Subject',
            'message': 'This is a test message that is long enough to pass validation',
            'category': 'bug',
            'source': 'contact_form'
        }
        
        response = self.client.post('/api/feedback/api/tickets/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertIn('ticket_number', response.data)
        
        # Verify ticket was created
        ticket = FeedbackTicket.objects.get(ticket_number=response.data['ticket_number'])
        self.assertEqual(ticket.subject, 'Test Subject')
        self.assertEqual(ticket.status, 'new')
        
        # Verify email was sent
        mock_email.assert_called_once()
    
    @patch('feedback.api_views.send_ticket_confirmation_email')
    def test_create_ticket_authenticated(self, mock_email):
        """Test creating a ticket as authenticated user"""
        mock_email.return_value = True
        self.client.force_authenticate(user=self.user)
        
        data = {
            'submitted_by_name': 'Test User',
            'submitted_by_email': 'test@example.com',
            'subject': 'Test Subject',
            'message': 'This is a test message that is long enough to pass validation',
            'category': 'feature_request'
        }
        
        response = self.client.post('/api/feedback/api/tickets/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        ticket = FeedbackTicket.objects.get(ticket_number=response.data['ticket_number'])
        self.assertEqual(ticket.user, self.user)
    
    def test_get_ticket_by_number_authenticated(self):
        """Test getting ticket by number as authenticated user"""
        ticket = FeedbackTicket.objects.create(
            user=self.user,
            submitted_by_name='Test User',
            submitted_by_email='test@example.com',
            subject='Test Subject',
            message='This is a test message that is long enough',
        )
        
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/feedback/api/tickets/{ticket.ticket_number}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['ticket_number'], ticket.ticket_number)
    
    def test_get_ticket_by_number_email_access(self):
        """Test getting ticket by number with email verification"""
        ticket = FeedbackTicket.objects.create(
            submitted_by_name='Test User',
            submitted_by_email='test@example.com',
            subject='Test Subject',
            message='This is a test message that is long enough',
        )
        
        # Access with email
        response = self.client.get(
            f'/api/feedback/api/tickets/{ticket.ticket_number}/',
            {'email': 'test@example.com'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_get_ticket_by_number_no_access(self):
        """Test getting ticket without proper access"""
        ticket = FeedbackTicket.objects.create(
            submitted_by_name='Test User',
            submitted_by_email='test@example.com',
            subject='Test Subject',
            message='This is a test message that is long enough',
        )
        
        # Try to access without authentication or email
        response = self.client.get(f'/api/feedback/api/tickets/{ticket.ticket_number}/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_list_user_tickets(self):
        """Test listing tickets for authenticated user"""
        # Create tickets
        ticket1 = FeedbackTicket.objects.create(
            user=self.user,
            submitted_by_name='Test User',
            submitted_by_email='test@example.com',
            subject='Ticket 1',
            message='This is a test message that is long enough',
        )
        
        ticket2 = FeedbackTicket.objects.create(
            user=self.user,
            submitted_by_name='Test User',
            submitted_by_email='test@example.com',
            subject='Ticket 2',
            message='This is a test message that is long enough',
        )
        
        # Create ticket for different user (different email to avoid matching)
        other_user = User.objects.create_user(
            username='other',
            email='other@example.com',
            password='testpass123'
        )
        FeedbackTicket.objects.create(
            user=other_user,
            submitted_by_name='Other User',
            submitted_by_email='other@example.com',  # Different email
            subject='Other Ticket',
            message='This is a test message that is long enough',
        )
        
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/feedback/api/user/tickets/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # DRF may paginate results, so check for 'results' key
        if isinstance(response.data, dict) and 'results' in response.data:
            tickets = response.data['results']
        else:
            tickets = response.data
        
        # Should get tickets where user matches OR email matches
        # Since we're using Q(user=) | Q(submitted_by_email=), we might get more
        # Let's check that we get at least our 2 tickets
        self.assertGreaterEqual(len(tickets), 2)
        ticket_numbers = [t['ticket_number'] for t in tickets]
        self.assertIn(ticket1.ticket_number, ticket_numbers)
        self.assertIn(ticket2.ticket_number, ticket_numbers)
        # Should not get other user's ticket
        other_ticket = FeedbackTicket.objects.filter(submitted_by_email='other@example.com').first()
        if other_ticket:
            self.assertNotIn(other_ticket.ticket_number, ticket_numbers)
    
    def test_add_user_comment(self):
        """Test adding comment as user"""
        ticket = FeedbackTicket.objects.create(
            user=self.user,
            submitted_by_name='Test User',
            submitted_by_email='test@example.com',
            subject='Test Subject',
            message='This is a test message that is long enough',
        )
        
        self.client.force_authenticate(user=self.user)
        data = {'content': 'This is a user comment'}
        
        response = self.client.post(
            f'/api/feedback/api/user/tickets/{ticket.id}/comments/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ticket.comments.count(), 1)
        comment = ticket.comments.first()
        self.assertFalse(comment.is_internal)
        self.assertFalse(comment.is_staff_response)


class AdminAPITest(APITestCase):
    """Test admin API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.staff_user = User.objects.create_user(
            username='staff',
            email='staff@example.com',
            password='testpass123',
            is_staff=True,
            is_superuser=True
        )
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.ticket = FeedbackTicket.objects.create(
            user=self.user,
            submitted_by_name='Test User',
            submitted_by_email='test@example.com',
            subject='Test Subject',
            message='This is a test message that is long enough',
            status='new'
        )
    
    def test_admin_list_tickets(self):
        """Test admin can list all tickets"""
        self.client.force_authenticate(user=self.staff_user)
        response = self.client.get('/api/feedback/api/admin/tickets/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
    
    def test_admin_filter_tickets(self):
        """Test admin can filter tickets"""
        # Create tickets with different statuses
        open_ticket = FeedbackTicket.objects.create(
            user=self.user,
            submitted_by_name='Test User',
            submitted_by_email='test@example.com',
            subject='Open Ticket',
            message='This is a test message that is long enough',
            status='open'
        )
        
        FeedbackTicket.objects.create(
            user=self.user,
            submitted_by_name='Test User',
            submitted_by_email='test@example.com',
            subject='New Ticket',
            message='This is a test message that is long enough',
            status='new'
        )
        
        self.client.force_authenticate(user=self.staff_user)
        response = self.client.get('/api/feedback/api/admin/tickets/?status=open')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # DRF may paginate results, so check for 'results' key
        if isinstance(response.data, dict) and 'results' in response.data:
            tickets = response.data['results']
        else:
            tickets = response.data
        
        self.assertGreater(len(tickets), 0)
        # Check that all returned tickets have status 'open'
        for ticket in tickets:
            self.assertEqual(ticket['status'], 'open')
        # Verify our open ticket is in the results
        ticket_numbers = [t['ticket_number'] for t in tickets]
        self.assertIn(open_ticket.ticket_number, ticket_numbers)
    
    def test_admin_assign_ticket(self):
        """Test admin can assign ticket"""
        self.client.force_authenticate(user=self.staff_user)
        data = {'assigned_to': self.staff_user.id}
        
        response = self.client.post(
            f'/api/feedback/api/admin/tickets/{self.ticket.id}/assign/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.assigned_to, self.staff_user)
    
    @patch('feedback.api_views.send_ticket_resolution_email')
    def test_admin_resolve_ticket(self, mock_email):
        """Test admin can resolve ticket"""
        mock_email.return_value = True
        self.client.force_authenticate(user=self.staff_user)
        data = {'resolution_notes': 'This issue has been resolved'}
        
        response = self.client.post(
            f'/api/feedback/api/admin/tickets/{self.ticket.id}/resolve/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, 'resolved')
        self.assertEqual(self.ticket.resolution_notes, 'This issue has been resolved')
        self.assertIsNotNone(self.ticket.resolved_at)
        mock_email.assert_called_once()
    
    def test_admin_add_internal_comment(self):
        """Test admin can add internal comment"""
        self.client.force_authenticate(user=self.staff_user)
        data = {
            'content': 'Internal note',
            'is_internal': True,
            'is_staff_response': False
        }
        
        response = self.client.post(
            f'/api/feedback/api/admin/tickets/{self.ticket.id}/comments/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        comment = self.ticket.comments.first()
        self.assertTrue(comment.is_internal)
    
    def test_admin_add_public_comment(self):
        """Test admin can add public comment"""
        self.client.force_authenticate(user=self.staff_user)
        data = {
            'content': 'Public response',
            'is_internal': False,
            'is_staff_response': True
        }
        
        response = self.client.post(
            f'/api/feedback/api/admin/tickets/{self.ticket.id}/comments/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        comment = self.ticket.comments.first()
        self.assertFalse(comment.is_internal)
        self.assertTrue(comment.is_staff_response)
        # Should set first_response_at
        self.ticket.refresh_from_db()
        self.assertIsNotNone(self.ticket.first_response_at)
    
    def test_non_staff_cannot_access_admin_endpoints(self):
        """Test non-staff users cannot access admin endpoints"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/feedback/api/admin/tickets/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class TicketNumberGeneratorTest(TestCase):
    """Test ticket number generation"""
    
    def test_sequential_ticket_numbers(self):
        """Test ticket numbers are sequential per day"""
        # Create multiple tickets
        tickets = []
        for i in range(5):
            ticket = FeedbackTicket.objects.create(
                submitted_by_name=f'User {i}',
                submitted_by_email=f'user{i}@example.com',
                subject=f'Test {i}',
                message='This is a test message that is long enough',
            )
            tickets.append(ticket)
        
        # All should have unique ticket numbers
        ticket_numbers = [t.ticket_number for t in tickets]
        self.assertEqual(len(ticket_numbers), len(set(ticket_numbers)))
        
        # All should start with same date prefix
        prefixes = [tn.split('-')[0] + '-' + tn.split('-')[1] for tn in ticket_numbers]
        self.assertEqual(len(set(prefixes)), 1)  # All same date prefix
        
        # Sequence numbers should be different
        sequences = [int(tn.split('-')[2]) for tn in ticket_numbers]
        self.assertEqual(len(sequences), len(set(sequences)))
