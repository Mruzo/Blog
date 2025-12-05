from rest_framework import serializers
from .models import Product, SiteImage, Order, OrderItem, ShippingAddress, ReachOut, NewsletterSubscription


class SiteImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteImage
        fields = ['image', 'caption']


class ProductSerializer(serializers.ModelSerializer):
    images = SiteImageSerializer(many=True, read_only=True)
    discounted_price = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'uuid', 'title', 'slug', 'description', 'content', 
            'price', 'discount_percentage', 'discounted_price',
            'available', 'stock', 'publish_date', 'timestamp', 
            'updated', 'images', 'gltf_model', 'usdz_model',
            'weight_grams', 'package_width', 'package_height', 'package_length'
        ]
        read_only_fields = ['uuid', 'timestamp', 'updated']
    
    def get_discounted_price(self, obj):
        return obj.get_discounted_price()


class ProductListSerializer(serializers.ModelSerializer):
    """Simplified serializer for product listings"""
    images = SiteImageSerializer(many=True, read_only=True)
    discounted_price = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'uuid', 'title', 'slug', 'description', 'price', 
            'discount_percentage', 'discounted_price', 'available', 
            'stock', 'images'
        ]
    
    def get_discounted_price(self, obj):
        return obj.get_discounted_price()


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    price = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'quantity', 'price']
    
    def get_price(self, obj):
        """Calculate price from product's discounted price"""
        return float(obj.product.get_discounted_price())


class ShippingAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingAddress
        fields = [
            'id', 'user', 'full_name', 'address_line_1', 'address_line_2',
            'city', 'state', 'postal_code', 'country_code'
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True, source='orderitem_set')
    shipping_address = ShippingAddressSerializer(read_only=True)
    user = serializers.SerializerMethodField()
    order_number = serializers.CharField(source='ref_code', read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'user', 'ref_code', 'order_number', 'items', 
            'ordered_date', 'shipping_address', 
            'shipping_cost', 'status', 'tracking_number', 
            'order_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['ref_code', 'order_number', 'ordered_date', 'order_date', 'created_at', 'updated_at']
    
    def get_user(self, obj):
        return {
            'id': obj.customer.id,
            'username': obj.customer.username,
            'email': obj.customer.email
        }


class CartItemSerializer(serializers.Serializer):
    """Serializer for cart operations"""
    product_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, max_value=100)
    
    def validate_product_id(self, value):
        try:
            Product.objects.get(uuid=value, available=True)
        except Product.DoesNotExist:
            raise serializers.ValidationError("Product not found or not available")
        return value


class CartUpdateSerializer(serializers.Serializer):
    """Serializer for updating cart item quantities"""
    quantity = serializers.IntegerField(min_value=1, max_value=100)


class ReachOutSerializer(serializers.ModelSerializer):
    """Serializer for contact form submissions"""
    class Meta:
        model = ReachOut
        fields = ['full_name', 'email', 'subject', 'content']
    
    def validate_email(self, value):
        """Validate email format"""
        from django.core.validators import EmailValidator
        validator = EmailValidator(message="Please enter a valid email address")
        validator(value)
        return value


class NewsletterSubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for newsletter subscriptions"""
    class Meta:
        model = NewsletterSubscription
        fields = ['email', 'source']
        extra_kwargs = {
            'source': {'required': False, 'allow_blank': True}
        }
    
    def validate_email(self, value):
        """Validate email format"""
        from django.core.validators import EmailValidator
        validator = EmailValidator(message="Please enter a valid email address")
        validator(value)
        return value
    
    def create(self, validated_data):
        """Create or reactivate subscription"""
        email = validated_data['email']
        source = validated_data.get('source', 'website')
        
        # Check if subscription already exists
        subscription, created = NewsletterSubscription.objects.get_or_create(
            email=email,
            defaults={
                'is_active': True,
                'source': source,
                'user': self.context.get('user')  # Link to user if authenticated
            }
        )
        
        # If subscription exists but is inactive, reactivate it
        if not created and not subscription.is_active:
            subscription.is_active = True
            subscription.unsubscribed_at = None
            subscription.source = source
            if self.context.get('user'):
                subscription.user = self.context['user']
            subscription.save()
        
        return subscription
