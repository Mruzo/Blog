from django.urls import path
from . import views

app_name = 'immersivecomics'

urlpatterns = [
    path('', views.ComicView.as_view(), name='comic_list'),
    path('dashboard/', views.UserDashboardView.as_view(), name='user_dashboard'),
    path('seasons/<int:pk>/', views.SeasonDetailView.as_view(), name='season_detail'),
    path('seasons/<int:season_id>/episodes/<int:pk>/', views.EpisodeDetailView.as_view(), name='episode_detail'),
    path('seasons/<int:season_id>/episodes/<int:pk>/preview/', views.EpisodePreviewView.as_view(), name='episode_preview'),
    path('analytics/', views.EpisodeAnalyticsView.as_view(), name='episode_analytics'),
    path('seasons/<int:pk>/analytics/', views.SeasonAnalyticsView.as_view(), name='season_analytics'),
    path('api/dialogue/<int:dialogue_id>/update-camera/', views.update_camera_data, name='update_camera_data'),
    path('api/track-share/', views.track_share_click, name='track_share_click'),
]
