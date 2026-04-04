from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import Profile, Order, Product, ProductNotification

@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    profile, _ = Profile.objects.get_or_create(user=instance)
    profile.save()

# Store previous status before save to detect changes
_previous_order_status = {}

@receiver(pre_save, sender=Order)
def store_previous_order_status(sender, instance, **kwargs):
    """Store the previous status before saving"""
    if instance.pk:
        try:
            old_instance = Order.objects.get(pk=instance.pk)
            _previous_order_status[instance.pk] = old_instance.status
        except Order.DoesNotExist:
            _previous_order_status[instance.pk] = None
    else:
        _previous_order_status[instance.pk] = None

@receiver(post_save, sender=Order)
def send_order_status_update_email(sender, instance, created, **kwargs):
    """Send email notification when order status changes"""
    # Skip if this is a new order (will be handled by order confirmation)
    if created:
        return

    # Record first time order is marked delivered (return window / customer comms)
    if instance.status == 'DELIVERED' and not instance.delivered_at:
        from django.utils import timezone
        Order.objects.filter(pk=instance.pk, delivered_at__isnull=True).update(delivered_at=timezone.now())
    
    # Get previous status
    previous_status = _previous_order_status.get(instance.pk)
    
    # Only send status update if status actually changed and it's not the initial creation
    if previous_status and instance.status != previous_status:
        # Don't send for these statuses (handled elsewhere):
        # - ORDERED: Handled by order confirmation
        # - CANCELLED: Handled by cancellation confirmation
        if instance.status in ['PROCESSING', 'SHIPPED', 'DELIVERED', 'LABEL_CREATED']:
            try:
                from snmov.utils.email_notifications import send_order_status_update
                send_order_status_update(instance)
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send order status update email for order {instance.id}: {e}")
    
    # Clean up stored status
    if instance.pk in _previous_order_status:
        del _previous_order_status[instance.pk]

# Store previous product availability before save
_previous_product_availability = {}
_previous_product_stock = {}

@receiver(pre_save, sender=Product)
def store_previous_product_status(sender, instance, **kwargs):
    """Store the previous availability and stock before saving"""
    if instance.pk:
        try:
            old_instance = Product.objects.get(pk=instance.pk)
            _previous_product_availability[instance.pk] = old_instance.available
            _previous_product_stock[instance.pk] = old_instance.stock
        except Product.DoesNotExist:
            _previous_product_availability[instance.pk] = None
            _previous_product_stock[instance.pk] = None
    else:
        _previous_product_availability[instance.pk] = None
        _previous_product_stock[instance.pk] = None

@receiver(post_save, sender=Product)
def send_back_in_stock_notifications(sender, instance, created, **kwargs):
    """Send back-in-stock notifications when product becomes available"""
    # Skip if this is a new product
    if created:
        return
    
    # Get previous status
    previous_available = _previous_product_availability.get(instance.pk)
    previous_stock = _previous_product_stock.get(instance.pk)
    
    # Check if product just became available or stock increased from 0
    became_available = (
        (previous_available is False and instance.available is True) or
        (previous_stock == 0 and instance.stock > 0 and instance.available)
    )
    
    if became_available:
        # Find all active notifications for this product that haven't been sent
        notifications = ProductNotification.objects.filter(
            product=instance,
            is_active=True,
            notification_sent=False
        )
        
        for notification in notifications:
            notification.send_back_in_stock_notification()
    
    # Clean up stored status
    if instance.pk in _previous_product_availability:
        del _previous_product_availability[instance.pk]
    if instance.pk in _previous_product_stock:
        del _previous_product_stock[instance.pk]