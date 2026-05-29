from django.urls import path
from .api_views import (
    ProductListView, ProductDetailView, featured_storefront_coupon, preview_coupon,
    site_image_by_caption_token, get_cart, add_to_cart,
    update_cart_item, remove_from_cart, clear_cart,
    OrderListView, OrderDetailView, user_profile, check_auth,
    checkout, get_shipping_rates, select_shipping_rate, payment_success,
    stripe_checkout_webhook,
    contact_form, get_saved_addresses, save_address, delete_saved_address,
    set_default_address, subscribe_newsletter, unsubscribe_newsletter,
    get_newsletter_subscription, export_user_data, delete_user_data,
    get_available_return_items, create_return_request, ReturnRequestListView,
    ReturnRequestDetailView, approve_return_request, reject_return_request,
    generate_return_label, download_invoice, download_credit_note,
    cancel_order_api
)

app_name = 'api'

urlpatterns = [
    path('coupons/featured/', featured_storefront_coupon, name='coupon-featured-storefront'),
    path('coupons/preview/', preview_coupon, name='coupon-preview'),
    path('site-images/by-caption/', site_image_by_caption_token, name='site-image-by-caption-token'),
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
    path('orders/<int:order_id>/cancel/', cancel_order_api, name='order-cancel'),
    
    # User endpoints
    path('user/profile/', user_profile, name='user-profile'),
    path('auth/check/', check_auth, name='auth-check'),
    
    # Checkout endpoints
    path('checkout/', checkout, name='checkout'),
    path('orders/<int:order_id>/shipping/', get_shipping_rates, name='shipping-rates'),
    path('orders/<int:order_id>/select-shipping/', select_shipping_rate, name='select-shipping'),
    path('payment/success/', payment_success, name='payment-success'),
    path('stripe/webhook/', stripe_checkout_webhook, name='stripe-webhook'),
    
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
    
    # Return/Refund endpoints
    path('orders/<int:order_id>/returnable-items/', get_available_return_items, name='returnable-items'),
    path('returns/', create_return_request, name='return-create'),
    path('returns/list/', ReturnRequestListView.as_view(), name='return-list'),
    path('returns/<int:pk>/', ReturnRequestDetailView.as_view(), name='return-detail'),
    path('returns/<int:return_id>/approve/', approve_return_request, name='return-approve'),
    path('returns/<int:return_id>/reject/', reject_return_request, name='return-reject'),
    path('returns/<int:return_id>/label/', generate_return_label, name='return-label'),
    path('orders/<int:order_id>/invoice/', download_invoice, name='invoice-download'),
    path('credit-notes/<int:credit_note_id>/pdf/', download_credit_note, name='credit-note-download'),
]
