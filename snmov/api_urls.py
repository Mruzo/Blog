from django.urls import path
from .api_views import (
    ProductListView, ProductDetailView, get_cart, add_to_cart,
    update_cart_item, remove_from_cart, clear_cart,
    OrderListView, OrderDetailView, user_profile, check_auth,
    checkout, get_shipping_rates, select_shipping_rate, payment_success,
    contact_form, get_saved_addresses, save_address, delete_saved_address,
    set_default_address, subscribe_newsletter, unsubscribe_newsletter,
    get_newsletter_subscription, export_user_data, delete_user_data
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
    
    # Contact form endpoint
    path('contact/', contact_form, name='contact-form'),
    
    # High Priority: Saved addresses endpoints
    path('addresses/', get_saved_addresses, name='saved-addresses'),
    path('addresses/save/', save_address, name='save-address'),
    path('addresses/<int:address_id>/delete/', delete_saved_address, name='delete-address'),
    path('addresses/<int:address_id>/set-default/', set_default_address, name='set-default-address'),
    
    # Newsletter subscription endpoints
    path('newsletter/subscribe/', subscribe_newsletter, name='newsletter-subscribe'),
    path('newsletter/unsubscribe/<str:token>/', unsubscribe_newsletter, name='newsletter-unsubscribe'),
    path('newsletter/status/', get_newsletter_subscription, name='newsletter-status'),
    
    # GDPR endpoints
    path('gdpr/export/', export_user_data, name='gdpr-export'),
    path('gdpr/delete/', delete_user_data, name='gdpr-delete'),
]
