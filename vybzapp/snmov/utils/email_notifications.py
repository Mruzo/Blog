from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.contrib.sites.models import Site

def get_site_url():
    """Get the site's base URL"""
    current_site = Site.objects.get_current()
    return f"https://{current_site.domain}"


def get_order_recipient_email(order):
    """Email address for transactional store messages (account or guest)."""
    email = order.get_contact_email() if hasattr(order, 'get_contact_email') else ''
    if email:
        return email
    if order.customer_id:
        return (order.customer.email or '').strip()
    return (getattr(order, 'guest_email', None) or '').strip()


def get_customer_facing_base_url():
    """
    Base URL for storefront links in transactional email (React app).
    Falls back to Django Sites framework when FRONTEND_URL is unset.
    """
    u = (getattr(settings, 'FRONTEND_URL', None) or '').strip()
    if u:
        return u.rstrip('/')
    return get_site_url()

def send_registration_email(user):
    """Send welcome email to newly registered users"""
    subject = 'Welcome to Vybz!'
    context = {
        'user': user,
        'site_url': get_site_url(),
    }
    html_message = render_to_string('emails/welcome_email.html', context)
    plain_message = render_to_string('emails/welcome_email.txt', context)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_message
    )

def send_order_confirmation(order):
    """Send order confirmation email"""
    subject = f'Order Confirmation - Order #{order.id}'
    
    base = get_customer_facing_base_url()
    order_url = f"{base}/product/order/{order.id}/"
    cancel_url = f"{base}/product/order/{order.id}/cancel/"
    
    context = {
        'order': order,
        'order_url': order_url,
        'cancel_url': cancel_url,
        'site_url': base,
    }
    
    html_message = render_to_string('emails/order_confirmation.html', context)
    plain_message = render_to_string('emails/order_confirmation.txt', context)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[get_order_recipient_email(order)],
        html_message=html_message
    )

def send_order_status_update(order):
    """Send email when order status changes"""
    subject = f'Order Status Update - Order #{order.id}'
    
    base = get_customer_facing_base_url()
    order_url = f"{base}/product/order/{order.id}/"
    
    context = {
        'order': order,
        'order_url': order_url,
        'site_url': base,
    }
    
    html_message = render_to_string('emails/order_status_update.html', context)
    plain_message = render_to_string('emails/order_status_update.txt', context)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[get_order_recipient_email(order)],
        html_message=html_message
    )

def send_order_cancellation_confirmation(order):
    """Send confirmation email when order is cancelled"""
    subject = f'Order Cancellation Confirmation - Order #{order.id}'
    site_url = get_site_url()
    
    context = {
        'order': order,
        'site_url': site_url,
    }
    
    html_message = render_to_string('emails/order_cancellation.html', context)
    plain_message = render_to_string('emails/order_cancellation.txt', context)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[get_order_recipient_email(order)],
        html_message=html_message,
        fail_silently=False
    )

def send_product_back_in_stock_notification(notification):
    """Send email notification when a product comes back in stock"""
    subject = f'Product Back in Stock - {notification.product.title}'
    site_url = get_site_url()
    
    # Generate product URL (assuming product detail page exists)
    try:
        from snmov.models import Product
        # Try to get product detail URL - adjust this based on your URL structure
        product_url = f"{site_url}/product/{notification.product.uuid}/"
    except:
        product_url = f"{site_url}/product/"
    
    context = {
        'notification': notification,
        'product_url': product_url,
        'site_url': site_url,
    }
    
    html_message = render_to_string('emails/product_back_in_stock.html', context)
    plain_message = render_to_string('emails/product_back_in_stock.txt', context)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[notification.email],
        html_message=html_message,
        fail_silently=False
    )

def send_abandoned_cart_reminder(user, cart_items, total_price, days_abandoned):
    """Send abandoned cart reminder email"""
    subject = f"Don't Forget Your Cart - You have items waiting for you"
    site_url = get_site_url()
    cart_url = f"{site_url}/product/cart/"
    
    context = {
        'user': user,
        'cart_items': cart_items,
        'total_price': total_price,
        'days_abandoned': days_abandoned,
        'cart_url': cart_url,
        'site_url': site_url,
    }
    
    html_message = render_to_string('emails/abandoned_cart_reminder.html', context)
    plain_message = render_to_string('emails/abandoned_cart_reminder.txt', context)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_message,
        fail_silently=False
    )

def send_order_refund_processed(order, refund_amount, refund_method=None):
    """Send email notification when order refund is processed"""
    subject = f'Refund Processed - Order #{order.id}'
    site_url = get_site_url()
    
    context = {
        'order': order,
        'refund_amount': refund_amount,
        'refund_method': refund_method,
        'site_url': site_url,
    }
    
    html_message = render_to_string('emails/order_refund_processed.html', context)
    plain_message = render_to_string('emails/order_refund_processed.txt', context)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[get_order_recipient_email(order)],
        html_message=html_message,
        fail_silently=False
    )

def send_feedback_confirmation(feedback):
    """Send confirmation email when feedback form is submitted"""
    subject = 'Thank You for Your Feedback'
    site_url = get_site_url()
    
    context = {
        'feedback': feedback,
        'site_url': site_url,
    }
    
    html_message = render_to_string('emails/feedback_confirmation.html', context)
    plain_message = render_to_string('emails/feedback_confirmation.txt', context)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[feedback.email],
        html_message=html_message,
        fail_silently=False
    )

def send_newsletter_welcome(subscription):
    """Send welcome email when user subscribes to newsletter"""
    subject = 'Welcome to Justvybz Newsletter!'
    site_url = get_site_url()
    
    # Generate unsubscribe URL
    unsubscribe_url = f"{site_url}/api/newsletter/unsubscribe/{subscription.unsubscribe_token}/"
    
    context = {
        'subscription': subscription,
        'unsubscribe_url': unsubscribe_url,
        'site_url': site_url,
    }
    
    html_message = render_to_string('emails/newsletter_welcome.html', context)
    plain_message = render_to_string('emails/newsletter_welcome.txt', context)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[subscription.email],
        html_message=html_message,
        fail_silently=False
    )

def send_newsletter_blast(subject_text, content_html, content_text, subscription):
    """Send newsletter email blast to a subscriber"""
    site_url = get_site_url()
    unsubscribe_url = f"{site_url}/api/newsletter/unsubscribe/{subscription.unsubscribe_token}/"
    
    context = {
        'subscription': subscription,
        'content': content_html,
        'unsubscribe_url': unsubscribe_url,
        'site_url': site_url,
    }
    
    html_message = render_to_string('emails/newsletter_blast.html', context)
    plain_message = content_text or render_to_string('emails/newsletter_blast.txt', context)
    
    send_mail(
        subject=subject_text,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[subscription.email],
        html_message=html_message,
        fail_silently=False
    )


def send_return_request_submitted(return_request):
    """Send email when return request is submitted"""
    subject = f'Return Request Submitted - Return #{return_request.id}'
    site_url = get_site_url()
    
    # Generate return detail URL (will be implemented in API)
    return_url = f"{site_url}/product/returns/{return_request.id}/"
    
    context = {
        'return_request': return_request,
        'order': return_request.order,
        'return_url': return_url,
        'site_url': site_url,
    }
    
    html_message = render_to_string('emails/return_request_submitted.html', context)
    plain_message = render_to_string('emails/return_request_submitted.txt', context)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[return_request.customer.email],
        html_message=html_message,
        fail_silently=False
    )


def send_return_approved(return_request, credit_note):
    """Send email when return request is approved"""
    subject = f'Return Request Approved - Return #{return_request.id}'
    site_url = get_site_url()
    
    return_url = f"{site_url}/product/returns/{return_request.id}/"
    credit_note_url = f"{site_url}/api/credit-notes/{credit_note.id}/pdf/" if getattr(credit_note, 'pdf_path', None) else None
    
    context = {
        'return_request': return_request,
        'credit_note': credit_note,
        'order': return_request.order,
        'return_url': return_url,
        'credit_note_url': credit_note_url,
        'site_url': site_url,
    }
    
    html_message = render_to_string('emails/return_approved.html', context)
    plain_message = render_to_string('emails/return_approved.txt', context)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[return_request.customer.email],
        html_message=html_message,
        fail_silently=False
    )


def send_return_rejected(return_request, reason):
    """Send email when return request is rejected"""
    subject = f'Return Request Update - Return #{return_request.id}'
    site_url = get_site_url()
    
    return_url = f"{site_url}/product/returns/{return_request.id}/"
    
    context = {
        'return_request': return_request,
        'order': return_request.order,
        'rejection_reason': reason,
        'return_url': return_url,
        'site_url': site_url,
    }
    
    html_message = render_to_string('emails/return_rejected.html', context)
    plain_message = render_to_string('emails/return_rejected.txt', context)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[return_request.customer.email],
        html_message=html_message,
        fail_silently=False
    )


def send_return_label_generated(return_request):
    """Send email when return label is generated"""
    subject = f'Return Label Ready - Return #{return_request.id}'
    site_url = get_site_url()
    
    return_url = f"{site_url}/product/returns/{return_request.id}/"
    label_url = return_request.return_label_url
    
    context = {
        'return_request': return_request,
        'order': return_request.order,
        'return_url': return_url,
        'label_url': label_url,
        'tracking_number': return_request.return_tracking_number,
        'site_url': site_url,
    }
    
    html_message = render_to_string('emails/return_label_generated.html', context)
    plain_message = render_to_string('emails/return_label_generated.txt', context)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[return_request.customer.email],
        html_message=html_message,
        fail_silently=False
    )


def send_credit_note_issued(credit_note):
    """Send email when credit note is issued"""
    subject = f'Credit Note Issued - {credit_note.credit_note_number}'
    site_url = get_site_url()
    
    return_request = credit_note.return_request
    return_url = f"{site_url}/product/returns/{return_request.id}/"
    credit_note_url = f"{site_url}/api/credit-notes/{credit_note.id}/pdf/" if credit_note.pdf_path else None
    
    context = {
        'credit_note': credit_note,
        'return_request': return_request,
        'order': return_request.order,
        'return_url': return_url,
        'credit_note_url': credit_note_url,
        'site_url': site_url,
    }
    
    html_message = render_to_string('emails/credit_note_issued.html', context)
    plain_message = render_to_string('emails/credit_note_issued.txt', context)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[return_request.customer.email],
        html_message=html_message,
        fail_silently=False
    )


def send_stripe_refund_processed(credit_note):
    """Send email when Stripe refund is successfully processed"""
    subject = f'Refund Processed - {credit_note.credit_note_number}'
    site_url = get_site_url()
    
    return_request = credit_note.return_request
    return_url = f"{site_url}/product/returns/{return_request.id}/"
    
    context = {
        'credit_note': credit_note,
        'return_request': return_request,
        'order': return_request.order,
        'return_url': return_url,
        'site_url': site_url,
    }
    
    html_message = render_to_string('emails/stripe_refund_processed.html', context)
    plain_message = render_to_string('emails/stripe_refund_processed.txt', context)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[return_request.customer.email],
        html_message=html_message,
        fail_silently=False
    )


def send_stripe_refund_failed(credit_note, error_message):
    """Send email when Stripe refund fails"""
    subject = f'Refund Processing Issue - {credit_note.credit_note_number}'
    site_url = get_site_url()
    
    return_request = credit_note.return_request
    return_url = f"{site_url}/product/returns/{return_request.id}/"
    support_email = getattr(settings, 'SUPPORT_EMAIL', settings.DEFAULT_FROM_EMAIL)
    
    context = {
        'credit_note': credit_note,
        'return_request': return_request,
        'order': return_request.order,
        'error_message': error_message,
        'return_url': return_url,
        'support_email': support_email,
        'site_url': site_url,
    }
    
    html_message = render_to_string('emails/stripe_refund_failed.html', context)
    plain_message = render_to_string('emails/stripe_refund_failed.txt', context)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[return_request.customer.email],
        html_message=html_message,
        fail_silently=False
    ) 