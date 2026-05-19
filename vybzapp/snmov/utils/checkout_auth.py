"""Guest vs authenticated access control for store checkout APIs."""
import secrets

from django.core.exceptions import ValidationError
from django.core.validators import validate_email

from snmov.models import Order


def normalize_guest_email(raw):
    return (raw or '').strip().lower()


def validate_guest_email(raw):
    email = normalize_guest_email(raw)
    if not email:
        raise ValidationError('Email is required for guest checkout.')
    validate_email(email)
    return email


def generate_guest_checkout_token():
    return secrets.token_urlsafe(32)


def user_can_access_order(request, order):
    if request.user.is_authenticated and order.customer_id == request.user.id:
        return True
    if order.customer_id is not None:
        return False
    token = (order.guest_checkout_token or '').strip()
    if not token:
        return False
    session_tokens = request.session.get('guest_order_tokens') or {}
    return session_tokens.get(str(order.id)) == token


def store_guest_order_access(request, order):
    token = (order.guest_checkout_token or '').strip()
    if not token:
        return
    session_tokens = request.session.get('guest_order_tokens') or {}
    session_tokens[str(order.id)] = token
    request.session['guest_order_tokens'] = session_tokens
    request.session.modified = True


def get_order_for_request(request, order_id):
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return None
    if user_can_access_order(request, order):
        return order
    return None


def order_customer_api_payload(order):
    if order.customer_id:
        return {
            'username': order.customer.username,
            'email': order.customer.email,
            'is_guest': False,
        }
    return {
        'username': 'Guest',
        'email': order.guest_email,
        'is_guest': True,
    }
