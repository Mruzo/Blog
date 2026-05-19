import uuid
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

User = get_user_model()


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    DEFAULT_FROM_EMAIL='test@example.com',
)
class RegisterAPITestCase(APITestCase):
    def setUp(self):
        self.url = reverse('icvybz-api:auth-register')
        self.suffix = uuid.uuid4().hex[:8]
        self.payload = {
            'username': f'reguser_{self.suffix}',
            'email': f'reg_{self.suffix}@example.com',
            'password': 'SecurePass123!',
            'password2': 'SecurePass123!',
            'first_name': 'Reg',
            'last_name': 'User',
            'accept_terms': True,
        }

    def test_register_success(self):
        response = self.client.post(self.url, self.payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertIn('token', data)
        self.assertIn('user', data)
        self.assertIn('message', data)
        self.assertTrue(data['email_verification_required'])

        user = User.objects.get(username=self.payload['username'])
        self.assertFalse(user.is_active)
        self.assertTrue(Token.objects.filter(user=user).exists())
        self.assertEqual(data['user']['id'], user.id)

    def test_duplicate_username_returns_400_single_user(self):
        self.client.post(self.url, self.payload, format='json')
        duplicate = {**self.payload, 'email': f'other_{self.suffix}@example.com'}
        response = self.client.post(self.url, duplicate, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already exists', response.json()['error'].lower())
        self.assertEqual(
            User.objects.filter(username=self.payload['username']).count(),
            1,
        )

    def test_duplicate_email_returns_400_single_user(self):
        self.client.post(self.url, self.payload, format='json')
        duplicate = {
            **self.payload,
            'username': f'other_{self.suffix}',
        }
        response = self.client.post(self.url, duplicate, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already in use', response.json()['error'].lower())
        self.assertEqual(
            User.objects.filter(email=self.payload['email']).count(),
            1,
        )

    def test_validation_failure_does_not_create_user(self):
        invalid = {**self.payload, 'password2': 'DifferentPass!'}
        response = self.client.post(self.url, invalid, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username=self.payload['username']).exists())

    def test_token_create_failure_rolls_back_user(self):
        with patch(
            'icvybz.api_views.Token.objects.get_or_create',
            side_effect=RuntimeError('token create failed'),
        ):
            response = self.client.post(self.url, self.payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertFalse(User.objects.filter(username=self.payload['username']).exists())
        self.assertFalse(User.objects.filter(email=self.payload['email']).exists())

    @patch('icvybz.api_views.send_mail', side_effect=Exception('SMTP down'))
    def test_send_mail_failure_still_returns_201(self, _mock_send):
        response = self.client.post(self.url, self.payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username=self.payload['username'])
        self.assertTrue(Token.objects.filter(user=user).exists())

    @patch('icvybz.api_views.send_mail')
    def test_verification_email_sent_on_success(self, mock_send_mail):
        response = self.client.post(self.url, self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        if hasattr(User(), 'is_email_verified'):
            mock_send_mail.assert_called_once()
            self.assertIn('Verify Your Email', mock_send_mail.call_args[0][0])
        else:
            mock_send_mail.assert_not_called()
