from django.shortcuts import get_object_or_404
from snmov.models import Product, ShippingAddress
import requests
import shippo
from django.contrib.auth import get_user_model
from django.conf import settings
from decimal import Decimal
from django.core.exceptions import ObjectDoesNotExist

User = get_user_model()

def get_cart_for_session(request):
    cart = request.session.get('cart', {})
    cart_items = []
    total_price = 0

    for product_id, details in cart.items():
        try:
            product = Product.objects.get(uuid=product_id)
            quantity = details.get('quantity', 1)
            unit_price = product.get_discounted_price()
            total = unit_price * quantity
            cart_items.append({
                'uuid': product.uuid,
                'title': product.title,
                'price': round(unit_price,2),
                'quantity': quantity,
                'total': round(total,2),
            })
            total_price += total
        except Product.DoesNotExist:
            continue

    return {
        'cart_items': cart_items,
        'total_price': total_price,
    }

def get_sender_address():
    try:
        sender_user = User.objects.get(username='chris')
        sender_address = ShippingAddress.objects.filter(user=sender_user).latest('id')
    except User.DoesNotExist:
        raise ValueError("Sender user 'chris' does not exist.")
    except ShippingAddress.DoesNotExist:
        raise ValueError("No shipping address found for sender user.")

    return {
        "name": f"{sender_user.first_name} {sender_user.last_name}".strip(),
        "street1": sender_address.address_line_1,
        "city": sender_address.city,
        "state": sender_address.state,
        "zip": sender_address.postal_code,
        "country": sender_address.country_code,
        "email": sender_user.email,
        "phone": sender_address.phone if hasattr(sender_address, "phone") else "",  # Optional
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
        shipment = shippo.Shipment.create(
            address_from=from_address,
            address_to=to_address,
            parcels=[parcel],
              **{'async': False}, 
        )
       
        # Print the raw API response
        print("==== SHIPPO API RAW RESPONSE ====")
        print(shipment)

        if not shipment.get("rates"):
            if "messages" in shipment:
                print("==== SHIPPO MESSAGES ====")
                for msg in shipment["messages"]:
                    print(f"- {msg.get('source')}: {msg.get('text')}")
            raise ValueError("No shipping options available.")

        return shipment["rates"]

    except requests.exceptions.HTTPError as e:
        raise ValueError(f"Failed to fetch rates: {e}")
    except Exception as e:
        raise ValueError(f"Unexpected error when fetching rates: {e}")
   
