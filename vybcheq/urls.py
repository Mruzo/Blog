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
    path("rule-sets/", views_staff.rule_set_list, name="rule_set_list"),
    path("rule-sets/new/", views_staff.rule_set_create, name="rule_set_create"),
    path("rule-sets/<int:pk>/edit/", views_staff.rule_set_edit, name="rule_set_edit"),
    path("run-screen/", views_staff.run_screen_pick, name="run_screen_pick"),
    path("run-screen/<int:rule_set_id>/", views_staff.run_screen_confirm, name="run_screen_confirm"),
    path("runs/", views_staff.screen_runs, name="screen_runs"),
    path("runs/<int:pk>/", views_staff.screen_run_detail, name="screen_run_detail"),
    path("sim/", views_staff.sim_portfolio, name="sim_portfolio"),
    path("sim/open/", views_staff.sim_open_trade, name="sim_open_trade"),
    path("sim/close/<int:position_id>/", views_staff.sim_close_trade, name="sim_close_trade"),
    path("sim/mark/", views_staff.sim_record_marks, name="sim_record_marks"),
    path("sim/position/<int:pk>/", views_staff.sim_position_detail, name="sim_position_detail"),
]
