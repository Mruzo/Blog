"""
Stripe refund processing utility
"""
import stripe
import logging
from django.conf import settings
from decimal import Decimal

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')


def process_stripe_refund(credit_note, amount, payment_intent_id):
    """
    Process Stripe refund for a credit note.
    
    Args:
        credit_note: CreditNote instance
        amount: Refund amount (Decimal)
        payment_intent_id: Stripe payment intent ID
        
    Returns:
        str: Stripe refund ID
        
    Raises:
        Exception: If refund fails
    """
    if not getattr(settings, 'STRIPE_REFUND_ENABLED', True):
        logger.warning(f"Stripe refunds are disabled. Skipping refund for credit note {credit_note.id}")
        return None
    
    if not stripe.api_key:
        raise ValueError("Stripe API key not configured")
    
    if not payment_intent_id:
        raise ValueError("Payment intent ID is required for refund")
    
    try:
        # Convert Decimal to cents (Stripe uses cents)
        amount_cents = int(float(amount) * 100)
        
        # Create refund
        refund = stripe.Refund.create(
            payment_intent=payment_intent_id,
            amount=amount_cents,
            metadata={
                'credit_note_id': credit_note.id,
                'return_request_id': credit_note.return_request.id,
                'order_id': credit_note.return_request.order.id,
            }
        )
        
        logger.info(f"Stripe refund created: {refund.id} for credit note {credit_note.id}, amount: ${amount}")
        
        return refund.id
        
    except stripe.error.CardError as e:
        # Card was declined
        error_msg = f"Card error: {e.user_message}"
        logger.error(f"Stripe refund failed for credit note {credit_note.id}: {error_msg}")
        raise Exception(error_msg)
        
    except stripe.error.RateLimitError as e:
        # Too many requests
        error_msg = "Rate limit error. Please try again later."
        logger.error(f"Stripe refund rate limit for credit note {credit_note.id}: {e}")
        raise Exception(error_msg)
        
    except stripe.error.InvalidRequestError as e:
        # Invalid parameters
        error_msg = f"Invalid request: {str(e)}"
        logger.error(f"Stripe refund invalid request for credit note {credit_note.id}: {error_msg}")
        raise Exception(error_msg)
        
    except stripe.error.AuthenticationError as e:
        # Authentication failed
        error_msg = "Stripe authentication failed. Please check API keys."
        logger.error(f"Stripe authentication error for credit note {credit_note.id}: {e}")
        raise Exception(error_msg)
        
    except stripe.error.APIConnectionError as e:
        # Network error
        error_msg = "Network error connecting to Stripe. Please try again."
        logger.error(f"Stripe API connection error for credit note {credit_note.id}: {e}")
        raise Exception(error_msg)
        
    except stripe.error.StripeError as e:
        # Generic Stripe error
        error_msg = f"Stripe error: {str(e)}"
        logger.error(f"Stripe error for credit note {credit_note.id}: {error_msg}")
        raise Exception(error_msg)
        
    except Exception as e:
        # Unexpected error
        error_msg = f"Unexpected error processing refund: {str(e)}"
        logger.error(f"Unexpected error for credit note {credit_note.id}: {error_msg}")
        raise Exception(error_msg)


def get_refund_status(stripe_refund_id):
    """
    Get status of a Stripe refund.
    
    Args:
        stripe_refund_id: Stripe refund ID
        
    Returns:
        dict: Refund status information
    """
    if not stripe.api_key:
        raise ValueError("Stripe API key not configured")
    
    try:
        refund = stripe.Refund.retrieve(stripe_refund_id)
        return {
            'id': refund.id,
            'status': refund.status,
            'amount': refund.amount / 100,  # Convert from cents
            'currency': refund.currency,
            'created': refund.created,
        }
    except stripe.error.StripeError as e:
        logger.error(f"Error retrieving refund status for {stripe_refund_id}: {e}")
        raise Exception(f"Error retrieving refund status: {str(e)}")


def process_partial_refund(credit_note, amount, payment_intent_id):
    """
    Process partial refund (if needed in future).
    Currently uses same logic as full refund.
    
    Args:
        credit_note: CreditNote instance
        amount: Refund amount (Decimal)
        payment_intent_id: Stripe payment intent ID
        
    Returns:
        str: Stripe refund ID
    """
    return process_stripe_refund(credit_note, amount, payment_intent_id)
