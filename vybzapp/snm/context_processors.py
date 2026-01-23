from dj_shop_cart.cart import get_cart_class
from django.shortcuts import get_object_or_404
from django.conf import settings

def cart_context(request):
    Cart = get_cart_class()
    return {'cart': Cart.new(request)}

def cart_count(request):
    cart = request.session.get('cart', {})
    count = sum(item.get('quantity', 1) for item in cart.values())
    return {'cart_count': count}