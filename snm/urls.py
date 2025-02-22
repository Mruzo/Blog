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
    logout_request,
    
)
from django.conf import settings
from django.contrib import admin
from django.contrib.sitemaps.views import sitemap
from django.urls import path, include
from django.contrib.auth import views as auth_views
from snmov.views import (
    article_create_view,
    
    
    article_detail_view,
    validate_username,
)
from snmov.sitemaps import StaticViewSitemap, ArticleSitemap, CommentSitemap
sitemaps = {
    'static': StaticViewSitemap,
    'article': ArticleSitemap,
    'comment': CommentSitemap,
}

urlpatterns = [
    path('', home_page, name="homepage"),
    path('home-list/', home_list, name="homelist"),
    path('new-article/', article_create_view, name='article_create'),
    path('article/', include('snmov.urls')),
    path('3dcomics/', include('tilf.urls')),
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
    path('uno/', admin.site.urls),
    path('sitemap.xml', sitemap, {'sitemaps': sitemaps}),
    path('tinymce/', include('tinymce.urls')),
    path('ajax/validate_username/', validate_username, name='validate_username'),
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

if settings.DEBUG:
    from django.conf.urls.static import static
    urlpatterns += static(settings.STATIC_URL,
                          document_root=settings.STATICFILES_DIRS)
    urlpatterns += static(settings.MEDIA_URL,
                          document_root=settings.MEDIA_ROOT)
