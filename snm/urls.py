from django.conf import settings
from django.contrib import admin
from django.contrib.sitemaps.views import sitemap
from django.urls import path, include
from django.contrib.auth import views as auth_views
from snmov.views import (
    article_create_view,
    logout_request,
    register_view,
    article_detail_view,
    validate_username,
)
from snmov.sitemaps import StaticViewSitemap, ArticleSitemap, CommentSitemap
sitemaps = {
    'static': StaticViewSitemap,
    'article': ArticleSitemap,
    'comment': CommentSitemap,
}
from .views import(
    home_page,
    about_page,
    contact_page_m,
    privacy_page,
    terms_page,
    cookie_page,
)

urlpatterns = [
    path('', home_page, name="homepage"),
    path('new-article/', article_create_view, name='article_create'),
    path('article/', include('snmov.urls')),
    path('about/', about_page, name='about'),
    path('privacy/', privacy_page, name='privacy'),
    path('terms/', terms_page, name='terms'),
    path('cookies/', cookie_page, name='cookie'),
    path('contact/', contact_page_m, name='contact'),
    path('logout/', logout_request, name='logout_req'),
    path('login/', auth_views.LoginView.as_view(template_name='snmov/login.html'), name='login_req'),
    path('register/', register_view, name='register'),
    path('uno/', admin.site.urls),
    path('sitemap.xml', sitemap, {'sitemaps': sitemaps}),
    path('tinymce/', include('tinymce.urls')),
    path('ajax/validate_username/', validate_username, name='validate_username')
]

if settings.DEBUG:
    from django.conf.urls.static import static
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
