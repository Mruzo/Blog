"""Tests for GDPR data export and deletion utilities."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from icvybz.models import Comic, Studio
from snmov.models import Order, ReachOut
from snmov.utils.gdpr import export_user_data, delete_user_data

User = get_user_model()


class GdprExportTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='gdpruser',
            email='gdpr@example.com',
            password='testpass123',
        )

    def test_export_includes_stories_and_orders(self):
        Comic.objects.create(user=self.user, title='My Story', description='Test')
        Order.objects.create(customer=self.user, status='ORDERED')
        ReachOut.objects.create(
            full_name='GDPR User',
            email='gdpr@example.com',
            subject='Help',
            content='Need support',
        )

        data = export_user_data(self.user)

        self.assertEqual(data['email'], 'gdpr@example.com')
        self.assertEqual(len(data['stories']), 1)
        self.assertEqual(data['stories'][0]['title'], 'My Story')
        self.assertEqual(len(data['orders']), 1)
        self.assertEqual(len(data['feedback_submissions']), 1)


class GdprDeleteTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='deleteuser',
            email='delete@example.com',
            password='testpass123',
        )
        self.user_id = self.user.id

    def test_delete_removes_ugc_and_account(self):
        Comic.objects.create(user=self.user, title='To Delete', description='Gone')
        Studio.objects.create(owner=self.user, name='My Studio')
        Order.objects.create(customer=self.user, status='ORDERED')

        summary = delete_user_data(self.user)

        self.assertTrue(summary.get('user_deleted'))
        self.assertEqual(summary.get('stories_deleted'), 1)
        self.assertEqual(summary.get('studios_deleted'), 1)
        self.assertFalse(User.objects.filter(id=self.user_id).exists())
        self.assertEqual(Comic.objects.count(), 0)
        self.assertEqual(Order.objects.count(), 1)
        self.assertIsNone(Order.objects.first().customer)

    def test_anonymize_keeps_account_disabled(self):
        Order.objects.create(customer=self.user, status='ORDERED')

        summary = delete_user_data(self.user, anonymize=True)

        self.assertTrue(summary.get('anonymized'))
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.assertTrue(self.user.email.endswith('@deleted.local'))


class GdprApiTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='apiuser',
            email='api@example.com',
            password='testpass123',
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

    def test_export_endpoint_returns_json(self):
        Comic.objects.create(user=self.user, title='API Story', description='Export me')
        url = reverse('api:gdpr-export')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        self.assertIn(b'"API Story"', response.content)

    def test_delete_endpoint_requires_password(self):
        url = reverse('api:gdpr-delete')
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_delete_endpoint_with_valid_password(self):
        Comic.objects.create(user=self.user, title='Gone', description='Bye')
        url = reverse('api:gdpr-delete')
        response = self.client.post(url, {'password': 'testpass123'}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data.get('success'))
        self.assertFalse(User.objects.filter(username='apiuser').exists())
        self.assertEqual(Comic.objects.count(), 0)
