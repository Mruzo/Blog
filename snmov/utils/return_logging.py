"""
Logging utility for return/refund actions
Provides audit trail for all return-related operations
"""
import logging
from django.utils import timezone
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)


def log_return_action(action, return_request, user, details=None):
    """
    Log return-related actions for audit trail.
    
    Args:
        action: Action type (CREATE, APPROVE, REJECT, LABEL_GENERATED, REFUND_PROCESSED, REFUND_FAILED)
        return_request: ReturnRequest instance
        user: User who performed the action
        details: Optional dict with additional details
    """
    user_info = {
        'user_id': user.id if user and not isinstance(user, AnonymousUser) else None,
        'username': user.username if user and not isinstance(user, AnonymousUser) else 'Anonymous',
    }
    
    log_data = {
        'action': action,
        'return_request_id': return_request.id,
        'order_id': return_request.order.id,
        'customer_id': return_request.customer.id,
        'customer_email': return_request.customer.email,
        'status': return_request.status,
        'user': user_info,
        'timestamp': timezone.now().isoformat(),
    }
    
    if details:
        log_data['details'] = details
    
    # Log to Django logger
    logger.info(f"Return Action: {action} - Return #{return_request.id} - User: {user_info['username']} - {log_data}")
    
    # Could also store in database if needed (create ReturnLog model)
    # For now, using file-based logging


def log_refund_action(action, credit_note, user, details=None):
    """
    Log refund-related actions.
    
    Args:
        action: Action type (REFUND_PROCESSED, REFUND_FAILED, REFUND_RETRY)
        credit_note: CreditNote instance
        user: User who performed the action
        details: Optional dict with additional details
    """
    user_info = {
        'user_id': user.id if user and not isinstance(user, AnonymousUser) else None,
        'username': user.username if user and not isinstance(user, AnonymousUser) else 'System',
    }
    
    log_data = {
        'action': action,
        'credit_note_id': credit_note.id,
        'credit_note_number': credit_note.credit_note_number,
        'return_request_id': credit_note.return_request.id,
        'amount': float(credit_note.amount),
        'status': credit_note.status,
        'stripe_refund_id': credit_note.stripe_refund_id,
        'user': user_info,
        'timestamp': timezone.now().isoformat(),
    }
    
    if details:
        log_data['details'] = details
    
    logger.info(f"Refund Action: {action} - Credit Note {credit_note.credit_note_number} - {log_data}")
