"""
Tests for medium-priority email notifications:
- Product back in stock notifications
- Abandoned cart reminders
- Order refund processed notifications
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core import mail
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch, MagicMock
from snmov.models import Product, ProductNotification, Order, OrderItem, ShippingAddress
from snmov.utils.email_notifications import (
    send_product_back_in_stock_notification,
    send_abandoned_cart_reminder,
    send_order_refund_processed
)

User = get_user_model()


class ProductBackInStockNotificationTestCase(TestCase):
    """Tests for product back in stock email notifications"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'
        )
        self.product = Product.objects.create(
            title='Test Product',
            price=10.00,
            stock=0,
            available=False
        )
        self.notification = ProductNotification.objects.create(
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            product=self.product,
            is_active=True,
            notification_sent=False
        )
    
    def test_send_back_in_stock_notification(self):
        """Test sending back in stock notification"""
        mail.outbox.clear()
        
        send_product_back_in_stock_notification(self.notification)
        
        # Check email was sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, f'Product Back in Stock - {self.product.title}')
        self.assertIn('john@example.com', mail.outbox[0].to)
        self.assertIn(self.product.title, mail.outbox[0].body)
    
    def test_notification_sent_flag_updated(self):
        """Test that notification_sent flag is updated after sending"""
        self.assertFalse(self.notification.notification_sent)
        
        self.notification.send_back_in_stock_notification()
        
        # Reload from database
        self.notification.refresh_from_db()
        self.assertTrue(self.notification.notification_sent)
        self.assertIsNotNone(self.notification.notification_sent_at)
        self.assertFalse(self.notification.is_active)  # Should be deactivated
    
    def test_notification_not_sent_twice(self):
        """Test that notification is not sent if already sent"""
        self.notification.notification_sent = True
        self.notification.save()
        
        mail.outbox.clear()
        result = self.notification.send_back_in_stock_notification()
        
        self.assertFalse(result)  # Should return False
        self.assertEqual(len(mail.outbox), 0)  # No email sent


class AbandonedCartReminderTestCase(TestCase):
    """Tests for abandoned cart reminder emails"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123',
            first_name='John'
        )
        self.product = Product.objects.create(
            title='Test Product',
            price=10.00,
            stock=10,
            available=True
        )
    
    def test_send_abandoned_cart_reminder(self):
        """Test sending abandoned cart reminder"""
        mail.outbox.clear()
        
        cart_items = [{
            'product': self.product,
            'quantity': 2
        }]
        total_price = 20.00
        days_abandoned = 1
        
        send_abandoned_cart_reminder(self.user, cart_items, total_price, days_abandoned)
        
        # Check email was sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Don't Forget Your Cart", mail.outbox[0].subject)
        self.assertIn('test@example.com', mail.outbox[0].to)
        self.assertIn(self.product.title, mail.outbox[0].body)
        self.assertIn('$20.00', mail.outbox[0].body)
    
    def test_abandoned_cart_reminder_different_days(self):
        """Test abandoned cart reminder with different days abandoned"""
        mail.outbox.clear()
        
        cart_items = [{'product': self.product, 'quantity': 1}]
        
        # Test 1 day
        send_abandoned_cart_reminder(self.user, cart_items, 10.00, 1)
        self.assertIn('48 hours', mail.outbox[0].body)
        
        mail.outbox.clear()
        
        # Test 3 days
        send_abandoned_cart_reminder(self.user, cart_items, 10.00, 3)
        self.assertIn('stock is limited', mail.outbox[0].body)


class OrderRefundProcessedTestCase(TestCase):
    """Tests for order refund processed email notifications"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123',
            first_name='John'
        )
        self.product = Product.objects.create(
            title='Test Product',
            price=10.00,
            stock=10,
            available=True
        )
        self.shipping_address = ShippingAddress.objects.create(
            user=self.user,
            full_name='John Doe',
            address_line_1='123 Test St',
            city='Test City',
            state='ON',
            postal_code='A1A 1A1',
            country_code='CA'
        )
        self.order = Order.objects.create(
            customer=self.user,
            status='CANCELLED',
            shipping_address=self.shipping_address,
            shipping_cost=5.00
        )
        self.order_item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=2
        )
    
    def test_send_order_refund_processed(self):
        """Test sending order refund processed notification"""
        mail.outbox.clear()
        
        refund_amount = 25.00  # 2 * 10.00 + 5.00 shipping
        send_order_refund_processed(self.order, refund_amount, "Original payment method")
        
        # Check email was sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, f'Refund Processed - Order #{self.order.id}')
        self.assertIn('test@example.com', mail.outbox[0].to)
        self.assertIn('$25.00', mail.outbox[0].body)
        self.assertIn('Refund Processed', mail.outbox[0].body)
    
    def test_refund_processed_includes_order_details(self):
        """Test that refund email includes order details"""
        mail.outbox.clear()
        
        send_order_refund_processed(self.order, 25.00)
        
        email_body = mail.outbox[0].body
        self.assertIn(str(self.order.id), email_body)
        self.assertIn(self.product.title, email_body)
        self.assertIn('5-10 business days', email_body)


class ProductBackInStockSignalTestCase(TestCase):
    """Tests for product back in stock signal integration"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='stockuser',
            email='stock@example.com',
            password='password123',
        )
        self.product = Product.objects.create(
            title='Test Product',
            price=10.00,
            stock=0,
            available=False,
            user=self.user,
        )
        self.notification = ProductNotification.objects.create(
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            product=self.product,
            is_active=True,
            notification_sent=False
        )
    
    def test_product_becomes_available_triggers_notification(self):
        """Test that making product available triggers notification"""
        mail.outbox.clear()
        
        # Make product available
        self.product.available = True
        self.product.stock = 10
        self.product.save()  # This should trigger the signal
        
        # Check notification was sent
        self.notification.refresh_from_db()
        self.assertTrue(self.notification.notification_sent)
        self.assertEqual(len(mail.outbox), 1)
    
    def test_product_stock_increases_triggers_notification(self):
        """Test that increasing stock from 0 triggers notification"""
        mail.outbox.clear()
        
        # Increase stock from 0
        self.product.stock = 5
        self.product.available = True
        self.product.save()  # This should trigger the signal
        
        # Check notification was sent
        self.notification.refresh_from_db()
        self.assertTrue(self.notification.notification_sent)
        self.assertEqual(len(mail.outbox), 1)
    
    def test_notification_not_sent_if_already_sent(self):
        """Test that notification is not sent if already sent"""
        self.notification.notification_sent = True
        self.notification.save()
        
        mail.outbox.clear()
        
        # Make product available
        self.product.available = True
        self.product.stock = 10
        self.product.save()
        
        # Should not send another email
        self.assertEqual(len(mail.outbox), 0)













