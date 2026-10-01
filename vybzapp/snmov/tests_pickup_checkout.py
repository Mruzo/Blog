"""Staff-only in-person sales: cash or card, invoice, no public pickup checkout."""
import uuid
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from snmov.models import Invoice, Order, OrderItem, Product, ShippingAddress
from snmov.utils.checkout_fulfillment import complete_order_from_stripe_checkout_session, ensure_invoice_pdf_for_order
from snmov.utils.pdf_generation import invoice_party_details

User = get_user_model()


@override_settings(MAX_CART_ITEMS_PER_PRODUCT=1000, STRIPE_SECRET_KEY='sk_test_pos')
class InPersonSaleAPITestCase(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            username='posstaff',
            email='staff@example.com',
            password='testpass123',
            is_staff=True,
        )
        self.buyer = User.objects.create_user(
            username='regularbuyer',
            email='buyer@example.com',
            password='testpass123',
        )
        self.product = Product.objects.create(
            title='Desk mat',
            slug='desk-mat-pos',
            price=Decimal('24.00'),
            stock=5,
            available=True,
            uuid=uuid.uuid4(),
        )
        self.sale_url = reverse('api:staff-in-person-sale')
        self.checkout_url = reverse('api:checkout')

    def test_public_checkout_rejects_pickup(self):
        self.client.force_authenticate(user=self.buyer)
        session = self.client.session
        session['cart'] = {str(self.product.uuid): {'quantity': 1}}
        session.save()
        response = self.client.post(
            self.checkout_url,
            {
                'fulfillment_method': 'pickup',
                'full_name': 'Maya Buyer',
                'address_line_1': '123 Main St',
                'city': 'Toronto',
                'state': 'ON',
                'postal_code': 'M5H 2N2',
                'country_code': 'CA',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('staff', response.data.get('error', '').lower())
        self.assertEqual(Order.objects.count(), 0)

    def test_regular_user_cannot_create_in_person_sale(self):
        self.client.force_authenticate(user=self.buyer)
        response = self.client.post(
            self.sale_url,
            {
                'customer_name': 'Maya Buyer',
                'payment_method': 'cash',
                'items': [{'uuid': str(self.product.uuid), 'quantity': 1}],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Order.objects.count(), 0)

    @patch('snmov.utils.pdf_generation.generate_pdf', return_value='invoices/pos.pdf')
    def test_staff_cash_sale_completes_and_invoices(self, _mock_pdf):
        from django.core import mail
        from django.core.files.base import ContentFile
        from django.core.files.storage import default_storage

        default_storage.save('invoices/pos.pdf', ContentFile(b'%PDF-1.4 test invoice'))
        mail.outbox.clear()
        self.client.force_authenticate(user=self.staff)
        response = self.client.post(
            self.sale_url,
            {
                'customer_name': 'Maya Buyer',
                'customer_email': 'maya@example.com',
                'payment_method': 'cash',
                'items': [{'uuid': str(self.product.uuid), 'quantity': 1}],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('success'))
        self.assertTrue(response.data.get('invoice_emailed'))
        order = Order.objects.get(id=response.data['order']['id'])
        self.assertEqual(order.fulfillment_method, Order.FULFILLMENT_PICKUP)
        self.assertEqual(order.payment_method, Order.PAYMENT_CASH)
        self.assertEqual(order.status, 'DELIVERED')
        self.assertIsNotNone(order.payment_completed_at)
        self.assertEqual(order.sold_by_id, self.staff.id)
        self.assertEqual(order.customer_id, None)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 4)
        self.assertIn('invoice_url', response.data)
        self.assertEqual(len(mail.outbox), 1)
        emailed = mail.outbox[0]
        self.assertEqual(emailed.to, ['maya@example.com'])
        self.assertEqual(len(emailed.attachments), 1)
        self.assertTrue(emailed.attachments[0][0].endswith('.pdf'))
        self.assertEqual(emailed.attachments[0][2], 'application/pdf')
        self.assertIn('invoice is attached', emailed.body.lower())

    def test_staff_cash_sale_requires_email(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.post(
            self.sale_url,
            {
                'customer_name': 'Maya Buyer',
                'payment_method': 'cash',
                'items': [{'uuid': str(self.product.uuid), 'quantity': 1}],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data.get('error', '').lower())
        self.assertEqual(Order.objects.count(), 0)

    @patch('snmov.utils.checkout_fulfillment.stripe.checkout.Session.create')
    def test_staff_card_sale_returns_stripe_url(self, mock_create):
        mock_session = MagicMock()
        mock_session.id = 'cs_pos_card'
        mock_session.url = 'https://checkout.stripe.com/c/pay/cs_pos_card'
        mock_create.return_value = mock_session

        self.client.force_authenticate(user=self.staff)
        response = self.client.post(
            self.sale_url,
            {
                'customer_name': 'Maya Buyer',
                'customer_email': 'maya@example.com',
                'payment_method': 'card',
                'items': [{'uuid': str(self.product.uuid), 'quantity': 1}],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('checkout_url'), mock_session.url)
        order = Order.objects.get(id=response.data['order_id'])
        self.assertEqual(order.payment_method, Order.PAYMENT_CARD)
        self.assertEqual(order.status, 'PENDING')
        self.assertIsNone(order.payment_completed_at)


class InPersonCardFulfillmentTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='pospay',
            email='pospay@example.com',
            password='pass',
        )
        self.product = Product.objects.create(
            title='Hand-off mug',
            price=Decimal('12.00'),
            stock=3,
            available=True,
        )

    @patch('snmov.utils.checkout_fulfillment.ensure_invoice_pdf_for_order')
    @patch('snmov.utils.checkout_fulfillment.send_order_confirmation')
    @patch('snmov.utils.checkout_fulfillment.fulfill_order_shipping_label')
    def test_paid_in_person_card_skips_shipping_and_marks_delivered(self, mock_label, mock_email, _mock_pdf):
        shipping = ShippingAddress.objects.create(
            user=self.user,
            full_name='Maya Buyer',
            address_line_1='In-person pickup',
            city='Local',
            state='',
            postal_code='',
            country_code='CA',
        )
        order = Order.objects.create(
            customer=None,
            guest_email='maya@example.com',
            shipping_address=shipping,
            status='PENDING',
            fulfillment_method=Order.FULFILLMENT_PICKUP,
            payment_method=Order.PAYMENT_CARD,
            shipping_cost=Decimal('0.00'),
        )
        OrderItem.objects.create(order=order, product=self.product, quantity=1)

        session = MagicMock()
        session.payment_status = 'paid'
        session.mode = 'payment'
        session.metadata = {'order_id': str(order.id)}
        session.payment_intent = 'pi_pos'
        session.id = 'cs_pos'
        session.amount_total = 1200

        payload = complete_order_from_stripe_checkout_session(order, session)

        order.refresh_from_db()
        mock_label.assert_not_called()
        mock_email.assert_called_once()
        self.assertEqual(order.status, 'DELIVERED')
        self.assertEqual(order.shipping_provider, 'in_person')
        self.assertTrue(payload['shipping_success'])
        self.assertEqual(payload['order']['payment_method'], 'card')


class GuestInvoicePartyTestCase(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='posowner',
            email='posowner@example.com',
            password='pass',
        )

    def test_guest_invoice_uses_shipping_name_not_customer_user(self):
        shipping = ShippingAddress.objects.create(
            full_name='Walk-in customer',
            address_line_1='In-person pickup',
            city='Local',
            country_code='CA',
        )
        order = Order.objects.create(
            customer=None,
            guest_email='walkin@example.com',
            shipping_address=shipping,
            fulfillment_method=Order.FULFILLMENT_PICKUP,
            payment_method=Order.PAYMENT_CASH,
            status='DELIVERED',
        )
        name, email = invoice_party_details(order)
        self.assertEqual(name, 'Walk-in customer')
        self.assertEqual(email, 'walkin@example.com')

    def test_guest_invoice_pdf_generates_without_customer_user(self):
        product = Product.objects.create(
            title='Pos mug',
            price=Decimal('10.00'),
            stock=2,
            available=True,
            user=self.owner,
        )
        shipping = ShippingAddress.objects.create(
            full_name='Walk-in customer',
            address_line_1='In-person pickup',
            city='Local',
            country_code='CA',
        )
        order = Order.objects.create(
            customer=None,
            guest_email='',
            shipping_address=shipping,
            fulfillment_method=Order.FULFILLMENT_PICKUP,
            payment_method=Order.PAYMENT_CASH,
            status='DELIVERED',
            payment_completed_at=timezone.now(),
        )
        OrderItem.objects.create(order=order, product=product, quantity=1)
        invoice = ensure_invoice_pdf_for_order(order)
        self.assertTrue(invoice.pdf_path)
        self.assertTrue(Invoice.objects.filter(order=order).exists())
