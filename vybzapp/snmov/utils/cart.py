from django.shortcuts import get_object_or_404
from snmov.models import Product, ShippingAddress
import requests
from django.contrib.auth import get_user_model
from django.conf import settings
from decimal import Decimal
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

def get_cart_for_session(request, clean_expired=True):
    """
    Get cart items for session.
    High Priority: Automatically clean expired cart items (older than 30 days).
    
    CRITICAL FIX: When user is authenticated, merge cart from ALL their sessions.
    This handles the case where Token Auth creates new sessions on each request.
    """
    from django.contrib.sessions.models import Session
    from django.utils import timezone
    
    # Handle case where request might not have user attribute (e.g., in tests)
    has_user = hasattr(request, 'user')
    is_authenticated = has_user and hasattr(request.user, 'is_authenticated') and request.user.is_authenticated
    
    cart = request.session.get('cart', {})
    
    # CRITICAL: If authenticated, merge cart from ALL user's sessions
    # BUT: Current session takes precedence (most recent updates)
    if is_authenticated:
        # Search for user's sessions with cart and merge them
        active_sessions = Session.objects.filter(expire_date__gte=timezone.now())
        merged_cart = dict(cart)  # Start with current session cart (this is the source of truth)
        
        for session in active_sessions:
            try:
                session_data = session.get_decoded()
                session_user_id = session_data.get('_auth_user_id')
                if session_user_id == str(request.user.id):
                    session_cart = session_data.get('cart', {})
                    if session_cart:
                        # Merge session cart into merged_cart
                        # CRITICAL: Current session (merged_cart) takes precedence over other sessions
                        for product_id, details in session_cart.items():
                            if product_id not in merged_cart:
                                # Only add items that don't exist in current session
                                # This ensures current session updates are not overwritten
                                merged_cart[product_id] = details
            except Exception:
                continue
        
        # If we merged carts, save to current session
        if merged_cart != cart:
            cart = merged_cart
            request.session['cart'] = cart
            request.session['_auth_user_id'] = str(request.user.id)
            request.session.modified = True
            request.session.save()
    cart_items = []
    total_price = Decimal('0.00')
    list_subtotal = Decimal('0.00')
    cart_modified = False
    
    # High Priority: Cart expiration - 30 days
    CART_EXPIRY_DAYS = 30
    expiry_date = timezone.now() - timedelta(days=CART_EXPIRY_DAYS)

    for product_id, details in cart.items():
        try:
            # Validate UUID format first
            import uuid
            uuid.UUID(product_id)
            
            # High Priority: Check if cart item has expired
            if clean_expired:
                item_added_at = details.get('added_at')
                if item_added_at:
                    try:
                        from django.utils.dateparse import parse_datetime
                        added_datetime = parse_datetime(item_added_at)
                        if added_datetime and added_datetime < expiry_date:
                            # Item expired, remove it
                            cart_modified = True
                            continue
                    except (ValueError, TypeError):
                        # If date parsing fails, keep the item (backward compatibility)
                        pass
            
            product = Product.objects.get(uuid=product_id)
            quantity = details.get('quantity', 1)
            list_unit = product.price or Decimal('0.00')
            unit_price = product.get_discounted_price()
            line_list = (list_unit * quantity).quantize(Decimal('0.01'))
            line_total = (unit_price * quantity).quantize(Decimal('0.01'))
            line_savings = max(Decimal('0.00'), line_list - line_total)
            cart_items.append({
                'uuid': product.uuid,
                'title': product.title,
                'list_price': float(list_unit),
                'price': float(unit_price),
                'quantity': quantity,
                'item_total': float(line_total),
                'item_list_total': float(line_list),
                'item_sale_savings': float(line_savings),
                'discount_percentage': float(product.discount_percentage or 0),
            })
            total_price += line_total
            list_subtotal += line_list
        except (Product.DoesNotExist, ValueError):
            # Skip invalid UUIDs or non-existent products
            cart_modified = True
            continue
    
    # If we removed expired items, update the session
    if cart_modified and clean_expired:
        # Rebuild cart with only non-expired items
        cleaned_cart = {}
        for product_id, details in cart.items():
            item_added_at = details.get('added_at')
            if item_added_at:
                try:
                    from django.utils.dateparse import parse_datetime
                    added_datetime = parse_datetime(item_added_at)
                    if added_datetime and added_datetime >= expiry_date:
                        cleaned_cart[product_id] = details
                except (ValueError, TypeError):
                    # Keep items without valid timestamps (backward compatibility)
                    cleaned_cart[product_id] = details
            else:
                # Keep items without timestamps (backward compatibility)
                cleaned_cart[product_id] = details
        
        request.session['cart'] = cleaned_cart
        request.session.modified = True

    product_sale_savings = max(Decimal('0.00'), list_subtotal - total_price).quantize(Decimal('0.01'))
    merchandise_subtotal = total_price.quantize(Decimal('0.01'))
    return {
        'cart_items': cart_items,
        'total_price': float(merchandise_subtotal),
        'list_subtotal': float(list_subtotal.quantize(Decimal('0.01'))),
        'product_sale_savings': float(product_sale_savings),
        'merchandise_subtotal': float(merchandise_subtotal),
    }

def get_sender_address():
    """
    Return the sender (store) address used for shipping rate/label APIs.

    Prefer a real DB-backed sender user/address when available, but fall back to
    settings defaults so local dev/tests don't require a hard-coded user.
    """
    from django.conf import settings

    try:
        sender_user = User.objects.get(username='chris')
        sender_address = ShippingAddress.objects.filter(user=sender_user).latest('id')
        return {
            "name": f"{sender_user.first_name} {sender_user.last_name}".strip() or sender_user.username,
            "street1": sender_address.address_line_1,
            "street2": getattr(sender_address, "address_line_2", "") or "",
            "city": sender_address.city,
            "state": sender_address.state,
            "zip": sender_address.postal_code,
            "country": sender_address.country_code,
            "email": sender_user.email,
            "phone": getattr(sender_address, "phone", "") or "",
        }
    except (User.DoesNotExist, ShippingAddress.DoesNotExist):
        # Fallback for tests / local dev
        return {
            "name": getattr(settings, "DEFAULT_SENDER_NAME", "Justvybz"),
            "street1": getattr(settings, "DEFAULT_SENDER_STREET1", ""),
            "street2": getattr(settings, "DEFAULT_SENDER_STREET2", ""),
            "city": getattr(settings, "DEFAULT_SENDER_CITY", ""),
            "state": getattr(settings, "DEFAULT_SENDER_STATE", ""),
            "zip": getattr(settings, "DEFAULT_SENDER_ZIP", ""),
            "country": getattr(settings, "DEFAULT_SENDER_COUNTRY", "CA"),
            "email": getattr(settings, "DEFAULT_FROM_EMAIL", ""),
            "phone": "",
        }



def get_shipping_rates(order):
    # Make sure the order has a shipping address
    shipping = order.shipping_address
    if not shipping:
        raise ValueError("Shipping address not found for this order.")

    # Use helper to retrieve sender address
    from_address = get_sender_address()

    to_address = {
        "name": shipping.full_name,
        "street1": shipping.address_line_1,
        "city": shipping.city,
        "state": shipping.state,
        "zip": shipping.postal_code,
        "country": shipping.country_code,
        "email": shipping.user.email if shipping.user else '',
        "phone": shipping.user.profile.phone if shipping.user and hasattr(shipping.user, 'profile') else '',
    }

    # Calculate total dimensions from order items
    total_length = Decimal("0.0")
    total_width = Decimal("0.0")
    total_height = Decimal("0.0")

    for item in order.orderitem_set.all():
        product = item.product
        quantity = item.quantity

        # Evaluate the model fields by converting them to Decimal
        product_length = Decimal(str(product.package_length or 0))
        product_width = Decimal(str(product.package_width or 0))
        product_height = Decimal(str(product.package_height or 0))

        # Use the evaluated values
        total_length = max(total_length, product_length)  # Use longest length
        total_width += product_width * quantity  # Sum widths for side-by-side placement
        total_height = max(total_height, product_height)  # Use tallest height

    # Create parcel with calculated dimensions
    parcel = {
        "length": str(round(total_length, 2)),
        "width": str(round(total_width, 2)),
        "height": str(round(total_height, 2)),
        "distance_unit": "cm",
        "weight": str(order.calculate_total_weight() / 1000.0),  # convert grams to kg
        "mass_unit": "kg",
    }

    print("TO ADDRESS:", to_address)
    print("FROM ADDRESS:", from_address)
    print("PARCEL:", parcel)


    try:
        # Use Canada Post API instead of Shippo
        from snmov.utils.canadapost import get_canadapost_rates
        
        # use_production=None will use settings.CANADAPOST_USE_PRODUCTION
        rates = get_canadapost_rates(order, use_production=None)
        
        if not rates:
            raise ValueError("No shipping options available.")
        
        # get_canadapost_rates already returns formatted rates with servicelevel.name
        # So we can return them directly, but ensure all fields are present
        formatted_rates = []
        for rate in rates:
            # Extract service name from servicelevel.name or _canadapost_service_name
            service_name = rate.get('servicelevel', {}).get('name', '') or rate.get('_canadapost_service_name', '')
            service_code = rate.get('object_id', '') or rate.get('_canadapost_service_code', '')
            estimated_days = rate.get('estimated_days', 0)
            
            formatted_rates.append({
                'object_id': service_code,
                'servicelevel': {
                    'name': service_name,
                },
                'amount': str(rate.get('amount', '0.00')),
                'currency': rate.get('currency', 'CAD'),
                'estimated_days': int(estimated_days) if estimated_days else 0,
                'courier_name': rate.get('courier_name', 'Canada Post'),
                'provider': rate.get('provider', 'Canada Post'),
                'provider_image_200': rate.get('provider_image_200', ''),
                'shipment_charge': {
                    'amount': str(rate.get('amount', '0.00')),
                    'currency': rate.get('currency', 'CAD'),
                },
                # Store original Canada Post data
                '_canadapost_service_code': service_code,
                '_canadapost_service_name': service_name,
            })
        
        return formatted_rates

    except requests.exceptions.HTTPError as e:
        raise ValueError(f"Failed to fetch rates: {e}")
    except Exception as e:
        raise ValueError(f"Unexpected error when fetching rates: {e}")
   
