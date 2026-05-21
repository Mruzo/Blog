import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.contrib.sites.shortcuts import get_current_site
from django.core.mail import send_mail
from django.urls import reverse
from django.utils import timezone
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode

logger = logging.getLogger(__name__)
User = get_user_model()


def get_user_from_uidb64(uidb64):
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        return User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return None


def user_needs_email_verification(user):
    if hasattr(user, 'is_email_verified'):
        return not user.is_email_verified or not user.is_active
    return not user.is_active


def send_verification_email(user, request, token=None):
    token = token or default_token_generator.make_token(user)
    current_site = get_current_site(request)
    verify_path = reverse(
        'verify_email',
        kwargs={'user_id': user.id, 'token': token},
    )
    scheme = 'https' if (
        request.is_secure() or getattr(settings, 'ACCOUNT_DEFAULT_HTTP_PROTOCOL', '') == 'https'
    ) else 'http'
    verification_url = f'{scheme}://{current_site.domain}{verify_path}'
    subject = 'Verify Your Email - Justvybz'
    message = (
        f'Hi {user.username},\n\n'
        f'Please verify your email address by clicking the link below:\n'
        f'{verification_url}\n\n'
        f'Best regards,\nJustVybz Team'
    )
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def schedule_post_password_reset_verification(user, request):
    """
    For unverified/inactive accounts: require email verification before login.
    Sends verification email immediately after a successful password reset.
    """
    if not user_needs_email_verification(user):
        return False

    token = default_token_generator.make_token(user)
    update_fields = ['is_active']
    user.is_active = False

    if hasattr(user, 'is_email_verified'):
        user.is_email_verified = False
        update_fields.append('is_email_verified')
    if hasattr(user, 'email_verification_token'):
        user.email_verification_token = token
        user.email_verification_sent_at = timezone.now()
        update_fields.extend(['email_verification_token', 'email_verification_sent_at'])

    user.save(update_fields=update_fields)

    try:
        send_verification_email(user, request, token=token)
    except Exception:
        logger.exception('Failed to send verification email after password reset for user %s', user.pk)
        raise

    return True
