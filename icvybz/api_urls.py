from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views, collaboration_views

# Create router for DRF viewsets
router = DefaultRouter()

urlpatterns = [
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
    
    # Dialogue URLs
    path('episodes/<int:episode_id>/dialogues/', api_views.DialogueListCreateView.as_view(), name='dialogue-list-create'),
    path('dialogues/<int:pk>/', api_views.DialogueDetailView.as_view(), name='dialogue-detail'),
    
    # Studio URLs
    path('studios/', api_views.StudioListCreateView.as_view(), name='studio-list-create'),
    path('studios/<int:pk>/', api_views.StudioDetailView.as_view(), name='studio-detail'),
    path('my-studio/', api_views.my_studio_api, name='my-studio'),
    
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
]

