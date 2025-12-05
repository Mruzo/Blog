from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views, collaboration_views

# Import auth views
from .api_views import (
    login_api, logout_api, get_current_user_api, register_api, password_reset_api
)

# Create router for DRF viewsets
router = DefaultRouter()

urlpatterns = [
    # Authentication URLs
    path('auth/login/', login_api, name='auth-login'),
    path('auth/logout/', logout_api, name='auth-logout'),
    path('auth/user/', get_current_user_api, name='auth-user'),
    path('auth/register/', register_api, name='auth-register'),
    path('auth/password-reset/', password_reset_api, name='auth-password-reset'),
    
    # Story/Comic URLs
    path('stories/', api_views.ComicListCreateView.as_view(), name='story-list-create'),
    path('stories/<int:pk>/', api_views.ComicDetailView.as_view(), name='story-detail'),
    path('stories/public/', api_views.PublicStoriesView.as_view(), name='public-stories'),
    
    # Season URLs
    path('stories/<int:story_id>/seasons/', api_views.SeasonListCreateView.as_view(), name='season-list-create'),
    path('seasons/<int:pk>/', api_views.SeasonDetailView.as_view(), name='season-detail'),
    
    # Character URLs
    path('stories/<int:story_id>/characters/', api_views.CharacterListCreateView.as_view(), name='character-list-create'),
    path('characters/<int:pk>/', api_views.CharacterDetailView.as_view(), name='character-detail'),
    
    # Episode URLs
    path('seasons/<int:season_id>/episodes/', api_views.EpisodeListCreateView.as_view(), name='episode-list-create'),
    path('episodes/<int:pk>/', api_views.EpisodeDetailView.as_view(), name='episode-detail'),
    path('episodes/<int:episode_id>/increment-view/', api_views.increment_episode_view, name='episode-increment-view'),
    
    # Dialogue URLs
    path('episodes/<int:episode_id>/dialogues/', api_views.DialogueListCreateView.as_view(), name='dialogue-list-create'),
    path('dialogues/<int:pk>/', api_views.DialogueDetailView.as_view(), name='dialogue-detail'),
    
    # Studio URLs
    path('studios/', api_views.StudioListCreateView.as_view(), name='studio-list-create'),
    path('studios/<int:pk>/', api_views.StudioDetailView.as_view(), name='studio-detail'),
    path('my-studio/', api_views.my_studio_api, name='my-studio'),
    path('studios/<int:studio_id>/collaborators/', api_views.get_studio_collaborators, name='studio-collaborators'),
    path('studios/<int:studio_id>/collaborators/invite-user/', api_views.invite_studio_user, name='invite-studio-user'),
    path('studios/<int:studio_id>/collaborators/invite-email/', api_views.invite_studio_by_email, name='invite-studio-email'),
    path('studios/<int:studio_id>/collaborators/<int:collaborator_id>/remove/', api_views.remove_studio_collaborator, name='remove-studio-collaborator'),
    path('studios/<int:studio_id>/collaboration-requests/', api_views.get_studio_collaboration_requests, name='studio-collaboration-requests'),
    path('studios/<int:studio_id>/collaboration-requests/create/', api_views.create_studio_collaboration_request, name='create-studio-collaboration-request'),
    path('studios/<int:studio_id>/collaboration-requests/<int:request_id>/accept/', api_views.accept_studio_collaboration_request, name='accept-studio-collaboration-request'),
    path('studios/<int:studio_id>/collaboration-requests/<int:request_id>/decline/', api_views.decline_studio_collaboration_request, name='decline-studio-collaboration-request'),
    
    # Audio Track URLs
    path('audio/', api_views.AudioTrackListCreateView.as_view(), name='audio-list-create'),
    path('audio/<int:pk>/', api_views.AudioTrackDetailView.as_view(), name='audio-detail'),
    
    # Complete Story Creation
    path('create-complete-story/', api_views.create_complete_story, name='create-complete-story'),
    
    # Collaboration URLs
    path('users/search/', collaboration_views.search_users, name='user-search'),
    path('stories/<int:story_id>/collaborators/', collaboration_views.get_collaborators, name='story-collaborators'),
    path('stories/<int:story_id>/collaborators/invite-user/', collaboration_views.invite_existing_user, name='invite-existing-user'),
    path('stories/<int:story_id>/collaborators/invite-email/', collaboration_views.invite_by_email, name='invite-by-email'),
    path('stories/<int:story_id>/collaborators/<uuid:invite_id>/', collaboration_views.update_collaborator_role, name='update-collaborator-role'),
    path('stories/<int:story_id>/collaborators/<uuid:invite_id>/remove/', collaboration_views.remove_collaborator, name='remove-collaborator'),
    path('collaborators/pending/', collaboration_views.get_pending_invitations, name='pending-invitations'),
    path('collaborators/<uuid:invite_id>/accept/', collaboration_views.accept_invitation, name='accept-invitation'),
    path('collaborators/<uuid:invite_id>/decline/', collaboration_views.decline_invitation, name='decline-invitation'),
    
    # Studio collaborators for story
    path('stories/<int:story_id>/studio-collaborators/', collaboration_views.get_studio_collaborators_for_story, name='story-studio-collaborators'),
    path('stories/<int:story_id>/collaborators/bulk-assign/', collaboration_views.bulk_assign_story_collaborators, name='bulk-assign-story-collaborators'),
]

