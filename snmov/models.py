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
    object_id = models.CharField(max_length=36, null=True, blank=True)  # Use CharField for UUID compatibility
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

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.quantity} x {self.product.title} (Order {self.order.id})"




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
