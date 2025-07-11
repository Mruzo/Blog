from django.urls import path
from . import views

app_name = 'immersivecomics'

urlpatterns = [
    path('', views.ComicView.as_view(), name='comic_list'),
    path('seasons/<int:pk>/', views.SeasonDetailView.as_view(), name='season_detail'),
    path('seasons/<int:season_id>/episodes/<int:pk>/', views.EpisodeDetailView.as_view(), name='episode_detail'),
    path('seasons/<int:season_id>/episodes/<int:pk>/add-comment/', views.EpisodeDetailView.as_view(), name='add_comment'),
    path('seasons/<int:season_id>/episodes/<int:pk>/delete-comment/<int:comment_id>/', views.delete_comment, name='delete_comment'),
    path('preview/seasons/<int:season_id>/episodes/<int:pk>/', views.EpisodePreviewView.as_view(), name='episode_preview'),
    path('api/dialogue/<int:dialogue_id>/update-camera/', views.update_camera_data, name='update_camera_data'),
    path('analytics/', views.EpisodeAnalyticsView.as_view(), name='episode_analytics'),
    path('analytics/seasons/<int:pk>/', views.SeasonAnalyticsView.as_view(), name='season_analytics'),
]
