from rest_framework import serializers
from .models import Product, SiteImage, Order, OrderItem, ShippingAddress


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
    
    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'quantity', 'price']


class ShippingAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingAddress
        fields = [
            'id', 'user', 'street_address', 'apartment_address', 
            'city', 'state', 'zip', 'country', 'default'
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    shipping_address = ShippingAddressSerializer(read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'user', 'ref_code', 'items', 'start_date', 
            'ordered_date', 'ordered', 'shipping_address', 
            'being_delivered', 'received', 'refund_requested', 
            'refund_granted', 'payment', 'coupon', 'shipping_cost'
        ]
        read_only_fields = ['ref_code', 'start_date', 'ordered_date']


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
