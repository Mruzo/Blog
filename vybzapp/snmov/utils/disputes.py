"""
Stripe payment dispute (chargeback) handling: ingest, alerts, evidence packs.
"""
import logging
from datetime import datetime, timedelta, timezone as dt_timezone

from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from django.db.models import Q
from django.template.loader import render_to_string
from django.utils import timezone

from snmov.models import Order, PaymentDispute, CreditNote, EmailLog, ReturnRequest

logger = logging.getLogger(__name__)

DISPUTE_EVENT_TYPES = {
    'charge.dispute.created',
    'charge.dispute.updated',
    'charge.dispute.closed',
    'charge.dispute.funds_withdrawn',
    'charge.dispute.funds_reinstated',
}


def _dispute_alert_recipients():
    explicit = (getattr(settings, 'DISPUTE_ALERT_EMAIL', '') or '').strip()
    if explicit:
        return [e.strip() for e in explicit.split(',') if e.strip()]
    support = (getattr(settings, 'SUPPORT_EMAIL', '') or getattr(settings, 'DEFAULT_FROM_EMAIL', '') or '').strip()
    return [support] if support else []


def _parse_unix_ts(value):
    if value in (None, ''):
        return None
    try:
        dt = datetime.fromtimestamp(int(value), tz=dt_timezone.utc)
        if not getattr(settings, 'USE_TZ', True):
            return dt.replace(tzinfo=None)
        return dt
    except (TypeError, ValueError, OSError):
        return None


def _normalize_status(status_value):
    if not status_value:
        return 'other'
    allowed = {c[0] for c in PaymentDispute.STATUS_CHOICES}
    return status_value if status_value in allowed else 'other'


def find_order_for_dispute(payment_intent_id='', charge_id='', metadata=None):
    metadata = metadata or {}
    order_id = metadata.get('order_id')
    if order_id:
        try:
            return Order.objects.filter(id=int(order_id)).first()
        except (TypeError, ValueError):
            pass
    if payment_intent_id:
        return Order.objects.filter(stripe_payment_intent_id=payment_intent_id).first()
    return None


def build_dispute_response_template(dispute, order=None):
    """Plain-text evidence narrative for Stripe / admin review."""
    order = order or dispute.order
    lines = [
        'STRIPE DISPUTE RESPONSE DRAFT',
        f'Dispute ID: {dispute.stripe_dispute_id}',
        f'Status: {dispute.status}',
        f'Reason: {dispute.reason or "n/a"}',
        f'Amount: {dispute.amount_display}',
        f'Evidence due: {dispute.evidence_due_by or "n/a"}',
        '',
    ]
    if not order:
        lines.append('No matching JustVybz order was found for this payment.')
        lines.append('Verify payment_intent / charge IDs in Stripe Dashboard.')
        return '\n'.join(lines)

    items = []
    for item in order.orderitem_set.select_related('product').all():
        items.append(f'- {item.quantity} x {item.product.title} @ {item.product.get_discounted_price()}')

    ship = order.shipping_address
    ship_lines = []
    if ship:
        ship_lines = [
            ship.full_name,
            ship.address_line_1,
            ship.address_line_2 or '',
            f'{ship.city}, {ship.state} {ship.postal_code}',
            ship.country_code,
        ]

    returns = ReturnRequest.objects.filter(order=order).order_by('-created_at')[:5]
    credits = CreditNote.objects.filter(return_request__order=order).order_by('-created_at')[:5]
    emails = EmailLog.objects.filter(
        Q(recipient_email__iexact=order.get_contact_email()) | Q(subject__icontains=f'Order #{order.id}')
    ).order_by('-created_at')[:10] if order.get_contact_email() else []

    lines.extend([
        f'Order ID: {order.id}',
        f'Order status: {order.status}',
        f'Order date: {order.order_date}',
        f'Payment completed: {order.payment_completed_at or "n/a"}',
        f'Customer email: {order.get_contact_email() or "n/a"}',
        f'Stripe PI: {order.stripe_payment_intent_id or "n/a"}',
        f'Stripe Checkout Session: {order.stripe_checkout_session_id or "n/a"}',
        f'Amount paid (cents): {order.amount_paid_cents if order.amount_paid_cents is not None else "n/a"}',
        f'Shipping service: {order.shipping_service or "n/a"} ({order.shipping_provider or "n/a"})',
        f'Tracking: {order.tracking_number or "n/a"}',
        f'Label URL: {order.label_url or "n/a"}',
        f'Delivered at: {order.delivered_at or "n/a"}',
        '',
        'Line items:',
        *(items or ['- (none)']),
        '',
        'Shipping address:',
        *(ship_lines or ['- (none)']),
        '',
        'Return requests:',
    ])
    if returns:
        for rr in returns:
            lines.append(f'- #{rr.id} status={rr.status} reason={rr.reason_category or rr.reason}')
    else:
        lines.append('- none')

    lines.append('')
    lines.append('Credit notes / refunds:')
    if credits:
        for cn in credits:
            lines.append(
                f'- #{cn.id} amount={cn.amount} status={cn.status} stripe_refund={cn.stripe_refund_id or "n/a"}'
            )
    else:
        lines.append('- none')

    lines.append('')
    lines.append('Recent related email log:')
    if emails:
        for em in emails:
            lines.append(f'- {em.created_at} [{em.email_type}/{em.status}] {em.subject}')
    else:
        lines.append('- none found')

    lines.extend([
        '',
        'Suggested merchant statement:',
        'The customer purchased physical goods through JustVybz. Payment was captured via Stripe Checkout.',
        'Fulfillment and shipping records are listed above. We request the dispute be decided in our favor',
        'based on proof of purchase, shipping/delivery, and communication history.',
    ])
    return '\n'.join(lines)


def upsert_dispute_from_stripe_object(dispute_obj, event_type=''):
    """
    Create/update PaymentDispute from Stripe dispute object (dict-like).
    Returns (dispute, created).
    """
    if hasattr(dispute_obj, 'to_dict'):
        data = dispute_obj.to_dict()
    elif isinstance(dispute_obj, dict):
        data = dispute_obj
    else:
        data = dict(dispute_obj)

    dispute_id = data.get('id')
    if not dispute_id:
        raise ValueError('Stripe dispute object missing id')

    payment_intent = data.get('payment_intent') or ''
    if isinstance(payment_intent, dict):
        payment_intent = payment_intent.get('id') or ''
    charge = data.get('charge') or ''
    if isinstance(charge, dict):
        charge = charge.get('id') or ''

    metadata = data.get('metadata') or {}
    order = find_order_for_dispute(payment_intent, charge, metadata)

    evidence_due = _parse_unix_ts(data.get('evidence_due_by'))
    status = _normalize_status(data.get('status'))

    defaults = {
        'stripe_charge_id': charge or '',
        'stripe_payment_intent_id': payment_intent or '',
        'order': order,
        'amount_cents': int(data.get('amount') or 0),
        'currency': (data.get('currency') or 'cad').lower(),
        'reason': data.get('reason') or '',
        'status': status,
        'evidence_due_by': evidence_due,
        'is_charge_refundable': data.get('is_charge_refundable'),
        'raw_payload': {'event_type': event_type, 'dispute': data},
    }

    dispute, created = PaymentDispute.objects.update_or_create(
        stripe_dispute_id=dispute_id,
        defaults=defaults,
    )

    if created or not (dispute.response_draft or '').strip():
        dispute.response_draft = build_dispute_response_template(dispute, order)
        dispute.save(update_fields=['response_draft', 'updated_at'])

    return dispute, created


def count_recent_disputes(window_hours=None):
    hours = window_hours
    if hours is None:
        hours = int(getattr(settings, 'DISPUTE_TREND_WINDOW_HOURS', 24))
    since = timezone.now() - timedelta(hours=hours)
    return PaymentDispute.objects.filter(created_at__gte=since).count()


def maybe_send_trending_alert(dispute):
    threshold = int(getattr(settings, 'DISPUTE_TREND_THRESHOLD', 3))
    window = int(getattr(settings, 'DISPUTE_TREND_WINDOW_HOURS', 24))
    cooldown = int(getattr(settings, 'DISPUTE_TRENDING_COOLDOWN_SECONDS', 6 * 3600))
    count = count_recent_disputes(window)
    if count < threshold:
        return False

    cache_key = 'payment_dispute_trending_alert'
    if cache.get(cache_key):
        return False

    recipients = _dispute_alert_recipients()
    if not recipients:
        logger.warning('Trending dispute alert skipped: no recipients configured')
        return False

    subject = f'[JustVybz] Dispute volume trending: {count} in {window}h'
    body = (
        f'{count} payment disputes were recorded in the last {window} hours '
        f'(threshold {threshold}).\n\n'
        f'Latest dispute: {dispute.stripe_dispute_id}\n'
        f'Status: {dispute.status}\n'
        f'Amount: {dispute.amount_display}\n'
        f'Order: {dispute.order_id or "unmatched"}\n\n'
        f'Review Payment Disputes in Django admin and Stripe Dashboard.'
    )
    send_mail(
        subject=subject,
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=recipients,
        fail_silently=False,
    )
    cache.set(cache_key, True, cooldown)
    dispute.trending_alert_sent_at = timezone.now()
    dispute.save(update_fields=['trending_alert_sent_at', 'updated_at'])
    return True


def send_dispute_created_alert(dispute, created=True):
    recipients = _dispute_alert_recipients()
    if not recipients:
        logger.warning('Dispute alert skipped: no recipients configured')
        return False

    verb = 'opened' if created else 'updated'
    subject = f'[JustVybz] Payment dispute {verb}: {dispute.stripe_dispute_id}'
    context = {
        'dispute': dispute,
        'order': dispute.order,
        'verb': verb,
        'evidence_preview': (dispute.response_draft or '')[:4000],
        'site_url': getattr(settings, 'FRONTEND_URL', '') or '',
    }
    try:
        html_message = render_to_string('emails/payment_dispute_alert.html', context)
        plain_message = render_to_string('emails/payment_dispute_alert.txt', context)
    except Exception:
        plain_message = (
            f'Dispute {dispute.stripe_dispute_id} {verb}.\n'
            f'Status: {dispute.status}\nReason: {dispute.reason}\n'
            f'Amount: {dispute.amount_display}\nOrder: {dispute.order_id}\n'
            f'Due: {dispute.evidence_due_by}\n'
        )
        html_message = None

    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=recipients,
        html_message=html_message,
        fail_silently=False,
    )
    dispute.last_alerted_at = timezone.now()
    dispute.save(update_fields=['last_alerted_at', 'updated_at'])
    return True


def handle_stripe_dispute_event(event):
    """
    Process a Stripe webhook event related to disputes.
    Returns PaymentDispute or None.
    """
    event_type = event.get('type') if isinstance(event, dict) else getattr(event, 'type', None)
    if event_type not in DISPUTE_EVENT_TYPES:
        return None

    data_object = event['data']['object'] if isinstance(event, dict) else event.data.object
    dispute, created = upsert_dispute_from_stripe_object(data_object, event_type=event_type)

    if event_type == 'charge.dispute.created' or created:
        try:
            send_dispute_created_alert(dispute, created=True)
        except Exception:
            logger.exception('Failed to send dispute created alert for %s', dispute.stripe_dispute_id)
        try:
            maybe_send_trending_alert(dispute)
        except Exception:
            logger.exception('Failed trending dispute alert for %s', dispute.stripe_dispute_id)
    elif event_type in ('charge.dispute.updated', 'charge.dispute.closed'):
        # Alert on status changes that still need attention
        if dispute.status in ('needs_response', 'warning_needs_response'):
            try:
                send_dispute_created_alert(dispute, created=False)
            except Exception:
                logger.exception('Failed to send dispute update alert for %s', dispute.stripe_dispute_id)

    return dispute
