from django.urls import path
from . import views
from . import api_views
from . import export_import_views

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
    
    # Export/Import URLs
    path('export-import/', export_import_views.StoryExportImportView.as_view(), name='story_export_import'),
    
    # Export/Import API URLs - TODO: Implement these views
    # path('api/story/<int:story_id>/export/', api_views.StoryExportAPIView.as_view(), name='story_export_api'),
    # path('api/story/import/', api_views.StoryImportAPIView.as_view(), name='story_import_api'),
    
    # Studio URLs
    path('studios/', views.StudioListView.as_view(), name='studio_list'),
    path('studio/<int:pk>/', views.StudioDetailView.as_view(), name='studio_detail'),
    path('my-studio/', views.MyStudioView.as_view(), name='my_studio'),
    path('studio/create/', views.StudioCreateView.as_view(), name='studio_create'),
    path('studio/<int:pk>/edit/', views.StudioUpdateView.as_view(), name='studio_edit'),
    
    # Audio URLs
    path('audio/', views.AudioTrackListView.as_view(), name='audio_track_list'),
    path('audio/create/', views.AudioTrackCreateView.as_view(), name='audio_track_create'),
    path('audio/<int:pk>/edit/', views.AudioTrackUpdateView.as_view(), name='audio_track_edit'),
    path('audio/<int:pk>/delete/', views.AudioTrackDeleteView.as_view(), name='audio_track_delete'),
    
    # Studio API URLs
    path('api/studios/', views.studio_list_api, name='studio_list_api'),
    path('api/my-studio/', views.my_studio_api, name='my_studio_api'),
]
