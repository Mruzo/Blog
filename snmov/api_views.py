from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle
from snmov.utils.security import rate_limit_check, log_security_event, validate_file_upload, sanitize_filename
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth import get_user_model
import json
import uuid
from decimal import Decimal

from .models import Product, Order, OrderItem, ShippingAddress, ReachOut, NewsletterSubscription
from .serializers import (
    ProductSerializer, ProductListSerializer, OrderSerializer, 
    CartItemSerializer, CartUpdateSerializer, ReachOutSerializer,
    NewsletterSubscriptionSerializer
)
from snm.settings.base import DEFAULT_FROM_EMAIL, SUPPORT_EMAIL
from django.core.mail import send_mail
from snmov.utils.email_notifications import send_order_confirmation
from .utils.cart import get_cart_for_session, get_shipping_rates as get_shipping_rates_for_order, get_sender_address
from .forms import ShippingAddressForm
from django.urls import reverse
import stripe
import requests
# import shippo  # Replaced with Canada Post
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

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
            
            # Enforce maximum of 4 items per product
            MAX_ITEMS_PER_PRODUCT = 4
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
                        'error': f'Sorry, {product.title} is out of stock. Only {product.stock} items available.',
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
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
            # Enforce maximum of 4 items per product
            MAX_ITEMS_PER_PRODUCT = 4
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
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
        return Order.objects.filter(customer=self.request.user).order_by('-ordered_date')


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
        shipping = form.save(commit=False)
        shipping.user = request.user
        shipping.save()
        
        # Create order
        order = Order.objects.create(customer=request.user, shipping_address=shipping)
        
        # Add items to the order and decrement stock
        for item in cart_items:
            try:
                product = Product.objects.get(uuid=item['uuid'], available=True)
                
                # Double-check stock before creating order item
                if product.stock >= item['quantity']:
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=item['quantity']
                    )
                    # Decrement stock
                    product.stock -= item['quantity']
                    product.save(update_fields=['stock'])
                else:
                    # This shouldn't happen due to validation above, but handle it
                    continue
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
    session_rates = request.session.get('shipping_rates', [])
    
    # CRITICAL FIX: If session rates not found (Token Auth issue), re-fetch them
    if not session_rates:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Shipping rates not found in session for order {order_id}, re-fetching...")
        try:
            from snmov.utils.cart import get_shipping_rates as get_shipping_rates_func
            session_rates = get_shipping_rates_func(order)
            # Save to session for next time
            request.session['shipping_rates'] = session_rates
            request.session.modified = True
            request.session.save()
        except Exception as e:
            logger.error(f"Error re-fetching shipping rates: {e}")
            return Response({
                'success': False,
                'error': f'Failed to fetch shipping rates: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
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
        # Redirect to React app's payment success page after Stripe checkout
        # Use settings to get frontend URL (for production compatibility)
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        success_url = f'{frontend_url}/product/payment/success/?session_id={{CHECKOUT_SESSION_ID}}'
        cancel_url = f'{frontend_url}/product/cart/checkout/'
        
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=line_items,
            mode='payment',
            success_url=success_url,
            cancel_url=cancel_url,
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
        previous_status = order.status
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
        
        # CRITICAL FIX: Send order confirmation email
        try:
            from snmov.utils.email_notifications import send_order_confirmation, send_order_status_update
            send_order_confirmation(order)
            
            # Send status update email if status changed and tracking is available
            if order.status != previous_status and order.tracking_number:
                send_order_status_update(order)
        except Exception as e:
            # Log email error but don't fail the request
            print(f"Failed to send order email: {e}")
        
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
        # Save the contact form submission
        reach_out = serializer.save()
        
        # Increment rate limit counter
        cache.set(rate_limit_key, submission_count + 1, 3600)  # 1 hour expiry
        
        # Send email notification to support
        try:
            subject = 'Contact Form'
            message = f"Name: {reach_out.full_name}\nEmail: {reach_out.email}\n\nSubject: {reach_out.subject}\n\nMessage: {reach_out.content}"
            from_email = DEFAULT_FROM_EMAIL
            to_email = SUPPORT_EMAIL
            
            send_mail(subject, message, from_email, [to_email])
        except Exception as e:
            # Log email error but don't fail the request
            print(f"Failed to send contact form email: {e}")
        
        # Send confirmation email to user
        try:
            from snmov.utils.email_notifications import send_feedback_confirmation
            send_feedback_confirmation(reach_out)
        except Exception as e:
            # Log email error but don't fail the request
            print(f"Failed to send feedback confirmation email: {e}")
        
        return Response({
            'success': True,
            'message': 'Thanks for reaching out. Your message has been sent.'
        }, status=status.HTTP_201_CREATED)
    
    return Response({
        'success': False,
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
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
