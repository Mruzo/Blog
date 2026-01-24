"""Signals for feedback app"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from .models import FeedbackTicket, TicketComment, TicketStatusHistory


@receiver(pre_save, sender=FeedbackTicket)
def create_status_history_on_status_change(sender, instance, **kwargs):
    """Create status history entry when status changes"""
    if instance.pk:  # Only for existing instances
        try:
            old_instance = FeedbackTicket.objects.get(pk=instance.pk)
            if old_instance.status != instance.status:
                # Status changed - will be handled in post_save
                instance._status_changed = True
                instance._old_status = old_instance.status
        except FeedbackTicket.DoesNotExist:
            pass


@receiver(post_save, sender=FeedbackTicket)
def handle_ticket_status_change(sender, instance, created, **kwargs):
    """Handle status changes and set timestamps"""
    if created:
        # Create initial status history entry
        TicketStatusHistory.objects.create(
            ticket=instance,
            old_status=None,
            new_status=instance.status,
            changed_by=None,  # System
            notes='Ticket created'
        )
    elif hasattr(instance, '_status_changed') and instance._status_changed:
        # Status was changed - create history entry
        # Note: changed_by should be set by the view/utils that changed the status
        # This is a fallback for admin changes
        TicketStatusHistory.objects.create(
            ticket=instance,
            old_status=getattr(instance, '_old_status', None),
            new_status=instance.status,
            changed_by=None,  # Will be set by update_ticket_status if called
            notes='Status changed'
        )
        # Clean up
        if hasattr(instance, '_status_changed'):
            delattr(instance, '_status_changed')
        if hasattr(instance, '_old_status'):
            delattr(instance, '_old_status')
    
    # Set timestamps based on status
    if instance.status == 'resolved' and not instance.resolved_at:
        instance.resolved_at = timezone.now()
        instance.save(update_fields=['resolved_at'])
    elif instance.status == 'closed' and not instance.closed_at:
        instance.closed_at = timezone.now()
        instance.save(update_fields=['closed_at'])


@receiver(post_save, sender=TicketComment)
def check_first_staff_response(sender, instance, created, **kwargs):
    """Set first_response_at when first staff response is added"""
    if created and instance.is_staff_response and not instance.is_internal:
        ticket = instance.ticket
        if not ticket.first_response_at:
            ticket.first_response_at = timezone.now()
            ticket.save(update_fields=['first_response_at'])
