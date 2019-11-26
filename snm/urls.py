from django.conf import settings
from django.contrib import admin
from django.urls import path, include
from snmov.views import (
    article_create_view,
    logout_request,
    login_request,
    register_view,
)
from .views import(
    home_page,
    about_page,
    contact_page,
    privacy_page,
)

urlpatterns = [
    path('', home_page),
    path('new-article/', article_create_view),
    path('article/', include('snmov.urls')),
    path('about/', about_page),
    path('privacy/', privacy_page),
    path('contact/', contact_page),
    path('logout/', logout_request),
    path('login/', login_request),
    path('register/', register_view),
    path('admin/', admin.site.urls),
]

if settings.DEBUG:
    from django.conf.urls.static import static
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)