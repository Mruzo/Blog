from django.urls import path
from snm.views import ReactAppView
from .views import (
    add_product,
    update_quantity,
    remove_product,
    cancel_order,
    verify_email,
    resend_verification,
    register,
    email_preferences,
    unsubscribe,
)

app_name = 'snmov'

urlpatterns = [
    # UI routes: React owns all user-facing pages (serve app shell).
    path('', ReactAppView.as_view(), name='product_list'),
    path('my-orders/', ReactAppView.as_view(), name='my_orders'),
    path('order/<int:order_id>/', ReactAppView.as_view(), name='order_detail'),
    path('cart/', ReactAppView.as_view(), name='view_cart'),
    path('cart/checkout/', ReactAppView.as_view(), name='checkout'),
    path('cart/shipping/<int:order_id>/', ReactAppView.as_view(), name='select_shipping'),
    path('payment/success/', ReactAppView.as_view(), name='payment_success'),
    path('<slug:slug>/', ReactAppView.as_view(), name='product_detail'),

    # Keep backend action endpoints (non-/api/) for compatibility.
    path('add-to-cart/<uuid:product_id>/', add_product, name='add_to_cart'),
    path('cart/update/<uuid:item_id>/', update_quantity, name='update_quantity'),
    path('cart/remove/<uuid:item_id>/', remove_product, name='remove_product'),
    path('order/<int:order_id>/cancel/', cancel_order, name='cancel_order'),

    # Auth/email endpoints (backend).
    path('verify-email/<int:user_id>/<str:token>/', verify_email, name='verify_email'),
    path('resend-verification/', resend_verification, name='resend_verification'),
    path('register/', register, name='register'),
    path('email/preferences/', email_preferences, name='email_preferences'),
    path('unsubscribe/<str:token>/', unsubscribe, name='unsubscribe'),
]
