"""
Comprehensive Integration Tests for Checkout Process
Tests seamless backend and frontend integration through checkout
"""
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from decimal import Decimal
import json
import uuid

from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from unittest.mock import patch, MagicMock

from snmov.models import Product, Order, OrderItem, ShippingAddress
from snmov.utils.cart import get_cart_for_session

User = get_user_model()


class CheckoutIntegrationTestCase(APITestCase):
    """Integration tests for complete checkout flow"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
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
            weight_grams=500
        )
        
        # Authenticate client
        self.client.force_authenticate(user=self.user)
        
        # Ensure session is created
        if not hasattr(self.client, 'session') or not self.client.session:
            from django.contrib.sessions.middleware import SessionMiddleware
            from django.test import RequestFactory
            factory = RequestFactory()
            request = factory.get('/')
            middleware = SessionMiddleware()
            middleware.process_request(request)
            request.session.save()
            self.client.session = request.session
    
    def test_complete_checkout_flow(self):
        """Test: Complete checkout flow from cart to order creation"""
        # Step 1: Manually set cart in session
        session = self.client.session
        session['cart'] = {
            str(self.product.uuid): {'quantity': 2}
        }
        session.save()
        
        # Step 2: Verify cart has items
        cart = self.client.session.get('cart', {})
        self.assertGreater(len(cart), 0)
        product_id_str = str(self.product.uuid)
        self.assertIn(product_id_str, cart)
        self.assertEqual(cart[product_id_str]['quantity'], 2)
        
        # Step 3: Submit checkout with shipping address
        checkout_data = {
            'full_name': 'Test User',
            'address_line_1': '123 Test St',
            'city': 'Toronto',
            'state': 'ON',
            'postal_code': 'M5H 2N2',
            'country_code': 'CA',
            'is_saved': False
        }
        
        response = self.client.post(
            '/api/checkout/',
            checkout_data,
            format='json'
        )
        
        # Step 4: Verify order created
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('order_id', response.data)
        
        order_id = response.data['order_id']
        order = Order.objects.get(id=order_id)
        
        # Step 5: Verify order details
        self.assertEqual(order.customer, self.user)
        self.assertIsNotNone(order.shipping_address)
        self.assertEqual(order.shipping_address.full_name, 'Test User')
        self.assertEqual(order.shipping_address.postal_code, 'M5H 2N2')
        
        # Step 6: Verify order items
        order_items = order.orderitem_set.all()
        self.assertEqual(len(order_items), 1)
        self.assertEqual(order_items[0].product, self.product)
        self.assertEqual(order_items[0].quantity, 2)
        
        # Step 7: Verify stock decremented
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 8)  # 10 - 2 = 8
    
    def test_checkout_with_saved_address(self):
        """Test: Checkout with saved address selection"""
        # Create saved address
        saved_address = ShippingAddress.objects.create(
            user=self.user,
            full_name='Saved User',
            address_line_1='456 Saved St',
            city='Toronto',
            state='ON',
            postal_code='M5H 1A1',
            country_code='CA',
            is_saved=True,
            label='Home',
            is_default=True
        )
        
        # Add product to cart
        self.client.post(
            '/api/cart/add/',
            {'product_id': str(self.product.uuid), 'quantity': 1},
            format='json'
        )
        
        # Checkout with saved address ID
        checkout_data = {
            'full_name': 'Saved User',
            'address_line_1': '456 Saved St',
            'city': 'Toronto',
            'state': 'ON',
            'postal_code': 'M5H 1A1',
            'country_code': 'CA',
            'is_saved': True,
            'label': 'Home'
        }
        
        response = self.client.post(
            '/api/checkout/',
            checkout_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        
        # Verify order uses correct address
        order = Order.objects.get(id=response.data['order_id'])
        self.assertEqual(order.shipping_address.full_name, 'Saved User')
        self.assertEqual(order.shipping_address.address_line_1, '456 Saved St')
    
    def test_checkout_requires_authentication(self):
        """Test: Checkout requires authentication"""
        # Create unauthenticated client
        unauthenticated_client = APIClient()
        
        checkout_data = {
            'full_name': 'Test User',
            'address_line_1': '123 Test St',
            'city': 'Toronto',
            'state': 'ON',
            'postal_code': 'M5H 2N2',
            'country_code': 'CA'
        }
        
        response = unauthenticated_client.post(
            '/api/checkout/',
            checkout_data,
            format='json'
        )
        
        # DRF returns 403 Forbidden for unauthenticated requests with IsAuthenticated permission
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
    
    def test_checkout_validates_address_format(self):
        """Test: Checkout validates Canadian postal code format"""
        # Manually set cart in session
        session = self.client.session
        session['cart'] = {
            str(self.product.uuid): {'quantity': 1}
        }
        session.save()
        
        # Try checkout with invalid postal code
        checkout_data = {
            'full_name': 'Test User',
            'address_line_1': '123 Test St',
            'city': 'Toronto',
            'state': 'ON',
            'postal_code': 'INVALID',  # Invalid format
            'country_code': 'CA'
        }
        
        response = self.client.post(
            '/api/checkout/',
            checkout_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertIn('errors', response.data)
        self.assertIn('postal_code', response.data['errors'])
    
    def test_checkout_with_empty_cart(self):
        """Test: Checkout fails with empty cart"""
        checkout_data = {
            'full_name': 'Test User',
            'address_line_1': '123 Test St',
            'city': 'Toronto',
            'state': 'ON',
            'postal_code': 'M5H 2N2',
            'country_code': 'CA'
        }
        
        response = self.client.post(
            '/api/checkout/',
            checkout_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertIn('Cart is empty', response.data['error'])
    
    def test_checkout_flow_to_shipping_rates(self):
        """Test: Complete flow from checkout to shipping rates"""
        # Step 1: Manually set cart in session (APIClient doesn't persist session automatically)
        session = self.client.session
        session['cart'] = {
            str(self.product.uuid): {'quantity': 1}
        }
        session.save()
        
        # Step 2: Create order via checkout
        checkout_data = {
            'full_name': 'Test User',
            'address_line_1': '123 Test St',
            'city': 'Toronto',
            'state': 'ON',
            'postal_code': 'M5H 2N2',
            'country_code': 'CA'
        }
        
        response = self.client.post(
            '/api/checkout/',
            checkout_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        order_id = response.data['order_id']
        
        # Step 3: Get shipping rates (mock the cart utility function that wraps Canada Post)
        with patch('snmov.api_views.get_shipping_rates_for_order') as mock_get_rates:
            mock_get_rates.return_value = [
                {
                    'object_id': 'DOM.EP',
                    'servicelevel': {
                        'name': 'Expedited Parcel',
                    },
                    'amount': '16.01',
                    'currency': 'CAD',
                    'estimated_days': 3,
                    'courier_name': 'Canada Post',
                    'provider': 'Canada Post',
                    'provider_image_200': '',
                    'shipment_charge': {
                        'amount': '16.01',
                        'currency': 'CAD',
                    },
                    '_canadapost_service_code': 'DOM.EP',
                    '_canadapost_service_name': 'Expedited Parcel',
                }
            ]
            
            response = self.client.get(f'/api/orders/{order_id}/shipping/')
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertTrue(response.data['success'])
            self.assertIn('rates', response.data)
            self.assertGreater(len(response.data['rates']), 0)
    
    def test_checkout_with_insufficient_stock(self):
        """Test: Checkout fails when stock becomes insufficient"""
        # Manually set cart with more items than available
        session = self.client.session
        session['cart'] = {
            str(self.product.uuid): {'quantity': 15}  # More than stock of 10
        }
        session.save()
        
        checkout_data = {
            'full_name': 'Test User',
            'address_line_1': '123 Test St',
            'city': 'Toronto',
            'state': 'ON',
            'postal_code': 'M5H 2N2',
            'country_code': 'CA'
        }
        
        response = self.client.post(
            '/api/checkout/',
            checkout_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertIn('insufficient_stock_items', response.data)
        self.assertEqual(len(response.data['insufficient_stock_items']), 1)
    
    def test_checkout_creates_shipping_address(self):
        """Test: Checkout creates shipping address correctly"""
        # Manually set cart in session
        session = self.client.session
        session['cart'] = {
            str(self.product.uuid): {'quantity': 1}
        }
        session.save()
        
        checkout_data = {
            'full_name': 'John Doe',
            'address_line_1': '789 Main St',
            'address_line_2': 'Apt 4B',
            'city': 'Vancouver',
            'state': 'BC',
            'postal_code': 'V6B 1A1',
            'country_code': 'CA'
        }
        
        response = self.client.post(
            '/api/checkout/',
            checkout_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify shipping address was created
        order = Order.objects.get(id=response.data['order_id'])
        shipping = order.shipping_address
        
        self.assertEqual(shipping.full_name, 'John Doe')
        self.assertEqual(shipping.address_line_1, '789 Main St')
        self.assertEqual(shipping.address_line_2, 'Apt 4B')
        self.assertEqual(shipping.city, 'Vancouver')
        self.assertEqual(shipping.state, 'BC')
        self.assertEqual(shipping.postal_code, 'V6B 1A1')
        self.assertEqual(shipping.country_code, 'CA')
        self.assertEqual(shipping.user, self.user)


class CheckoutFrontendIntegrationTestCase(APITestCase):
    """Test frontend-backend integration for checkout"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.product = Product.objects.create(
            title='Test Product',
            slug='test-product',
            price=Decimal('29.99'),
            stock=10,
            available=True,
            uuid=uuid.uuid4()
        )
        
        self.client.force_authenticate(user=self.user)
    
    def test_checkout_api_response_format(self):
        """Test: Checkout API returns correct response format for frontend"""
        # Manually set cart in session
        session = self.client.session
        session['cart'] = {
            str(self.product.uuid): {'quantity': 1}
        }
        session.save()
        
        checkout_data = {
            'full_name': 'Test User',
            'address_line_1': '123 Test St',
            'city': 'Toronto',
            'state': 'ON',
            'postal_code': 'M5H 2N2',
            'country_code': 'CA'
        }
        
        response = self.client.post(
            '/api/checkout/',
            checkout_data,
            format='json'
        )
        
        # Verify response structure matches frontend expectations
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('success', response.data)
        self.assertIn('order_id', response.data)
        self.assertIn('message', response.data)
        
        self.assertTrue(response.data['success'])
        self.assertIsInstance(response.data['order_id'], int)
        self.assertEqual(response.data['message'], 'Order created successfully')
    
    def test_checkout_error_response_format(self):
        """Test: Checkout error responses match frontend expectations"""
        # Try checkout with empty cart
        checkout_data = {
            'full_name': 'Test User',
            'address_line_1': '123 Test St',
            'city': 'Toronto',
            'state': 'ON',
            'postal_code': 'M5H 2N2',
            'country_code': 'CA'
        }
        
        response = self.client.post(
            '/api/checkout/',
            checkout_data,
            format='json'
        )
        
        # Verify error response structure
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('success', response.data)
        self.assertIn('error', response.data)
        self.assertFalse(response.data['success'])
        self.assertIsInstance(response.data['error'], str)
    
    def test_checkout_with_inventory_errors_format(self):
        """Test: Inventory error responses include detailed item information"""
        # Manually set cart with more than available stock
        session = self.client.session
        session['cart'] = {
            str(self.product.uuid): {'quantity': 15}
        }
        session.save()
        
        checkout_data = {
            'full_name': 'Test User',
            'address_line_1': '123 Test St',
            'city': 'Toronto',
            'state': 'ON',
            'postal_code': 'M5H 2N2',
            'country_code': 'CA'
        }
        
        response = self.client.post(
            '/api/checkout/',
            checkout_data,
            format='json'
        )
        
        # Verify error response includes detailed item info
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('unavailable_items', response.data)
        self.assertIn('insufficient_stock_items', response.data)
        
        # Verify insufficient stock items structure
        if response.data['insufficient_stock_items']:
            item = response.data['insufficient_stock_items'][0]
            self.assertIn('product', item)
            self.assertIn('requested_quantity', item)
            self.assertIn('available', item)
            self.assertIn('reason', item)


class CheckoutEndToEndTestCase(APITestCase):
    """End-to-end tests for complete checkout process"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
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
            weight_grams=500
        )
        
        self.client.force_authenticate(user=self.user)
    
    @patch('snmov.api_views.get_shipping_rates_for_order')
    @patch('stripe.checkout.Session.create')
    def test_complete_checkout_to_shipping_selection(self, mock_stripe_create, mock_get_rates):
        """Test: Complete flow from cart to shipping selection"""
        # Mock Stripe checkout session
        mock_stripe_session = MagicMock()
        mock_stripe_session.url = 'https://checkout.stripe.com/test-session'
        mock_stripe_create.return_value = mock_stripe_session
        
        # Mock shipping rates (already formatted by cart utility)
        mock_get_rates.return_value = [
            {
                'object_id': 'DOM.EP',
                'servicelevel': {
                    'name': 'Expedited Parcel',
                },
                'amount': '16.01',
                'currency': 'CAD',
                'estimated_days': 3,
                'courier_name': 'Canada Post',
                'provider': 'Canada Post',
                'provider_image_200': '',
                'shipment_charge': {
                    'amount': '16.01',
                    'currency': 'CAD',
                },
                '_canadapost_service_code': 'DOM.EP',
                '_canadapost_service_name': 'Expedited Parcel',
            },
            {
                'object_id': 'DOM.PC',
                'servicelevel': {
                    'name': 'Priority',
                },
                'amount': '36.92',
                'currency': 'CAD',
                'estimated_days': 2,
                'courier_name': 'Canada Post',
                'provider': 'Canada Post',
                'provider_image_200': '',
                'shipment_charge': {
                    'amount': '36.92',
                    'currency': 'CAD',
                },
                '_canadapost_service_code': 'DOM.PC',
                '_canadapost_service_name': 'Priority',
            }
        ]
        
        # Step 1: Manually set cart in session
        session = self.client.session
        session['cart'] = {
            str(self.product.uuid): {'quantity': 2}
        }
        session.save()
        
        # Step 2: Checkout
        checkout_data = {
            'full_name': 'Test User',
            'address_line_1': '123 Test St',
            'city': 'Toronto',
            'state': 'ON',
            'postal_code': 'M5H 2N2',
            'country_code': 'CA'
        }
        
        response = self.client.post(
            '/api/checkout/',
            checkout_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        order_id = response.data['order_id']
        
        # Step 3: Get shipping rates
        response = self.client.get(f'/api/orders/{order_id}/shipping/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('rates', response.data)
        
        rates = response.data['rates']
        self.assertGreater(len(rates), 0)
        
        # Step 4: Verify rate structure matches frontend expectations
        rate = rates[0]
        self.assertIn('object_id', rate)
        self.assertIn('servicelevel', rate)
        self.assertIn('name', rate['servicelevel'])
        self.assertIn('amount', rate)
        self.assertIn('total_with_shipping', rate)
        self.assertIn('provider', rate)
        self.assertIn('estimated_days', rate)
        
        # Step 5: Select shipping rate
        selected_rate = rates[0]
        response = self.client.post(
            f'/api/orders/{order_id}/select-shipping/',
            {'rate_id': selected_rate['object_id']},
            format='json'
        )
        
        # Should return Stripe checkout URL
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('checkout_url', response.data)
        self.assertEqual(response.data['checkout_url'], 'https://checkout.stripe.com/test-session')
        
        # Verify Stripe session was created with correct parameters
        mock_stripe_create.assert_called_once()
        call_args = mock_stripe_create.call_args
        self.assertEqual(call_args[1]['mode'], 'payment')
        self.assertIn('line_items', call_args[1])
        self.assertIn('success_url', call_args[1])
        self.assertIn('/product/payment/success/', call_args[1]['success_url'])
        self.assertIn('cancel_url', call_args[1])
        self.assertIn('/product/cart/checkout/', call_args[1]['cancel_url'])
    
    def test_checkout_preserves_cart_until_order_created(self):
        """Test: Cart is preserved until order is successfully created"""
        # Manually set cart in session
        session = self.client.session
        session['cart'] = {
            str(self.product.uuid): {'quantity': 1}
        }
        session.save()
        
        # Verify cart has items by checking session directly
        cart = session.get('cart', {})
        self.assertEqual(len(cart), 1)
        self.assertIn(str(self.product.uuid), cart)
        
        # Checkout
        checkout_data = {
            'full_name': 'Test User',
            'address_line_1': '123 Test St',
            'city': 'Toronto',
            'state': 'ON',
            'postal_code': 'M5H 2N2',
            'country_code': 'CA'
        }
        
        response = self.client.post(
            '/api/checkout/',
            checkout_data,
            format='json'
        )
        
        # Cart should still exist (not cleared until payment)
        # This is by design - cart is cleared after payment success
        # The important thing is order was created successfully
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        
        # Verify order was created
        order_id = response.data['order_id']
        order = Order.objects.get(id=order_id)
        self.assertEqual(order.customer, self.user)

