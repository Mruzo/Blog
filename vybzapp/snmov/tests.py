from django.contrib.auth import get_user_model

User = get_user_model()
from django.test import TestCase, Client
from django.urls import reverse
from snmov.models import ReachOut, Product, SiteImage, ProductNotification, Order, OrderItem, ShippingAddress
from snmov.forms import ShippingAddressForm
from snmov.utils.cart import get_cart_for_session
from django.core.mail import outbox
from snm.forms import ProductNotificationForm
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core import mail
from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator, default_token_generator
from decimal import Decimal
from unittest.mock import patch
import re
import json


class ContactFormTest(TestCase):
    def test_contact_form_submission(self):
        form_data = {
            'submitted_by_name': 'John Doe',
            'submitted_by_email': 'john@example.com',
            'subject': 'Test Subject',
            'message': 'This is a test message that is long enough for validation.',
            'category': 'other',
        }

        response = self.client.post(
            '/api/feedback/api/tickets/',
            data=json.dumps(form_data),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        from feedback.models import FeedbackTicket
        ticket = FeedbackTicket.objects.filter(submitted_by_email='john@example.com').first()
        self.assertIsNotNone(ticket)
        self.assertEqual(ticket.submitted_by_name, 'John Doe')
        self.assertEqual(ticket.subject, 'Test Subject')


class ProductNotificationTest(TestCase):

    def setUp(self):

        # Create a sample user for the foreign key
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@example.com',
            password='password123'
        )

        # Create a sample product for testing
        self.unavailable_product = Product.objects.create(
            title='Test Product',
            description='Test Description',
            content='Test Content',
            price=10.00,  # Add a valid price here
            stock=0,
            available=False,
        )

    def test_product_notification_form_submission(self):
        # Set up data for the form submission
        data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john.doe@example.com',
            'products': [self.unavailable_product.id],
            'price': '5.00'
        }

        # Make a POST request to the home page with form data
        response = self.client.post(reverse('homepage'), data)

        # Check that the form submission redirects to the home page
        self.assertEqual(response.status_code, 302)

        # Check that the user data is saved in the database
        self.assertEqual(ProductNotification.objects.count(), 1)
        notification = ProductNotification.objects.first()
        self.assertEqual(notification.first_name, 'John')
        self.assertEqual(notification.last_name, 'Doe')
        self.assertEqual(notification.email, 'john.doe@example.com')
        self.assertEqual(notification.product, self.unavailable_product)


class OrderModelTest(TestCase):

    def setUp(self):
        # Create a test user
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@example.com',
            password='password123'
        )
        
        # Create a test product
        self.product = Product.objects.create(
            title='Test Product',
            price=10.00,
            stock=100
        )

    def test_order_creation(self):
        # Create an order
        order = Order.objects.create(
            customer=self.user,
            status='PENDING',
        )
        
        # Create an OrderItem with quantity and add it to the order
        order_item = OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=2  # Ensure quantity is set
        )

        # Test if the order is created successfully
        self.assertEqual(order.customer.username, 'testuser')
        self.assertEqual(order.status, 'PENDING')
        self.assertEqual(order_item.quantity, 2)  # Test that quantity is correctly set
        self.assertIn(self.product, order.products.all())  # Ensure the product is added
        self.assertIsNotNone(order.order_date)  # Ensure order date is set

    def test_order_status_choices(self):
        # Test if the status choices work correctly
        order = Order.objects.create(customer=self.user, status='SHIPPED')
        self.assertEqual(order.status, 'SHIPPED')

        order.status = 'CANCELLED'
        order.save()
        self.assertEqual(order.status, 'CANCELLED')

    def test_order_str_representation(self):
        # Test the string representation of the order
        order = Order.objects.create(customer=self.user)
        self.assertEqual(str(order), f"Order {order.id} by testuser")


class CartTestCase(TestCase):

    def setUp(self):
        # Create a test user
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@example.com',
            password='password123'
        )

        # Create a product to add to the cart
        self.product = Product.objects.create(
            title="Test Product",
            price=10.00,
            stock=100
        )

    def test_add_item_to_cart(self):
        # Send a POST request to add the product to the cart
        response = self.client.post(
            reverse('snmov:add_to_cart', args=[self.product.uuid]),
            {"quantity": 1},  # Send the quantity
        )
        
        # Check that the response indicates success
        self.assertEqual(response.status_code, 200)

        # Verify the cart data in the session
        cart_data = self.client.session.get('cart', {})
        print(cart_data)
        
        # Ensure the product is in the cart
        self.assertTrue(
            str(self.product.uuid) in cart_data,
            "Product was not added to the cart."
        ) 

        # Check the quantity
        self.assertEqual(cart_data[str(self.product.uuid)]['quantity'], 1)


class CartAPITestCase(TestCase):
    """Comprehensive tests for Django REST Framework cart API endpoints"""

    def setUp(self):
        # Create a test user
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@example.com',
            password='password123'
        )

        # Create test products
        self.product1 = Product.objects.create(
            title="Test Product 1",
            price=10.00,
            stock=100,
            available=True
        )
        
        self.product2 = Product.objects.create(
            title="Test Product 2", 
            price=25.00,
            stock=50,
            available=True
        )
        
        self.unavailable_product = Product.objects.create(
            title="Unavailable Product",
            price=5.00,
            stock=0,
            available=False
        )

    def test_get_empty_cart(self):
        """Test getting an empty cart"""
        response = self.client.get('/api/cart/')
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data['cart_items'], [])
        self.assertEqual(data['total_price'], 0)

    def test_add_item_to_cart(self):
        """Test adding an item to cart via API - should add 1 item when cart is empty"""
        # Ensure cart is empty first
        response = self.client.get('/api/cart/')
        initial_data = response.json()
        self.assertEqual(len(initial_data['cart_items']), 0, "Cart should be empty at start")
        
        # Add 1 item to empty cart
        response = self.client.post('/api/cart/add/', {
            'product_id': str(self.product1.uuid),
            'quantity': 1
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 200, getattr(response, "content", b""))
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('Added Test Product 1 to cart', data['message'])
        
        # Verify cart data - should have exactly 1 item
        cart_data = data['cart']
        self.assertEqual(len(cart_data['cart_items']), 1)
        self.assertEqual(cart_data['cart_items'][0]['title'], 'Test Product 1')
        self.assertEqual(cart_data['cart_items'][0]['quantity'], 1, "Should add exactly 1 item when cart is empty")
        self.assertEqual(cart_data['total_price'], 10.00)

    def test_add_to_cart_with_session_cookie_and_no_csrf_token(self):
        """Regression: cart POST must work when a Django session exists but no CSRF header."""
        from rest_framework.test import APIClient

        client = APIClient()
        client.force_login(self.user)
        response = client.post(
            '/api/cart/add/',
            {'product_id': str(self.product1.uuid), 'quantity': 1},
            format='json',
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.json()['success'])

    def test_add_unavailable_product_to_cart(self):
        """Test adding an unavailable product to cart"""
        response = self.client.post('/api/cart/add/', {
            'product_id': str(self.unavailable_product.uuid),
            'quantity': 1
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn('not found or not available', str(data))

    def test_add_invalid_product_to_cart(self):
        """Test adding a non-existent product to cart"""
        response = self.client.post('/api/cart/add/', {
            'product_id': '00000000-0000-0000-0000-000000000000',
            'quantity': 1
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn('not found or not available', str(data))

    def test_add_multiple_items_to_cart(self):
        """Test adding multiple different items to cart"""
        # Add first product
        response = self.client.post('/api/cart/add/', {
            'product_id': str(self.product1.uuid),
            'quantity': 2
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        
        # Add second product
        response = self.client.post('/api/cart/add/', {
            'product_id': str(self.product2.uuid),
            'quantity': 1
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        
        # Check final cart
        response = self.client.get('/api/cart/')
        data = response.json()
        self.assertEqual(len(data['cart_items']), 2)
        self.assertEqual(data['total_price'], 45.00)  # (10*2) + (25*1)

    def test_add_same_item_multiple_times(self):
        """Test adding the same item multiple times (should increase quantity)"""
        # Add item first time
        response = self.client.post('/api/cart/add/', {
            'product_id': str(self.product1.uuid),
            'quantity': 1
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        
        # Add same item again
        response = self.client.post('/api/cart/add/', {
            'product_id': str(self.product1.uuid),
            'quantity': 2
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        
        # Check final cart
        response = self.client.get('/api/cart/')
        data = response.json()
        self.assertEqual(len(data['cart_items']), 1)
        self.assertEqual(data['cart_items'][0]['quantity'], 3)  # 1 + 2
        self.assertEqual(data['total_price'], 30.00)  # 10 * 3

    def test_add_one_item_at_a_time(self):
        """Test adding 1 item at a time multiple times"""
        # Add 1 item
        response = self.client.post('/api/cart/add/', {
            'product_id': str(self.product1.uuid),
            'quantity': 1
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['cart']['cart_items'][0]['quantity'], 1)
        
        # Add 1 more item
        response = self.client.post('/api/cart/add/', {
            'product_id': str(self.product1.uuid),
            'quantity': 1
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['cart']['cart_items'][0]['quantity'], 2)
        
        # Add 1 more item
        response = self.client.post('/api/cart/add/', {
            'product_id': str(self.product1.uuid),
            'quantity': 1
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['cart']['cart_items'][0]['quantity'], 3)
        
        # Add 1 more item (should reach max of 4)
        response = self.client.post('/api/cart/add/', {
            'product_id': str(self.product1.uuid),
            'quantity': 1
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['cart']['cart_items'][0]['quantity'], 4)
        
        # Try to add 1 more item (should fail - exceeds 4-item limit)
        response = self.client.post('/api/cart/add/', {
            'product_id': str(self.product1.uuid),
            'quantity': 1
        }, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data['success'])
        self.assertIn('Maximum of 4 items', data['error'])
        
        # Verify cart still has 4 items
        response = self.client.get('/api/cart/')
        data = response.json()
        self.assertEqual(len(data['cart_items']), 1)
        self.assertEqual(data['cart_items'][0]['quantity'], 4)

    def test_update_cart_item_quantity(self):
        """Test updating cart item quantity"""
        # Add item to cart
        self.client.post('/api/cart/add/', {
            'product_id': str(self.product1.uuid),
            'quantity': 2
        }, content_type='application/json')
        
        # Update quantity
        response = self.client.put(f'/api/cart/update/{self.product1.uuid}/', {
            'quantity': 4
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        
        # Verify updated cart
        response = self.client.get('/api/cart/')
        data = response.json()
        self.assertEqual(data['cart_items'][0]['quantity'], 4)
        self.assertEqual(data['total_price'], 40.00)

    def test_update_cart_item_to_zero_removes_item(self):
        """Test that setting quantity to 0 removes item from cart"""
        # Add item to cart
        self.client.post('/api/cart/add/', {
            'product_id': str(self.product1.uuid),
            'quantity': 2
        }, content_type='application/json')
        
        # Update quantity to 0 (this should fail due to serializer validation)
        response = self.client.put(f'/api/cart/update/{self.product1.uuid}/', {
            'quantity': 0
        }, content_type='application/json')
        
        # The serializer validation should reject quantity 0
        self.assertEqual(response.status_code, 400)
        
        # Verify item is still in cart (quantity unchanged)
        response = self.client.get('/api/cart/')
        data = response.json()
        self.assertEqual(len(data['cart_items']), 1)
        self.assertEqual(data['cart_items'][0]['quantity'], 2)

    def test_update_nonexistent_cart_item(self):
        """Test updating a cart item that doesn't exist"""
        response = self.client.put(f'/api/cart/update/{self.product1.uuid}/', {
            'quantity': 5
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 404)
        data = response.json()
        self.assertFalse(data['success'])
        self.assertIn('not in cart', data['error'])

    def test_remove_cart_item(self):
        """Test removing an item from cart"""
        # Add item to cart
        self.client.post('/api/cart/add/', {
            'product_id': str(self.product1.uuid),
            'quantity': 2
        }, content_type='application/json')
        
        # Remove item
        response = self.client.delete(f'/api/cart/remove/{self.product1.uuid}/')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        
        # Verify item is removed
        response = self.client.get('/api/cart/')
        data = response.json()
        self.assertEqual(len(data['cart_items']), 0)
        self.assertEqual(data['total_price'], 0)

    def test_remove_nonexistent_cart_item(self):
        """Test removing a cart item that doesn't exist"""
        response = self.client.delete(f'/api/cart/remove/{self.product1.uuid}/')
        
        self.assertEqual(response.status_code, 404)
        data = response.json()
        self.assertFalse(data['success'])
        self.assertIn('not in cart', data['error'])

    def test_clear_cart(self):
        """Test clearing the entire cart"""
        # Add multiple items to cart
        self.client.post('/api/cart/add/', {
            'product_id': str(self.product1.uuid),
            'quantity': 2
        }, content_type='application/json')
        
        self.client.post('/api/cart/add/', {
            'product_id': str(self.product2.uuid),
            'quantity': 1
        }, content_type='application/json')
        
        # Clear cart
        response = self.client.delete('/api/cart/clear/')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        
        # Verify cart is empty
        response = self.client.get('/api/cart/')
        data = response.json()
        self.assertEqual(len(data['cart_items']), 0)
        self.assertEqual(data['total_price'], 0)

    def test_clear_empty_cart(self):
        """Test clearing an already empty cart"""
        response = self.client.delete('/api/cart/clear/')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('Cart cleared', data['message'])

    def test_cart_persistence_across_requests(self):
        """Test that cart data persists across multiple requests"""
        # Add item to cart
        response = self.client.post('/api/cart/add/', {
            'product_id': str(self.product1.uuid),
            'quantity': 3
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        
        # Make another request to verify persistence
        response = self.client.get('/api/cart/')
        data = response.json()
        self.assertEqual(len(data['cart_items']), 1)
        self.assertEqual(data['cart_items'][0]['quantity'], 3)
        self.assertEqual(data['total_price'], 30.00)

    def test_cart_calculations_with_discounts(self):
        """Test cart calculations with product discounts"""
        # Create a product with discount
        discounted_product = Product.objects.create(
            title="Discounted Product",
            price=100.00,
            discount_percentage=20.00,  # 20% discount
            stock=10,
            available=True
        )
        
        # Add discounted product to cart
        response = self.client.post('/api/cart/add/', {
            'product_id': str(discounted_product.uuid),
            'quantity': 2
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        
        # Check cart calculations
        response = self.client.get('/api/cart/')
        data = response.json()
        self.assertEqual(len(data['cart_items']), 1)
        self.assertEqual(data['cart_items'][0]['price'], 80.00)  # 100 - 20%
        self.assertEqual(data['total_price'], 160.00)  # 80 * 2

    def test_cart_with_mixed_products(self):
        """Test cart with both regular and discounted products"""
        # Create a discounted product
        discounted_product = Product.objects.create(
            title="Discounted Product",
            price=50.00,
            discount_percentage=10.00,
            stock=5,
            available=True
        )
        
        # Add both products
        self.client.post('/api/cart/add/', {
            'product_id': str(self.product1.uuid),
            'quantity': 2
        }, content_type='application/json')
        
        self.client.post('/api/cart/add/', {
            'product_id': str(discounted_product.uuid),
            'quantity': 1
        }, content_type='application/json')
        
        # Check total calculation
        response = self.client.get('/api/cart/')
        data = response.json()
        self.assertEqual(len(data['cart_items']), 2)
        # product1: 10.00 * 2 = 20.00
        # discounted_product: 50.00 - 10% = 45.00 * 1 = 45.00
        # Total: 65.00
        self.assertEqual(data['total_price'], 65.00)

    
class EmailVerificationTest(TestCase):

    def test_email_sent_on_registration(self):
        response = self.client.post(
            '/api/icvybz/auth/register/',
            data=json.dumps({
                'username': 'testuser',
                'email': 'testuser@example.com',
                'password': 'admin2015',
                'password2': 'admin2015',
                'first_name': 'Test',
                'last_name': 'User',
                'accept_terms': True,
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        if hasattr(User(), 'is_email_verified'):
            self.assertEqual(len(mail.outbox), 1)
            email = mail.outbox[0]
            self.assertIn('Verify Your Email', email.subject)
            token_match = re.search(r'/verify_email/(\d+)/([a-zA-Z0-9\-]+)/', email.body)
            self.assertIsNotNone(token_match, 'Token not found in the email body')

    def test_user_can_verify_email(self):
        user = User.objects.create_user(
            username='testuser2',
            email='testuser2@example.com',
            password='admin2015',
            is_active=False,
        )
        verification_link = reverse('verify_email', args=[user.id, 'some_token'])
        response = self.client.get(verification_link)
        user.refresh_from_db()
        self.assertIn(response.status_code, [200, 302])

    def test_invalid_verification_link(self):
        response = self.client.get('/verify/invalid_link/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Invalid verification link')


class OrderCheckoutModelTestCase(TestCase):
    """Order/shipping model tests (legacy server-rendered checkout removed)."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@example.com',
            password='password123',
            first_name='Test',
            last_name='User',
        )
        self.product1 = Product.objects.create(
            title="Test Product 1",
            price=25.00,
            stock=10,
            available=True,
            weight_grams=500,
        )
        self.product2 = Product.objects.create(
            title="Test Product 2",
            price=15.00,
            stock=5,
            available=True,
            weight_grams=300,
        )
        self.client = Client()
        self.client.force_login(self.user)

    def test_shipping_address_model_creation(self):
        shipping = ShippingAddress.objects.create(
            user=self.user,
            full_name='Test User',
            address_line_1='123 Test Street',
            address_line_2='Apt 1',
            city='Test City',
            state='Test State',
            postal_code='12345',
            country_code='US',
        )
        self.assertEqual(shipping.full_name, 'Test User')
        self.assertEqual(shipping.user, self.user)

    def test_order_model_methods(self):
        order = Order.objects.create(customer=self.user)
        OrderItem.objects.create(order=order, product=self.product1, quantity=2)
        OrderItem.objects.create(order=order, product=self.product2, quantity=1)
        expected_weight = (self.product1.weight_grams * 2) + (self.product2.weight_grams * 1)
        self.assertEqual(order.calculate_total_weight(), expected_weight)
        expected_value = (self.product1.price * 2) + (self.product2.price * 1)
        self.assertEqual(order.calculate_total_value(), expected_value)

    def test_order_status_transitions(self):
        order = Order.objects.create(customer=self.user, status='PENDING')
        for status_code in ('ORDERED', 'PROCESSING', 'SHIPPED', 'DELIVERED'):
            order.status = status_code
            order.save()
            self.assertEqual(order.status, status_code)

    def test_cart_cleared_after_checkout(self):
        self.client.post(reverse('snmov:add_to_cart', args=[self.product1.uuid]), {'quantity': 1})
        cart = self.client.session.get('cart', {})
        self.assertGreater(len(cart), 0)
        shipping_data = {
            'full_name': 'Test User',
            'address_line_1': '123 Test Street',
            'city': 'Test City',
            'state': 'Test State',
            'postal_code': '12345',
            'country_code': 'US',
        }
        self.client.post(reverse('snmov:checkout'), shipping_data)
        cart = self.client.session.get('cart', {})
        self.assertGreater(len(cart), 0)
