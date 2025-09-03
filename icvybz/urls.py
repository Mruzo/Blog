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
    
    # Story Management URLs
    path('story/create/', views.StoryCreateView.as_view(), name='story_create'),
    path('story/<int:pk>/edit/', views.StoryEditView.as_view(), name='story_edit'),
    path('story/<int:pk>/manage/', views.StoryManageView.as_view(), name='story_manage'),
    path('story/<int:pk>/delete/', views.StoryDeleteView.as_view(), name='story_delete'),
    
    # Season Management URLs
    path('story/<int:story_id>/season/create/', views.SeasonCreateView.as_view(), name='season_create'),
    path('season/<int:pk>/edit/', views.SeasonEditView.as_view(), name='season_edit'),
    
    # Episode Management URLs
    path('season/<int:season_id>/episode/create/', views.EpisodeCreateView.as_view(), name='episode_create'),
    path('episode/<int:pk>/edit/', views.EpisodeEditView.as_view(), name='episode_edit'),
    path('episode/<int:pk>/manage/', views.EpisodeManageView.as_view(), name='episode_manage'),
    
    # Character Management URLs
    path('story/<int:story_id>/character/create/', views.CharacterCreateView.as_view(), name='character_create'),
    
    # Dialogue Management URLs
    path('episode/<int:episode_id>/dialogue/create/', views.DialogueCreateView.as_view(), name='dialogue_create'),
    path('dialogue/<int:pk>/edit/', views.DialogueEditView.as_view(), name='dialogue_edit'),
    path('dialogue/<int:pk>/delete/', views.DialogueDeleteView.as_view(), name='dialogue_delete'),
]
