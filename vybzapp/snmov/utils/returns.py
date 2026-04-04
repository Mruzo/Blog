"""
Business logic utilities for returns and refunds system
"""
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import logging

from snmov.models import Order, OrderItem, ReturnRequest, ReturnItem, ReturnPolicy, CreditNote

logger = logging.getLogger(__name__)


def get_return_window_days(order):
    """
    Get return window days for an order.
    Checks product-specific policies first, then falls back to global default.
    
    Args:
        order: Order instance
        
    Returns:
        int: Return window in days
    """
    # Check for product-specific policies
    for order_item in order.orderitem_set.all():
        policy = ReturnPolicy.objects.filter(product=order_item.product).first()
        if policy:
            return policy.return_window_days
    
    # Fall back to global default
    return getattr(settings, 'DEFAULT_RETURN_WINDOW_DAYS', 30)


def is_order_eligible_for_return_start(order):
    """Whether the order status allows starting a return (policy)."""
    allowed = getattr(settings, 'RETURN_ELIGIBLE_STATUSES', ('DELIVERED', 'SHIPPED'))
    if isinstance(allowed, str):
        allowed = (allowed,)
    return order.status in tuple(allowed)


def validate_return_window(order, return_window_days=None):
    """
    Validate if order is within return window.
    
    Args:
        order: Order instance
        return_window_days: Optional override for return window
        
    Returns:
        tuple: (is_valid, error_message)
    """
    if not is_order_eligible_for_return_start(order):
        return False, (
            "This order is not eligible for a return yet. "
            "Returns open after the order is shipped or delivered."
        )
    
    if return_window_days is None:
        return_window_days = get_return_window_days(order)
    
    delivery_date = order.delivered_at or order.order_date
    deadline = delivery_date + timedelta(days=return_window_days)
    
    if timezone.now() > deadline:
        return False, f"Return window has expired. Returns must be requested within {return_window_days} days of delivery."
    
    return True, None


def validate_return_items(return_request):
    """
    Validate return items - quantities, items match order, etc.
    
    Args:
        return_request: ReturnRequest instance
        
    Returns:
        tuple: (is_valid, error_message)
    """
    order = return_request.order
    
    for return_item in return_request.returnitem_set.all():
        order_item = return_item.order_item
        
        # Check item belongs to order
        if order_item.order != order:
            return False, f"Item {order_item.product.title} does not belong to order {order.id}."
        
        # Check quantity is valid
        if return_item.quantity <= 0:
            return False, f"Return quantity must be greater than 0 for {order_item.product.title}."
        
        # Check quantity doesn't exceed available
        available = order_item.get_available_for_return()
        if return_item.quantity > available:
            return False, f"Cannot return {return_item.quantity} of {order_item.product.title}. Only {available} available for return."
    
    return True, None


def validate_return_condition(return_request):
    """
    Validate return condition notes if required.
    
    Args:
        return_request: ReturnRequest instance
        
    Returns:
        tuple: (is_valid, error_message)
    """
    for return_item in return_request.returnitem_set.all():
        # Require condition notes for damaged items
        if return_item.condition == 'damaged' and not return_item.condition_notes:
            return False, f"Condition notes are required for damaged items ({return_item.order_item.product.title})."
        
        # Require condition notes for poor condition
        if return_item.condition == 'poor' and not return_item.condition_notes:
            return False, f"Condition notes are required for items in poor condition ({return_item.order_item.product.title})."
    
    return True, None


def calculate_return_shipping_cost(return_request):
    """
    Estimate return shipping (integrate carrier API in production).
    Uses total weight of returned lines when available.
    """
    if return_request is None or not return_request.pk:
        return Decimal('10.00')
    weight_g = 0
    for ri in return_request.returnitem_set.select_related('order_item__product').all():
        w = getattr(ri.order_item.product, 'weight_grams', None) or 0
        weight_g += int(w) * ri.quantity
    if weight_g <= 0:
        weight_g = 200
    base = Decimal('8.00')
    per_kg = Decimal('2.50')
    extra = (Decimal(weight_g) / Decimal('1000')) * per_kg
    return (base + extra).quantize(Decimal('0.01'))


def calculate_refund_amount(return_request):
    """
    Calculate total refund amount for return request.
    
    Args:
        return_request: ReturnRequest instance
        
    Returns:
        Decimal: Total refund amount
    """
    total = Decimal('0.00')
    
    # Sum of all returned items
    for return_item in return_request.returnitem_set.all():
        item_price = return_item.order_item.product.get_discounted_price()
        total += item_price * return_item.quantity
    
    # Deduct return shipping if customer pays
    if return_request.return_shipping_paid_by == 'customer':
        # Defensive: DecimalField default may be set as float on the in-memory instance
        # (e.g. default=0.00). Ensure we always subtract a Decimal.
        shipping_cost = return_request.return_shipping_cost
        if shipping_cost is None:
            shipping_cost = Decimal('0.00')
        elif not isinstance(shipping_cost, Decimal):
            shipping_cost = Decimal(str(shipping_cost))
        total -= shipping_cost
    
    # Apply restocking fees if any
    for return_item in return_request.returnitem_set.all():
        policy = ReturnPolicy.objects.filter(product=return_item.order_item.product).first()
        if policy and policy.restocking_fee_percentage > 0:
            item_total = return_item.order_item.product.get_discounted_price() * return_item.quantity
            restocking_fee = item_total * (policy.restocking_fee_percentage / 100)
            total -= restocking_fee
    
    return max(total, Decimal('0.00'))  # Ensure non-negative


def get_total_refunded_amount(order):
    """Sum of completed Stripe refunds for this order (credit notes)."""
    from django.db.models import Sum
    total = CreditNote.objects.filter(
        return_request__order=order,
        status='REFUNDED',
    ).aggregate(s=Sum('amount'))['s']
    return total if total is not None else Decimal('0.00')


def get_max_refundable_amount(order):
    """Remaining amount that can be refunded (matches charged total when available)."""
    refunded = get_total_refunded_amount(order)
    if order.amount_paid_cents is not None:
        paid = Decimal(order.amount_paid_cents) / Decimal('100')
        return paid - refunded
    paid = order.calculate_grand_total()
    if getattr(settings, 'TAX_ENABLED', True) and getattr(settings, 'STRIPE_CHECKOUT_INCLUDE_TAX', True):
        sub = order.calculate_total_value() or Decimal('0')
        ship = order.shipping_cost or Decimal('0')
        rate = Decimal(str(getattr(settings, 'TAX_RATE', 0) or 0))
        paid = paid + (sub + ship) * rate
    return (paid - refunded).quantize(Decimal('0.01'))


def assert_refund_within_payment_limits(order, refund_amount):
    """Raise ValueError if refund exceeds amount paid minus prior refunds."""
    max_amt = get_max_refundable_amount(order)
    if refund_amount > max_amt + Decimal('0.02'):
        raise ValueError(
            f'Refund of ${refund_amount} exceeds remaining refundable balance (${max_amt}).'
        )


def get_available_return_items(order):
    """
    Get order items available for return with quantities.
    
    Args:
        order: Order instance
        
    Returns:
        list: List of dicts with order_item, available_quantity
    """
    if not is_order_eligible_for_return_start(order):
        return []

    available_items = []
    
    for order_item in order.orderitem_set.all():
        available = order_item.get_available_for_return()
        if available > 0:
            available_items.append({
                'order_item_id': order_item.id,
                'product_name': order_item.product.title,
                'product_uuid': order_item.product.uuid,
                'quantity_ordered': order_item.quantity,
                'quantity_returned': order_item.get_returned_quantity(),
                'available_quantity': available,
                'unit_price': order_item.product.get_discounted_price(),
            })
    
    return available_items


@transaction.atomic
def process_return_approval(return_request, admin_user=None):
    """
    Process return approval - create credit note, generate PDF, process refund.
    This is wrapped in a transaction to ensure atomicity.
    
    Args:
        return_request: ReturnRequest instance
        admin_user: User who approved (optional)
        
    Returns:
        CreditNote: Created credit note
        
    Raises:
        Exception: If processing fails (transaction will rollback)
    """
    from snmov.utils.pdf_generation import generate_pdf
    from snmov.utils.stripe_refunds import process_stripe_refund
    
    # Update return request status
    return_request.status = 'APPROVED'
    return_request.approved_at = timezone.now()
    return_request.save()
    
    # Calculate refund amount
    refund_amount = calculate_refund_amount(return_request)
    assert_refund_within_payment_limits(return_request.order, refund_amount)
    
    # Create credit note
    credit_note = CreditNote.objects.create(
        return_request=return_request,
        amount=refund_amount,
        status='PENDING'
    )
    
    # Generate credit note PDF
    try:
        pdf_path = generate_pdf(
            template_name='pdf/credit_note.html',
            context={
                'credit_note': credit_note,
                'return_request': return_request,
                'order': return_request.order,
            },
            filename=f'credit_note_{credit_note.id}.pdf',
            pdf_type='credit_note'
        )
        credit_note.pdf_path = pdf_path
        credit_note.save()
    except Exception as e:
        logger.error(f"Failed to generate credit note PDF for return {return_request.id}: {e}")
        # Don't fail the whole process if PDF generation fails
        # PDF can be regenerated later
    
    # Process Stripe refund if enabled
    if getattr(settings, 'STRIPE_REFUND_ENABLED', True) and return_request.order.stripe_payment_intent_id:
        try:
            stripe_refund_id = process_stripe_refund(
                credit_note=credit_note,
                amount=refund_amount,
                payment_intent_id=return_request.order.stripe_payment_intent_id
            )
            credit_note.stripe_refund_id = stripe_refund_id
            credit_note.status = 'REFUNDED'
            credit_note.save()
        except Exception as e:
            logger.error(f"Failed to process Stripe refund for return {return_request.id}: {e}")
            # Rollback transaction on Stripe failure
            raise Exception(f"Stripe refund failed: {str(e)}")
    else:
        # Mark as issued if no Stripe refund
        credit_note.status = 'ISSUED'
        credit_note.save()
    
    # Update stock (restore returned items)
    for return_item in return_request.returnitem_set.all():
        product = return_item.order_item.product
        product.stock += return_item.quantity
        product.save()
    
    return credit_note


def process_return_rejection(return_request, rejection_reason, admin_user=None):
    """
    Process return rejection.
    
    Args:
        return_request: ReturnRequest instance
        rejection_reason: Reason for rejection
        admin_user: User who rejected (optional)
    """
    return_request.status = 'REJECTED'
    return_request.rejected_at = timezone.now()
    return_request.admin_notes = f"Rejected: {rejection_reason}"
    return_request.save()
    
    logger.info(f"Return request {return_request.id} rejected: {rejection_reason}")


def generate_return_label(return_request):
    """
    Generate return label using Canada Post.
    This will be implemented in Phase 5.
    
    Args:
        return_request: ReturnRequest instance
        
    Returns:
        dict: Label info with url, tracking_number
    """
    from snmov.utils.canadapost import create_return_label
    result = create_return_label(return_request)

    # Persist label info on the return request for later downloads / emails
    label_url = result.get('label_url')
    tracking_number = result.get('tracking_number')
    if label_url:
        return_request.return_label_url = label_url
    if tracking_number:
        return_request.return_tracking_number = tracking_number
    return_request.save(update_fields=['return_label_url', 'return_tracking_number', 'updated_at'])

    return result
