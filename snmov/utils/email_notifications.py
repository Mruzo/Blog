from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.urls import reverse
from django.contrib.sites.models import Site

def get_site_url():
    """Get the site's base URL"""
    current_site = Site.objects.get_current()
    return f"https://{current_site.domain}"

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
    
    # Generate order detail URL
    site_url = get_site_url()
    order_url = f"{site_url}{reverse('snmov:order_detail', args=[order.id])}"
    cancel_url = f"{site_url}{reverse('snmov:cancel_order', args=[order.id])}"
    
    context = {
        'order': order,
        'order_url': order_url,
        'cancel_url': cancel_url,
        'site_url': site_url,
    }
    
    html_message = render_to_string('emails/order_confirmation.html', context)
    plain_message = render_to_string('emails/order_confirmation.txt', context)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[order.customer.email],
        html_message=html_message
    )

def send_order_status_update(order):
    """Send email when order status changes"""
    subject = f'Order Status Update - Order #{order.id}'
    
    site_url = get_site_url()
    order_url = f"{site_url}{reverse('snmov:order_detail', args=[order.id])}"
    
    context = {
        'order': order,
        'order_url': order_url,
        'site_url': site_url,
    }
    
    html_message = render_to_string('emails/order_status_update.html', context)
    plain_message = render_to_string('emails/order_status_update.txt', context)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[order.customer.email],
        html_message=html_message
    )

def send_order_cancellation_confirmation(order):
    """Send confirmation email when order is cancelled"""
    subject = f'Order Cancellation Confirmation - Order #{order.id}'
    
    context = {
        'order': order,
        'site_url': get_site_url(),
    }
    
    html_message = render_to_string('emails/order_cancellation.html', context)
    plain_message = render_to_string('emails/order_cancellation.txt', context)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[order.customer.email],
        html_message=html_message
    ) 