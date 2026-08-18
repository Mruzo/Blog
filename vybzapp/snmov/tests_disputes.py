"""Tests for payment dispute ingest, alerts, and evidence packs."""
from datetime import datetime, timezone as dt_timezone
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone

from snmov.models import Order, PaymentDispute, Product, ShippingAddress
from snmov.utils.disputes import (
    build_dispute_response_template,
    handle_stripe_dispute_event,
    maybe_send_trending_alert,
    upsert_dispute_from_stripe_object,
)

User = get_user_model()


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    SUPPORT_EMAIL='ops@example.com',
    DEFAULT_FROM_EMAIL='noreply@example.com',
    DISPUTE_TREND_THRESHOLD=2,
    DISPUTE_TREND_WINDOW_HOURS=24,
    DISPUTE_TRENDING_COOLDOWN_SECONDS=60,
)
class PaymentDisputeTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='buyer1',
            email='buyer@example.com',
            password='TestPass123!',
        )
        self.address = ShippingAddress.objects.create(
            user=self.user,
            full_name='Buyer One',
            address_line_1='123 Main',
            city='Toronto',
            state='ON',
            postal_code='M5V1A1',
            country_code='CA',
        )
        self.order = Order.objects.create(
            customer=self.user,
            status='DELIVERED',
            shipping_address=self.address,
            stripe_payment_intent_id='pi_test_123',
            payment_completed_at=timezone.now(),
            amount_paid_cents=2500,
            tracking_number='TRACK123',
        )

    def _stripe_dispute(self, dispute_id='dp_test_1', status='needs_response'):
        return {
            'id': dispute_id,
            'object': 'dispute',
            'amount': 2500,
            'currency': 'cad',
            'reason': 'fraudulent',
            'status': status,
            'payment_intent': 'pi_test_123',
            'charge': 'ch_test_1',
            'evidence_due_by': int(datetime.now(tz=dt_timezone.utc).timestamp()) + 86400,
            'is_charge_refundable': True,
            'metadata': {},
        }

    def test_upsert_links_order_and_builds_template(self):
        dispute, created = upsert_dispute_from_stripe_object(self._stripe_dispute(), 'charge.dispute.created')
        self.assertTrue(created)
        self.assertEqual(dispute.order_id, self.order.id)
        self.assertIn('Order ID:', dispute.response_draft)
        self.assertIn('TRACK123', dispute.response_draft)
        self.assertIn('buyer@example.com', dispute.response_draft)

    def test_handle_created_sends_alert_email(self):
        event = {
            'type': 'charge.dispute.created',
            'data': {'object': self._stripe_dispute('dp_alert_1')},
        }
        dispute = handle_stripe_dispute_event(event)
        self.assertIsNotNone(dispute)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('dp_alert_1', mail.outbox[0].subject)
        self.assertTrue(dispute.last_alerted_at)

    def test_trending_alert_fires_at_threshold(self):
        d1, _ = upsert_dispute_from_stripe_object(self._stripe_dispute('dp_t1'), 'charge.dispute.created')
        d2, _ = upsert_dispute_from_stripe_object(
            {**self._stripe_dispute('dp_t2'), 'payment_intent': 'pi_other'},
            'charge.dispute.created',
        )
        mail.outbox.clear()
        sent = maybe_send_trending_alert(d2)
        self.assertTrue(sent)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('trending', mail.outbox[0].subject.lower())

    def test_regenerate_template_without_order(self):
        dispute = PaymentDispute.objects.create(
            stripe_dispute_id='dp_orphan',
            amount_cents=1000,
            currency='cad',
            status='needs_response',
        )
        text = build_dispute_response_template(dispute)
        self.assertIn('No matching JustVybz order', text)
