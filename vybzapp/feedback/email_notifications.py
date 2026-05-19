"""Email notifications for feedback tickets"""
import logging

from django.conf import settings
from django.contrib.sites.shortcuts import get_current_site
from django.core.mail import send_mail
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def get_site_url(request=None):
    """Get the site URL"""
    if request:
        current_site = get_current_site(request)
        scheme = 'https' if request.is_secure() else 'http'
        return f"{scheme}://{current_site.domain}"
    return getattr(settings, 'SITE_URL', 'https://vybz.com')


def _support_recipient():
    return getattr(settings, 'SUPPORT_EMAIL', settings.DEFAULT_FROM_EMAIL)


def send_ticket_admin_notification(ticket, request=None):
    """Notify support inbox when a ticket is created via the feedback API."""
    subject = f'New Feedback Ticket - {ticket.ticket_number}'
    message = (
        f"Ticket: {ticket.ticket_number}\n"
        f"Name: {ticket.submitted_by_name}\n"
        f"Email: {ticket.submitted_by_email}\n"
        f"Subject: {ticket.subject}\n"
        f"Category: {ticket.get_category_display()}\n"
        f"Source: {ticket.get_source_display()}\n"
        f"Priority: {ticket.get_priority_display()}\n\n"
        f"Message:\n{ticket.message}"
    )
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[_support_recipient()],
            fail_silently=False,
        )
        logger.info(
            'Support notification sent for ticket %s to %s',
            ticket.ticket_number,
            _support_recipient(),
        )
        return True
    except Exception:
        logger.exception(
            'Failed to send support notification for ticket %s',
            ticket.ticket_number,
        )
        return False


def send_ticket_confirmation_email(ticket, request=None):
    """Send confirmation email when ticket is created"""
    subject = f'Feedback Received - {ticket.ticket_number}'
    site_url = get_site_url(request)

    context = {
        'ticket': ticket,
        'site_url': site_url,
    }

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
    except Exception:
        logger.exception(
            'Failed to send ticket confirmation email for %s',
            ticket.ticket_number,
        )
        return False


def send_ticket_resolution_email(ticket, request=None):
    """Send resolution email when ticket is resolved"""
    if not ticket.resolution_notes:
        return False

    subject = f'Your Request Has Been Addressed - {ticket.ticket_number}'
    site_url = get_site_url(request)

    context = {
        'ticket': ticket,
        'site_url': site_url,
    }

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
    except Exception:
        logger.exception(
            'Failed to send ticket resolution email for %s',
            ticket.ticket_number,
        )
        return False
