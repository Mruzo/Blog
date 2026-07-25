import uuid

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class LoginAPITestCase(APITestCase):
    def setUp(self):
        self.url = reverse('icvybz-api:auth-login')
        self.suffix = uuid.uuid4().hex[:8]
        self.password = 'SecurePass123!'
        self.user = User.objects.create_user(
            username=f'loginuser_{self.suffix}',
            email=f'login_{self.suffix}@example.com',
            password=self.password,
            is_active=True,
        )

    def test_login_with_username(self):
        response = self.client.post(
            self.url,
            {'username': self.user.username, 'password': self.password},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.json())

    def test_login_with_email(self):
        response = self.client.post(
            self.url,
            {'username': self.user.email, 'password': self.password},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.json())

    def test_login_with_unknown_email_returns_400(self):
        response = self.client.post(
            self.url,
            {'username': f'nobody_{self.suffix}@example.com', 'password': self.password},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_with_username_is_case_insensitive(self):
        mixed = self.user.username.swapcase()
        self.assertNotEqual(mixed, self.user.username)
        response = self.client.post(
            self.url,
            {'username': mixed, 'password': self.password},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.json())
