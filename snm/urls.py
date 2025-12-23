from .views import(
    HomePageView,
    ReactAppView,
    track_ar_usage,
    track_model_usage,
    about_page,
    contact_page,
    privacy_page,
    terms_page,
    cookie_page,
    register_view,
    verify_email,
    invalidlink_view,
)
from django.conf import settings
from django.contrib import admin
from django.contrib.sitemaps.views import sitemap
from django.urls import path, include
from django.contrib.auth import views as auth_views
from django.conf.urls.static import static
from snmov.views import (
    article_create_view,
    logout_request,
    validate_username,
)
from snmov.sitemaps import StaticViewSitemap, ProductSitemap, CommentSitemap

sitemaps = {
    'static': StaticViewSitemap,
    'product': ProductSitemap,
    'comment': CommentSitemap,
}

# Add these handler patterns for custom error pages
handler404 = 'snm.views.custom_404'
handler500 = 'snm.views.custom_500'

urlpatterns = [
    path('', HomePageView.as_view(), name='homepage'),
    path('new-article/', article_create_view, name='article_create'),
    path('product/', include(('snmov.urls', 'snmov'), namespace='product')),
    path('api/', include(('snmov.api_urls', 'api'), namespace='api')),
    path('api/icvybz/', include(('icvybz.api_urls', 'icvybz-api'), namespace='icvybz-api')),
    # path('immersivecomics/', include(('icvybz.urls', 'icvybz'), namespace='immersivecomics')),  # Commented: React handles /immersivecomics/ via catch-all
    # Commented out: React handles these routes via catch-all
    # path('about/', about_page, name='about'),
    # path('privacy/', privacy_page, name='privacy'),
    # path('terms/', terms_page, name='terms'),
    # path('cookies/', cookie_page, name='cookie_policy'),
    # path('contact/', contact_page, name='contact'),
    # path('login/', auth_views.LoginView.as_view(template_name='snmov/login.html'), name='login_req'),
    # path('register/', register_view, name='register'),
    path('track-ar-usage/', track_ar_usage, name='track-ar-usage'),
    path('track-model-usage/', track_model_usage, name='track-ar-usage'),
    path('logout/', logout_request, name='logout_req'),
    path('verify_email/<int:user_id>/<str:token>/', verify_email, name='verify_email'),
    path('verify/invalid_link/', invalidlink_view, name='invalid_link'),
    path('uno/', admin.site.urls),
    path('sitemap.xml', sitemap, {'sitemaps': sitemaps}),
    path('tinymce/', include('tinymce.urls')),
    path('ajax/validate_username/', validate_username, name='validate_username'),
    # Commented out: React handles password reset routes via catch-all
    # path('password-reset/',
    #      auth_views.PasswordResetView.as_view(
    #          template_name='snmov/password_reset.html',
    #          extra_email_context={'protocol': 'https'}),
    #      name='password_reset'),
    # path('password-reset/done/',
    #      auth_views.PasswordResetDoneView.as_view(
    #          template_name='snmov/password_reset_done.html'),
    #      name='password_reset_done'),
    # path('password-reset-confirm/<uidb64>/<token>/',
    #      auth_views.PasswordResetConfirmView.as_view(
    #          template_name='snmov/password_reset_confirm.html'),
    #      name='password_reset_confirm'),
    # path('password-reset-complete/',
    #      auth_views.PasswordResetCompleteView.as_view(
    #          template_name='snmov/password_reset_complete.html'),
    #      name='password_reset_complete'),
    # Catch-all route for React client-side routing
    # This must be LAST to allow Django URLs to take precedence
    path('<path:path>', ReactAppView.as_view(), name='react_app'),
]


if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
