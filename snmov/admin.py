from django.contrib import admin
from django.contrib.auth import get_user_model
from .models import Product, Comment, Preference, ReachOut, About, SiteImage, Testimonials, ProductNotification, ARUsage, ModelUsage, ShippingAddress, Order, OrderItem, Profile, User, EmailPreference, EmailLog, NewsletterSubscription, SecurityLog, DataConsent
from tinymce.widgets import TinyMCE
from django.db import models
from django.contrib.auth.admin import UserAdmin
from django.contrib.contenttypes.models import ContentType
from django.db.models import Sum, Avg
from snmov.forms import SiteImageForm

# Remove this line since we're importing User directly from models
# User = get_user_model()

# Unregister the default User admin first
try:
    admin.site.unregister(User)
except admin.sites.NotRegistered:
    pass


class ProductUno(admin.ModelAdmin):
    formfield_overrides = {
        models.TextField: {'widget': TinyMCE()},
    }
    list_display = ['id','uuid', 'title', 'available', 'price', 'discount_percentage', 'gltf_model', 'usdz_model',]


class SiteImageAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_related_object', 'image', 'caption')
    list_filter = ('content_type', 'product')
    search_fields = ('caption', 'product__title')
    
    def get_related_object(self, obj):
        if obj.product:
            return f"Product: {obj.product.title}"
        elif obj.content_object:
            return f"{obj.content_type.model.title()}: {obj.content_object}"
        return "N/A"
    get_related_object.short_description = 'Related Object'


class ReachOutAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'full_name','email', 'subject') 

class AboutUno(admin.ModelAdmin):
    formfield_overrides = {
        models.TextField: {'widget': TinyMCE()},
    }

class NotificationUno(admin.ModelAdmin):
    # list_display = ['id','created_at', 'first_name', 'last_name', 'email', 'product','is_active',]

    list_display = ['id', 'created_at', 'first_name', 'last_name', 'email', 'product_name', 'num_notifications', 'is_active', 'get_active_notifications']
    list_filter = ['is_active', 'created_at']

    def product_name(self, obj):
        return obj.product.title  # Assuming Product model has a 'title' field

    def num_notifications(self, obj):
        return obj.product.productnotification_set.count()  # Number of notification requests for the product
    
    def get_active_notifications(self, obj):
        return obj.product.productnotification_set.filter(is_active=True).count()

    product_name.short_description = 'Product Name'
    num_notifications.short_description = 'Number of Notifications'
    get_active_notifications.short_description = 'Active Notifications'

class ARUsageUno(admin.ModelAdmin):
    list_display = ('user', 'anonymous_user_id', 'timestamp','count', 'total_usage') 

    def total_usage(self, obj):
        # Assuming you want to display a total count across all records
        total = ARUsage.objects.aggregate(total_count=Sum('count'))['total_count'] or 0
        return total

    total_usage.short_description = 'Total Usage'

class ModelUsageUno(admin.ModelAdmin):
    list_display = ('user','anonymous_user_id', 'timestamp', 'count', 'total_usage')

    def total_usage(self, obj):
        # Assuming you want to display a total count across all records
        total = ModelUsage.objects.aggregate(total_count=Sum('count'))['total_count'] or 0
        return total

    total_usage.short_description = 'Total Usage'

# Register your models here.
admin.site.register(Product, ProductUno)
admin.site.register(Comment)
admin.site.register(Preference)
admin.site.register(ReachOut, ReachOutAdmin)
admin.site.register(About, AboutUno)
admin.site.register(SiteImage, SiteImageAdmin)
admin.site.register(Testimonials)
admin.site.register(ProductNotification, NotificationUno)
admin.site.register(ARUsage, ARUsageUno)
admin.site.register(ModelUsage, ModelUsageUno)
admin.site.register(ShippingAddress)

class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'status', 'order_date', 'tracking_number', 'shipping_provider')
    list_filter = ('status', 'order_date', 'shipping_provider')
    search_fields = ('id', 'customer__username', 'customer__email', 'tracking_number')
    readonly_fields = ('order_date', 'created_at', 'updated_at', 'stripe_payment_intent_id')
    date_hierarchy = 'order_date'
    
    def save_model(self, request, obj, form, change):
        """Override save to trigger status update email if status changed"""
        if change:
            # Get the old instance to compare status
            old_obj = Order.objects.get(pk=obj.pk)
            previous_status = old_obj.status
            
            # Save the order
            super().save_model(request, obj, form, change)
            
            # Send status update email if status changed
            if obj.status != previous_status and obj.status in ['PROCESSING', 'SHIPPED', 'DELIVERED', 'LABEL_CREATED']:
                try:
                    from snmov.utils.email_notifications import send_order_status_update
                    send_order_status_update(obj)
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to send order status update email for order {obj.id}: {e}")
        else:
            super().save_model(request, obj, form, change)
    
    actions = ['process_refund']
    
    def process_refund(self, request, queryset):
        """Admin action to process refunds for cancelled orders"""
        from snmov.utils.email_notifications import send_order_refund_processed
        from decimal import Decimal
        
        processed = 0
        for order in queryset:
            if order.status != 'CANCELLED':
                continue
            
            # Calculate refund amount (order total)
            refund_amount = order.calculate_grand_total()
            
            # In a real implementation, you would process the Stripe refund here
            # For now, we'll just send the email notification
            try:
                send_order_refund_processed(order, refund_amount, "Original payment method")
                processed += 1
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send refund processed email for order {order.id}: {e}")
        
        self.message_user(request, f'Refund processed notifications sent for {processed} order(s).')
    
    process_refund.short_description = "Send refund processed notification (for cancelled orders)"

admin.site.register(Order, OrderAdmin)
admin.site.register(OrderItem)
admin.site.register(Profile)

class EmailPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'marketing_emails', 'product_notifications', 'order_updates', 'cart_reminders', 'collaboration_notifications', 'newsletter', 'created_at')
    list_filter = ('marketing_emails', 'product_notifications', 'order_updates', 'cart_reminders', 'collaboration_notifications', 'newsletter')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('unsubscribe_token', 'unsubscribe_token_created_at', 'created_at', 'updated_at')

admin.site.register(EmailPreference, EmailPreferenceAdmin)

class EmailLogAdmin(admin.ModelAdmin):
    list_display = ('email_type', 'recipient_email', 'subject', 'status', 'created_at', 'opened_at', 'bounced')
    list_filter = ('email_type', 'status', 'bounced', 'created_at')
    search_fields = ('recipient_email', 'subject', 'email_type')
    readonly_fields = ('created_at', 'opened_at', 'clicked_at', 'bounced_at')
    date_hierarchy = 'created_at'
    
    def has_add_permission(self, request):
        return False  # Logs are created automatically

admin.site.register(EmailLog, EmailLogAdmin)

class NewsletterSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('email', 'user', 'is_active', 'subscribed_at', 'unsubscribed_at', 'source')
    list_filter = ('is_active', 'subscribed_at', 'source')
    search_fields = ('email', 'user__username', 'user__email')
    readonly_fields = ('unsubscribe_token', 'subscribed_at', 'unsubscribed_at')
    date_hierarchy = 'subscribed_at'

admin.site.register(NewsletterSubscription, NewsletterSubscriptionAdmin)

class SecurityLogAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'severity', 'ip_address', 'user', 'path', 'method', 'created_at')
    list_filter = ('event_type', 'severity', 'created_at')
    search_fields = ('ip_address', 'path', 'user__username', 'user__email')
    readonly_fields = ('created_at', 'event_type', 'severity', 'ip_address', 'user_agent', 'path', 'method', 'user', 'details')
    date_hierarchy = 'created_at'
    
    def has_add_permission(self, request):
        return False  # Logs are created automatically
    
    def has_change_permission(self, request, obj=None):
        return False  # Logs should not be edited

admin.site.register(SecurityLog, SecurityLogAdmin)

class DataConsentAdmin(admin.ModelAdmin):
    list_display = ('user', 'consent_type', 'consented', 'consent_date', 'version', 'created_at')
    list_filter = ('consent_type', 'consented', 'created_at')
    search_fields = ('user__username', 'user__email', 'consent_type')
    readonly_fields = ('created_at', 'updated_at', 'ip_address', 'user_agent')
    date_hierarchy = 'created_at'

admin.site.register(DataConsent, DataConsentAdmin)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'is_email_verified')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'is_email_verified')
    
    # Add email verification fields to the existing fieldsets
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
        ('Email Verification', {'fields': ('is_email_verified', 'email_verification_token', 'email_verification_sent_at')}),
    )
    
    readonly_fields = (
        'date_joined',
        'last_login',
        'email_verification_token',
        'email_verification_sent_at',
    )

    # Keep the rest of the CustomUserAdmin class unchanged
    actions = [
        'activate_users',
        'verify_email',
    ]

    def activate_users(self, request, queryset):
        cnt = queryset.filter(is_active=False).update(is_active=True)
        self.message_user(request, 'Activated {} users.'.format(cnt))
    activate_users.short_description = 'Activate selected users'

    def verify_email(self, request, queryset):
        cnt = queryset.filter(is_email_verified=False).update(
            is_email_verified=True,
            email_verification_token=None,
            email_verification_sent_at=None
        )
        self.message_user(request, 'Verified email for {} users.'.format(cnt))
    verify_email.short_description = 'Mark selected users as email verified'

    def get_actions(self, request):
        actions = super().get_actions(request)
        if not request.user.has_perm('auth.change_user'):
            if 'activate_users' in actions:
                del actions['activate_users']
            if 'verify_email' in actions:
                del actions['verify_email']
        return actions

    def has_delete_permission(self, request, obj=None):
        return False

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        is_superuser = request.user.is_superuser
        disabled_fields = set()

        if not is_superuser:
            disabled_fields |= {
                'username',
                'is_superuser',
                'user_permissions',
            }

        if (not is_superuser and obj is not None and obj == request.user):
            disabled_fields |= {
                'is_staff',
                'is_superuser',
                'groups',
                'user_permissions',
            }

        for f in disabled_fields:
            if f in form.base_fields:
                form.base_fields[f].disabled = True

        return form
