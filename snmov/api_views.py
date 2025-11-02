from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth import get_user_model
import json
import uuid
from decimal import Decimal

from .models import Product, Order, OrderItem, ShippingAddress
from .serializers import (
    ProductSerializer, ProductListSerializer, OrderSerializer, 
    CartItemSerializer, CartUpdateSerializer
)
from .utils.cart import get_cart_for_session, get_shipping_rates, get_sender_address
from .forms import ShippingAddressForm
from django.urls import reverse
import stripe
import shippo
from django.conf import settings

User = get_user_model()


class ProductListView(generics.ListAPIView):
    """API view for listing products"""
    queryset = Product.objects.filter(available=True).prefetch_related('images')
    serializer_class = ProductListSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by category if provided
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category__slug=category)
        
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(title__icontains=search)
        
        # Order by publish date (newest first)
        return queryset.order_by('-publish_date')


class ProductDetailView(generics.RetrieveAPIView):
    """API view for product details"""
    queryset = Product.objects.filter(available=True).prefetch_related('images')
    serializer_class = ProductSerializer
    lookup_field = 'slug'
    permission_classes = [AllowAny]


@api_view(['GET'])
@permission_classes([AllowAny])
def get_cart(request):
    """Get current cart contents"""
    cart_data = get_cart_for_session(request)
    return Response(cart_data)


@api_view(['POST'])
@permission_classes([AllowAny])
def add_to_cart(request):
    """Add product to cart"""
    serializer = CartItemSerializer(data=request.data)
    if serializer.is_valid():
        product_id = serializer.validated_data['product_id']
        quantity = serializer.validated_data['quantity']
        
        try:
            product = Product.objects.get(uuid=product_id, available=True)
            
            # Get current cart from session
            cart = request.session.get('cart', {})
            product_id_str = str(product_id)
            
            # Check if product is already in cart
            if product_id_str not in cart:
                cart[product_id_str] = {'quantity': 0}
            
            # Add quantity
            cart[product_id_str]['quantity'] += quantity
            
            # Save cart to session
            request.session['cart'] = cart
            request.session.modified = True
            
            # Calculate cart totals
            cart_data = get_cart_for_session(request)
            
            return Response({
                'success': True,
                'message': f'Added {product.title} to cart',
                'cart': cart_data
            })
            
        except Product.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Product not found or not available'
            }, status=status.HTTP_404_NOT_FOUND)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT'])
@permission_classes([AllowAny])
def update_cart_item(request, product_id):
    """Update cart item quantity"""
    try:
        product_uuid = uuid.UUID(str(product_id))
        product = Product.objects.get(uuid=product_uuid, available=True)
    except (ValueError, Product.DoesNotExist):
        return Response({
            'success': False,
            'error': 'Product not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    serializer = CartUpdateSerializer(data=request.data)
    if serializer.is_valid():
        quantity = serializer.validated_data['quantity']
        product_id_str = str(product_id)
        
        # Get current cart
        cart = request.session.get('cart', {})
        
        if product_id_str in cart:
            cart[product_id_str]['quantity'] = quantity
            request.session['cart'] = cart
            request.session.modified = True
            
            # Calculate updated cart totals
            cart_data = get_cart_for_session(request)
            
            return Response({
                'success': True,
                'message': f'Updated {product.title} quantity',
                'cart': cart_data
            })
        else:
            return Response({
                'success': False,
                'error': 'Product not in cart'
            }, status=status.HTTP_404_NOT_FOUND)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([AllowAny])
def remove_from_cart(request, product_id):
    """Remove product from cart"""
    try:
        product_uuid = uuid.UUID(str(product_id))
        product = Product.objects.get(uuid=product_uuid)
    except (ValueError, Product.DoesNotExist):
        return Response({
            'success': False,
            'error': 'Product not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    product_id_str = str(product_id)
    cart = request.session.get('cart', {})
    
    if product_id_str in cart:
        del cart[product_id_str]
        request.session['cart'] = cart
        request.session.modified = True
        
        # Calculate updated cart totals
        cart_data = get_cart_for_session(request)
        
        return Response({
            'success': True,
            'message': f'Removed {product.title} from cart',
            'cart': cart_data
        })
    else:
        return Response({
            'success': False,
            'error': 'Product not in cart'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['DELETE'])
@permission_classes([AllowAny])
def clear_cart(request):
    """Clear entire cart"""
    request.session['cart'] = {}
    request.session.modified = True
    
    return Response({
        'success': True,
        'message': 'Cart cleared',
        'cart': {'cart_items': [], 'total_price': 0}
    })


class OrderListView(generics.ListAPIView):
    """API view for user's orders"""
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-ordered_date')


class OrderDetailView(generics.RetrieveAPIView):
    """API view for order details"""
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Get current user profile"""
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_authenticated': True
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def check_auth(request):
    """Check if user is authenticated"""
    return Response({
        'is_authenticated': request.user.is_authenticated,
        'user': {
            'id': request.user.id,
            'username': request.user.username,
            'first_name': request.user.first_name,
        } if request.user.is_authenticated else None
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def checkout(request):
    """Process checkout and create order"""
    cart_data = get_cart_for_session(request)
    cart_items = cart_data.get('cart_items', [])
    
    if not cart_items:
        return Response({
            'success': False,
            'error': 'Cart is empty'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Create shipping address
    form = ShippingAddressForm(request.data)
    if form.is_valid():
        shipping = form.save(commit=False)
        shipping.user = request.user
        shipping.save()
        
        # Create order
        order = Order.objects.create(customer=request.user, shipping_address=shipping)
        
        # Add items to the order
        for item in cart_items:
            try:
                product = Product.objects.get(uuid=item['uuid'])
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity=item['quantity']
                )
            except Product.DoesNotExist:
                continue
        
        return Response({
            'success': True,
            'order_id': order.id,
            'message': 'Order created successfully'
        })
    
    return Response({
        'success': False,
        'errors': form.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_shipping_rates(request, order_id):
    """Get shipping rates for an order"""
    try:
        order = Order.objects.get(id=order_id, customer=request.user)
    except Order.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Order not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Get shipping rates
    try:
        rates = get_shipping_rates(order)
        request.session['shipping_rates'] = rates
        request.session.modified = True
        
        return Response({
            'success': True,
            'order': {
                'id': order.id,
                'customer': {'username': order.customer.username},
                'order_date': order.order_date,
                'status': order.status,
                'shipping_cost': float(order.shipping_cost),
                'orderitem_set': [
                    {
                        'product': {'title': item.product.title},
                        'quantity': item.quantity
                    }
                    for item in order.orderitem_set.all()
                ]
            },
            'rates': rates
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def select_shipping_rate(request, order_id):
    """Select shipping rate and redirect to Stripe"""
    try:
        order = Order.objects.get(id=order_id, customer=request.user)
    except Order.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Order not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    rate_id = request.data.get('rate_id')
    session_rates = request.session.get('shipping_rates', [])
    
    # Find selected rate
    selected_rate = next((r for r in session_rates if r.get("object_id") == rate_id), None)
    if not selected_rate:
        return Response({
            'success': False,
            'error': 'Selected shipping rate not found'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Save selected shipping info to order
    order.shipping_rate_id = rate_id
    order.shipping_cost = Decimal(selected_rate['amount'])
    order.save()
    
    # Build Stripe line items
    line_items = [
        {
            'price_data': {
                'currency': 'cad',
                'product_data': {'name': item.product.title},
                'unit_amount': int(item.product.get_discounted_price() * 100),
            },
            'quantity': item.quantity,
        }
        for item in order.orderitem_set.all()
    ]
    line_items.append({
        'price_data': {
            'currency': 'cad',
            'product_data': {'name': 'Shipping'},
            'unit_amount': int(order.shipping_cost * 100),
        },
        'quantity': 1,
    })
    
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=line_items,
            mode='payment',
            success_url=request.build_absolute_uri(reverse('api:payment-success')) + '?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=request.build_absolute_uri(reverse('api:checkout')),
            customer_email=request.user.email,
            metadata={'order_id': order.id},
        )
        
        return Response({
            'success': True,
            'checkout_url': checkout_session.url
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': f'Stripe error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_success(request):
    """Handle successful payment"""
    session_id = request.GET.get('session_id')
    if not session_id:
        return Response({
            'success': False,
            'error': 'No session ID provided'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        stripe.api_key = settings.STRIPE_SECRET_KEY
        session = stripe.checkout.Session.retrieve(session_id)
        
        order_id = session.metadata.get('order_id')
        order = Order.objects.get(id=order_id, customer=request.user)
        
        # Save Stripe payment intent ID
        order.stripe_payment_intent_id = session.payment_intent
        order.status = "ORDERED"
        
        # Create shipping label
        try:
            from .views import create_shipping_label
            shipping_info = create_shipping_label(order)
            
            order.label_url = shipping_info["label_url"]
            order.tracking_number = shipping_info["tracking_number"]
            order.shipping_provider = shipping_info["carrier"]
            order.status = "PROCESSING"
            shipping_success = True
        except Exception as e:
            shipping_success = False
        
        order.save()
        
        # Clean up session
        request.session.pop("cart", None)
        request.session.pop("shipping_rates", None)
        request.session.modified = True
        
        return Response({
            'success': True,
            'order': {
                'id': order.id,
                'order_date': order.order_date,
                'status': order.status,
                'shipping_cost': float(order.shipping_cost),
                'tracking_number': order.tracking_number,
                'label_url': order.label_url,
                'shipping_provider': order.shipping_provider,
                'orderitem_set': [
                    {
                        'product': {'title': item.product.title},
                        'quantity': item.quantity
                    }
                    for item in order.orderitem_set.all()
                ],
                'shipping_address': {
                    'full_name': order.shipping_address.full_name,
                    'address_line_1': order.shipping_address.address_line_1,
                    'address_line_2': order.shipping_address.address_line_2,
                    'city': order.shipping_address.city,
                    'state': order.shipping_address.state,
                    'postal_code': order.shipping_address.postal_code,
                    'country_code': order.shipping_address.country_code,
                }
            },
            'shipping_success': shipping_success
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
