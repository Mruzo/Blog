import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.test import override_settings
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    DEFAULT_FROM_EMAIL='test@example.com',
)
class PasswordResetAPITestCase(APITestCase):
    def setUp(self):
        self.suffix = uuid.uuid4().hex[:8]
        self.reset_url = reverse('icvybz-api:auth-password-reset')

    def _uid_token(self, user):
        uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        return uidb64, token

    def test_inactive_unverified_user_can_request_reset_email(self):
        user = User.objects.create_user(
            username=f'inactive_{self.suffix}',
            email=f'inactive_{self.suffix}@example.com',
            password='OldPass123!',
            is_active=False,
        )
        if hasattr(user, 'is_email_verified'):
            user.is_email_verified = False
            user.save(update_fields=['is_email_verified'])

        response = self.client.post(
            self.reset_url,
            {'email': user.email},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(user.email, mail.outbox[0].to)

    def test_active_user_can_reset_without_verification_email(self):
        user = User.objects.create_user(
            username=f'active_{self.suffix}',
            email=f'active_{self.suffix}@example.com',
            password='OldPass123!',
            is_active=True,
        )
        if hasattr(user, 'is_email_verified'):
            user.is_email_verified = True
            user.save(update_fields=['is_email_verified'])

        uidb64, token = self._uid_token(user)
        confirm_url = reverse(
            'icvybz-api:auth-password-reset-confirm',
            kwargs={'uidb64': uidb64, 'token': token},
        )

        mail.outbox.clear()
        response = self.client.post(
            confirm_url,
            {'new_password1': 'NewSecure456!', 'new_password2': 'NewSecure456!'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.json()['email_verification_required'])
        self.assertEqual(len(mail.outbox), 0)

        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertTrue(user.check_password('NewSecure456!'))

    def test_inactive_user_reset_triggers_verification_email(self):
        user = User.objects.create_user(
            username=f'unverified_{self.suffix}',
            email=f'unverified_{self.suffix}@example.com',
            password='OldPass123!',
            is_active=False,
        )
        if hasattr(user, 'is_email_verified'):
            user.is_email_verified = False
            user.save(update_fields=['is_email_verified'])

        uidb64, token = self._uid_token(user)
        confirm_url = reverse(
            'icvybz-api:auth-password-reset-confirm',
            kwargs={'uidb64': uidb64, 'token': token},
        )

        response = self.client.post(
            confirm_url,
            {'new_password1': 'NewSecure456!', 'new_password2': 'NewSecure456!'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()['email_verification_required'])
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Verify Your Email', mail.outbox[0].subject)
        self.assertIn(user.email, mail.outbox[0].to)

        user.refresh_from_db()
        self.assertFalse(user.is_active)
        self.assertTrue(user.check_password('NewSecure456!'))
        if hasattr(user, 'is_email_verified'):
            self.assertFalse(user.is_email_verified)

    def test_confirm_validate_rejects_invalid_token(self):
        user = User.objects.create_user(
            username=f'validate_{self.suffix}',
            email=f'validate_{self.suffix}@example.com',
            password='OldPass123!',
        )
        uidb64, _token = self._uid_token(user)
        confirm_url = reverse(
            'icvybz-api:auth-password-reset-confirm',
            kwargs={'uidb64': uidb64, 'token': 'invalid-token'},
        )
        response = self.client.get(confirm_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unknown_email_still_returns_success(self):
        response = self.client.post(
            self.reset_url,
            {'email': f'nobody_{self.suffix}@example.com'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)
