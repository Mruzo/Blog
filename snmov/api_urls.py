from django.urls import path
from .api_views import (
    ProductListView, ProductDetailView, get_cart, add_to_cart,
    update_cart_item, remove_from_cart, clear_cart,
    OrderListView, OrderDetailView, user_profile, check_auth,
    checkout, get_shipping_rates, select_shipping_rate, payment_success
)

app_name = 'api'

urlpatterns = [
    # Product endpoints
    path('products/', ProductListView.as_view(), name='product-list'),
    path('products/<slug:slug>/', ProductDetailView.as_view(), name='product-detail'),
    
    # Cart endpoints
    path('cart/', get_cart, name='cart'),
    path('cart/add/', add_to_cart, name='cart-add'),
    path('cart/update/<uuid:product_id>/', update_cart_item, name='cart-update'),
    path('cart/remove/<uuid:product_id>/', remove_from_cart, name='cart-remove'),
    path('cart/clear/', clear_cart, name='cart-clear'),
    
    # Order endpoints
    path('orders/', OrderListView.as_view(), name='order-list'),
    path('orders/<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
    
    # User endpoints
    path('user/profile/', user_profile, name='user-profile'),
    path('auth/check/', check_auth, name='auth-check'),
    
    # Checkout endpoints
    path('checkout/', checkout, name='checkout'),
    path('orders/<int:order_id>/shipping/', get_shipping_rates, name='shipping-rates'),
    path('orders/<int:order_id>/select-shipping/', select_shipping_rate, name='select-shipping'),
    path('payment/success/', payment_success, name='payment-success'),
]
