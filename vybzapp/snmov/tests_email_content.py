"""
Comprehensive tests for email content verification
Tests that email templates render correctly with all expected content
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core import mail
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from snmov.models import Product, Order, OrderItem, ShippingAddress, ProductNotification
from snmov.utils.email_notifications import (
    send_order_confirmation,
    send_order_status_update,
    send_order_cancellation_confirmation,
    send_product_back_in_stock_notification,
    send_abandoned_cart_reminder,
    send_order_refund_processed
)

User = get_user_model()


class OrderConfirmationEmailContentTestCase(TestCase):
    """Test order confirmation email content"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123',
            first_name='John',
            last_name='Doe'
        )
        self.product = Product.objects.create(
            title='Test Product',
            price=Decimal('29.99'),
            discount_percentage=Decimal('10.00'),
            stock=10,
            available=True,
            user=self.user  # Product needs a user
        )
        self.shipping_address = ShippingAddress.objects.create(
            user=self.user,
            full_name='John Doe',
            address_line_1='123 Main St',
            address_line_2='Apt 4B',
            city='Toronto',
            state='ON',
            postal_code='M5H 2N2',
            country_code='CA'
        )
        self.order = Order.objects.create(
            customer=self.user,
            shipping_address=self.shipping_address,
            status='ORDERED',
            shipping_cost=Decimal('5.00')
        )
        self.order_item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=2
        )
    
    def test_order_confirmation_email_content(self):
        """Test that order confirmation email contains all expected content"""
        mail.outbox.clear()
        
        send_order_confirmation(self.order)
        
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        
        # Check subject
        self.assertEqual(email.subject, f'Order Confirmation - Order #{self.order.id}')
        
        # Check recipient
        self.assertEqual(email.to, [self.user.email])
        
        # Calculate expected values
        discounted_price = self.product.get_discounted_price()
        expected_subtotal = discounted_price * 2
        expected_total = self.order.calculate_grand_total()
        
        # Check plain text content
        self.assertIn(str(self.order.id), email.body)
        self.assertIn(self.product.title, email.body)
        self.assertIn(f'${expected_subtotal:.2f}', email.body)
        self.assertIn(f'${self.order.shipping_cost:.2f}', email.body)
        self.assertIn(f'${expected_total:.2f}', email.body)
        self.assertIn('123 Main St', email.body)
        self.assertIn('Toronto', email.body)
        self.assertIn('M5H 2N2', email.body)
        
        # Check HTML content
        self.assertIsNotNone(email.alternatives)
        html_content = email.alternatives[0][0]
        self.assertIn(str(self.order.id), html_content)
        self.assertIn(self.product.title, html_content)
        self.assertIn(f'${expected_subtotal:.2f}', html_content)
        self.assertIn(f'${self.order.shipping_cost:.2f}', html_content)
        self.assertIn(f'${expected_total:.2f}', html_content)
        self.assertIn('123 Main St', html_content)
        self.assertIn('Toronto', html_content)
        self.assertIn('M5H 2N2', html_content)
        
        # Check for order URL
        self.assertIn('order', html_content.lower())
    
    def test_order_confirmation_email_amounts_formatted(self):
        """Test that amounts in order confirmation are formatted to 2 decimal places"""
        mail.outbox.clear()
        
        send_order_confirmation(self.order)
        
        email = mail.outbox[0]
        html_content = email.alternatives[0][0]
        
        # Calculate expected values
        discounted_price = self.product.get_discounted_price()
        expected_subtotal = discounted_price * 2
        expected_total = self.order.calculate_grand_total()
        
        # Check that amounts have 2 decimal places (not more, not less)
        self.assertIn(f'${expected_subtotal:.2f}', html_content)  # e.g., $53.98 not $53.98000000 or $54
        self.assertIn(f'${self.order.shipping_cost:.2f}', html_content)  # e.g., $5.00 not $5 or $5.0
        self.assertIn(f'${expected_total:.2f}', html_content)  # e.g., $58.98 not $58.98000000
        
        # Verify format: should have exactly 2 decimal places
        import re
        # Check for pattern $XX.XX (exactly 2 decimal places)
        amount_pattern = r'\$\d+\.\d{2}'
        amounts = re.findall(amount_pattern, html_content)
        self.assertGreater(len(amounts), 0, "Should find formatted amounts with 2 decimal places")


class OrderStatusUpdateEmailContentTestCase(TestCase):
    """Test order status update email content"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123',
            first_name='John'
        )
        self.product = Product.objects.create(
            title='Test Product',
            price=Decimal('29.99'),
            discount_percentage=Decimal('10.00'),
            stock=10,
            available=True,
            user=self.user  # Product needs a user
        )
        self.order = Order.objects.create(
            customer=self.user,
            status='SHIPPED',
            tracking_number='CP123456789CA',
            shipping_provider='Canada Post',
            shipping_service='Regular Parcel'
        )
        self.order_item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=2
        )
    
    def test_order_status_update_email_content(self):
        """Test that order status update email contains all expected content"""
        mail.outbox.clear()
        
        send_order_status_update(self.order)
        
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        
        # Check subject
        self.assertEqual(email.subject, f'Order Status Update - Order #{self.order.id}')
        
        # Check content
        self.assertIn(str(self.order.id), email.body)
        self.assertIn(self.product.title, email.body)
        self.assertIn('CP123456789CA', email.body)
        self.assertIn('Canada Post', email.body)
        
        # Check HTML content
        html_content = email.alternatives[0][0]
        self.assertIn(str(self.order.id), html_content)
        self.assertIn(self.product.title, html_content)
        self.assertIn('CP123456789CA', html_content)
        self.assertIn('Canada Post', html_content)
        self.assertIn('Regular Parcel', html_content)


class OrderCancellationEmailContentTestCase(TestCase):
    """Test order cancellation email content"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123',
            first_name='John'
        )
        self.product = Product.objects.create(
            title='Test Product',
            price=Decimal('29.99'),
            discount_percentage=Decimal('10.00'),
            stock=10,
            available=True,
            user=self.user  # Product needs a user
        )
        self.order = Order.objects.create(
            customer=self.user,
            status='CANCELLED',
            shipping_cost=Decimal('5.00')
        )
        self.order_item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=2
        )
    
    def test_order_cancellation_email_content(self):
        """Test that order cancellation email contains all expected content"""
        mail.outbox.clear()
        
        send_order_cancellation_confirmation(self.order)
        
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        
        # Check subject
        self.assertEqual(email.subject, f'Order Cancellation Confirmation - Order #{self.order.id}')
        
        # Calculate expected values
        discounted_price = self.product.get_discounted_price()
        expected_subtotal = discounted_price * 2
        expected_total = self.order.calculate_grand_total()
        
        # Check content
        self.assertIn(str(self.order.id), email.body)
        self.assertIn(self.product.title, email.body)
        self.assertIn('Cancelled', email.body)
        self.assertIn('refund', email.body.lower())
        
        # Check HTML content
        html_content = email.alternatives[0][0]
        self.assertIn(str(self.order.id), html_content)
        self.assertIn(self.product.title, html_content)
        self.assertIn('Cancelled', html_content)
        self.assertIn('refund', html_content.lower())
        
        # Check amounts are formatted to 2 decimal places
        self.assertIn(f'${expected_subtotal:.2f}', html_content)
        self.assertIn(f'${self.order.shipping_cost:.2f}', html_content)
        self.assertIn(f'${expected_total:.2f}', html_content)


class ProductBackInStockEmailContentTestCase(TestCase):
    """Test product back in stock email content"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='productowner',
            email='owner@example.com',
            password='password123'
        )
        self.product = Product.objects.create(
            title='Test Product',
            price=Decimal('29.99'),
            discount_percentage=Decimal('10.00'),
            stock=5,
            available=True,
            user=self.user  # Product needs a user
        )
        self.notification = ProductNotification.objects.create(
            first_name='Jane',
            last_name='Smith',
            email='jane@example.com',
            product=self.product,
            is_active=True
        )
    
    def test_product_back_in_stock_email_content(self):
        """Test that product back in stock email contains all expected content"""
        mail.outbox.clear()
        
        send_product_back_in_stock_notification(self.notification)
        
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        
        # Check subject
        self.assertEqual(email.subject, f'Product Back in Stock - {self.product.title}')
        
        # Check content
        self.assertIn(self.product.title, email.body)
        self.assertIn('Jane', email.body)
        self.assertIn('$26.99', email.body)  # Discounted price
        self.assertIn('$29.99', email.body)  # Original price
        self.assertIn('10', email.body)  # Discount percentage
        
        # Check HTML content
        html_content = email.alternatives[0][0]
        self.assertIn(self.product.title, html_content)
        self.assertIn('Jane', html_content)
        self.assertIn('$26.99', html_content)
        self.assertIn('$29.99', html_content)
        # Template shows "10.00%" not "10%"
        self.assertTrue('10' in html_content and '%' in html_content)


class AbandonedCartReminderEmailContentTestCase(TestCase):
    """Test abandoned cart reminder email content"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123',
            first_name='John'
        )
        self.product = Product.objects.create(
            title='Test Product',
            price=Decimal('29.99'),
            discount_percentage=Decimal('10.00'),
            stock=10,
            available=True,
            user=self.user  # Product needs a user
        )
    
    def test_abandoned_cart_reminder_email_content(self):
        """Test that abandoned cart reminder email contains all expected content"""
        mail.outbox.clear()
        
        cart_items = [{
            'product': self.product,
            'quantity': 2
        }]
        total_price = Decimal('59.98')
        
        send_abandoned_cart_reminder(self.user, cart_items, total_price, 1)
        
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        
        # Check subject
        self.assertIn("Don't Forget Your Cart", email.subject)
        
        # Check content
        self.assertIn(self.product.title, email.body)
        self.assertIn('John', email.body)
        self.assertIn(f'${total_price:.2f}', email.body)
        self.assertIn('48 hours', email.body)  # For 1 day abandoned
        
        # Check HTML content
        html_content = email.alternatives[0][0]
        self.assertIn(self.product.title, html_content)
        self.assertIn('John', html_content)
        self.assertIn(f'${total_price:.2f}', html_content)
        self.assertIn('48 hours', html_content)


class OrderRefundProcessedEmailContentTestCase(TestCase):
    """Test order refund processed email content"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123',
            first_name='John'
        )
        self.product = Product.objects.create(
            title='Test Product',
            price=Decimal('29.99'),
            discount_percentage=Decimal('10.00'),
            stock=10,
            available=True,
            user=self.user  # Product needs a user
        )
        self.order = Order.objects.create(
            customer=self.user,
            status='CANCELLED',
            shipping_cost=Decimal('5.00')
        )
        self.order_item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=2
        )
    
    def test_order_refund_processed_email_content(self):
        """Test that order refund processed email contains all expected content"""
        mail.outbox.clear()
        
        refund_amount = Decimal('64.98')
        send_order_refund_processed(self.order, refund_amount, 'Original payment method')
        
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        
        # Check subject
        self.assertEqual(email.subject, f'Refund Processed - Order #{self.order.id}')
        
        # Check content
        self.assertIn(str(self.order.id), email.body)
        self.assertIn(self.product.title, email.body)
        self.assertIn('$64.98', email.body)
        self.assertIn('Original payment method', email.body)
        self.assertIn('5-10 business days', email.body)
        
        # Check HTML content
        html_content = email.alternatives[0][0]
        self.assertIn(str(self.order.id), html_content)
        self.assertIn(self.product.title, html_content)
        self.assertIn('$64.98', html_content)
        self.assertIn('Original payment method', html_content)
        self.assertIn('5-10 business days', html_content)

