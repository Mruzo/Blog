from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle
from snmov.utils.security import rate_limit_check, log_security_event, validate_file_upload, sanitize_filename
from django.shortcuts import get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.db import transaction
from django.db.models import F
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth import get_user_model
import json
import uuid
from decimal import Decimal

from .models import (
    Product, Order, OrderItem, ShippingAddress, ReachOut, NewsletterSubscription,
    ReturnRequest, ReturnItem, CreditNote, Invoice
)
from .serializers import (
    ProductSerializer, ProductListSerializer, OrderSerializer, 
    CartItemSerializer, CartUpdateSerializer, ReachOutSerializer,
    NewsletterSubscriptionSerializer, ReturnRequestSerializer, ReturnRequestCreateSerializer,
    CreditNoteSerializer, InvoiceSerializer, AvailableReturnItemSerializer
)
from snm.settings.base import DEFAULT_FROM_EMAIL, SUPPORT_EMAIL
from django.core.mail import send_mail
from .utils.cart import get_cart_for_session, get_shipping_rates as get_shipping_rates_for_order, get_sender_address
from .forms import ShippingAddressForm
from django.urls import reverse
import stripe
import requests
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


def _first_serializer_error_message(serializer_errors):
    """Single user-facing string for JSON `error` (DRF ErrorDict may be nested)."""
    if not serializer_errors:
        return 'Invalid request'
    for key, msgs in serializer_errors.items():
        if isinstance(msgs, dict):
            nested = _first_serializer_error_message(msgs)
            if nested != 'Invalid request':
                return nested
        elif isinstance(msgs, (list, tuple)):
            for m in msgs:
                if m is not None and str(m).strip():
                    return str(m)
        elif msgs is not None and str(msgs).strip():
            return str(msgs)
    return 'Invalid request'


class _CheckoutTransactionError(Exception):
    """Rollback checkout DB transaction and map to HTTP response."""
    def __init__(self, message, http_status=status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.http_status = http_status
        super().__init__(message)


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
    import logging
    from django.contrib.sessions.models import Session
    from django.utils import timezone
    
    logger = logging.getLogger(__name__)
    
    # CRITICAL FIX: When authenticated, look up user's session if current session is empty
    # This handles the case where session cookie isn't sent with Token Auth
    if request.user.is_authenticated:
        # Ensure session is associated with user
        if not request.session.get('_auth_user_id'):
            request.session['_auth_user_id'] = str(request.user.id)
            request.session.modified = True
            request.session.save()
        
        # Check if current session has cart
        current_cart = request.session.get('cart', {})
        
        if not current_cart:
            # No cart in current session - search for user's session with cart
            logger.info(f"Searching for cart in user {request.user.id} sessions...")
            active_sessions = Session.objects.filter(expire_date__gte=timezone.now())
            for session in active_sessions:
                try:
                    session_data = session.get_decoded()
                    session_user_id = session_data.get('_auth_user_id')
                    if session_user_id == str(request.user.id):
                        session_cart = session_data.get('cart', {})
                        if session_cart:
                            # Found a session with cart for this user - copy it to current session
                            logger.info(f"Found cart in user session: {session.session_key}, copying to current session")
                            request.session['cart'] = session_cart
                            request.session['_auth_user_id'] = str(request.user.id)
                            request.session.modified = True
                            request.session.save()
                            break
                except Exception as e:
                    logger.debug(f"Error decoding session {session.session_key}: {e}")
                    continue
    
    cart_data = get_cart_for_session(request)
    return Response(cart_data)


@api_view(['POST'])
@permission_classes([AllowAny])
def add_to_cart(request):
    """Add product to cart"""
    import logging
    from django.contrib.sessions.models import Session
    from django.utils import timezone
    
    logger = logging.getLogger(__name__)
    
    # CRITICAL FIX: Ensure session is associated with authenticated user
    # DO NOT merge sessions here - merging should only happen when READING the cart
    # (in get_cart_for_session), not when WRITING to it. This prevents adding to
    # quantities from other sessions, which causes the "adds 2 items when cart is empty" bug.
    if request.user.is_authenticated:
        # Ensure session is associated with user
        if not request.session.get('_auth_user_id'):
            request.session['_auth_user_id'] = str(request.user.id)
            request.session.modified = True
    
    serializer = CartItemSerializer(data=request.data)
    if serializer.is_valid():
        product_id = serializer.validated_data['product_id']
        quantity = serializer.validated_data['quantity']
        
        try:
            product = Product.objects.get(uuid=product_id, available=True)
            
            # Get current cart from session (after merging)
            cart = request.session.get('cart', {})
            product_id_str = str(product_id)
            
            # Check if product is already in cart
            current_quantity = cart.get(product_id_str, {}).get('quantity', 0)
            new_quantity = current_quantity + quantity
            
            # Log for debugging
            logger.info(f"Add to cart - Product: {product_id_str}, Current quantity: {current_quantity}, Adding: {quantity}, New quantity: {new_quantity}")
            
            # Enforce maximum items per product (configurable)
            MAX_ITEMS_PER_PRODUCT = getattr(settings, 'MAX_CART_ITEMS_PER_PRODUCT', 4)
            if new_quantity > MAX_ITEMS_PER_PRODUCT:
                max_allowed = MAX_ITEMS_PER_PRODUCT - current_quantity
                if max_allowed <= 0:
                    return Response({
                        'success': False,
                        'error': f'Maximum of {MAX_ITEMS_PER_PRODUCT} items per product allowed. You already have {current_quantity} in your cart.',
                        'current_cart_quantity': current_quantity,
                        'max_allowed': MAX_ITEMS_PER_PRODUCT
                    }, status=status.HTTP_400_BAD_REQUEST)
                else:
                    return Response({
                        'success': False,
                        'error': f'Maximum of {MAX_ITEMS_PER_PRODUCT} items per product allowed. You can add {max_allowed} more.',
                        'current_cart_quantity': current_quantity,
                        'max_allowed': MAX_ITEMS_PER_PRODUCT,
                        'can_add': max_allowed
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # CRITICAL FIX: Validate stock availability
            if product.stock < new_quantity:
                available_stock = product.stock - current_quantity
                if available_stock <= 0:
                    return Response({
                        'success': False,
                        'error': f'Sorry, {product.title} is out of stock.',
                        'available_stock': product.stock,
                        'current_cart_quantity': current_quantity
                    }, status=status.HTTP_400_BAD_REQUEST)
                else:
                    return Response({
                        'success': False,
                        'error': f'Only {available_stock} more item(s) of {product.title} available in stock. You already have {current_quantity} in your cart.',
                        'available_stock': available_stock,
                        'current_cart_quantity': current_quantity,
                        'max_available': product.stock
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if product is already in cart
            if product_id_str not in cart:
                cart[product_id_str] = {'quantity': 0}
            
            # High Priority: Add timestamp for cart expiration tracking
            if 'added_at' not in cart[product_id_str]:
                from django.utils import timezone
                cart[product_id_str]['added_at'] = timezone.now().isoformat()
            
            # Add quantity
            cart[product_id_str]['quantity'] += quantity
            
            # Save cart to session
            request.session['cart'] = cart
            # CRITICAL: Ensure session is associated with user if authenticated
            if request.user.is_authenticated:
                request.session['_auth_user_id'] = str(request.user.id)
            request.session.modified = True
            request.session.save()  # Explicitly save session
            
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
    
    return Response(
        {
            'success': False,
            'error': _first_serializer_error_message(serializer.errors),
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(['PUT'])
@permission_classes([AllowAny])
def update_cart_item(request, product_id):
    """Update cart item quantity"""
    import logging
    from django.contrib.sessions.models import Session
    from django.utils import timezone
    
    logger = logging.getLogger(__name__)
    
    # CRITICAL: Ensure session is associated with authenticated user if logged in
    if request.user.is_authenticated and not request.session.get('_auth_user_id'):
        request.session['_auth_user_id'] = str(request.user.id)
        request.session.modified = True
    
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
        
        # CRITICAL FIX: If cart is empty and user is authenticated, search for cart in other sessions
        # This handles the case where Token Auth creates new sessions on each request
        if not cart and request.user.is_authenticated:
            logger.info(f"Cart not found in current session for user {request.user.id}, searching other sessions...")
            active_sessions = Session.objects.filter(expire_date__gte=timezone.now())
            for session in active_sessions:
                try:
                    session_data = session.get_decoded()
                    session_user_id = session_data.get('_auth_user_id')
                    if session_user_id == str(request.user.id):
                        session_cart = session_data.get('cart', {})
                        if session_cart:
                            # Found a session with cart for this user - copy it to current session
                            logger.info(f"Found cart in user session: {session.session_key}, copying to current session")
                            request.session['cart'] = session_cart
                            request.session['_auth_user_id'] = str(request.user.id)
                            request.session.modified = True
                            request.session.save()
                            cart = session_cart
                            break
                except Exception as e:
                    logger.debug(f"Error decoding session {session.session_key}: {e}")
                    continue
        
        if product_id_str in cart:
            # Enforce maximum items per product (configurable)
            MAX_ITEMS_PER_PRODUCT = getattr(settings, 'MAX_CART_ITEMS_PER_PRODUCT', 4)
            if quantity > MAX_ITEMS_PER_PRODUCT:
                return Response({
                    'success': False,
                    'error': f'Maximum of {MAX_ITEMS_PER_PRODUCT} items per product allowed. You requested {quantity}.',
                    'requested_quantity': quantity,
                    'max_allowed': MAX_ITEMS_PER_PRODUCT
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # CRITICAL FIX: Validate stock availability before updating
            if product.stock < quantity:
                return Response({
                    'success': False,
                    'error': f'Only {product.stock} item(s) of {product.title} available in stock.',
                    'available_stock': product.stock,
                    'requested_quantity': quantity
                }, status=status.HTTP_400_BAD_REQUEST)
            
            cart[product_id_str]['quantity'] = quantity
            request.session['cart'] = cart
            # CRITICAL: Ensure session is associated with user if authenticated
            if request.user.is_authenticated:
                request.session['_auth_user_id'] = str(request.user.id)
            request.session.modified = True
            request.session.save()  # Explicitly save session
            
            # Verify the update was saved
            logger.info(f"Updated cart - Product: {product_id_str}, New quantity: {quantity}, Cart in session: {request.session.get('cart', {}).get(product_id_str, {})}")
            
            # Calculate updated cart totals directly from current session
            # Don't use get_cart_for_session as it might merge from other sessions and overwrite the update
            from decimal import Decimal
            
            cart_items = []
            total_price = Decimal('0.00')
            
            for pid, details in cart.items():
                try:
                    # Convert string UUID to UUID object
                    product_uuid = uuid.UUID(str(pid))
                    p = Product.objects.get(uuid=product_uuid, available=True)
                    qty = details.get('quantity', 1)
                    unit_price = p.get_discounted_price()
                    total = unit_price * qty
                    cart_items.append({
                        'uuid': p.uuid,
                        'title': p.title,
                        'price': round(float(unit_price), 2),
                        'quantity': qty,
                        'item_total': round(float(total), 2),
                    })
                    total_price += total
                except (Product.DoesNotExist, ValueError, TypeError) as e:
                    logger.debug(f"Skipping invalid cart item {pid}: {e}")
                    continue
            
            cart_data = {
                'cart_items': cart_items,
                'total_price': float(total_price),
            }
            
            # Log the returned cart data to verify it has the updated quantity
            returned_items = cart_data.get('cart_items', [])
            for item in returned_items:
                if str(item.get('uuid')) == product_id_str:
                    logger.info(f"Cart data returned - Product {product_id_str} quantity: {item.get('quantity')}")
            
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
    
    return Response(
        {
            'success': False,
            'error': _first_serializer_error_message(serializer.errors),
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(['DELETE'])
@permission_classes([AllowAny])
def remove_from_cart(request, product_id):
    """Remove product from cart"""
    import logging
    from django.contrib.sessions.models import Session
    from django.utils import timezone
    
    logger = logging.getLogger(__name__)
    
    try:
        # CRITICAL: Ensure session is associated with authenticated user if logged in
        if hasattr(request, 'user') and request.user.is_authenticated and not request.session.get('_auth_user_id'):
            request.session['_auth_user_id'] = str(request.user.id)
            request.session.modified = True
        
        try:
            product_uuid = uuid.UUID(str(product_id))
            product = Product.objects.get(uuid=product_uuid)
        except (ValueError, Product.DoesNotExist) as e:
            logger.error(f"Product not found: {product_id}, error: {e}")
            return Response({
                'success': False,
                'error': 'Product not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        product_id_str = str(product_id)
        
        # Get current cart
        cart = request.session.get('cart', {})
        
        # CRITICAL FIX: If cart is empty and user is authenticated, search for cart in other sessions
        # This handles the case where Token Auth creates new sessions on each request
        if not cart and hasattr(request, 'user') and request.user.is_authenticated:
            logger.info(f"Cart not found in current session for user {request.user.id}, searching other sessions...")
            active_sessions = Session.objects.filter(expire_date__gte=timezone.now())
            for session in active_sessions:
                try:
                    session_data = session.get_decoded()
                    session_user_id = session_data.get('_auth_user_id')
                    if session_user_id == str(request.user.id):
                        session_cart = session_data.get('cart', {})
                        if session_cart:
                            # Found a session with cart for this user - copy it to current session
                            logger.info(f"Found cart in user session: {session.session_key}, copying to current session")
                            request.session['cart'] = session_cart
                            request.session['_auth_user_id'] = str(request.user.id)
                            request.session.modified = True
                            request.session.save()
                            cart = session_cart
                            break
                except Exception as e:
                    logger.debug(f"Error decoding session {session.session_key}: {e}")
                    continue
        
        if product_id_str in cart:
            del cart[product_id_str]
            request.session['cart'] = cart
            # CRITICAL: Ensure session is associated with user if authenticated
            if hasattr(request, 'user') and request.user.is_authenticated:
                request.session['_auth_user_id'] = str(request.user.id)
            request.session.modified = True
            request.session.save()  # Explicitly save session
            
            # Log the deletion
            logger.info(f"Removed product {product_id_str} from cart. Cart now has {len(cart)} items.")
            
            # Calculate updated cart totals
            # Use the cart directly from session without merging from other sessions
            # to ensure deleted items stay deleted
            from decimal import Decimal
            
            cart_items = []
            total_price = Decimal('0.00')
            
            for pid, details in cart.items():
                try:
                    # Convert string UUID to UUID object
                    product_uuid = uuid.UUID(str(pid))
                    product = Product.objects.get(uuid=product_uuid, available=True)
                    quantity = details.get('quantity', 1)
                    unit_price = product.get_discounted_price()
                    total = unit_price * quantity
                    cart_items.append({
                        'uuid': product.uuid,
                        'title': product.title,
                        'price': round(float(unit_price), 2),
                        'quantity': quantity,
                        'item_total': round(float(total), 2),
                    })
                    total_price += total
                except (Product.DoesNotExist, ValueError, TypeError) as e:
                    logger.warning(f"Skipping invalid cart item {pid}: {e}")
                    continue
                except Exception as e:
                    logger.error(f"Unexpected error processing cart item {pid}: {e}", exc_info=True)
                    continue
            
            cart_data = {
                'cart_items': cart_items,
                'total_price': float(total_price),
            }
            
            # Verify the item was actually removed
            if product_id_str in request.session.get('cart', {}):
                logger.warning(f"Product {product_id_str} still in cart after deletion!")
            else:
                logger.info(f"Verified: Product {product_id_str} successfully removed from cart.")
            
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
            
    except Exception as e:
        logger.error(f"Unexpected error in remove_from_cart: {e}", exc_info=True)
        return Response({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    product_id_str = str(product_id)
    
    # Get current cart
    cart = request.session.get('cart', {})
    
    # CRITICAL FIX: If cart is empty and user is authenticated, search for cart in other sessions
    # This handles the case where Token Auth creates new sessions on each request
    if not cart and hasattr(request, 'user') and request.user.is_authenticated:
        logger.info(f"Cart not found in current session for user {request.user.id}, searching other sessions...")
        active_sessions = Session.objects.filter(expire_date__gte=timezone.now())
        for session in active_sessions:
            try:
                session_data = session.get_decoded()
                session_user_id = session_data.get('_auth_user_id')
                if session_user_id == str(request.user.id):
                    session_cart = session_data.get('cart', {})
                    if session_cart:
                        # Found a session with cart for this user - copy it to current session
                        logger.info(f"Found cart in user session: {session.session_key}, copying to current session")
                        request.session['cart'] = session_cart
                        request.session['_auth_user_id'] = str(request.user.id)
                        request.session.modified = True
                        request.session.save()
                        cart = session_cart
                        break
            except Exception as e:
                logger.debug(f"Error decoding session {session.session_key}: {e}")
                continue
    
    if product_id_str in cart:
        del cart[product_id_str]
        request.session['cart'] = cart
        # CRITICAL: Ensure session is associated with user if authenticated
        if hasattr(request, 'user') and request.user.is_authenticated:
            request.session['_auth_user_id'] = str(request.user.id)
        request.session.modified = True
        request.session.save()  # Explicitly save session
        
        # Log the deletion
        logger.info(f"Removed product {product_id_str} from cart. Cart now has {len(cart)} items.")
        
        # Calculate updated cart totals
        # Use the cart directly from session without merging from other sessions
        # to ensure deleted items stay deleted
        # Note: Product is already imported at module level
        from decimal import Decimal
        
        cart_items = []
        total_price = Decimal('0.00')
        
        for pid, details in cart.items():
            try:
                # Convert string UUID to UUID object
                product_uuid = uuid.UUID(str(pid))
                product = Product.objects.get(uuid=product_uuid, available=True)
                quantity = details.get('quantity', 1)
                unit_price = product.get_discounted_price()
                total = unit_price * quantity
                cart_items.append({
                    'uuid': product.uuid,
                    'title': product.title,
                    'price': round(float(unit_price), 2),
                    'quantity': quantity,
                    'item_total': round(float(total), 2),
                })
                total_price += total
            except (Product.DoesNotExist, ValueError, TypeError) as e:
                logger.warning(f"Skipping invalid cart item {pid}: {e}")
                continue
            except Exception as e:
                logger.error(f"Unexpected error processing cart item {pid}: {e}", exc_info=True)
                continue
        
        cart_data = {
            'cart_items': cart_items,
            'total_price': float(total_price),
        }
        
        # Verify the item was actually removed
        if product_id_str in request.session.get('cart', {}):
            logger.warning(f"Product {product_id_str} still in cart after deletion!")
        else:
            logger.info(f"Verified: Product {product_id_str} successfully removed from cart.")
        
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
    # CRITICAL: Ensure session is associated with authenticated user if logged in
    if request.user.is_authenticated:
        request.session['_auth_user_id'] = str(request.user.id)
    request.session['cart'] = {}
    request.session.modified = True
    request.session.save()
    
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
        # Order model uses `order_date` (not `ordered_date`)
        return Order.objects.filter(customer=self.request.user).order_by('-order_date')


class OrderDetailView(generics.RetrieveAPIView):
    """API view for order details"""
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user)


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
    import logging
    from django.contrib.sessions.models import Session
    from django.utils import timezone
    
    logger = logging.getLogger(__name__)
    
    # CRITICAL FIX: When using Token Auth, the session cookie might not be sent
    # So we need to find the user's session by looking up sessions with their user ID
    # Try to get cart from current session first
    current_cart = request.session.get('cart', {})
    
    if not current_cart:
        # If no cart in current session, try to find user's session by user ID
        # Look for active sessions associated with this user
        logger.info(f"Searching for cart in user {request.user.id} sessions...")
        active_sessions = Session.objects.filter(expire_date__gte=timezone.now())
        for session in active_sessions:
            try:
                session_data = session.get_decoded()
                session_user_id = session_data.get('_auth_user_id')
                if session_user_id == str(request.user.id):
                    session_cart = session_data.get('cart', {})
                    if session_cart:
                        # Found a session with cart for this user - copy it to current session
                        logger.info(f"Found cart in user session: {session.session_key}, copying to current session")
                        request.session['cart'] = session_cart
                        request.session['_auth_user_id'] = str(request.user.id)
                        request.session.modified = True
                        request.session.save()
                        current_cart = session_cart
                        break
            except Exception as e:
                logger.debug(f"Error decoding session {session.session_key}: {e}")
                continue
    
    # Ensure session is associated with user
    if not request.session.get('_auth_user_id'):
        request.session['_auth_user_id'] = str(request.user.id)
        request.session.modified = True
    
    # Ensure session exists
    if not request.session.session_key:
        request.session.create()
        request.session.save()
    
    # Debug: Log session info
    logger.info(
        f"Checkout - Session key: {request.session.session_key}, "
        f"Session user ID: {request.session.get('_auth_user_id')}, "
        f"Request user: {request.user.id}, "
        f"Cart keys in session: {list(request.session.get('cart', {}).keys())}"
    )
    
    # Get cart from session
    cart_data = get_cart_for_session(request)
    cart_items = cart_data.get('cart_items', [])
    
    if not cart_items:
        # Cart is empty - provide helpful error message
        direct_cart = request.session.get('cart', {})
        
        logger.warning(
            f"Checkout failed - Cart is empty. "
            f"Session key: {request.session.session_key}, "
            f"Session user ID: {request.session.get('_auth_user_id')}, "
            f"Request user: {request.user.id}, "
            f"Cart in session: {bool(direct_cart)}, "
            f"Cart keys: {list(direct_cart.keys()) if direct_cart else []}, "
            f"User: {request.user.username}"
        )
        
        return Response({
            'success': False,
            'error': 'Cart is empty. Please add items to your cart before checkout.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # CRITICAL FIX: Re-validate inventory before creating order
    unavailable_items = []
    insufficient_stock_items = []
    
    for item in cart_items:
        try:
            product = Product.objects.get(uuid=item['uuid'])
            
            # Check if product is still available
            if not product.available:
                unavailable_items.append({
                    'product': product.title,
                    'requested_quantity': item['quantity'],
                    'available': 0,
                    'reason': 'Product is no longer available'
                })
                continue
            
            # Check if stock is sufficient
            if product.stock < item['quantity']:
                insufficient_stock_items.append({
                    'product': product.title,
                    'requested_quantity': item['quantity'],
                    'available': product.stock,
                    'reason': f'Only {product.stock} items available in stock'
                })
                continue
                
        except Product.DoesNotExist:
            unavailable_items.append({
                'product': item.get('title', 'Unknown Product'),
                'requested_quantity': item['quantity'],
                'available': 0,
                'reason': 'Product not found'
            })
    
    # If there are any issues, return error with details
    if unavailable_items or insufficient_stock_items:
        return Response({
            'success': False,
            'error': 'Some items in your cart are no longer available or have insufficient stock',
            'unavailable_items': unavailable_items,
            'insufficient_stock_items': insufficient_stock_items
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Create shipping address
    form = ShippingAddressForm(request.data)
    if form.is_valid():
        try:
            with transaction.atomic():
                uuids = [item['uuid'] for item in cart_items]
                locked = Product.objects.select_for_update().filter(uuid__in=uuids, available=True)
                by_uuid = {str(p.uuid): p for p in locked}
                for item in cart_items:
                    uid = str(item['uuid'])
                    p = by_uuid.get(uid)
                    if not p or p.stock < item['quantity']:
                        raise _CheckoutTransactionError(
                            'Inventory changed while checking out. Refresh your cart and try again.',
                            status.HTTP_409_CONFLICT,
                        )

                shipping = form.save(commit=False)
                shipping.user = request.user
                shipping.save()
                order = Order.objects.create(customer=request.user, shipping_address=shipping)

                for item in cart_items:
                    p = by_uuid[str(item['uuid'])]
                    OrderItem.objects.create(
                        order=order,
                        product=p,
                        quantity=item['quantity'],
                    )
                    updated = Product.objects.filter(
                        pk=p.pk, stock__gte=item['quantity']
                    ).update(stock=F('stock') - item['quantity'])
                    if updated != 1:
                        raise _CheckoutTransactionError(
                            'Inventory changed while checking out. Please try again.',
                            status.HTTP_409_CONFLICT,
                        )
        except _CheckoutTransactionError as e:
            return Response({'success': False, 'error': e.message}, status=e.http_status)

        request.session['cart'] = {}
        request.session.modified = True
        request.session.save()

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
        rates = get_shipping_rates_for_order(order)
        
        # Calculate cart total for total_with_shipping
        cart_total = order.calculate_total_value() or Decimal("0.00")
        
        # Add total_with_shipping to each rate and ensure all required fields
        for rate in rates:
            shipping_amount = Decimal(str(rate.get('amount', '0.00')))
            rate['total_with_shipping'] = str(float(cart_total + shipping_amount))
            # Ensure amount is a string for consistency
            rate['amount'] = str(rate.get('amount', '0.00'))
            # Ensure estimated_days is a number (not empty string)
            if rate.get('estimated_days') == '' or rate.get('estimated_days') is None:
                rate['estimated_days'] = 0
            else:
                rate['estimated_days'] = int(rate.get('estimated_days', 0))
            # Ensure servicelevel.name exists - check if servicelevel exists and has name
            servicelevel = rate.get('servicelevel')
            if not servicelevel or not servicelevel.get('name'):
                # Use fallback if servicelevel doesn't exist or name is missing
                fallback_name = rate.get('_canadapost_service_name', 'Standard Shipping')
                rate['servicelevel'] = {
                    'name': fallback_name
                }
            # Also ensure _canadapost_service_name is set for frontend fallback
            if not rate.get('_canadapost_service_name'):
                rate['_canadapost_service_name'] = rate.get('servicelevel', {}).get('name', 'Standard Shipping')
        
        # Save rates to session if available (for rate selection later)
        if hasattr(request, 'session'):
            request.session['shipping_rates'] = rates
            request.session.modified = True

        from snmov.utils.checkout_fulfillment import snapshot_shipping_rates_on_order
        snapshot_shipping_rates_on_order(order, rates)
        
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
    except ValueError as e:
        # Handle configuration/authentication errors with 400 status
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    except requests.exceptions.HTTPError as e:
        # Handle HTTP errors from Canada Post API
        error_msg = str(e)
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_detail = e.response.text[:500]
                error_msg = f"Canada Post API error: {error_detail}"
            except:
                pass
        return Response({
            'success': False,
            'error': error_msg
        }, status=status.HTTP_502_BAD_GATEWAY)
    except Exception as e:
        import traceback
        logger.error(f"Error getting shipping rates: {str(e)}\n{traceback.format_exc()}")
        return Response({
            'success': False,
            'error': f"Failed to get shipping rates: {str(e)}"
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
    session_rates = order.shipping_rates_snapshot or request.session.get('shipping_rates', [])
    
    # CRITICAL FIX: If session rates not found (Token Auth issue), re-fetch them
    if not session_rates:
        logger.warning("Shipping rates not found for order %s (session/snapshot); re-fetching...", order_id)
        try:
            from snmov.utils.cart import get_shipping_rates as get_shipping_rates_func
            session_rates = get_shipping_rates_func(order)
            request.session['shipping_rates'] = session_rates
            request.session.modified = True
            request.session.save()
            from snmov.utils.checkout_fulfillment import snapshot_shipping_rates_on_order
            snapshot_shipping_rates_on_order(order, session_rates)
        except Exception as e:
            logger.error(f"Error re-fetching shipping rates: {e}")
            return Response({
                'success': False,
                'error': 'Selected shipping rate not found.',
                'details': f'Failed to fetch shipping rates: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    # Find selected rate
    selected_rate = next((r for r in session_rates if r.get("object_id") == rate_id), None)
    if not selected_rate:
        return Response({
            'success': False,
            'error': f'Selected shipping rate not found. Available rates: {[r.get("object_id") for r in session_rates]}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Save selected shipping info to order
    order.shipping_rate_id = rate_id
    order.shipping_cost = Decimal(selected_rate['amount'])
    # Store Canada Post service code for label creation
    order.shipping_service = selected_rate.get('_canadapost_service_code', rate_id)
    order.save()

    stripe.api_key = settings.STRIPE_SECRET_KEY
    if order.stripe_checkout_session_id:
        try:
            stripe.checkout.Session.expire(order.stripe_checkout_session_id)
        except Exception as ex:
            logger.warning('Could not expire prior Stripe session %s: %s', order.stripe_checkout_session_id, ex)

    from snmov.utils.checkout_fulfillment import build_checkout_line_items
    line_items = build_checkout_line_items(order)

    try:
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')
        success_url = f'{frontend_url}/product/payment/success/?session_id={{CHECKOUT_SESSION_ID}}'
        cancel_url = f'{frontend_url}/product/cart/checkout/'

        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=line_items,
            mode='payment',
            success_url=success_url,
            cancel_url=cancel_url,
            customer_email=request.user.email,
            metadata={'order_id': str(order.id)},
        )
        order.stripe_checkout_session_id = checkout_session.id
        order.save(update_fields=['stripe_checkout_session_id'])

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
    """Handle successful payment (browser redirect); idempotent with Stripe webhook."""
    session_id = request.GET.get('session_id')
    if not session_id:
        return Response({
            'success': False,
            'error': 'No session ID provided'
        }, status=status.HTTP_400_BAD_REQUEST)

    from snmov.utils.checkout_fulfillment import complete_order_from_stripe_checkout_session

    try:
        stripe.api_key = settings.STRIPE_SECRET_KEY
        session = stripe.checkout.Session.retrieve(session_id)
        order_id = session.metadata.get('order_id')
        order = Order.objects.get(id=int(order_id), customer=request.user)
        payload = complete_order_from_stripe_checkout_session(order, session)
    except ValueError as e:
        return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Order.DoesNotExist:
        return Response({'success': False, 'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception('payment_success failed: %s', e)
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    request.session.pop('cart', None)
    request.session.pop('shipping_rates', None)
    request.session.modified = True

    return Response(payload)


@csrf_exempt
def stripe_checkout_webhook(request):
    """
    Stripe webhook: checkout.session.completed (authoritative when browser never hits success URL).
    Configure STRIPE_WEBHOOK_SECRET and point Stripe Dashboard to POST /api/stripe/webhook/
    """
    if request.method != 'POST':
        return HttpResponse(status=405)

    secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', '') or ''
    if not secret:
        logger.error('stripe_checkout_webhook: STRIPE_WEBHOOK_SECRET is not configured')
        return HttpResponse(status=503)

    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, secret)
    except ValueError:
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError:
        return HttpResponse(status=400)

    if event['type'] != 'checkout.session.completed':
        return HttpResponse(status=200)

    from snmov.utils.checkout_fulfillment import complete_order_from_stripe_checkout_session

    session_data = event['data']['object']
    session_id = session_data.get('id')
    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        session = stripe.checkout.Session.retrieve(session_id, expand=['payment_intent'])
    except Exception as e:
        logger.exception('Webhook retrieve session failed: %s', e)
        return HttpResponse(status=500)

    meta = session.metadata or {}
    order_id = meta.get('order_id')
    if not order_id:
        return HttpResponse(status=200)

    try:
        order = Order.objects.get(id=int(order_id))
    except (Order.DoesNotExist, ValueError, TypeError):
        logger.warning('Webhook: order %s not found', order_id)
        return HttpResponse(status=200)

    email_session = (getattr(session, 'customer_email', None) or '').strip().lower()
    if not email_session:
        cd = getattr(session, 'customer_details', None)
        if isinstance(cd, dict):
            email_session = (cd.get('email') or '').strip().lower()
        elif cd is not None and getattr(cd, 'email', None):
            email_session = str(cd.email).strip().lower()
    if email_session and order.customer.email.strip().lower() != email_session:
        logger.warning(
            'Webhook: email mismatch for order %s (session=%s order=%s)',
            order.id, email_session, order.customer.email,
        )
        return HttpResponse(status=400)

    try:
        complete_order_from_stripe_checkout_session(order, session)
    except ValueError as e:
        logger.warning('Webhook fulfillment rejected: %s', e)
        return HttpResponse(status=400)
    except Exception as e:
        logger.exception('Webhook fulfillment failed: %s', e)
        return HttpResponse(status=500)

    return HttpResponse(status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_saved_addresses(request):
    """Get all saved addresses for the current user"""
    saved_addresses = ShippingAddress.objects.filter(
        user=request.user,
        is_saved=True
    ).order_by('-is_default', '-created_at')
    
    addresses = []
    for addr in saved_addresses:
        addresses.append({
            'id': addr.id,
            'label': addr.label or 'Saved Address',
            'full_name': addr.full_name,
            'address_line_1': addr.address_line_1,
            'address_line_2': addr.address_line_2 or '',
            'city': addr.city,
            'state': addr.state,
            'postal_code': addr.postal_code,
            'country_code': addr.country_code,
            'is_default': addr.is_default,
        })
    
    return Response({
        'success': True,
        'addresses': addresses
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_address(request):
    """Save a shipping address for future use"""
    form = ShippingAddressForm(request.data)
    if form.is_valid():
        address = form.save(commit=False)
        address.user = request.user
        address.is_saved = True
        address.label = request.data.get('label', 'Saved Address')
        
        # Set as default if requested or if it's the first saved address
        set_as_default = request.data.get('is_default', False)
        if set_as_default or not ShippingAddress.objects.filter(user=request.user, is_saved=True).exists():
            address.is_default = True
        
        address.save()
        
        return Response({
            'success': True,
            'message': 'Address saved successfully',
            'address': {
                'id': address.id,
                'label': address.label,
                'full_name': address.full_name,
                'address_line_1': address.address_line_1,
                'address_line_2': address.address_line_2 or '',
                'city': address.city,
                'state': address.state,
                'postal_code': address.postal_code,
                'country_code': address.country_code,
                'is_default': address.is_default,
            }
        })
    
    return Response({
        'success': False,
        'errors': form.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_saved_address(request, address_id):
    """Delete a saved address"""
    try:
        address = ShippingAddress.objects.get(
            id=address_id,
            user=request.user,
            is_saved=True
        )
        address.delete()
        
        return Response({
            'success': True,
            'message': 'Address deleted successfully'
        })
    except ShippingAddress.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Address not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_default_address(request, address_id):
    """Set a saved address as default"""
    try:
        address = ShippingAddress.objects.get(
            id=address_id,
            user=request.user,
            is_saved=True
        )
        
        # Unset other defaults
        ShippingAddress.objects.filter(
            user=request.user,
            is_saved=True,
            is_default=True
        ).exclude(pk=address.id).update(is_default=False)
        
        # Set this as default
        address.is_default = True
        address.save()
        
        return Response({
            'success': True,
            'message': 'Default address updated'
        })
    except ShippingAddress.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Address not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@authentication_classes([])  # Disable authentication (and CSRF) for this endpoint
@permission_classes([AllowAny])
def contact_form(request):
    """
    API endpoint for contact form submissions.
    Saves to ReachOut model and sends email notification.
    Includes spam protection: honeypot, rate limiting, and time-based validation.
    """
    from django.core.cache import cache
    from django.utils import timezone
    import time
    
    # Get client IP for rate limiting
    def get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    client_ip = get_client_ip(request)
    
    # Spam Protection Checks
    
    # 1. Honeypot check - if honeypot field is filled, it's a bot
    honeypot_value = request.data.get('_honeypot', '')
    if honeypot_value:
        # Silently reject - don't let bots know they were caught
        return Response({
            'success': True,
            'message': 'Thanks for reaching out. Your message has been sent.'
        }, status=status.HTTP_201_CREATED)
    
    # 2. Time-based validation - if form was filled too quickly (< 3 seconds), likely spam
    form_time = request.data.get('_form_time', '0')
    try:
        fill_time = float(form_time)
        if fill_time < 3:
            return Response({
                'success': False,
                'message': 'Please take your time filling out the form.'
            }, status=status.HTTP_400_BAD_REQUEST)
    except (ValueError, TypeError):
        pass  # If time not provided, continue (for backward compatibility)
    
    # 3. Rate limiting - max 3 submissions per IP per hour
    rate_limit_key = f'contact_form_rate_limit_{client_ip}'
    submission_count = cache.get(rate_limit_key, 0)
    
    if submission_count >= 3:
        return Response({
            'success': False,
            'message': 'Too many submissions. Please try again later.'
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    # Validate and save
    serializer = ReachOutSerializer(data=request.data)
    
    if serializer.is_valid():
        # Save the contact form submission (for backward compatibility)
        reach_out = serializer.save()
        
        # Also create a FeedbackTicket
        try:
            from feedback.models import FeedbackTicket
            from feedback.email_notifications import send_ticket_confirmation_email
            
            # Determine source
            source = 'feedback_modal' if request.data.get('source') == 'feedback_modal' else 'contact_form'
            
            # Try to infer category from subject
            subject_lower = (reach_out.subject or '').lower()
            category = 'other'
            if any(word in subject_lower for word in ['bug', 'error', 'broken', 'issue']):
                category = 'bug'
            elif any(word in subject_lower for word in ['feature', 'suggestion', 'improvement']):
                category = 'feature_request'
            elif any(word in subject_lower for word in ['question', 'help', 'how']):
                category = 'question'
            elif any(word in subject_lower for word in ['order', 'payment', 'billing', 'refund']):
                category = 'billing'
            
            # Get user if authenticated
            user = request.user if request.user.is_authenticated else None
            
            # Create ticket
            ticket = FeedbackTicket.objects.create(
                user=user,
                submitted_by_name=reach_out.full_name,
                submitted_by_email=reach_out.email,
                subject=reach_out.subject or 'Contact Form Submission',
                message=reach_out.content,
                category=category,
                source=source,
                ip_address=client_ip,
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            # Send ticket confirmation email
            try:
                send_ticket_confirmation_email(ticket, request)
            except Exception as e:
                print(f"Failed to send ticket confirmation email: {e}")
            
            ticket_number = ticket.ticket_number
        except Exception as e:
            # If ticket creation fails, still proceed with ReachOut
            # Log error but don't fail the request
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create feedback ticket: {e}")
            ticket_number = None
        
        # Increment rate limit counter
        cache.set(rate_limit_key, submission_count + 1, 3600)  # 1 hour expiry
        
        # Send email notification to support (keep existing behavior)
        try:
            subject = 'Contact Form'
            message = f"Name: {reach_out.full_name}\nEmail: {reach_out.email}\n\nSubject: {reach_out.subject}\n\nMessage: {reach_out.content}"
            if ticket_number:
                message += f"\n\nTicket Number: {ticket_number}"
            from_email = DEFAULT_FROM_EMAIL
            to_email = SUPPORT_EMAIL
            
            send_mail(subject, message, from_email, [to_email])
        except Exception as e:
            # Log email error but don't fail the request
            print(f"Failed to send contact form email: {e}")
        
        # Send confirmation email to user (keep existing behavior for backward compatibility)
        try:
            from snmov.utils.email_notifications import send_feedback_confirmation
            send_feedback_confirmation(reach_out)
        except Exception as e:
            # Log email error but don't fail the request
            print(f"Failed to send feedback confirmation email: {e}")
        
        response_data = {
            'success': True,
            'message': 'Thanks for reaching out. Your message has been sent.'
        }
        if ticket_number:
            response_data['ticket_number'] = ticket_number
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    return Response({
        'success': False,
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@authentication_classes([])  # Disable authentication (and CSRF) for this endpoint
@permission_classes([AllowAny])
def subscribe_newsletter(request):
    """
    API endpoint for newsletter subscription.
    Allows both authenticated and anonymous users to subscribe.
    """
    from .serializers import NewsletterSubscriptionSerializer
    
    serializer = NewsletterSubscriptionSerializer(
        data=request.data,
        context={'user': request.user if request.user.is_authenticated else None}
    )
    
    if serializer.is_valid():
        subscription = serializer.save()
        
        # Send welcome email for newsletter subscription
        try:
            from snmov.utils.email_notifications import send_newsletter_welcome
            send_newsletter_welcome(subscription)
        except Exception as e:
            print(f"Failed to send newsletter welcome email: {e}")
        
        return Response({
            'success': True,
            'message': 'Successfully subscribed to newsletter!'
        }, status=status.HTTP_201_CREATED)
    
    return Response({
        'success': False,
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@authentication_classes([])  # Disable authentication (and CSRF) for this endpoint
@permission_classes([AllowAny])
def unsubscribe_newsletter(request, token):
    """
    API endpoint for newsletter unsubscription using token.
    """
    try:
        subscription = NewsletterSubscription.objects.get(
            unsubscribe_token=token,
            is_active=True
        )
        subscription.unsubscribe()
        
        return Response({
            'success': True,
            'message': 'Successfully unsubscribed from newsletter.'
        }, status=status.HTTP_200_OK)
    except NewsletterSubscription.DoesNotExist:
        return Response({
            'success': False,
            'message': 'Invalid or expired unsubscribe link.'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_newsletter_subscription(request):
    """
    Get newsletter subscription status for authenticated user.
    """
    try:
        subscription = NewsletterSubscription.objects.get(
            user=request.user,
            is_active=True
        )
        return Response({
            'subscribed': True,
            'email': subscription.email,
            'subscribed_at': subscription.subscribed_at
        }, status=status.HTTP_200_OK)
    except NewsletterSubscription.DoesNotExist:
        return Response({
            'subscribed': False
        }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_user_data(request):
    """
    GDPR Right to Access - Export all user data.
    Returns JSON file with all user data.
    """
    from snmov.utils.gdpr import export_user_data as gdpr_export
    from snmov.utils.security import log_security_event
    import json
    from django.http import HttpResponse
    
    try:
        # Export user data
        data = gdpr_export(request.user)
        
        # Log data export
        log_security_event(
            event_type='data_export',
            request=request,
            user=request.user,
            details={'export_date': data.get('export_date')},
            severity='INFO'
        )
        
        # Return as JSON response
        response = HttpResponse(
            json.dumps(data, indent=2),
            content_type='application/json'
        )
        response['Content-Disposition'] = f'attachment; filename="user_data_{request.user.id}_{timezone.now().strftime("%Y%m%d")}.json"'
        return response
        
    except Exception as e:
        log_security_event(
            event_type='data_export',
            request=request,
            user=request.user,
            details={'error': str(e)},
            severity='ERROR'
        )
        return Response({
            'error': 'Failed to export user data',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_user_data(request):
    """
    GDPR Right to Erasure - Delete or anonymize user data.
    Requires confirmation password.
    """
    from snmov.utils.gdpr import delete_user_data as gdpr_delete
    from snmov.utils.security import log_security_event
    from django.contrib.auth import authenticate
    
    password = request.data.get('password')
    anonymize = request.data.get('anonymize', False)
    
    if not password:
        return Response({
            'error': 'Password confirmation required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify password
    user = authenticate(username=request.user.username, password=password)
    if not user:
        log_security_event(
            event_type='unauthorized_access',
            request=request,
            user=request.user,
            details={'action': 'delete_data', 'reason': 'invalid_password'},
            severity='WARNING'
        )
        return Response({
            'error': 'Invalid password'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        # Delete/anonymize user data
        summary = gdpr_delete(request.user, anonymize=anonymize)
        
        # Log data deletion
        log_security_event(
            event_type='data_deletion',
            request=request,
            user=request.user,
            details=summary,
            severity='INFO'
        )
        
        return Response({
            'success': True,
            'message': 'User data deleted successfully' if not anonymize else 'User data anonymized successfully',
            'summary': summary
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        log_security_event(
            event_type='data_deletion',
            request=request,
            user=request.user,
            details={'error': str(e)},
            severity='ERROR'
        )
        return Response({
            'error': 'Failed to delete user data',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# RETURN/REFUND API ENDPOINTS
# ============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_available_return_items(request, order_id):
    """Get items available for return from an order"""
    try:
        order = Order.objects.get(id=order_id, customer=request.user)
        
        from snmov.utils.returns import get_available_return_items
        available_items = get_available_return_items(order)
        
        serializer = AvailableReturnItemSerializer(available_items, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Order.DoesNotExist:
        return Response(
            {'error': 'Order not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_return_request(request):
    """Create a new return request"""
    from snmov.utils.returns import (
        validate_return_window, validate_return_items, validate_return_condition,
        calculate_return_shipping_cost, get_return_window_days
    )
    from snmov.utils.email_notifications import send_return_request_submitted
    from django.db import transaction
    
    serializer = ReturnRequestCreateSerializer(data=request.data, context={'request': request})
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        order = Order.objects.get(id=serializer.validated_data['order_id'])
        
        # Validate return window
        return_window_days = get_return_window_days(order)
        is_valid, error_msg = validate_return_window(order, return_window_days)
        if not is_valid:
            return Response({'error': error_msg}, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            # Create return request (shipping cost set after line items exist)
            return_request = ReturnRequest.objects.create(
                order=order,
                customer=request.user,
                reason=serializer.validated_data['reason'],
                reason_category=serializer.validated_data['reason_category'],
                return_window_days=return_window_days,
                return_shipping_cost=Decimal('0.00'),
                return_shipping_paid_by=serializer.validated_data.get('return_shipping_paid_by', 'customer'),
                status='PENDING'
            )
            
            # Create return items
            for item_data in serializer.validated_data['return_items']:
                order_item = OrderItem.objects.get(
                    id=item_data['order_item_id'],
                    order=order
                )
                
                # Validate quantity
                available = order_item.get_available_for_return()
                if item_data['quantity'] > available:
                    raise ValueError(f"Cannot return {item_data['quantity']} of {order_item.product.title}. Only {available} available.")
                
                ReturnItem.objects.create(
                    return_request=return_request,
                    order_item=order_item,
                    quantity=item_data['quantity'],
                    condition=item_data['condition'],
                    condition_notes=item_data.get('condition_notes', '')
                )
            
            # Validate return items
            is_valid, error_msg = validate_return_items(return_request)
            if not is_valid:
                raise ValueError(error_msg)
            
            # Validate return condition
            is_valid, error_msg = validate_return_condition(return_request)
            if not is_valid:
                raise ValueError(error_msg)

            return_request.return_shipping_cost = calculate_return_shipping_cost(return_request)
            return_request.save(update_fields=['return_shipping_cost'])
        
        # Send email notification
        try:
            send_return_request_submitted(return_request)
        except Exception as e:
            logger.error(f"Failed to send return request email: {e}")
        
        # Return created return request
        response_serializer = ReturnRequestSerializer(return_request)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
    except OrderItem.DoesNotExist:
        return Response({'error': 'Order item not found'}, status=status.HTTP_404_NOT_FOUND)
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error creating return request: {e}")
        return Response(
            {'error': 'Failed to create return request', 'message': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class ReturnRequestListView(generics.ListAPIView):
    """List user's return requests"""
    serializer_class = ReturnRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ReturnRequest.objects.filter(customer=self.request.user).select_related(
            'order', 'customer'
        ).prefetch_related('returnitem_set', 'returnitem_set__order_item', 'returnitem_set__order_item__product').order_by('-created_at')


class ReturnRequestDetailView(generics.RetrieveAPIView):
    """Get return request details"""
    serializer_class = ReturnRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ReturnRequest.objects.filter(customer=self.request.user).select_related(
            'order', 'customer'
        ).prefetch_related('returnitem_set', 'returnitem_set__order_item', 'returnitem_set__order_item__product')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_return_request(request, return_id):
    """Approve return request (admin only)"""
    from django.contrib.auth.models import AnonymousUser
    if not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        return_request = ReturnRequest.objects.get(id=return_id)
        
        if return_request.status != 'PENDING':
            return Response(
                {'error': f'Return request is already {return_request.status.lower()}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from snmov.utils.returns import process_return_approval
        from snmov.utils.email_notifications import send_return_approved
        
        credit_note = process_return_approval(return_request, admin_user=request.user)
        
        # Send email notification
        try:
            send_return_approved(return_request, credit_note)
        except Exception as e:
            logger.error(f"Failed to send return approved email: {e}")
        
        response_serializer = ReturnRequestSerializer(return_request)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
        
    except ReturnRequest.DoesNotExist:
        return Response({'error': 'Return request not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error approving return request: {e}")
        return Response(
            {'error': 'Failed to approve return request', 'message': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_return_request(request, return_id):
    """Reject return request (admin only)"""
    if not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        return_request = ReturnRequest.objects.get(id=return_id)
        
        if return_request.status != 'PENDING':
            return Response(
                {'error': f'Return request is already {return_request.status.lower()}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        rejection_reason = request.data.get('reason', 'Return request rejected')
        
        from snmov.utils.returns import process_return_rejection
        from snmov.utils.email_notifications import send_return_rejected
        
        process_return_rejection(return_request, rejection_reason, admin_user=request.user)
        
        # Send email notification
        try:
            send_return_rejected(return_request, rejection_reason)
        except Exception as e:
            logger.error(f"Failed to send return rejected email: {e}")
        
        response_serializer = ReturnRequestSerializer(return_request)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
        
    except ReturnRequest.DoesNotExist:
        return Response({'error': 'Return request not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error rejecting return request: {e}")
        return Response(
            {'error': 'Failed to reject return request', 'message': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_return_label(request, return_id):
    """Generate return shipping label (admin only)"""
    if not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        return_request = ReturnRequest.objects.get(id=return_id)
        
        if return_request.status != 'APPROVED':
            return Response(
                {'error': 'Return request must be approved before generating label'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from snmov.utils.returns import generate_return_label
        from snmov.utils.email_notifications import send_return_label_generated
        
        label_info = generate_return_label(return_request)
        
        # Update return request with label info
        return_request.return_label_url = label_info.get('label_url')
        return_request.return_tracking_number = label_info.get('tracking_number')
        return_request.save()
        
        # Send email notification
        try:
            send_return_label_generated(return_request)
        except Exception as e:
            logger.error(f"Failed to send return label email: {e}")
        
        response_serializer = ReturnRequestSerializer(return_request)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
        
    except ReturnRequest.DoesNotExist:
        return Response({'error': 'Return request not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error generating return label: {e}")
        return Response(
            {'error': 'Failed to generate return label', 'message': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_invoice(request, order_id):
    """Download invoice PDF for an order"""
    try:
        order = Order.objects.get(id=order_id, customer=request.user)
        
        # Get or create invoice
        invoice, created = Invoice.objects.get_or_create(order=order)
        
        # Generate invoice if it doesn't exist
        if not invoice.pdf_path or created:
            from snmov.utils.pdf_generation import generate_pdf
            pdf_path = generate_pdf(
                template_name='pdf/invoice.html',
                context={'order': order, 'invoice': invoice},
                filename=f'invoice_{order.id}.pdf',
                pdf_type='invoice'
            )
            invoice.pdf_path = pdf_path
            invoice.save()
        
        # Return PDF file
        from django.http import FileResponse
        import os
        from django.conf import settings
        
        pdf_full_path = os.path.join(settings.MEDIA_ROOT, invoice.pdf_path)
        if os.path.exists(pdf_full_path):
            return FileResponse(
                open(pdf_full_path, 'rb'),
                content_type='application/pdf',
                filename=f'invoice_{invoice.invoice_number}.pdf'
            )
        else:
            return Response(
                {'error': 'Invoice PDF not found'},
                status=status.HTTP_404_NOT_FOUND
            )
            
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error downloading invoice: {e}")
        return Response(
            {'error': 'Failed to download invoice', 'message': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_credit_note(request, credit_note_id):
    """Download credit note PDF"""
    try:
        credit_note = CreditNote.objects.select_related('return_request', 'return_request__customer').get(
            id=credit_note_id,
            return_request__customer=request.user
        )
        
        if not credit_note.pdf_path:
            return Response(
                {'error': 'Credit note PDF not available'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Return PDF file
        from django.http import FileResponse
        import os
        from django.conf import settings
        
        pdf_full_path = os.path.join(settings.MEDIA_ROOT, credit_note.pdf_path)
        if os.path.exists(pdf_full_path):
            return FileResponse(
                open(pdf_full_path, 'rb'),
                content_type='application/pdf',
                filename=f'credit_note_{credit_note.credit_note_number}.pdf'
            )
        else:
            return Response(
                {'error': 'Credit note PDF not found'},
                status=status.HTTP_404_NOT_FOUND
            )
            
    except CreditNote.DoesNotExist:
        return Response({'error': 'Credit note not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error downloading credit note: {e}")
        return Response(
            {'error': 'Failed to download credit note', 'message': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
