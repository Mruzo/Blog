from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include, re_path
from django.contrib.sitemaps.views import sitemap
from django.contrib.auth import views as auth_views
# from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.http import JsonResponse
from .views import(
    home_page,
    home_list,
    about_page,
    get_craft_categories,
    craft_list,
    craft_detail,
    contact_page,
    privacy_page,
    terms_page,
    cookie_page,
    register_view,
    verify_email,
    verify_contact_email,
    delete_user_data,
    data_access_request,
    logout_request,
    invalidlink_view,
)
from snmov.views import (
    article_create_view,
    article_detail,
    validate_username,
)
from tilf.admin import download_export
from snmov.sitemaps import StaticViewSitemap, ArticleSitemap, CommentSitemap

sitemaps = {
    'static': StaticViewSitemap,
    'article': ArticleSitemap,
    'comment': CommentSitemap,
}

def tinymce_version(request):
    return JsonResponse({'version': '6.8.3'})

def tinymce_list(request):
    return JsonResponse({'plugins': []})

urlpatterns = [
    path('', home_page, name="homepage"),
    path('home-list/', home_list, name="homelist"),
    path('new-article/', article_create_view, name='article_create'),
    path('article/', include('snmov.urls')),
    path('immersivecomics/', include('tilf.urls', namespace='immersivecomics')),
    path('staff/vybcheq/', include('vybcheq.urls', namespace='vybcheq_staff')),
    path('about/', about_page, name='about'),
    path('categories/', get_craft_categories, name='categories_list'),
    path('crafts/', craft_list, name='craft_list'),
    path('craft/<int:craft_id>/', craft_detail, name='craft_detail'),
    path('privacy/', privacy_page, name='privacy'),
    path('terms/', terms_page, name='terms'),
    path('cookies/', cookie_page, name='cookie'),
    path('reachout/', contact_page, name='contact'),
    path('logout/', logout_request, name='logout_req'),
    path('login/', auth_views.LoginView.as_view(template_name='login.html'),
         name='login_req'),
    path('register/', register_view, name='register'),
    path('verify_email/<int:user_id>/<str:token>/', verify_email, name='verify_email'),
    path('verify_contact_email/<int:contact_id>/<str:token>/', verify_contact_email, name='verify_contact_email'),
    path('delete-user-data/<int:user_id>/', delete_user_data, name='delete_user_data'),
    path('data-access-request/<int:user_id>/', data_access_request, name='data_access_request'),
    path('invalid-link/', invalidlink_view, name='invalid_link'),
    path('uno/', admin.site.urls),
    path('admin/tilf/download-export/', download_export, name='download_export'),
    path('sitemap.xml', sitemap, {'sitemaps': sitemaps}),
    path('tinymce/', include('tinymce.urls')),
    path('ajax/validate_username/', validate_username, name='validate_username'),
    re_path(r'^json/version/?$', tinymce_version, name='tinymce_version'),
    re_path(r'^json/list/?$', tinymce_list, name='tinymce_list'),
    path('password-reset/',
         auth_views.PasswordResetView.as_view(
             template_name='password_reset.html'),
         name='password_reset'),
    path('password-reset/done/',
         auth_views.PasswordResetDoneView.as_view(
             template_name='password_reset_done.html'),
         name='password_reset_done'),
    path('password-reset-confirm/<uidb64>/<token>/',
         auth_views.PasswordResetConfirmView.as_view(
             template_name='password_reset_confirm.html'),
         name='password_reset_confirm'),
    path('password-reset-complete/',
         auth_views.PasswordResetCompleteView.as_view(
             template_name='password_reset_complete.html'),
         name='password_reset_complete'),
]

# Add static and media URL patterns
# urlpatterns += staticfiles_urlpatterns()
# urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    # Only serve media files if MEDIA_URL is defined
    if hasattr(settings, 'MEDIA_URL') and settings.MEDIA_URL:
        urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)