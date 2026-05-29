"""
Idempotent order fulfillment after Stripe Checkout payment succeeds.
Used by the browser success API and by the Stripe webhook.
"""
import json
import logging
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.utils import timezone

from snmov.utils.email_notifications import send_order_confirmation
from snmov.utils.canadapost import fulfill_order_shipping_label

logger = logging.getLogger(__name__)


def _payment_intent_id(session):
    pi = session.payment_intent
    if isinstance(pi, str):
        return pi
    if pi is not None and getattr(pi, 'id', None):
        return pi.id
    return None


def _json_safe_rates(rates):
    """Ensure shipping rate structures are JSON-serializable for DB snapshot."""
    try:
        return json.loads(json.dumps(rates, default=str))
    except (TypeError, ValueError):
        return []


def snapshot_shipping_rates_on_order(order, rates):
    order.shipping_rates_snapshot = _json_safe_rates(rates)
    order.save(update_fields=['shipping_rates_snapshot'])


def _price_to_cents(amount: Decimal) -> int:
    """Convert dollars to Stripe cents (non-negative integer)."""
    cents = (amount * Decimal('100')).quantize(Decimal('1'), rounding=ROUND_HALF_UP)
    return max(0, int(cents))


def _merchandise_product_lines(order_items):
    """One Stripe line per cart item (no coupon applied on lines)."""
    lines = []
    for item in order_items:
        unit_price = item.product.get_discounted_price()
        lines.append({
            'price_data': {
                'currency': 'cad',
                'product_data': {'name': item.product.title},
                'unit_amount': _price_to_cents(unit_price),
            },
            'quantity': item.quantity or 1,
        })
    return lines


def _merchandise_after_coupon_line(order, order_items, coupon_discount: Decimal):
    """
    Single merchandise charge: subtotal minus coupon, before shipping and tax.
    Stripe requires non-negative unit_amount, so the coupon is baked into this line.
    """
    merch = order.calculate_merchandise_subtotal() or Decimal('0')
    merch_after = (merch - coupon_discount).quantize(Decimal('0.01'))
    if merch_after < 0:
        merch_after = Decimal('0.00')

    item_summary = ', '.join(
        f'{item.quantity}× {item.product.title}' for item in order_items
    )
    product_data = {'name': 'Merchandise'}
    if order.coupon_code:
        product_data['name'] = f'Merchandise (coupon {order.coupon_code})'
    if item_summary:
        product_data['description'] = item_summary[:500]

    return [{
        'price_data': {
            'currency': 'cad',
            'product_data': product_data,
            'unit_amount': _price_to_cents(merch_after),
        },
        'quantity': 1,
    }]


def stripe_tax_line_item_cents(order):
    """
    Tax amount in cents for Stripe line_items, aligned with invoice PDF (tax on subtotal + shipping).
    """
    if not getattr(settings, 'STRIPE_CHECKOUT_INCLUDE_TAX', True):
        return None
    if not getattr(settings, 'TAX_ENABLED', True):
        return None
    rate = getattr(settings, 'TAX_RATE', 0) or 0
    if rate <= 0:
        return None
    merch = order.calculate_merchandise_subtotal() or Decimal('0')
    coupon = order.calculate_coupon_discount() or Decimal('0')
    shipping = order.shipping_cost or Decimal('0')
    taxable = merch - coupon + shipping
    if taxable < 0:
        taxable = Decimal('0')
    tax = (taxable * Decimal(str(rate))).quantize(Decimal('0.01'))
    return int(tax * 100)


def build_checkout_line_items(order):
    """Stripe Checkout line_items for an order (products + shipping + optional tax)."""
    order_items = list(order.orderitem_set.select_related('product').all())
    coupon_discount = order.calculate_coupon_discount() or Decimal('0')

    if coupon_discount > 0:
        line_items = _merchandise_after_coupon_line(order, order_items, coupon_discount)
    else:
        line_items = _merchandise_product_lines(order_items)

    line_items.append({
        'price_data': {
            'currency': 'cad',
            'product_data': {'name': 'Shipping'},
            'unit_amount': _price_to_cents(order.shipping_cost or Decimal('0')),
        },
        'quantity': 1,
    })
    tax_cents = stripe_tax_line_item_cents(order)
    if tax_cents and tax_cents > 0:
        pct = float(getattr(settings, 'TAX_RATE', 0) or 0) * 100
        line_items.append({
            'price_data': {
                'currency': 'cad',
                'product_data': {'name': f'Sales tax ({pct:.1f}%)'},
                'unit_amount': tax_cents,
            },
            'quantity': 1,
        })
    return line_items


def ensure_invoice_pdf_for_order(order):
    """Create Invoice row and PDF once paid (idempotent)."""
    from snmov.models import Invoice
    from snmov.utils.pdf_generation import generate_pdf
    import os
    from django.conf import settings as dj_settings

    invoice, _created = Invoice.objects.get_or_create(order=order)
    if invoice.pdf_path:
        full = os.path.join(dj_settings.MEDIA_ROOT, invoice.pdf_path)
        if os.path.exists(full):
            return invoice
    try:
        pdf_path = generate_pdf(
            template_name='pdf/invoice.html',
            context={'order': order, 'invoice': invoice},
            filename=f'invoice_{order.id}.pdf',
            pdf_type='invoice',
        )
        invoice.pdf_path = pdf_path
        invoice.save(update_fields=['pdf_path'])
    except Exception as e:
        logger.error('Invoice PDF failed for order %s: %s', order.id, e)
    return invoice


def build_payment_success_response_dict(order, shipping_success):
    addr = order.shipping_address
    shipping_payload = {}
    if addr:
        shipping_payload = {
            'full_name': addr.full_name,
            'address_line_1': addr.address_line_1,
            'address_line_2': addr.address_line_2,
            'city': addr.city,
            'state': addr.state,
            'postal_code': addr.postal_code,
            'country_code': addr.country_code,
        }
    return {
        'success': True,
        'order': {
            'id': order.id,
            'order_date': order.order_date,
            'status': order.status,
            'shipping_cost': float(order.shipping_cost or 0),
            'tracking_number': order.tracking_number,
            'label_url': order.label_url,
            'shipping_provider': order.shipping_provider,
            'coupon_code': (order.coupon_code or '').strip(),
            'coupon_discount': float(order.calculate_coupon_discount() or 0),
            'merchandise_subtotal': float(order.calculate_merchandise_subtotal() or 0),
            'product_sale_savings': float(order.calculate_product_sale_savings() or 0),
            'tax_amount': float(order.calculate_tax_amount() or 0),
            'grand_total': float(order.calculate_grand_total() or 0),
            'orderitem_set': [
                {
                    'product': {'title': item.product.title},
                    'quantity': item.quantity,
                }
                for item in order.orderitem_set.all()
            ],
            'shipping_address': shipping_payload,
        },
        'shipping_success': shipping_success,
    }


def complete_order_from_stripe_checkout_session(order, session):
    """
    Apply payment, optional outbound label, confirmation email, invoice PDF.
    Safe to call multiple times for the same paid session (idempotent).
    """
    if session.payment_status != 'paid':
        raise ValueError(f'Checkout session is not paid (status={session.payment_status})')
    if getattr(session, 'mode', None) != 'payment':
        raise ValueError('Invalid Stripe Checkout mode')
    meta_oid = session.metadata.get('order_id')
    if not meta_oid or int(meta_oid) != order.id:
        raise ValueError('Checkout session does not match this order')

    pi_id = _payment_intent_id(session)
    if order.payment_completed_at is not None:
        if pi_id and order.stripe_payment_intent_id and order.stripe_payment_intent_id != pi_id:
            raise ValueError('Payment does not match existing order payment')

    amount_total = getattr(session, 'amount_total', None)
    if amount_total is not None:
        order.amount_paid_cents = int(amount_total)

    if order.payment_completed_at is None:
        order.stripe_checkout_session_id = session.id
        if pi_id:
            order.stripe_payment_intent_id = pi_id
        order.payment_completed_at = timezone.now()
        if order.status == 'PENDING':
            order.status = 'ORDERED'

    shipping_success = bool(order.label_url and order.tracking_number)
    if not shipping_success:
        try:
            shipping_info = fulfill_order_shipping_label(order)
            order.label_url = shipping_info['label_url']
            order.tracking_number = shipping_info['tracking_number']
            order.shipping_provider = shipping_info['carrier']
            order.status = 'PROCESSING'
            shipping_success = True
        except Exception as e:
            logger.exception('Outbound label failed for order %s: %s', order.id, e)
            shipping_success = False

    order.save()

    ensure_invoice_pdf_for_order(order)

    if not order.order_confirmation_sent_at:
        try:
            send_order_confirmation(order)
            order.order_confirmation_sent_at = timezone.now()
            order.save(update_fields=['order_confirmation_sent_at'])
        except Exception as e:
            logger.error('Order confirmation email failed for order %s: %s', order.id, e)

    order.refresh_from_db()
    return build_payment_success_response_dict(order, shipping_success)
