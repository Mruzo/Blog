"""
Centralized Email Service

This module provides a centralized email service with:
- Standardized error handling and logging
- Email preferences/unsubscribe support
- Email tracking infrastructure (foundation for analytics)
- Async-ready architecture (can be upgraded to Celery/Django-Q)
"""

import logging
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
try:
    from snmov.models import EmailPreference, EmailLog
except ImportError:
    # Models might not be migrated yet
    EmailPreference = None
    EmailLog = None

logger = logging.getLogger(__name__)
User = get_user_model()


class EmailService:
    """
    Centralized email service with standardized error handling,
    preferences checking, and tracking.
    """
    
    @staticmethod
    def get_user_preferences(user):
        """Get or create email preferences for a user"""
        if not user or not user.is_authenticated:
            return None
        
        preferences, _ = EmailPreference.objects.get_or_create(user=user)
        return preferences
    
    @staticmethod
    def can_send_email(user, email_type='essential'):
        """
        Check if email can be sent to user based on preferences.
        
        Args:
            user: User instance or email string
            email_type: Type of email ('essential', 'marketing', 'product', etc.)
        
        Returns:
            bool: True if email can be sent
        """
        # Essential emails always sent
        if email_type == 'essential':
            return True
        
        # If user is not authenticated (email string), allow sending
        if isinstance(user, str) or not hasattr(user, 'is_authenticated'):
            return True
        
        if not user.is_authenticated:
            return True
        
        preferences = EmailService.get_user_preferences(user)
        if not preferences:
            return True  # Default to True if no preferences
        
        return preferences.can_receive_email(email_type)
    
    @staticmethod
    def log_email(email_type, recipient, subject, status='sent', error=None, **kwargs):
        """
        Log email sending attempt for analytics and debugging.
        
        Args:
            email_type: Type of email (e.g., 'order_confirmation', 'welcome')
            recipient: Email address or User instance
            subject: Email subject
            status: 'sent', 'failed', 'skipped'
            error: Error message if failed
            **kwargs: Additional metadata
        """
        if not EmailLog:
            return  # Models not available yet
        
        try:
            # Get email address
            if isinstance(recipient, str):
                email_address = recipient
                user = None
            else:
                email_address = recipient.email if hasattr(recipient, 'email') else str(recipient)
                user = recipient if hasattr(recipient, 'is_authenticated') else None
            
            EmailLog.objects.create(
                email_type=email_type,
                recipient_email=email_address,
                recipient_user=user,
                subject=subject,
                status=status,
                error_message=error,
                metadata=kwargs
            )
        except Exception as e:
            # Don't fail email sending if logging fails
            logger.warning(f"Failed to log email: {e}")
    
    @staticmethod
    def send_email(
        subject,
        recipient,
        template_html,
        template_txt,
        context,
        email_type='essential',
        from_email=None,
        fail_silently=False,
        **kwargs
    ):
        """
        Send email with standardized error handling and preferences checking.
        
        Args:
            subject: Email subject
            recipient: User instance or email string
            template_html: Path to HTML template
            template_txt: Path to plain text template
            context: Template context dictionary
            email_type: Type of email for preferences checking
            from_email: From email address (defaults to settings.DEFAULT_FROM_EMAIL)
            fail_silently: Whether to fail silently on errors
            **kwargs: Additional arguments for send_mail
        
        Returns:
            bool: True if email was sent successfully, False otherwise
        """
        # Get email address
        if isinstance(recipient, str):
            email_address = recipient
            user = None
        else:
            email_address = recipient.email if hasattr(recipient, 'email') else str(recipient)
            user = recipient if hasattr(recipient, 'is_authenticated') else None
        
        # Check preferences
        if user and not EmailService.can_send_email(user, email_type):
            logger.info(f"Email skipped for {email_address} - user preferences: {email_type}")
            EmailService.log_email(
                email_type=email_type,
                recipient=email_address,
                subject=subject,
                status='skipped',
                reason='user_preferences'
            )
            return False
        
        # Add unsubscribe URL to context if user has preferences
        if user and EmailPreference:
            try:
                preferences = EmailPreference.objects.get(user=user)
                from django.urls import reverse
                from django.contrib.sites.models import Site
                site_url = f"https://{Site.objects.get_current().domain}"
                context['unsubscribe_url'] = f"{site_url}{reverse('snmov:unsubscribe', args=[preferences.unsubscribe_token])}"
            except (EmailPreference.DoesNotExist, Exception):
                pass  # Don't fail if preferences don't exist
        
        # Prepare email
        try:
            html_message = render_to_string(template_html, context)
            plain_message = render_to_string(template_txt, context)
        except Exception as e:
            error_msg = f"Template rendering failed: {str(e)}"
            logger.error(error_msg)
            EmailService.log_email(
                email_type=email_type,
                recipient=email_address,
                subject=subject,
                status='failed',
                error=error_msg
            )
            if not fail_silently:
                raise
            return False
        
        # Send email
        try:
            from_email = from_email or settings.DEFAULT_FROM_EMAIL
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=from_email,
                recipient_list=[email_address],
                html_message=html_message,
                fail_silently=fail_silently,
                **kwargs
            )
            
            # Log success
            EmailService.log_email(
                email_type=email_type,
                recipient=email_address,
                subject=subject,
                status='sent'
            )
            
            logger.info(f"Email sent successfully: {email_type} to {email_address}")
            return True
            
        except Exception as e:
            error_msg = f"Email sending failed: {str(e)}"
            logger.error(error_msg, exc_info=True)
            
            EmailService.log_email(
                email_type=email_type,
                recipient=email_address,
                subject=subject,
                status='failed',
                error=error_msg
            )
            
            if not fail_silently:
                raise
            
            return False
    
    @staticmethod
    def send_email_async(
        subject,
        recipient,
        template_html,
        template_txt,
        context,
        email_type='essential',
        **kwargs
    ):
        """
        Queue email for async sending (placeholder for future Celery/Django-Q integration).
        
        Currently calls send_email synchronously, but can be upgraded to use
        Celery or Django-Q for async processing.
        
        Args:
            Same as send_email
        
        Returns:
            bool: True if queued/sent successfully
        """
        # TODO: Implement async queue (Celery/Django-Q)
        # For now, send synchronously
        return EmailService.send_email(
            subject=subject,
            recipient=recipient,
            template_html=template_html,
            template_txt=template_txt,
            context=context,
            email_type=email_type,
            fail_silently=True,  # Don't block on async sends
            **kwargs
        )

