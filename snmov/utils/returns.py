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


def validate_return_window(order, return_window_days=None):
    """
    Validate if order is within return window.
    
    Args:
        order: Order instance
        return_window_days: Optional override for return window
        
    Returns:
        tuple: (is_valid, error_message)
    """
    if order.status != 'DELIVERED':
        return False, "Order must be delivered before returns can be requested."
    
    if return_window_days is None:
        return_window_days = get_return_window_days(order)
    
    # Calculate deadline (using order_date as delivery date proxy)
    # In production, you'd use actual delivery_date if tracked
    delivery_date = order.order_date
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
    Calculate return shipping cost.
    This is a placeholder - in production, you'd integrate with shipping API.
    
    Args:
        return_request: ReturnRequest instance
        
    Returns:
        Decimal: Return shipping cost
    """
    # Placeholder: return fixed cost or calculate based on weight/dimensions
    # In production, integrate with Canada Post or other shipping provider
    return Decimal('10.00')  # Default $10 return shipping


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
        total -= return_request.return_shipping_cost
    
    # Apply restocking fees if any
    for return_item in return_request.returnitem_set.all():
        policy = ReturnPolicy.objects.filter(product=return_item.order_item.product).first()
        if policy and policy.restocking_fee_percentage > 0:
            item_total = return_item.order_item.product.get_discounted_price() * return_item.quantity
            restocking_fee = item_total * (policy.restocking_fee_percentage / 100)
            total -= restocking_fee
    
    return max(total, Decimal('0.00'))  # Ensure non-negative


def get_available_return_items(order):
    """
    Get order items available for return with quantities.
    
    Args:
        order: Order instance
        
    Returns:
        list: List of dicts with order_item, available_quantity
    """
    available_items = []
    
    for order_item in order.orderitem_set.all():
        available = order_item.get_available_for_return()
        if available > 0:
            available_items.append({
                'order_item': order_item,
                'available_quantity': available,
                'product': order_item.product,
                'quantity_ordered': order_item.quantity,
                'quantity_returned': order_item.get_returned_quantity(),
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
    # Placeholder - will be implemented when extending Canada Post
    from snmov.utils.canadapost import create_return_label
    return create_return_label(return_request)
