"""URLconf used only by snm.settings.test_vybcheq."""
from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path


def _dummy_page(request):
    return HttpResponse("ok")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("staff/vybcheq/", include("vybcheq.urls", namespace="vybcheq_staff")),
    # Names referenced by templates/base.html footer
    path("privacy/", _dummy_page, name="privacy"),
    path("cookies/", _dummy_page, name="cookie"),
    path("terms/", _dummy_page, name="terms"),
]
