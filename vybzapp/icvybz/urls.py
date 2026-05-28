from django.urls import path
from snm.views import ReactAppView
from . import views
from . import api_views
from . import export_import_views

app_name = 'immersivecomics'

urlpatterns = [
    # UI routes: React owns all user-facing pages (serve app shell).
    path('', ReactAppView.as_view(), name='comic_list'),
    path('dashboard/', ReactAppView.as_view(), name='user_dashboard'),
    path('seasons/<int:pk>/', ReactAppView.as_view(), name='season_detail'),
    path('seasons/<int:season_id>/episodes/<int:pk>/', ReactAppView.as_view(), name='episode_detail'),
    path('seasons/<int:season_id>/episodes/<int:pk>/preview/', ReactAppView.as_view(), name='episode_preview'),
    path('analytics/', ReactAppView.as_view(), name='episode_analytics'),
    path('seasons/<int:pk>/analytics/', ReactAppView.as_view(), name='season_analytics'),

    # In-app endpoints (non-/api/): keep Django handlers.
    path('api/dialogue/<int:dialogue_id>/update-camera/', views.update_camera_data, name='update_camera_data'),
    path('api/track-share/', views.track_share_click, name='track_share_click'),
    
    # Story Management URLs
    path('story/create/', ReactAppView.as_view(), name='story_create'),
    path('story/<int:pk>/edit/', ReactAppView.as_view(), name='story_edit'),
    path('story/<int:pk>/manage/', ReactAppView.as_view(), name='story_manage'),
    path('story/<int:pk>/delete/', ReactAppView.as_view(), name='story_delete'),
    
    # Season Management URLs
    path('story/<int:story_id>/season/create/', ReactAppView.as_view(), name='season_create'),
    path('season/<int:pk>/edit/', ReactAppView.as_view(), name='season_edit'),
    
    # Episode Management URLs
    path('season/<int:season_id>/episode/create/', ReactAppView.as_view(), name='episode_create'),
    path('episode/<int:pk>/edit/', ReactAppView.as_view(), name='episode_edit'),
    path('episode/<int:pk>/manage/', ReactAppView.as_view(), name='episode_manage'),
    
    # Character Management URLs
    path('story/<int:story_id>/character/create/', ReactAppView.as_view(), name='character_create'),
    
    # Dialogue Management URLs
    path('episode/<int:episode_id>/dialogue/create/', ReactAppView.as_view(), name='dialogue_create'),
    path('dialogue/<int:pk>/edit/', ReactAppView.as_view(), name='dialogue_edit'),
    path('dialogue/<int:pk>/delete/', ReactAppView.as_view(), name='dialogue_delete'),
    
    # Export/Import URLs
    path('export-import/', ReactAppView.as_view(), name='story_export_import'),
    
    # Export/Import API URLs - TODO: Implement these views
    # path('api/story/<int:story_id>/export/', api_views.StoryExportAPIView.as_view(), name='story_export_api'),
    # path('api/story/import/', api_views.StoryImportAPIView.as_view(), name='story_import_api'),
    
    # Studio URLs
    path('studios/', ReactAppView.as_view(), name='studio_list'),
    path('studio/<int:pk>/', ReactAppView.as_view(), name='studio_detail'),
    path('my-studio/', ReactAppView.as_view(), name='my_studio'),
    path('studio/create/', ReactAppView.as_view(), name='studio_create'),
    path('studio/<int:pk>/edit/', ReactAppView.as_view(), name='studio_edit'),
    
    # Audio URLs
    path('audio/', ReactAppView.as_view(), name='audio_track_list'),
    path('audio/create/', ReactAppView.as_view(), name='audio_track_create'),
    path('audio/<int:pk>/edit/', ReactAppView.as_view(), name='audio_track_edit'),
    path('audio/<int:pk>/delete/', ReactAppView.as_view(), name='audio_track_delete'),
    
    # Studio API URLs
    path('api/studios/', views.studio_list_api, name='studio_list_api'),
    path('api/my-studio/', views.my_studio_api, name='my_studio_api'),
    
    # Email Preview URLs (for development/testing)
    path('preview/email/collaboration/', views.preview_collaboration_email, name='preview_collaboration_email'),
    path('preview/email/all/', views.preview_all_emails, name='preview_all_emails'),
]
