"""Guest checkout: anonymous cart through pending order and session-scoped access."""
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from snmov.models import Order, Product

User = get_user_model()


@override_settings(MAX_CART_ITEMS_PER_PRODUCT=1000)
class GuestCheckoutAPITestCase(APITestCase):
    def setUp(self):
        self.product = Product.objects.create(
            title='Guest Test Product',
            slug='guest-test-product',
            price=Decimal('19.99'),
            stock=10,
            available=True,
            uuid=uuid.uuid4(),
            user=None,
        )
        self.checkout_url = reverse('api:checkout')
        self.shipping_payload = {
            'full_name': 'Guest Buyer',
            'address_line_1': '123 Main St',
            'address_line_2': '',
            'city': 'Toronto',
            'state': 'ON',
            'postal_code': 'M5V 2T6',
            'country_code': 'CA',
        }

    def _add_product_to_session_cart(self):
        session = self.client.session
        session['cart'] = {
            str(self.product.uuid): {
                'quantity': 1,
                'added_at': '2026-01-01T12:00:00+00:00',
            }
        }
        session.save()

    def test_guest_checkout_requires_email(self):
        self._add_product_to_session_cart()
        response = self.client.post(
            self.checkout_url,
            self.shipping_payload,
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data.get('error', '').lower())
        self.assertEqual(Order.objects.count(), 0)

    def test_guest_checkout_creates_order_without_customer(self):
        self._add_product_to_session_cart()
        payload = {**self.shipping_payload, 'email': 'guest.buyer@example.com'}
        response = self.client.post(self.checkout_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('success'))
        order_id = response.data['order_id']

        order = Order.objects.get(id=order_id)
        self.assertIsNone(order.customer_id)
        self.assertEqual(order.guest_email, 'guest.buyer@example.com')
        self.assertTrue(order.guest_checkout_token)

        session_tokens = self.client.session.get('guest_order_tokens', {})
        self.assertEqual(session_tokens.get(str(order.id)), order.guest_checkout_token)

    def test_guest_cannot_access_another_guest_order(self):
        self._add_product_to_session_cart()
        payload = {**self.shipping_payload, 'email': 'guest.buyer@example.com'}
        create_resp = self.client.post(self.checkout_url, payload, format='json')
        order_id = create_resp.data['order_id']

        other_client = self.client_class()
        rates_url = reverse('api:shipping-rates', kwargs={'order_id': order_id})
        with patch('snmov.api_views.get_shipping_rates_for_order', return_value=[]):
            response = other_client.get(rates_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_authenticated_checkout_still_sets_customer(self):
        user = User.objects.create_user(
            username='buyer1',
            email='buyer1@example.com',
            password='testpass123',
        )
        self.client.force_authenticate(user=user)
        self._add_product_to_session_cart()

        response = self.client.post(self.checkout_url, self.shipping_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order = Order.objects.get(id=response.data['order_id'])
        self.assertEqual(order.customer_id, user.id)
        self.assertEqual(order.guest_email, '')
