from django.db import models
from django.conf import settings
from django.utils import timezone
from django.db.models import Q
from meta.models import ModelMeta
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from dj_shop_cart.cart import CartItem
from dj_shop_cart.protocols import Numeric
import uuid
from django.contrib.auth.models import AbstractUser
from decimal import Decimal


# Create your models here.

class User(AbstractUser):
    is_email_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=100, blank=True, null=True)
    email_verification_sent_at = models.DateTimeField(null=True, blank=True)

    class Meta(AbstractUser.Meta):
        swappable = 'AUTH_USER_MODEL'
        db_table = 'snmov_User'  # Match the case of the model name
        verbose_name = 'User'  # Match the case of the model name
        verbose_name_plural = 'Users'  # Match the case of the model name

class Profile(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    phone = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return f"{self.user.username}'s profile"

class ProductQuerySet(models.QuerySet):
    def published(self):
        now = timezone.now()
        return self.filter(publish_date__lte=now)

    def search(self, query):
        lookup = (
            Q(title__icontains=query) |
            Q(content__icontains=query) |
            Q(slug__icontains=query)
            # user search
            # Q(user__first_name__icontains=query) |
            # Q(user__last_name__icontains=query) |
            # Q(user__username__icontains=query)
        )
        return self.filter(lookup)


class ProductManager(models.Manager):

    # class Meta:
    #     ordering = ['-publish_date', '-updated', '-timestamp']

    def get_queryset(self):
        return ProductQuerySet(self.model, using=self._db)

    def published(self):
        return self.get_queryset().published()

    def search(self, query=None):
        if query is None:
            return self.get_queryset().none()
        return self.get_queryset().published().search(query)


class Product(ModelMeta, models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)  # New UUID field
    user = models.ForeignKey(settings.AUTH_USER_MODEL, default=1, null=True,
                             on_delete=models.SET_NULL)
    title = models.CharField(max_length=120)
    slug = models.SlugField(unique=True, null=True, blank=True)
    description = models.CharField(max_length=160, null=True)
    content = models.TextField(null=True, blank=True)
    publish_date = models.DateTimeField(
        auto_now=False, auto_now_add=False, null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)  # Original price
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)  # Discount percentage
    timestamp = models.DateTimeField(auto_now_add=True)
    likes = models.IntegerField(default=0)
    dislikes = models.IntegerField(default=0)
    updated = models.DateTimeField(auto_now=True)
    available = models.BooleanField(default=True)

    # Add GLTF model field
    gltf_model = models.FileField(upload_to='gltf_models/', blank=True, null=True)
    usdz_model = models.FileField(upload_to='usdz_models/', blank=True, null=True)
    stock = models.PositiveIntegerField(default=0)
    weight_grams = models.PositiveIntegerField(default=0, help_text="Weight in grams for Easyship")
    package_width = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, help_text="Width in cm")
    package_height = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, help_text="Height in cm")
    package_length = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, help_text="Length in cm")


    objects = ProductManager()

    _metadata = {
        'title': 'title',
        'description': 'description',
        'image': 'get_meta_image',
    }

    def get_meta_image(self):
        first_image = self.images.first()
        if first_image:
            return first_image.image.url
        return None
        
    
    def get_meta_gltf(self):
        if self.gltf_model:
            return self.gltf_model.url
        

    class Meta:
        ordering = ['-publish_date', '-updated', '-timestamp']
        app_label = 'snmov'

    def __str__(self):
        return self.title

    # def get_absolute_url(self):
    #     return reverse('product_detail', kwargs={'slug': self.slug})
    
    # def get_gltf_url(self):
    #     return f"/product/{self.slug}"
    
    def get_gltf_url(self):
        return self.gltf_model.url if self.gltf_model else ""

    def get_meta_usdz(self):
        return self.usdz_model.url if self.gltf_model else ""
            
    
    def get_discounted_price(self):
        if self.discount_percentage > 0:
            return self.price * (1 - self.discount_percentage / 100)
        return self.price
    
    # def get_price(self, item:CartItem) -> Numeric:
    #     return item.product.price * item.quantity
    
    def get_package_dimensions(self):
        return {
            "width": float(self.package_width or 0),
            "height": float(self.package_height or 0),
            "length": float(self.package_length or 0),
        }

    def get_edit_url(self):
        return f"{self.get_absolute_url()}/edit"

    def get_delete_url(self):
        return f"{self.get_absolute_url()}/delete"

    def approved_comments(self):
        return self.comments.filter(approved_comment=True)

    @property
    def comments_count_multiplied(self):
        return 2 * self.comments.count()

class ProductNotification(models.Model):
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30)
    email = models.EmailField()
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(null=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.product.title} Notification"

class ReachOut(models.Model):
    full_name = models.CharField(max_length=30)
    email = models.EmailField(max_length=40)
    subject = models.CharField(max_length=50, null=True)
    content = models.TextField(max_length=250)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.subject


class SiteImage(models.Model):
    # Generic relation fields
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.TextField(null=True, blank=True)  # Changed to TextField to handle both UUID and integer IDs
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Direct product relationship for better admin interface
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True, related_name="images")
    
    image = models.ImageField(upload_to='image/', blank=True, null=True)
    caption = models.CharField(max_length=50, blank=True)

    def __str__(self):
        if self.product:
            return f"Image for {self.product.title} - {self.caption}"
        elif self.content_object:
            return f"Image for {self.content_object} - {self.caption}"
        return f"Image {self.id}"

    def get_meta_image(self):
        """Returns the URL of the image if available."""
        if self.image:
            return self.image.url
        return None

    def save(self, *args, **kwargs):
        # If product is set but content_type/object_id isn't, set them
        if self.product and not self.content_type:
            self.content_type = ContentType.objects.get_for_model(Product)
            self.object_id = str(self.product.uuid)
        
        # Convert integer IDs to strings for consistent storage
        if self.object_id and self.content_type:
            model_class = self.content_type.model_class()
            if model_class:
                pk_type = type(model_class._meta.pk)
                if pk_type in (models.AutoField, models.BigAutoField, models.IntegerField, models.BigIntegerField):
                    try:
                        # Ensure integer IDs are stored as strings
                        int_id = int(self.object_id)
                        self.object_id = str(int_id)
                    except (ValueError, TypeError):
                        pass  # Not an integer ID, leave as is (could be UUID)
        
        super().save(*args, **kwargs)

class Testimonials(models.Model):
    caption = models.CharField(max_length=100)
    image = models.ImageField(upload_to='image/', blank=True, null=True)

    def __str__(self):
        return f'{self.caption}'

    def get_meta_image(self):
        if self.image:
            return self.image.url


class ARUsage(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)  # Track user (optional)
    anonymous_user_id = models.CharField(max_length=255, null=True, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)
    count = models.IntegerField(default=0)

    def __str__(self):
        if self.user:
            return f"AR usage by {self.user} at {self.timestamp}"
        return f"AR usage by anonymous user {self.anonymous_user_id} at {self.timestamp}"

class ModelUsage(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)  # Track user (optional)
    anonymous_user_id = models.CharField(max_length=255, null=True, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)
    count = models.IntegerField(default=0)
    
    def __str__(self):
        if self.user:
            return f"Model usage by {self.user} at {self.timestamp}"
        return f"Model usage by anonymous user {self.anonymous_user_id} at {self.timestamp}"

class ShippingAddress(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='shipping_addresses', null=True)
    full_name = models.CharField(max_length=255)
    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country_code = models.CharField(max_length=2)  # e.g., 'US', 'CA'

    class Meta:
        verbose_name_plural = "ShippingAddress"

    def save(self, *args, **kwargs):
        if not self.full_name:
            self.full_name = f'{self.user.first_name()} {self.user.last_name}'
        super().save(*args, **kwargs)
        

class Order(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ORDERED', 'Payment Received'),
        ('PROCESSING', 'Processing'),
        ('LABEL_CREATED', 'Label Created'),
        ('SHIPPED', 'Shipped'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
        ('FAILED', 'Failed'),
    ]

    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders")
    order_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')  # Increased max_length
    products = models.ManyToManyField(Product, through='OrderItem')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    shipping_address = models.ForeignKey(ShippingAddress, on_delete=models.SET_NULL, null=True, blank=True)
    shipping_rate_id = models.CharField(max_length=100, blank=True, null=True)
    shipping_provider = models.CharField(max_length=50, blank=True, null=True)
    shipping_service = models.CharField(max_length=100, blank=True, null=True)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    tracking_number = models.CharField(max_length=100, blank=True, null=True)
    label_url = models.URLField(blank=True, null=True)
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True, null=True)
    shipping_label_created_at = models.DateTimeField(null=True, blank=True)  # New field
    shipping_label_error = models.TextField(blank=True, null=True)  # New field for storing error messages
    

    def __str__(self):
        return f"Order {self.id} by {self.customer.username}"
    
    def calculate_total_weight(self):
        return sum([
            item.product.weight_grams * item.quantity
            for item in self.orderitem_set.select_related('product')
        ])

    def calculate_total_value(self):
        return sum([
            item.product.get_discounted_price() * item.quantity
            for item in self.orderitem_set.select_related('product')
        ])
    
    def calculate_grand_total(self):
        subtotal = self.calculate_total_value()
        shipping = self.shipping_cost or Decimal("0.00")
        return subtotal + shipping
    
    def is_eligible_for_return(self):
        """Check if order is eligible for returns"""
        # Only delivered orders can be returned
        if self.status != 'DELIVERED':
            return False
        
        # Check if within return window
        from django.conf import settings
        from datetime import timedelta
        
        return_window = getattr(settings, 'DEFAULT_RETURN_WINDOW_DAYS', 30)
        deadline = self.order_date + timedelta(days=return_window)
        return timezone.now() <= deadline

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.quantity} x {self.product.title} (Order {self.order.id})"
    
    def get_returned_quantity(self):
        """Get total quantity already returned for this order item"""
        return sum([
            return_item.quantity
            for return_item in self.returnitem_set.all()
            if return_item.return_request.status in ['APPROVED', 'PROCESSING', 'COMPLETED']
        ])
    
    def get_available_for_return(self):
        """Get quantity available for return"""
        return self.quantity - self.get_returned_quantity()


class ReturnPolicy(models.Model):
    """Return policy configuration - can be global or product-specific"""
    product = models.ForeignKey(
        Product, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='return_policies',
        help_text="If null, this is the global default policy"
    )
    return_window_days = models.PositiveIntegerField(
        default=30,
        help_text="Number of days from delivery to allow returns"
    )
    restocking_fee_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        help_text="Restocking fee as percentage (0-100)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Return Policy"
        verbose_name_plural = "Return Policies"
        unique_together = ['product']  # One policy per product (or one global)
    
    def __str__(self):
        if self.product:
            return f"Return Policy for {self.product.title}"
        return "Global Return Policy"


class ReturnRequest(models.Model):
    """Return request model"""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    REASON_CATEGORIES = [
        ('defective', 'Defective/Damaged'),
        ('wrong_item', 'Wrong Item Received'),
        ('not_as_described', 'Not as Described'),
        ('changed_mind', 'Changed Mind'),
        ('size_fit', 'Size/Fit Issue'),
        ('quality', 'Quality Issue'),
        ('other', 'Other'),
    ]
    
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='return_requests')
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='return_requests')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    reason = models.TextField(help_text="Customer's reason for return")
    reason_category = models.CharField(max_length=50, choices=REASON_CATEGORIES)
    return_window_days = models.PositiveIntegerField(
        default=30,
        help_text="Return window at time of request"
    )
    return_shipping_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        help_text="Cost of return shipping"
    )
    return_shipping_paid_by = models.CharField(
        max_length=20,
        choices=[('customer', 'Customer'), ('store', 'Store')],
        default='customer'
    )
    return_label_url = models.URLField(blank=True, null=True)
    return_tracking_number = models.CharField(max_length=100, blank=True, null=True)
    admin_notes = models.TextField(blank=True, null=True, help_text="Internal admin notes")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Return Request"
        verbose_name_plural = "Return Requests"
    
    def __str__(self):
        return f"Return #{self.id} for Order {self.order.id} - {self.get_status_display()}"
    
    def is_within_window(self):
        """Check if return request is within return window"""
        if self.order.status != 'DELIVERED':
            return False
        
        # Get return window from policy or use default
        from django.conf import settings
        from datetime import timedelta
        
        return_window = getattr(settings, 'DEFAULT_RETURN_WINDOW_DAYS', 30)
        
        # Check if product has specific policy
        for item in self.returnitem_set.all():
            policy = ReturnPolicy.objects.filter(product=item.order_item.product).first()
            if policy:
                return_window = policy.return_window_days
                break
        
        # Check if order was delivered within window
        # For now, use order_date + return_window_days
        # In production, you'd use actual delivery date
        delivery_date = self.order.order_date
        deadline = delivery_date + timedelta(days=return_window)
        return timezone.now() <= deadline
    
    def calculate_refund_amount(self):
        """Calculate total refund amount"""
        from decimal import Decimal
        
        # Sum of all returned items
        total = Decimal('0.00')
        for return_item in self.returnitem_set.all():
            item_price = return_item.order_item.product.get_discounted_price()
            total += item_price * return_item.quantity
        
        # Deduct return shipping if customer pays
        if self.return_shipping_paid_by == 'customer':
            total -= self.return_shipping_cost
        
        # Apply restocking fees if any
        for return_item in self.returnitem_set.all():
            policy = ReturnPolicy.objects.filter(product=return_item.order_item.product).first()
            if policy and policy.restocking_fee_percentage > 0:
                item_total = return_item.order_item.product.get_discounted_price() * return_item.quantity
                restocking_fee = item_total * (policy.restocking_fee_percentage / 100)
                total -= restocking_fee
        
        return max(total, Decimal('0.00'))  # Ensure non-negative


class ReturnItem(models.Model):
    """Items being returned"""
    CONDITION_CHOICES = [
        ('new', 'New/Unopened'),
        ('like_new', 'Like New'),
        ('good', 'Good'),
        ('fair', 'Fair'),
        ('poor', 'Poor'),
        ('damaged', 'Damaged'),
    ]
    
    return_request = models.ForeignKey(ReturnRequest, on_delete=models.CASCADE, related_name='returnitem_set')
    order_item = models.ForeignKey(OrderItem, on_delete=models.CASCADE, related_name='returnitem_set')
    quantity = models.PositiveIntegerField()
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='good')
    condition_notes = models.TextField(blank=True, null=True, help_text="Additional notes about item condition")
    
    class Meta:
        verbose_name = "Return Item"
        verbose_name_plural = "Return Items"
    
    def __str__(self):
        return f"{self.quantity} x {self.order_item.product.title} (Return #{self.return_request.id})"


class Invoice(models.Model):
    """Invoice model for orders"""
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='invoice')
    invoice_number = models.CharField(max_length=50, unique=True)
    pdf_path = models.CharField(max_length=500, blank=True, null=True)
    generated_at = models.DateTimeField(auto_now_add=True)
    regenerated_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-generated_at']
        verbose_name = "Invoice"
        verbose_name_plural = "Invoices"
    
    def __str__(self):
        return f"Invoice {self.invoice_number} for Order {self.order.id}"
    
    def save(self, *args, **kwargs):
        if not self.invoice_number:
            # Generate invoice number: INV-YYYYMMDD-{order_id}
            from datetime import datetime
            date_str = datetime.now().strftime('%Y%m%d')
            self.invoice_number = f"INV-{date_str}-{self.order.id}"
        super().save(*args, **kwargs)


class CreditNote(models.Model):
    """Credit note for refunds"""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ISSUED', 'Issued'),
        ('REFUNDED', 'Refunded'),
        ('FAILED', 'Failed'),
    ]
    
    return_request = models.OneToOneField(ReturnRequest, on_delete=models.CASCADE, related_name='credit_note')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    credit_note_number = models.CharField(max_length=50, unique=True)
    pdf_path = models.CharField(max_length=500, blank=True, null=True)
    stripe_refund_id = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    refund_method = models.CharField(max_length=50, default='Original payment method')
    regenerated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Credit Note"
        verbose_name_plural = "Credit Notes"
    
    def __str__(self):
        return f"Credit Note {self.credit_note_number} - ${self.amount}"
    
    def save(self, *args, **kwargs):
        if not self.credit_note_number:
            # Generate credit note number: CN-YYYYMMDD-{return_id}
            from datetime import datetime
            date_str = datetime.now().strftime('%Y%m%d')
            self.credit_note_number = f"CN-{date_str}-{self.return_request.id}"
        super().save(*args, **kwargs)


class Preference(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    post = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='preferences')
    value = models.IntegerField()
    created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} : \'{self.post.slug}\''

    class Meta:
        unique_together = ('user', 'post', 'value')


class Comment(models.Model):
    comment_cont = models.TextField(max_length=200, verbose_name='Comment')
    user_name = models.ForeignKey(
        settings.AUTH_USER_MODEL, default=1, null=True, on_delete=models.SET_NULL)
    comment_post = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='comments')
    comment_date = models.DateTimeField(default=timezone.now)
    approved_comment = models.BooleanField(default=False)

    class Meta:
        ordering = ['-comment_date']

    def __str__(self):
        return self.comment_cont

    def get_absolute_url(self):
        return f"/article/{self.pk}"

    # def get_absolute_url(self):
    #     return f"{Article.get_absolute_url()}"

    def get_addc_url(self):
        return f"{self.get_absolute_url()}/addc"

    def get_deletec_url(self):
        return f"{self.get_absolute_url()}/deletec"

    def approve(self):
        self.approved_comment = True
        self.save()

class About(models.Model):
    body = models.TextField(null=True, blank=True)


class EmailPreference(models.Model):
    """Model to track user email preferences and unsubscribe status"""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='email_preferences'
    )
    
    # Essential emails (cannot be unsubscribed)
    # These are always sent regardless of preferences
    # - Order confirmations
    # - Password resets
    # - Account security alerts
    
    # Marketing emails
    marketing_emails = models.BooleanField(default=True, help_text="Receive marketing and promotional emails")
    
    # Product notifications
    product_notifications = models.BooleanField(default=True, help_text="Receive product back in stock notifications")
    
    # Order updates
    order_updates = models.BooleanField(default=True, help_text="Receive order status update emails")
    
    # Abandoned cart reminders
    cart_reminders = models.BooleanField(default=True, help_text="Receive abandoned cart reminder emails")
    
    # Collaboration notifications
    collaboration_notifications = models.BooleanField(default=True, help_text="Receive collaboration invitation and request emails")
    
    # Newsletter
    newsletter = models.BooleanField(default=False, help_text="Subscribe to newsletter")
    
    # Unsubscribe token for one-click unsubscribe
    unsubscribe_token = models.CharField(max_length=64, unique=True, null=True, blank=True)
    unsubscribe_token_created_at = models.DateTimeField(null=True, blank=True)
    
    # Tracking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Email Preference"
        verbose_name_plural = "Email Preferences"
    
    def __str__(self):
        return f"Email Preferences for {self.user.username}"
    
    def save(self, *args, **kwargs):
        if not self.unsubscribe_token:
            import secrets
            self.unsubscribe_token = secrets.token_urlsafe(32)
            self.unsubscribe_token_created_at = timezone.now()
        super().save(*args, **kwargs)
    
    def can_receive_email(self, email_type):
        """
        Check if user can receive a specific type of email.
        
        email_type options:
        - 'marketing': Marketing/promotional emails
        - 'product': Product back in stock notifications
        - 'order_updates': Order status updates (non-essential)
        - 'cart_reminders': Abandoned cart reminders
        - 'collaboration': Collaboration invitations/requests
        - 'newsletter': Newsletter emails
        - 'essential': Essential emails (always True)
        """
        if email_type == 'essential':
            return True  # Essential emails always sent
        
        if email_type == 'marketing':
            return self.marketing_emails
        elif email_type == 'product':
            return self.product_notifications
        elif email_type == 'order_updates':
            return self.order_updates
        elif email_type == 'cart_reminders':
            return self.cart_reminders
        elif email_type == 'collaboration':
            return self.collaboration_notifications
        elif email_type == 'newsletter':
            return self.newsletter
        
        return True  # Default to True if unknown type


class EmailLog(models.Model):
    """Model to track email sending for analytics and debugging"""
    
    STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('skipped', 'Skipped'),
    ]
    
    email_type = models.CharField(
        max_length=50,
        help_text="Type of email (e.g., 'order_confirmation', 'welcome')"
    )
    recipient_email = models.EmailField()
    recipient_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_logs'
    )
    subject = models.CharField(max_length=255)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    error_message = models.TextField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional metadata")
    
    # Tracking fields (for future analytics integration)
    opened_at = models.DateTimeField(null=True, blank=True)
    clicked_at = models.DateTimeField(null=True, blank=True)
    bounced = models.BooleanField(default=False)
    bounced_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email_type', 'status']),
            models.Index(fields=['recipient_email', 'created_at']),
            models.Index(fields=['recipient_user', 'created_at']),
        ]
        verbose_name = "Email Log"
        verbose_name_plural = "Email Logs"
    
    def __str__(self):
        return f"{self.email_type} to {self.recipient_email} - {self.status}"


class NewsletterSubscription(models.Model):
    """Model for newsletter subscriptions (for periodic email blasts)"""
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True, help_text="Whether the subscription is active")
    subscribed_at = models.DateTimeField(auto_now_add=True)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)
    unsubscribe_token = models.CharField(max_length=64, unique=True, null=True, blank=True)
    
    # Optional: Link to user account if they have one
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='newsletter_subscriptions'
    )
    
    # Source tracking
    source = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Where the subscription came from (e.g., 'website', 'checkout', 'signup')"
    )
    
    class Meta:
        verbose_name = "Newsletter Subscription"
        verbose_name_plural = "Newsletter Subscriptions"
        ordering = ['-subscribed_at']
        indexes = [
            models.Index(fields=['email', 'is_active']),
            models.Index(fields=['is_active', 'subscribed_at']),
        ]
    
    def __str__(self):
        return f"{self.email} - {'Active' if self.is_active else 'Unsubscribed'}"
    
    def save(self, *args, **kwargs):
        if not self.unsubscribe_token:
            import secrets
            self.unsubscribe_token = secrets.token_urlsafe(32)
        if not self.is_active and not self.unsubscribed_at:
            self.unsubscribed_at = timezone.now()
        super().save(*args, **kwargs)
    
    def unsubscribe(self):
        """Unsubscribe from newsletter"""
        self.is_active = False
        self.unsubscribed_at = timezone.now()
        self.save()
        
        # Also update user's EmailPreference if linked
        if self.user:
            try:
                preference = self.user.email_preferences
                preference.newsletter = False
                preference.save()
            except EmailPreference.DoesNotExist:
                pass


class SecurityLog(models.Model):
    """Model for security event logging (NIST, PCI DSS compliance)"""
    
    SEVERITY_CHOICES = [
        ('INFO', 'Info'),
        ('WARNING', 'Warning'),
        ('ERROR', 'Error'),
        ('CRITICAL', 'Critical'),
    ]
    
    EVENT_TYPE_CHOICES = [
        ('login_success', 'Login Success'),
        ('login_failed', 'Login Failed'),
        ('brute_force_attempt', 'Brute Force Attempt'),
        ('rate_limit_exceeded', 'Rate Limit Exceeded'),
        ('unauthorized_access', 'Unauthorized Access'),
        ('file_upload', 'File Upload'),
        ('payment_processed', 'Payment Processed'),
        ('data_export', 'Data Export'),
        ('data_deletion', 'Data Deletion'),
        ('password_reset', 'Password Reset'),
        ('api_access', 'API Access'),
        ('suspicious_activity', 'Suspicious Activity'),
    ]
    
    event_type = models.CharField(max_length=50, choices=EVENT_TYPE_CHOICES)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='INFO')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default='')
    path = models.CharField(max_length=255, blank=True, default='')
    method = models.CharField(max_length=10, blank=True, default='')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='security_logs'
    )
    details = models.JSONField(default=dict, blank=True, help_text="Additional event details")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event_type', 'created_at']),
            models.Index(fields=['ip_address', 'created_at']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['severity', 'created_at']),
        ]
        verbose_name = "Security Log"
        verbose_name_plural = "Security Logs"
    
    def __str__(self):
        return f"{self.event_type} - {self.severity} - {self.created_at}"


class DataConsent(models.Model):
    """Model for GDPR consent management"""
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='data_consents'
    )
    consent_type = models.CharField(
        max_length=50,
        choices=[
            ('privacy_policy', 'Privacy Policy'),
            ('terms_of_service', 'Terms of Service'),
            ('cookies', 'Cookie Consent'),
            ('marketing', 'Marketing Emails'),
            ('analytics', 'Analytics Tracking'),
        ]
    )
    consented = models.BooleanField(default=False)
    consent_date = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    version = models.CharField(max_length=20, help_text="Version of policy/terms consented to")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'consent_type']
        ordering = ['-created_at']
        verbose_name = "Data Consent"
        verbose_name_plural = "Data Consents"
    
    def __str__(self):
        return f"{self.user.username} - {self.consent_type} - {'Consented' if self.consented else 'Not Consented'}"
