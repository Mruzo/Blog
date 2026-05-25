"""Login API: session cookie must not trigger DRF CSRF 403 (production HttpOnly csrftoken)."""
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

User = get_user_model()


class LoginAPITestCase(APITestCase):
    def setUp(self):
        self.url = reverse('icvybz-api:auth-login')
        self.password = 'SecurePass123!'
        self.user = User.objects.create_user(
            username='loginuser',
            email='loginuser@example.com',
            password=self.password,
            is_active=True,
        )

    def test_login_with_email_when_session_cookie_exists(self):
        """Browsers often have a session before login; must not return 403 CSRF."""
        client = APIClient(enforce_csrf_checks=True)
        client.get('/')
        response = client.post(
            self.url,
            {'username': 'loginuser@example.com', 'password': self.password},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.json())

    def test_login_with_username(self):
        response = self.client.post(
            self.url,
            {'username': 'loginuser', 'password': self.password},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.json())
