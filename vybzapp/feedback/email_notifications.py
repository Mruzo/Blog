"""Email notifications for feedback tickets"""
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.contrib.sites.shortcuts import get_current_site


def get_site_url(request=None):
    """Get the site URL"""
    if request:
        current_site = get_current_site(request)
        scheme = 'https' if request.is_secure() else 'http'
        return f"{scheme}://{current_site.domain}"
    return getattr(settings, 'SITE_URL', 'https://vybz.com')


def send_ticket_confirmation_email(ticket, request=None):
    """Send confirmation email when ticket is created"""
    subject = f'Feedback Received - {ticket.ticket_number}'
    site_url = get_site_url(request)
    
    context = {
        'ticket': ticket,
        'site_url': site_url,
    }
    
    # Render email templates
    html_message = render_to_string('emails/ticket_created.html', context)
    plain_message = render_to_string('emails/ticket_created.txt', context)
    
    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[ticket.submitted_by_email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        # Log error but don't fail ticket creation
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to send ticket confirmation email: {e}")
        return False


def send_ticket_resolution_email(ticket, request=None):
    """Send resolution email when ticket is resolved"""
    if not ticket.resolution_notes:
        # Don't send if no resolution notes
        return False
    
    subject = f'Your Request Has Been Addressed - {ticket.ticket_number}'
    site_url = get_site_url(request)
    
    context = {
        'ticket': ticket,
        'site_url': site_url,
    }
    
    # Render email templates
    html_message = render_to_string('emails/ticket_resolved.html', context)
    plain_message = render_to_string('emails/ticket_resolved.txt', context)
    
    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[ticket.submitted_by_email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        # Log error but don't fail resolution
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to send ticket resolution email: {e}")
        return False
