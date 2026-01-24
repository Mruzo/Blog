from rest_framework import serializers
from .models import (
    Product, SiteImage, Order, OrderItem, ShippingAddress, ReachOut, NewsletterSubscription,
    ReturnRequest, ReturnItem, CreditNote, Invoice, ReturnPolicy
)


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
    # Backwards-compatible fields expected by the frontend / older API clients
    ref_code = serializers.SerializerMethodField()
    order_number = serializers.SerializerMethodField()
    ordered_date = serializers.DateTimeField(source='order_date', read_only=True)
    
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

    def get_ref_code(self, obj):
        # Provide a stable, human-readable reference without requiring a DB field
        return f"ORD-{obj.id}"

    def get_order_number(self, obj):
        return self.get_ref_code(obj)


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


class ReturnItemSerializer(serializers.ModelSerializer):
    """Serializer for return items"""
    product_name = serializers.CharField(source='order_item.product.title', read_only=True)
    product_uuid = serializers.UUIDField(source='order_item.product.uuid', read_only=True)
    order_item_id = serializers.IntegerField(source='order_item.id', read_only=True)
    
    class Meta:
        model = ReturnItem
        fields = [
            'id', 'order_item_id', 'product_name', 'product_uuid', 
            'quantity', 'condition', 'condition_notes'
        ]


class ReturnRequestSerializer(serializers.ModelSerializer):
    """Serializer for return requests"""
    returnitem_set = ReturnItemSerializer(many=True, read_only=True)
    # Backwards/forwards compatible alias (nicer API name for clients)
    return_items = ReturnItemSerializer(source='returnitem_set', many=True, read_only=True)
    order = OrderSerializer(read_only=True)
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    customer_email = serializers.EmailField(source='customer.email', read_only=True)
    refund_amount = serializers.SerializerMethodField()
    credit_note = serializers.SerializerMethodField()
    
    class Meta:
        model = ReturnRequest
        fields = [
            'id', 'order', 'customer', 'customer_name', 'customer_email',
            'status', 'reason', 'reason_category', 'return_window_days',
            'return_shipping_cost', 'return_shipping_paid_by',
            'return_label_url', 'return_tracking_number', 'admin_notes',
            'created_at', 'updated_at', 'approved_at', 'rejected_at', 'completed_at',
            'returnitem_set', 'return_items', 'refund_amount', 'credit_note'
        ]
        read_only_fields = [
            'id', 'customer', 'status', 'created_at', 'updated_at',
            'approved_at', 'rejected_at', 'completed_at',
            'return_label_url', 'return_tracking_number'
        ]
    
    def get_refund_amount(self, obj):
        """Calculate refund amount"""
        from snmov.utils.returns import calculate_refund_amount
        return float(calculate_refund_amount(obj))
    
    def get_credit_note(self, obj):
        """Get credit note if exists"""
        if hasattr(obj, 'credit_note'):
            return {
                'id': obj.credit_note.id,
                'credit_note_number': obj.credit_note.credit_note_number,
                'amount': float(obj.credit_note.amount),
                'status': obj.credit_note.status,
                'pdf_url': f'/api/credit-notes/{obj.credit_note.id}/pdf/' if obj.credit_note.pdf_path else None,
            }
        return None


class ReturnRequestCreateSerializer(serializers.Serializer):
    """Serializer for creating return requests"""
    order_id = serializers.IntegerField()
    reason = serializers.CharField(max_length=1000)
    reason_category = serializers.ChoiceField(choices=ReturnRequest.REASON_CATEGORIES)
    return_items = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )
    return_shipping_paid_by = serializers.ChoiceField(
        choices=[('customer', 'Customer'), ('store', 'Store')],
        default='customer'
    )
    
    def validate_order_id(self, value):
        """Validate order exists and belongs to user"""
        from rest_framework.exceptions import NotFound, PermissionDenied
        try:
            order = Order.objects.get(id=value)
        except Order.DoesNotExist:
            # Use 404 (not 400) for non-existent orders
            raise NotFound("Order not found")
        
        if self.context['request'].user != order.customer:
            # Use 403 for unauthorized access
            raise PermissionDenied("Order does not belong to you")
        return value
    
    def validate_return_items(self, value):
        """Validate return items"""
        if not value:
            raise serializers.ValidationError("At least one item must be returned")
        
        for item in value:
            if 'order_item_id' not in item:
                raise serializers.ValidationError("Each item must have order_item_id")
            if 'quantity' not in item:
                raise serializers.ValidationError("Each item must have quantity")
            if 'condition' not in item:
                raise serializers.ValidationError("Each item must have condition")
            
            quantity = item['quantity']
            if quantity <= 0:
                raise serializers.ValidationError("Quantity must be greater than 0")
        
        return value


class CreditNoteSerializer(serializers.ModelSerializer):
    """Serializer for credit notes"""
    return_request_id = serializers.IntegerField(source='return_request.id', read_only=True)
    pdf_url = serializers.SerializerMethodField()
    
    class Meta:
        model = CreditNote
        fields = [
            'id', 'return_request_id', 'amount', 'credit_note_number',
            'pdf_path', 'pdf_url', 'stripe_refund_id', 'status',
            'refund_method', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'credit_note_number', 'pdf_path', 'stripe_refund_id',
            'status', 'created_at', 'updated_at'
        ]
    
    def get_pdf_url(self, obj):
        """Get PDF download URL"""
        if obj.pdf_path:
            return f'/api/credit-notes/{obj.id}/pdf/'
        return None


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for invoices"""
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    pdf_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'order_id', 'invoice_number', 'pdf_path', 'pdf_url',
            'generated_at', 'regenerated_at'
        ]
        read_only_fields = ['id', 'invoice_number', 'pdf_path', 'generated_at', 'regenerated_at']
    
    def get_pdf_url(self, obj):
        """Get PDF download URL"""
        if obj.pdf_path:
            return f'/api/orders/{obj.order.id}/invoice/'
        return None


class AvailableReturnItemSerializer(serializers.Serializer):
    """Serializer for available return items"""
    order_item_id = serializers.IntegerField()
    product_name = serializers.CharField()
    product_uuid = serializers.UUIDField()
    quantity_ordered = serializers.IntegerField()
    quantity_returned = serializers.IntegerField()
    available_quantity = serializers.IntegerField()
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)
