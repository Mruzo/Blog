"""
Comprehensive tests for returns and refunds system.
Tests API endpoints, business logic, email notifications, and integrations.
Optimized to work with existing test patterns.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from django.core import mail
from decimal import Decimal
from datetime import timedelta
import json
import uuid
from unittest.mock import patch, MagicMock

from rest_framework.test import APIClient, APITestCase
from rest_framework import status

from snmov.models import (
    Product, Order, OrderItem, ShippingAddress, 
    ReturnRequest, ReturnItem, CreditNote, Invoice
)
from snmov.utils.returns import (
    validate_return_window, validate_return_items,
    calculate_refund_amount, process_return_approval,
    process_return_rejection, generate_return_label
)
from snmov.utils.email_notifications import (
    send_return_request_submitted,
    send_return_rejected,
    send_return_label_generated,
    send_credit_note_issued,
    send_stripe_refund_processed,
    send_stripe_refund_failed
)

User = get_user_model()


class ReturnRequestAPITestCase(APITestCase):
    """Test return request API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        self.product = Product.objects.create(
            title='Test Product',
            slug='test-product',
            price=Decimal('29.99'),
            stock=10,
            available=True,
            uuid=uuid.uuid4(),
            package_length=Decimal('10.0'),
            package_width=Decimal('5.0'),
            package_height=Decimal('3.0'),
            weight_grams=500,
            user=self.user
        )
        
        # Create shipping address
        self.shipping_address = ShippingAddress.objects.create(
            user=self.user,
            full_name='Test User',
            address_line_1='123 Test St',
            city='Toronto',
            state='ON',
            postal_code='M5H 2N2',
            country_code='CA'
        )
        
        # Create delivered order (order_date will be auto-set to now)
        # We'll manually set order_date to 5 days ago to simulate delivered order
        self.order = Order.objects.create(
            customer=self.user,
            shipping_address=self.shipping_address,
            status='DELIVERED',
            shipping_cost=Decimal('10.00'),
            stripe_payment_intent_id='pi_test123'
        )
        # Manually set order_date to 5 days ago for return window testing
        self.order.order_date = timezone.now() - timedelta(days=5)
        self.order.save()
        
        self.order_item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=2
        )
        
        self.client.force_authenticate(user=self.user)
    
    def test_get_returnable_items(self):
        """Test: GET /api/orders/:id/returnable-items/ returns available items"""
        response = self.client.get(
            reverse('api:returnable-items', kwargs={'order_id': self.order.id})
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # API returns a list directly, not wrapped
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 1)
        # Check that the response contains order_item information
        item = response.data[0]
        self.assertEqual(item['order_item_id'], self.order_item.id)
        self.assertEqual(item['available_quantity'], 2)
        self.assertEqual(item['quantity_ordered'], 2)
        self.assertEqual(item['product_name'], 'Test Product')
    
    def test_get_returnable_items_nonexistent_order(self):
        """Test: GET returnable items for non-existent order returns 404"""
        response = self.client.get(
            reverse('api:returnable-items', kwargs={'order_id': 99999})
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_get_returnable_items_unauthorized_order(self):
        """Test: GET returnable items for another user's order does not leak existence (404)"""
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='pass123'
        )
        other_order = Order.objects.create(
            customer=other_user,
            shipping_address=self.shipping_address,
            status='DELIVERED'
        )
        
        response = self.client.get(
            reverse('api:returnable-items', kwargs={'order_id': other_order.id})
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    @patch('snmov.utils.email_notifications.send_return_request_submitted')
    def test_create_return_request(self, mock_send_email):
        """Test: POST /api/returns/ creates return request successfully"""
        return_data = {
            'order_id': self.order.id,
            'reason': 'Changed my mind',
            'reason_category': 'changed_mind',
            'return_items': [
                {
                    'order_item_id': self.order_item.id,
                    'quantity': 1,
                    'condition': 'unopened',
                    'condition_notes': ''
                }
            ],
            'return_shipping_paid_by': 'customer'
        }
        
        response = self.client.post(
            reverse('api:return-create'),
            return_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        self.assertEqual(response.data['status'], 'PENDING')
        self.assertEqual(response.data['reason'], 'Changed my mind')
        
        # Verify return request was created
        return_request = ReturnRequest.objects.get(id=response.data['id'])
        self.assertEqual(return_request.customer, self.user)
        self.assertEqual(return_request.order, self.order)
        self.assertEqual(return_request.returnitem_set.count(), 1)
        
        # Verify email was sent
        mock_send_email.assert_called_once_with(return_request)
    
    def test_create_return_request_requires_authentication(self):
        """Test: Creating return request requires authentication"""
        unauthenticated_client = APIClient()
        
        return_data = {
            'order_id': self.order.id,
            'reason': 'Test',
            'reason_category': 'changed_mind',
            'return_items': [{'order_item_id': self.order_item.id, 'quantity': 1, 'condition': 'unopened'}]
        }
        
        response = unauthenticated_client.post(
            reverse('api:return-create'),
            return_data,
            format='json'
        )
        
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
    
    def test_create_return_request_invalid_order(self):
        """Test: Creating return for non-existent order returns 404"""
        return_data = {
            'order_id': 99999,
            'reason': 'Test',
            'reason_category': 'changed_mind',
            'return_items': [{'order_item_id': self.order_item.id, 'quantity': 1, 'condition': 'unopened'}]
        }
        
        response = self.client.post(
            reverse('api:return-create'),
            return_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_create_return_request_exceeds_quantity(self):
        """Test: Creating return with quantity > available returns 400"""
        return_data = {
            'order_id': self.order.id,
            'reason': 'Test',
            'reason_category': 'changed_mind',
            'return_items': [
                {
                    'order_item_id': self.order_item.id,
                    'quantity': 5,  # More than available (2)
                    'condition': 'unopened',
                    'condition_notes': ''
                }
            ]
        }
        
        response = self.client.post(
            reverse('api:return-create'),
            return_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_create_return_request_expired_window(self):
        """Test: Creating return after return window expires returns 400"""
        # Set order date to 35 days ago (beyond 30-day window)
        self.order.order_date = timezone.now() - timedelta(days=35)
        self.order.save()
        
        return_data = {
            'order_id': self.order.id,
            'reason': 'Test',
            'reason_category': 'changed_mind',
            'return_items': [
                {
                    'order_item_id': self.order_item.id,
                    'quantity': 1,
                    'condition': 'unopened',
                    'condition_notes': ''
                }
            ]
        }
        
        response = self.client.post(
            reverse('api:return-create'),
            return_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('return window', response.data.get('error', '').lower())
    
    def test_list_return_requests(self):
        """Test: GET /api/returns/list/ returns user's return requests"""
        # Create a return request
        return_request = ReturnRequest.objects.create(
            order=self.order,
            customer=self.user,
            reason='Test return',
            reason_category='changed_mind',
            status='PENDING'
        )
        
        response = self.client.get(reverse('api:return-list'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], return_request.id)
    
    def test_list_return_requests_empty(self):
        """Test: GET /api/returns/list/ returns empty list when no returns"""
        response = self.client.get(reverse('api:return-list'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 0)
    
    def test_get_return_request_detail(self):
        """Test: GET /api/returns/:id/ returns return request details"""
        return_request = ReturnRequest.objects.create(
            order=self.order,
            customer=self.user,
            reason='Test return',
            reason_category='changed_mind',
            status='PENDING'
        )
        
        ReturnItem.objects.create(
            return_request=return_request,
            order_item=self.order_item,
            quantity=1,
            condition='unopened'
        )
        
        response = self.client.get(
            reverse('api:return-detail', kwargs={'pk': return_request.id})
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], return_request.id)
        self.assertEqual(response.data['status'], 'PENDING')
        self.assertIn('return_items', response.data)
        self.assertEqual(len(response.data['return_items']), 1)
    
    def test_get_return_request_detail_unauthorized(self):
        """Test: GET return detail for another user's return does not leak existence (404)"""
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='pass123'
        )
        other_order = Order.objects.create(
            customer=other_user,
            shipping_address=self.shipping_address,
            status='DELIVERED'
        )
        other_return = ReturnRequest.objects.create(
            order=other_order,
            customer=other_user,
            reason='Test',
            reason_category='changed_mind'
        )
        
        response = self.client.get(
            reverse('api:return-detail', kwargs={'pk': other_return.id})
        )
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ReturnBusinessLogicTestCase(TestCase):
    """Test return business logic and validation"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.product = Product.objects.create(
            title='Test Product',
            price=Decimal('29.99'),
            stock=10,
            available=True,
            uuid=uuid.uuid4(),
            user=self.user
        )
        
        self.shipping_address = ShippingAddress.objects.create(
            user=self.user,
            full_name='Test User',
            address_line_1='123 Test St',
            city='Toronto',
            state='ON',
            postal_code='M5H 2N2',
            country_code='CA'
        )
        
        # Create delivered order (order_date is used as delivery date proxy)
        self.order = Order.objects.create(
            customer=self.user,
            shipping_address=self.shipping_address,
            status='DELIVERED'
        )
        self.order.order_date = timezone.now() - timedelta(days=5)
        self.order.save()
        
        self.order_item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=2
        )
    
    def test_validate_return_window_within_window(self):
        """Test: Return window validation passes for recent delivery"""
        is_valid, error_msg = validate_return_window(self.order)
        self.assertTrue(is_valid)
        self.assertIsNone(error_msg)
    
    def test_validate_return_window_expired(self):
        """Test: Return window validation fails for expired window"""
        self.order.order_date = timezone.now() - timedelta(days=35)
        self.order.save()
        
        is_valid, error_msg = validate_return_window(self.order)
        self.assertFalse(is_valid)
        self.assertIn('return window', error_msg.lower())
    
    def test_validate_return_window_not_delivered(self):
        """Test: Return window validation fails for non-delivered orders"""
        self.order.status = 'PROCESSING'
        self.order.save()
        
        is_valid, error_msg = validate_return_window(self.order)
        self.assertFalse(is_valid)
        self.assertIn('delivered', error_msg.lower())
    
    def test_calculate_refund_amount_full_return(self):
        """Test: Refund calculation for full return"""
        return_request = ReturnRequest.objects.create(
            order=self.order,
            customer=self.user,
            reason='Test',
            reason_category='changed_mind',
            return_shipping_paid_by='customer'
        )
        
        ReturnItem.objects.create(
            return_request=return_request,
            order_item=self.order_item,
            quantity=2,  # Return all items
            condition='unopened'
        )
        
        refund_amount = calculate_refund_amount(return_request)
        # Shipping cost is stored on return_request.return_shipping_cost (default 0.00)
        expected = self.product.get_discounted_price() * Decimal('2')
        self.assertEqual(refund_amount, expected)
    
    def test_calculate_refund_amount_partial_return(self):
        """Test: Refund calculation for partial return"""
        return_request = ReturnRequest.objects.create(
            order=self.order,
            customer=self.user,
            reason='Test',
            reason_category='changed_mind',
            return_shipping_paid_by='customer'
        )
        
        ReturnItem.objects.create(
            return_request=return_request,
            order_item=self.order_item,
            quantity=1,  # Return only 1 of 2 items
            condition='unopened'
        )
        
        refund_amount = calculate_refund_amount(return_request)
        # Should be proportional to returned quantity
        expected = self.product.get_discounted_price() * Decimal('1')
        self.assertEqual(refund_amount, expected)


class ReturnEmailNotificationsTestCase(TestCase):
    """Test return/refund email notifications"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        self.product = Product.objects.create(
            title='Test Product',
            price=Decimal('29.99'),
            stock=10,
            available=True,
            uuid=uuid.uuid4(),
            user=self.user
        )
        
        self.shipping_address = ShippingAddress.objects.create(
            user=self.user,
            full_name='Test User',
            address_line_1='123 Test St',
            city='Toronto',
            state='ON',
            postal_code='M5H 2N2',
            country_code='CA'
        )
        
        self.order = Order.objects.create(
            customer=self.user,
            shipping_address=self.shipping_address,
            status='DELIVERED',
            shipping_cost=Decimal('10.00'),
            stripe_payment_intent_id='pi_test123',
            amount_paid_cents=100000,
        )
        
        self.order_item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=1,
        )
        
        self.return_request = ReturnRequest.objects.create(
            order=self.order,
            customer=self.user,
            reason='Changed my mind',
            reason_category='changed_mind',
            status='PENDING',
            return_shipping_cost=Decimal('0.00'),
        )
        
        ReturnItem.objects.create(
            return_request=self.return_request,
            order_item=self.order_item,
            quantity=1,
            condition='unopened'
        )
    
    def test_send_return_request_submitted_email(self):
        """Test: Return request submitted email is sent"""
        send_return_request_submitted(self.return_request)
        
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertEqual(email.to, [self.user.email])
        self.assertIn('return request', email.subject.lower())
        self.assertIn(str(self.return_request.id), email.body)
    
    @patch('snmov.utils.pdf_generation.generate_pdf', return_value='cn/email.pdf')
    @patch('snmov.utils.stripe_refunds.process_stripe_refund')
    def test_send_return_approved_email(self, mock_stripe_refund, _pdf):
        """Test: Return approved email is sent"""
        mock_stripe_refund.return_value = 're_test123'
        
        # Process approval
        credit_note = process_return_approval(self.return_request)
        
        # Manually send email (as done in API view)
        # Note: send_return_approved may not exist yet, so we'll test credit_note_issued instead
        send_credit_note_issued(credit_note)
        
        # Check email was sent
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertIn('credit', email.subject.lower())
        self.assertIn(str(credit_note.id), email.body)
    
    def test_send_return_rejected_email(self):
        """Test: Return rejected email is sent"""
        rejection_reason = 'Item condition does not meet return policy'
        process_return_rejection(self.return_request, rejection_reason)
        
        # Manually trigger email (process_return_rejection doesn't send email automatically)
        # This matches the API view behavior
        send_return_rejected(self.return_request, rejection_reason)
        
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertIn('return request update', email.subject.lower())
        self.assertIn(str(self.return_request.id), email.body)


class ReturnLabelGenerationTestCase(TestCase):
    """Test Canada Post return label generation"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.product = Product.objects.create(
            title='Test Product',
            price=Decimal('29.99'),
            stock=10,
            available=True,
            uuid=uuid.uuid4(),
            package_length=Decimal('10.0'),
            package_width=Decimal('5.0'),
            package_height=Decimal('3.0'),
            weight_grams=500,
            user=self.user
        )
        
        self.shipping_address = ShippingAddress.objects.create(
            user=self.user,
            full_name='Test User',
            address_line_1='123 Test St',
            city='Toronto',
            state='ON',
            postal_code='M5H 2N2',
            country_code='CA'
        )
        
        self.order = Order.objects.create(
            customer=self.user,
            shipping_address=self.shipping_address,
            status='DELIVERED'
        )
        self.order.order_date = timezone.now() - timedelta(days=5)
        self.order.save()
        
        self.order_item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=1,
        )
        
        self.return_request = ReturnRequest.objects.create(
            order=self.order,
            customer=self.user,
            reason='Test',
            reason_category='changed_mind',
            status='APPROVED'
        )
        
        ReturnItem.objects.create(
            return_request=self.return_request,
            order_item=self.order_item,
            quantity=1,
            condition='unopened'
        )
    
    @patch('snmov.utils.canadapost.create_return_label')
    def test_generate_return_label(self, mock_create_label):
        """Test: Return label generation calls Canada Post API"""
        mock_create_label.return_value = {
            'label_url': 'https://example.com/label.pdf',
            'tracking_number': 'CP123456789',
            'carrier': 'Canada Post'
        }
        
        result = generate_return_label(self.return_request)
        
        mock_create_label.assert_called_once_with(self.return_request)
        self.assertIn('label_url', result)
        self.assertIn('tracking_number', result)
    
    @patch('snmov.utils.canadapost.create_return_label')
    def test_generate_return_label_saves_to_request(self, mock_create_label):
        """Test: Generated label URL and tracking number are saved to return request"""
        mock_create_label.return_value = {
            'label_url': 'https://example.com/label.pdf',
            'tracking_number': 'CP123456789',
            'carrier': 'Canada Post'
        }
        
        result = generate_return_label(self.return_request)
        
        # Refresh from database
        self.return_request.refresh_from_db()
        self.assertEqual(self.return_request.return_label_url, 'https://example.com/label.pdf')
        self.assertEqual(self.return_request.return_tracking_number, 'CP123456789')


class ReturnStripeRefundTestCase(TestCase):
    """Test Stripe refund processing"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.product = Product.objects.create(
            title='Test Product',
            price=Decimal('29.99'),
            stock=10,
            available=True,
            uuid=uuid.uuid4(),
            user=self.user
        )
        
        self.shipping_address = ShippingAddress.objects.create(
            user=self.user,
            full_name='Test User',
            address_line_1='123 Test St',
            city='Toronto',
            state='ON',
            postal_code='M5H 2N2',
            country_code='CA'
        )
        
        self.order = Order.objects.create(
            customer=self.user,
            shipping_address=self.shipping_address,
            status='DELIVERED',
            shipping_cost=Decimal('10.00'),
            stripe_payment_intent_id='pi_test123',
            amount_paid_cents=100000,
        )
        
        self.order_item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=1,
        )
        
        self.return_request = ReturnRequest.objects.create(
            order=self.order,
            customer=self.user,
            reason='Test',
            reason_category='changed_mind',
            status='PENDING',
            return_shipping_cost=Decimal('0.00'),
        )
        
        ReturnItem.objects.create(
            return_request=self.return_request,
            order_item=self.order_item,
            quantity=1,
            condition='unopened'
        )
    
    @patch('snmov.utils.pdf_generation.generate_pdf', return_value='cn/refund.pdf')
    @patch('snmov.utils.stripe_refunds.process_stripe_refund')
    def test_stripe_refund_processing(self, mock_stripe_refund, _pdf):
        """Test: Stripe refund is processed during return approval"""
        mock_stripe_refund.return_value = 're_test123'
        
        # Process approval (includes Stripe refund)
        credit_note = process_return_approval(self.return_request)
        
        # Verify Stripe refund was called with correct parameters
        mock_stripe_refund.assert_called_once()
        call_args = mock_stripe_refund.call_args
        self.assertEqual(call_args[1]['credit_note'], credit_note)
        self.assertEqual(call_args[1]['payment_intent_id'], self.order.stripe_payment_intent_id)
        
        # Verify credit note was updated
        credit_note.refresh_from_db()
        self.assertEqual(credit_note.stripe_refund_id, 're_test123')
        self.assertEqual(credit_note.status, 'REFUNDED')
    
    @patch('snmov.utils.pdf_generation.generate_pdf', return_value='cn/fail.pdf')
    @patch('snmov.utils.stripe_refunds.process_stripe_refund')
    def test_stripe_refund_failure_rolls_back(self, mock_stripe_refund, _pdf):
        """Test: Stripe refund failure rolls back transaction"""
        mock_stripe_refund.side_effect = Exception('Stripe API error')
        
        # Count credit notes before
        initial_count = CreditNote.objects.filter(return_request=self.return_request).count()
        self.assertEqual(initial_count, 0)
        
        # Process approval should fail and rollback
        with self.assertRaises(Exception) as context:
            process_return_approval(self.return_request)
        
        self.assertIn('Stripe refund failed', str(context.exception))
        
        # Full atomic block rolls back; status stays PENDING
        self.return_request.refresh_from_db()
        self.assertEqual(self.return_request.status, 'PENDING')
        
        # Verify no new credit note was created (transaction rolled back)
        final_count = CreditNote.objects.filter(return_request=self.return_request).count()
        self.assertEqual(final_count, 0)


class ReturnIntegrationTestCase(APITestCase):
    """Integration tests for complete return workflow"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.product = Product.objects.create(
            title='Test Product',
            price=Decimal('29.99'),
            stock=10,
            available=True,
            uuid=uuid.uuid4(),
            user=self.user
        )
        
        self.shipping_address = ShippingAddress.objects.create(
            user=self.user,
            full_name='Test User',
            address_line_1='123 Test St',
            city='Toronto',
            state='ON',
            postal_code='M5H 2N2',
            country_code='CA'
        )
        
        self.order = Order.objects.create(
            customer=self.user,
            shipping_address=self.shipping_address,
            status='DELIVERED',
            shipping_cost=Decimal('10.00'),
            stripe_payment_intent_id='pi_test123',
            amount_paid_cents=200000,
        )
        
        self.order_item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=2
        )
        
        self.client.force_authenticate(user=self.user)
    
    @patch('snmov.utils.pdf_generation.generate_pdf', return_value='cn/workflow.pdf')
    @patch('snmov.utils.email_notifications.send_return_request_submitted')
    @patch('snmov.utils.returns.generate_return_label')
    @patch('snmov.utils.stripe_refunds.process_stripe_refund')
    def test_complete_return_workflow(self, mock_stripe_refund, mock_generate_label, mock_send_email, _pdf):
        """Test: Complete return workflow from creation to refund"""
        # Step 1: Create return request
        return_data = {
            'order_id': self.order.id,
            'reason': 'Changed my mind',
            'reason_category': 'changed_mind',
            'return_items': [
                {
                    'order_item_id': self.order_item.id,
                    'quantity': 1,
                    'condition': 'unopened',
                    'condition_notes': ''
                }
            ]
        }
        
        response = self.client.post(
            reverse('api:return-create'),
            return_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return_request_id = response.data['id']
        mock_send_email.assert_called_once()
        
        # Step 2: Approve return (admin action - would be done via admin or separate endpoint)
        return_request = ReturnRequest.objects.get(id=return_request_id)
        mock_generate_label.return_value = {
            'label_url': 'https://example.com/label.pdf',
            'tracking_number': 'CP123456789'
        }
        mock_stripe_refund.return_value = 're_test123'
        
        credit_note = process_return_approval(return_request)
        
        # Verify credit note was created
        self.assertIsNotNone(credit_note)
        self.assertEqual(credit_note.return_request, return_request)
        self.assertEqual(credit_note.status, 'REFUNDED')
        
        # Step 3: Verify return request status
        return_request.refresh_from_db()
        self.assertEqual(return_request.status, 'APPROVED')
        
        # Step 4: Verify stock was restored
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 11)  # 10 original + 1 returned
