"""
Staff-only UI for Vybcheq (mounted at /staff/vybcheq/).
"""
from django.urls import path

from . import views_staff

app_name = "vybcheq_staff"

urlpatterns = [
    path("", views_staff.dashboard, name="dashboard"),
    path("watchlist/", views_staff.watchlist, name="watchlist"),
    path("security/<int:pk>/metrics/", views_staff.security_metrics, name="security_metrics"),
    path("run-screen/", views_staff.run_screen_pick, name="run_screen_pick"),
    path("run-screen/<int:rule_set_id>/", views_staff.run_screen_confirm, name="run_screen_confirm"),
    path("runs/", views_staff.screen_runs, name="screen_runs"),
    path("runs/<int:pk>/", views_staff.screen_run_detail, name="screen_run_detail"),
]
