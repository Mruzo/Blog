from django.urls import path
from . import api_views

app_name = 'feedback'

urlpatterns = [
    # Public endpoints
    path('api/tickets/', api_views.create_ticket, name='create-ticket'),
    path('api/tickets/<str:ticket_number>/', api_views.get_ticket_by_number, name='get-ticket-by-number'),
    
    # User endpoints
    path('api/user/tickets/', api_views.UserTicketList.as_view(), name='user-ticket-list'),
    path('api/user/tickets/<int:id>/', api_views.UserTicketDetail.as_view(), name='user-ticket-detail'),
    path('api/user/tickets/<int:ticket_id>/comments/', api_views.add_user_comment, name='add-user-comment'),
    
    # Admin endpoints
    path('api/admin/tickets/', api_views.AdminTicketList.as_view(), name='admin-ticket-list'),
    path('api/admin/tickets/<int:id>/', api_views.AdminTicketDetail.as_view(), name='admin-ticket-detail'),
    path('api/admin/tickets/<int:ticket_id>/assign/', api_views.assign_ticket, name='assign-ticket'),
    path('api/admin/tickets/<int:ticket_id>/comments/', api_views.add_admin_comment, name='add-admin-comment'),
    path('api/admin/tickets/<int:ticket_id>/resolve/', api_views.resolve_ticket, name='resolve-ticket'),
    path('api/admin/tickets/<int:ticket_id>/close/', api_views.close_ticket, name='close-ticket'),
]
