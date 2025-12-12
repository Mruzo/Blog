from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.serializers import AuthTokenSerializer
from django.contrib.auth.models import User
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django.db import connection
from django.db.models import Q, Sum
from django.utils import timezone
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.forms import PasswordResetForm
from django.core.mail import send_mail
from django.contrib.sites.shortcuts import get_current_site
from django.urls import reverse
from django.conf import settings
import time
import logging
from .models import Comic, Season, Episode, Dialogue, Character, POV, Studio, AudioTrack, StudioCollaborator, StudioCollaborationRequest
from .serializers import (
    ComicSerializer, SeasonSerializer, EpisodeSerializer, 
    DialogueSerializer, CharacterSerializer, StudioSerializer, AudioTrackSerializer,
    StudioCollaboratorSerializer, InviteStudioUserSerializer, InviteStudioEmailSerializer,
    StudioCollaborationRequestSerializer, CreateStudioCollaborationRequestSerializer
)

# Set up logging for performance monitoring
logger = logging.getLogger(__name__)

# Story/Comic API Views
class ComicListCreateView(generics.ListCreateAPIView):
    serializer_class = ComicSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination for stories
    
    def get_queryset(self):
        start_time = time.time()
        initial_queries = len(connection.queries)
        
        # Always apply annotation for total_views (don't cache annotated querysets)
        # Cache is cleared when stories/episodes are modified, so this is acceptable
        queryset = Comic.objects.filter(user=self.request.user).select_related('user').annotate(
            total_views=Sum('seasons__episodes__view_count', default=0)
        )
        
        end_time = time.time()
        query_count = len(connection.queries) - initial_queries
        logger.info(f"ComicListCreateView: {end_time - start_time:.3f}s, {query_count} queries")
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        # Clear cache when new comic is created
        cache_key = f"user_comics_{self.request.user.id}"
        cache.delete(cache_key)
    
    def perform_update(self, serializer):
        serializer.save()
        # Clear cache when comic is updated
        cache_key = f"user_comics_{self.request.user.id}"
        cache.delete(cache_key)

class ComicDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ComicSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Allow access to stories where user is owner OR collaborator
        from .models import StoryCollaborator
        return Comic.objects.filter(
            Q(user=self.request.user) | 
            Q(collaborators__user=self.request.user, collaborators__is_active=True)
        ).select_related('user').annotate(
            total_views=Sum('seasons__episodes__view_count', default=0)
        ).distinct()
    
    def get_object(self):
        obj = super().get_object()
        # Additional permission check: only owner can update/delete
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            if obj.user != self.request.user:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Only the story owner can modify or delete the story.")
        return obj

# Public Stories View - shows all published stories from all users
class PublicStoriesView(generics.ListAPIView):
    serializer_class = ComicSerializer
    permission_classes = [AllowAny]  # No authentication required
    
    def get_queryset(self):
        try:
            # Only show stories that are both public AND approved (published)
            queryset = Comic.objects.filter(
                is_public=True,
                moderation_status='approved'
            ).select_related('user').order_by('-created_at')
            return queryset
        except Exception as e:
            # Log the error and return empty queryset instead of crashing
            logger.error(f"Error in PublicStoriesView.get_queryset(): {str(e)}", exc_info=True)
            return Comic.objects.none()
# Season API Views
class SeasonListCreateView(generics.ListCreateAPIView):
    serializer_class = SeasonSerializer
    permission_classes = [AllowAny]  # Allow public access for public stories
    
    def get_permissions(self):
        # Require authentication for POST/PUT/DELETE, allow public for GET
        if self.request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            return [IsAuthenticated()]
        return [AllowAny()]
    
    def get_queryset(self):
        story_id = self.kwargs.get('story_id')
        story = Comic.objects.filter(id=story_id).first()
        
        # Check if user is authenticated and is the story owner
        is_owner = self.request.user.is_authenticated and story and story.user == self.request.user
        
        # If story is public AND user is NOT the owner, only show public seasons to unauthenticated users
        if story and story.is_public and story.moderation_status == 'approved' and not is_owner:
            # Check cache first
            cache_key = f"seasons_public_{story_id}"
            cached_queryset = cache.get(cache_key)
            if cached_queryset:
                return cached_queryset
            
            # Only return seasons that are both in a public story AND are themselves public
            queryset = Season.objects.filter(
                comic_id=story_id,
                is_public=True
            ).select_related('comic', 'comic__user')
            # Cache for 5 minutes
            cache.set(cache_key, queryset, 60 * 5)
            return queryset
        
        # For story owners or authenticated users accessing their own stories, require authentication
        if not self.request.user.is_authenticated:
            return Season.objects.none()
        
        # Check cache first
        cache_key = f"seasons_{story_id}_{self.request.user.id}"
        cached_queryset = cache.get(cache_key)
        if cached_queryset:
            return cached_queryset
        
        # Story owners can see ALL seasons in their own stories (regardless of public status)
        queryset = Season.objects.filter(comic_id=story_id, comic__user=self.request.user).select_related('comic', 'comic__user')
        # Cache for 5 minutes
        cache.set(cache_key, queryset, 60 * 5)
        return queryset
    
    def perform_create(self, serializer):
        story_id = self.kwargs.get('story_id')
        story = Comic.objects.get(id=story_id, user=self.request.user)
        serializer.save(comic=story)
        # Clear cache when new season is created
        cache_key = f"seasons_{story_id}_{self.request.user.id}"
        cache.delete(cache_key)
        # Also clear public cache if story is public
        if story.is_public and story.moderation_status == 'approved':
            cache.delete(f"seasons_public_{story_id}")

class SeasonDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SeasonSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Season.objects.filter(comic__user=self.request.user).select_related('comic', 'comic__user')
    
    def perform_update(self, serializer):
        season = serializer.save()
        # Clear cache when season is updated (both public and private caches)
        story_id = season.comic.id
        cache.delete(f"seasons_public_{story_id}")
        cache.delete(f"seasons_{story_id}_{self.request.user.id}")
        # Also clear episodes cache for this season
        cache.delete(f"episodes_public_{season.id}")
        cache.delete(f"episodes_{season.id}_{self.request.user.id}")

# Character API Views
class CharacterListCreateView(generics.ListCreateAPIView):
    serializer_class = CharacterSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        story_id = self.kwargs.get('story_id')
        queryset = Character.objects.filter(user=self.request.user)
        if story_id:
            queryset = queryset.filter(story_id=story_id)
        # Prefetch POV data to avoid N+1 queries
        return queryset.select_related('user', 'story').prefetch_related('povs')
    
    def perform_create(self, serializer):
        story_id = self.kwargs.get('story_id')
        if story_id:
            # Get the story to ensure it belongs to the user
            story = Comic.objects.get(id=story_id, user=self.request.user)
            serializer.save(user=self.request.user, story=story)
        else:
            serializer.save(user=self.request.user)

class CharacterDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CharacterSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Prefetch POV data to avoid N+1 queries
        return Character.objects.filter(user=self.request.user).select_related('user', 'story').prefetch_related('povs')
    
    def perform_update(self, serializer):
        """Update character and associated POV if POV data is provided"""
        character = serializer.save()
        
        # Check if POV data is in the request
        pov_head_x = self.request.data.get('pov_head_x')
        pov_head_y = self.request.data.get('pov_head_y')
        pov_head_z = self.request.data.get('pov_head_z')
        
        # Update or create POV if any POV data is provided
        if pov_head_x is not None or pov_head_y is not None or pov_head_z is not None:
            pov, created = POV.objects.get_or_create(
                character=character,
                defaults={
                    'title': f"{character.name}'s POV",
                    'head_x': pov_head_x if pov_head_x is not None else 0.0,
                    'head_y': pov_head_y if pov_head_y is not None else 1.6,
                    'head_z': pov_head_z if pov_head_z is not None else 0.0,
                    'default_camera_target': f"{pov_head_x if pov_head_x is not None else 0.0}m {pov_head_y if pov_head_y is not None else 1.6}m {pov_head_z if pov_head_z is not None else 0.0}m"
                }
            )
            
            # Update existing POV if it already exists
            if not created:
                if pov_head_x is not None:
                    pov.head_x = pov_head_x
                if pov_head_y is not None:
                    pov.head_y = pov_head_y
                if pov_head_z is not None:
                    pov.head_z = pov_head_z
                pov.default_camera_target = f"{pov.head_x}m {pov.head_y}m {pov.head_z}m"
                pov.save()

# Episode API Views
class EpisodeListCreateView(generics.ListCreateAPIView):
    serializer_class = EpisodeSerializer
    permission_classes = [AllowAny]  # Allow public access for public stories
    
    def get_permissions(self):
        # Require authentication for POST/PUT/DELETE, allow public for GET
        if self.request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            return [IsAuthenticated()]
        return [AllowAny()]
    
    def get_queryset(self):
        season_id = self.kwargs.get('season_id')
        season = Season.objects.filter(id=season_id).select_related('comic').first()
        
        # If story is public AND season is public, allow access without authentication
        if season and season.comic and season.comic.is_public and season.comic.moderation_status == 'approved' and season.is_public:
            # Check cache first
            cache_key = f"episodes_public_{season_id}"
            cached_queryset = cache.get(cache_key)
            if cached_queryset:
                return cached_queryset
            
            queryset = Episode.objects.filter(season_id=season_id).select_related('season', 'season__comic', 'season__comic__user')
            # Cache for 5 minutes
            cache.set(cache_key, queryset, 60 * 5)
            return queryset
        
        # For private stories or authenticated users, require authentication
        if not self.request.user.is_authenticated:
            return Episode.objects.none()
        
        # Check cache first
        cache_key = f"episodes_{season_id}_{self.request.user.id}"
        cached_queryset = cache.get(cache_key)
        if cached_queryset:
            return cached_queryset
        
        queryset = Episode.objects.filter(season_id=season_id, season__comic__user=self.request.user).select_related('season', 'season__comic', 'season__comic__user')
        # Cache for 5 minutes
        cache.set(cache_key, queryset, 60 * 5)
        return queryset
    
    def perform_create(self, serializer):
        season_id = self.kwargs.get('season_id')
        season = Season.objects.get(id=season_id, comic__user=self.request.user)
        episode = serializer.save(season=season)
        # Clear cache when new episode is created
        cache.delete(f"episodes_{season_id}_{self.request.user.id}")
        # Also clear public cache if story/season is public
        if season.comic.is_public and season.comic.moderation_status == 'approved' and season.is_public:
            cache.delete(f"episodes_public_{season_id}")
        # Clear user stories cache so total_views updates in My Studio
        if season.comic.user:
            cache.delete(f"user_comics_{season.comic.user.id}")

class EpisodeDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EpisodeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Episode.objects.filter(season__comic__user=self.request.user).select_related('season', 'season__comic', 'season__comic__user')
    
    def perform_update(self, serializer):
        episode = serializer.save()
        season_id = episode.season.id
        # Clear cache when episode is updated
        cache.delete(f"episodes_public_{season_id}")
        cache.delete(f"episodes_{season_id}_{self.request.user.id}")
        # Clear user stories cache so total_views updates in My Studio
        if episode.season.comic.user:
            cache.delete(f"user_comics_{episode.season.comic.user.id}")
    
    def perform_destroy(self, instance):
        season_id = instance.season.id
        story_user_id = instance.season.comic.user.id if instance.season.comic.user else None
        # Clear cache before deletion
        cache.delete(f"episodes_public_{season_id}")
        cache.delete(f"episodes_{season_id}_{self.request.user.id}")
        # Clear user stories cache so total_views updates in My Studio
        if story_user_id:
            cache.delete(f"user_comics_{story_user_id}")
        instance.delete()

@api_view(['POST'])
@permission_classes([AllowAny])  # Allow public access for public episodes
def increment_episode_view(request, episode_id):
    """
    Increment view count for an episode.
    This is called from the React app when an episode is viewed in Comic3DViewer.
    Only increments for published episodes in public stories.
    """
    try:
        episode = Episode.objects.select_related('season', 'season__comic').get(id=episode_id)
        
        # Only allow incrementing views for published episodes in public, approved stories with public seasons
        if not episode.is_published:
            return Response({'error': 'Episode is not published'}, status=status.HTTP_403_FORBIDDEN)
        
        if not episode.season.comic.is_public or episode.season.comic.moderation_status != 'approved':
            return Response({'error': 'Story is not public'}, status=status.HTTP_403_FORBIDDEN)
        
        if not episode.season.is_public:
            return Response({'error': 'Season is not public'}, status=status.HTTP_403_FORBIDDEN)
        
        # Increment view count
        episode.increment_view()
        
        # Log traffic source (similar to Django view)
        from .views import log_traffic_source
        log_traffic_source(request, episode)
        
        # Clear cache for episodes list to reflect updated view count
        from django.core.cache import cache
        season_id = episode.season.id
        cache.delete(f"episodes_public_{season_id}")
        # Also clear private cache for story owner
        if episode.season.comic.user:
            cache.delete(f"episodes_{season_id}_{episode.season.comic.user.id}")
            # Clear user stories cache so total_views updates in My Studio
            cache.delete(f"user_comics_{episode.season.comic.user.id}")
        
        return Response({
            'success': True,
            'view_count': episode.view_count
        }, status=status.HTTP_200_OK)
        
    except Episode.DoesNotExist:
        return Response({'error': 'Episode not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Dialogue API Views
class DialogueListCreateView(generics.ListCreateAPIView):
    serializer_class = DialogueSerializer
    permission_classes = [AllowAny]  # Allow public access for public stories
    
    def get_permissions(self):
        # Require authentication for POST/PUT/DELETE, allow public for GET
        if self.request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            return [IsAuthenticated()]
        return [AllowAny()]
    
    def get_queryset(self):
        episode_id = self.kwargs.get('episode_id')
        episode = Episode.objects.filter(id=episode_id).select_related('season__comic').first()
        
        # If story is public AND season is public, allow access without authentication
        if episode and episode.season and episode.season.comic and \
           episode.season.comic.is_public and episode.season.comic.moderation_status == 'approved' and \
           episode.season.is_public:
            return Dialogue.objects.filter(episode_id=episode_id).select_related('pov', 'pov__character', 'character', 'episode', 'episode__season', 'episode__season__comic')
        
        # For private stories or authenticated users, require authentication
        if not self.request.user.is_authenticated:
            return Dialogue.objects.none()
        
        return Dialogue.objects.filter(episode_id=episode_id, episode__season__comic__user=self.request.user).select_related('pov', 'pov__character', 'character', 'episode', 'episode__season', 'episode__season__comic', 'episode__season__comic__user')
    
    def perform_create(self, serializer):
        episode_id = self.kwargs.get('episode_id')
        episode = Episode.objects.get(id=episode_id, season__comic__user=self.request.user)
        serializer.save(episode=episode)

class DialogueDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DialogueSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Dialogue.objects.filter(episode__season__comic__user=self.request.user).select_related('pov', 'pov__character', 'character', 'episode', 'episode__season', 'episode__season__comic', 'episode__season__comic__user')

# Studio API Views
class StudioListCreateView(generics.ListCreateAPIView):
    serializer_class = StudioSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Studio.objects.filter(owner=self.request.user).select_related('owner')
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class StudioDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = StudioSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Studio.objects.filter(owner=self.request.user).select_related('owner')

# Audio Track API Views
class AudioTrackListCreateView(generics.ListCreateAPIView):
    serializer_class = AudioTrackSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return AudioTrack.objects.filter(created_by=self.request.user).select_related('created_by')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class AudioTrackDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AudioTrackSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return AudioTrack.objects.filter(created_by=self.request.user).select_related('created_by')

# Complete Story Creation API
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_complete_story(request):
    """
    Create a complete story with all related objects in one API call
    """
    try:
        data = request.data
        
        # Create story
        story_data = data.get('story', {})
        
        # Validate story data
        title = story_data.get('title', '').strip()
        description = story_data.get('description', '').strip()
        
        # Enforce character limits
        if len(title) > 50:
            return Response(
                {'error': 'Story title cannot exceed 50 characters.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(description) > 200:
            return Response(
                {'error': 'Story description cannot exceed 200 characters.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        print(f"Creating story with data: {story_data}")
        story = Comic.objects.create(
            title=title,
            description=description,
            is_public=story_data.get('is_public', False),
            user=request.user
        )
        print(f"Story created with ID: {story.id}")
        
        # Create season
        season_data = data.get('season', {})
        
        # Validate season data
        season_title = season_data.get('title', '').strip()
        season_description = season_data.get('description', '').strip()
        
        # Enforce character limits
        if len(season_title) > 50:
            return Response(
                {'error': 'Season title cannot exceed 50 characters.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(season_description) > 150:
            return Response(
                {'error': 'Season description cannot exceed 150 characters.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        season = Season.objects.create(
            title=season_title,
            season_number=season_data.get('season_number', 1),
            description=season_description,
            release_date=season_data.get('release_date', '2024-01-01'),
            comic=story
        )
        
        # Create characters
        characters = []
        for char_data in data.get('characters', []):
            character = Character.objects.create(
                name=char_data.get('name', ''),
                bio=char_data.get('bio', ''),
                personality=char_data.get('personality', ''),
                love_interest=char_data.get('love_interest', ''),
                user=request.user,
                story=story
            )
            characters.append(character)
        
        # Create episode
        episode_data = data.get('episode', {})
        
        # Validate episode data
        episode_title = episode_data.get('title', '').strip()
        episode_description = episode_data.get('description', '').strip()
        
        # Enforce character limits
        if len(episode_title) > 50:
            return Response(
                {'error': 'Episode title cannot exceed 50 characters.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(episode_description) > 150:
            return Response(
                {'error': 'Episode description cannot exceed 150 characters.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        episode = Episode.objects.create(
            title=episode_title,
            episode_number=episode_data.get('episode_number', 1),
            description=episode_description,
            summary=episode_data.get('summary', ''),
            is_published=episode_data.get('is_published', False),
            season=season
        )
        
        # Create POVs for characters (one POV per character)
        # Match characters with their POV data from the request by name
        povs = {}
        character_pov_data = {}  # Map character name to POV data
        for char_data in data.get('characters', []):
            char_name = char_data.get('name', '')
            if char_name:
                character_pov_data[char_name] = {
                    'head_x': char_data.get('pov_head_x', 0.0),
                    'head_y': char_data.get('pov_head_y', 1.6),
                    'head_z': char_data.get('pov_head_z', 0.0)
                }
        
        for character in characters:
            # Get POV data for this character if provided (match by name)
            pov_data = character_pov_data.get(character.name, {})
            pov, created = POV.objects.get_or_create(
                character=character,
                defaults={
                    'title': f"{character.name}'s POV",
                    'head_x': pov_data.get('head_x', 0.0),
                    'head_y': pov_data.get('head_y', 1.6),
                    'head_z': pov_data.get('head_z', 0.0),
                    'default_camera_target': f"{pov_data.get('head_x', 0.0)}m {pov_data.get('head_y', 1.6)}m {pov_data.get('head_z', 0.0)}m"
                }
            )
            # Update POV if it already existed but we have new data
            if not created and character.name in character_pov_data:
                pov.head_x = pov_data.get('head_x', pov.head_x)
                pov.head_y = pov_data.get('head_y', pov.head_y)
                pov.head_z = pov_data.get('head_z', pov.head_z)
                pov.default_camera_target = f"{pov.head_x}m {pov.head_y}m {pov.head_z}m"
                pov.save()
            povs[character.id] = pov
        
        # Create dialogues
        dialogues = []
        for dialogue_data in data.get('dialogues', []):
            # Get POV ID from dialogue data, or character ID to find/create POV
            pov_id = dialogue_data.get('pov')
            character_id = dialogue_data.get('character')
            
            pov = None
            character = None
            
            if pov_id:
                try:
                    pov = POV.objects.get(id=pov_id)
                    character = pov.character
                except POV.DoesNotExist:
                    pass
            elif character_id:
                try:
                    character = Character.objects.get(id=character_id)
                    # Get or create POV for this character
                    pov = povs.get(character_id)
                    if not pov:
                        pov, created = POV.objects.get_or_create(
                            character=character,
                            defaults={
                                'title': f"{character.name}'s POV",
                                'head_x': 0.0,
                                'head_y': 1.6,
                                'head_z': 0.0,
                                'default_camera_target': '0m 1.6m 0m'
                            }
                        )
                        povs[character_id] = pov
                except Character.DoesNotExist:
                    # Skip dialogue if character doesn't exist
                    continue
            
            if pov:  # Only create dialogue if we have a POV
                dialogue = Dialogue.objects.create(
                    pov=pov,
                    character=character,
                    text=dialogue_data.get('text', ''),
                    order=dialogue_data.get('order', 1),
                    scene_title=dialogue_data.get('scene_title', ''),
                    scene_description=dialogue_data.get('scene_description', ''),
                    shot_type=dialogue_data.get('shot_type', 'mediumShot'),
                    camera_orbit=dialogue_data.get('camera_orbit', '0deg 75deg 3m'),
                    camera_target=dialogue_data.get('camera_target', '0m 1.6m 0m'),
                    field_of_view=dialogue_data.get('field_of_view', 45.0),
                    zoom_speed=dialogue_data.get('zoom_speed', 1.0),
                    rotation=dialogue_data.get('rotation', '0deg 0deg 0deg'),
                    episode=episode
                )
                dialogues.append(dialogue)
        
        # Handle model upload if provided (with security validation)
        model_url = None
        if 'model' in request.FILES:
            from snmov.utils.security import validate_file_upload, sanitize_filename, log_security_event
            
            model_file = request.FILES['model']
            
            # Sanitize filename
            model_file.name = sanitize_filename(model_file.name)
            
            # Validate file upload (OWASP A08)
            is_valid, error_message = validate_file_upload(
                model_file,
                allowed_types=['.glb', '.usdz', '.gltf'],
                max_size_mb=50
            )
            
            if not is_valid:
                log_security_event(
                    event_type='file_upload',
                    request=request,
                    user=request.user,
                    details={
                        'filename': model_file.name,
                        'error': error_message,
                        'file_size': model_file.size,
                    },
                    severity='WARNING'
                )
                return Response(
                    {'error': error_message},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Log successful file upload
            log_security_event(
                event_type='file_upload',
                request=request,
                user=request.user,
                details={
                    'filename': model_file.name,
                    'file_size': model_file.size,
                    'content_type': getattr(model_file, 'content_type', 'unknown'),
                },
                severity='INFO'
            )
            
            # TODO: Handle file upload and save to season
            model_url = f"/media/models/{model_file.name}"
        
        return Response({
            'story': ComicSerializer(story).data,
            'season': SeasonSerializer(season).data,
            'characters': CharacterSerializer(characters, many=True).data,
            'episode': EpisodeSerializer(episode).data,
            'dialogues': DialogueSerializer(dialogues, many=True).data,
            'model_url': model_url
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )

# My Studio API
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_studio_api(request):
    """
    Get or create user's studio
    """
    try:
        studio, created = Studio.objects.get_or_create(
            owner=request.user,
            defaults={
                'name': f"{request.user.first_name or request.user.username}'s Studio",
                'description': 'My personal storytelling studio',
                'is_public': False
            }
        )
        
        return Response(StudioSerializer(studio).data)
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )


# Studio Collaboration API Views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_studio_collaborators(request, studio_id):
    """Get all collaborators for a studio"""
    try:
        studio = Studio.objects.get(id=studio_id)
        
        # Check if user is the owner
        if studio.owner != request.user:
            return Response(
                {'detail': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        collaborators = StudioCollaborator.objects.filter(
            studio=studio, 
            is_active=True
        ).select_related('user')
        
        serializer = StudioCollaboratorSerializer(collaborators, many=True)
        return Response({'results': serializer.data})
    except Studio.DoesNotExist:
        return Response(
            {'detail': 'Studio not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def invite_studio_user(request, studio_id):
    """Invite an existing user to collaborate on a studio"""
    try:
        studio = Studio.objects.get(id=studio_id)
        
        # Check if user is the owner
        if studio.owner != request.user:
            return Response(
                {'detail': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = InviteStudioUserSerializer(data=request.data)
        if serializer.is_valid():
            user_id = serializer.validated_data['user_id']
            role = serializer.validated_data['role']
            
            # Check if user exists
            try:
                invitee_user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response(
                    {'detail': 'User not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if user is the owner
            if invitee_user == studio.owner:
                return Response(
                    {'detail': 'Cannot invite the studio owner'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if user is already a collaborator
            if StudioCollaborator.objects.filter(studio=studio, user=invitee_user).exists():
                return Response(
                    {'detail': 'User is already a collaborator'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create collaborator
            collaborator = StudioCollaborator.objects.create(
                studio=studio,
                user=invitee_user,
                role=role
            )
            
            # Send email notification to invited user
            try:
                from django.template.loader import render_to_string
                from django.contrib.sites.models import Site
                
                subject = f"Studio Collaboration Invitation: {studio.name}"
                current_site = Site.objects.get_current()
                site_url = f"https://{current_site.domain}"
                frontend_url = getattr(settings, 'FRONTEND_URL', site_url)
                studio_url = f"{frontend_url}/immersivecomics/studio/{studio.id}/"
                
                context = {
                    'invitee_user': invitee_user,
                    'inviter': request.user,
                    'studio': studio,
                    'role_display': collaborator.get_role_display(),
                    'studio_url': studio_url,
                    'site_url': site_url,
                }
                
                html_message = render_to_string('emails/studio_invitation.html', context)
                plain_message = render_to_string('emails/studio_invitation.txt', context)
                
                send_mail(
                    subject=subject,
                    message=plain_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[invitee_user.email],
                    html_message=html_message,
                    fail_silently=False,
                )
            except Exception as e:
                # Log email error but don't fail the request
                print(f"Failed to send studio invitation email: {e}")
            
            serializer = StudioCollaboratorSerializer(collaborator)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Studio.DoesNotExist:
        return Response(
            {'detail': 'Studio not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_studio_collaborator(request, studio_id, collaborator_id):
    """Remove a collaborator from a studio"""
    try:
        studio = Studio.objects.get(id=studio_id)
        
        # Check if user is the owner
        if studio.owner != request.user:
            return Response(
                {'detail': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get the collaborator
        try:
            collaborator = StudioCollaborator.objects.get(
                id=collaborator_id,
                studio=studio
            )
        except StudioCollaborator.DoesNotExist:
            return Response(
                {'detail': 'Collaborator not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Don't allow removing the owner
        if collaborator.user == studio.owner:
            return Response(
                {'detail': 'Cannot remove the studio owner'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Deactivate the collaborator instead of deleting (soft delete)
        from django.utils import timezone
        collaborator.is_active = False
        collaborator.removed_at = timezone.now()
        collaborator.save()
        
        return Response(
            {'detail': 'Collaborator removed successfully'}, 
            status=status.HTTP_200_OK
        )
    except Studio.DoesNotExist:
        return Response(
            {'detail': 'Studio not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def invite_studio_by_email(request, studio_id):
    """Invite a user by email address to collaborate on a studio"""
    try:
        studio = Studio.objects.get(id=studio_id)
        
        # Check if user is the owner
        if studio.owner != request.user:
            return Response(
                {'detail': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = InviteStudioEmailSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            role = serializer.validated_data['role']
            
            # Check if user with this email exists
            try:
                invitee_user = User.objects.get(email=email)
                
                # Check if user is the owner
                if invitee_user == studio.owner:
                    return Response(
                        {'detail': 'Cannot invite the studio owner'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Check if user is already a collaborator
                if StudioCollaborator.objects.filter(studio=studio, user=invitee_user).exists():
                    return Response(
                        {'detail': 'User is already a collaborator'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Create collaborator
                collaborator = StudioCollaborator.objects.create(
                    studio=studio,
                    user=invitee_user,
                    role=role
                )
                
                # Send email notification to invited user
                try:
                    from django.template.loader import render_to_string
                    from django.core.mail import send_mail
                    from django.contrib.sites.models import Site
                    
                    subject = f"Studio Collaboration Invitation: {studio.name}"
                    current_site = Site.objects.get_current()
                    site_url = f"https://{current_site.domain}"
                    frontend_url = getattr(settings, 'FRONTEND_URL', site_url)
                    studio_url = f"{frontend_url}/immersivecomics/studio/{studio.id}/"
                    
                    context = {
                        'invitee_user': invitee_user,
                        'inviter': request.user,
                        'studio': studio,
                        'role_display': collaborator.get_role_display(),
                        'studio_url': studio_url,
                        'site_url': site_url,
                    }
                    
                    html_message = render_to_string('emails/studio_invitation.html', context)
                    plain_message = render_to_string('emails/studio_invitation.txt', context)
                    
                    send_mail(
                        subject=subject,
                        message=plain_message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[invitee_user.email],
                        html_message=html_message,
                        fail_silently=False,
                    )
                except Exception as e:
                    # Log email error but don't fail the request
                    print(f"Failed to send studio invitation email: {e}")
                
                serializer = StudioCollaboratorSerializer(collaborator)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except User.DoesNotExist:
                # User doesn't exist - for now, return error
                # In the future, we could create an invitation system similar to story collaboration
                return Response(
                    {'detail': 'User with this email not found. Please invite registered users only.'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Studio.DoesNotExist:
        return Response(
            {'detail': 'Studio not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


# Studio Collaboration Request API Views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_studio_collaboration_requests(request, studio_id):
    """Get pending collaboration requests for a studio (only owner can see)"""
    try:
        studio = Studio.objects.get(id=studio_id)
        
        # Check if user is the owner
        if studio.owner != request.user:
            return Response(
                {'detail': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get pending requests, sorted by most recent first
        requests = StudioCollaborationRequest.objects.filter(
            studio=studio,
            status='pending'
        ).order_by('-created_at').select_related('requester')
        
        serializer = StudioCollaborationRequestSerializer(requests, many=True)
        return Response({'results': serializer.data})
    except Studio.DoesNotExist:
        return Response(
            {'detail': 'Studio not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_studio_collaboration_request(request, studio_id):
    """Create a collaboration request for a studio"""
    try:
        studio = Studio.objects.get(id=studio_id)
        
        # Check if user is already the owner
        if studio.owner == request.user:
            return Response(
                {'detail': 'You are the owner of this studio'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user is already a collaborator
        if StudioCollaborator.objects.filter(studio=studio, user=request.user, is_active=True).exists():
            return Response(
                {'detail': 'You are already a collaborator'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if there's already a pending request
        existing_pending = StudioCollaborationRequest.objects.filter(
            studio=studio,
            requester=request.user,
            status='pending'
        ).first()
        
        if existing_pending:
            return Response(
                {'detail': 'You already have a pending request'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # If there's a declined request, delete it to allow a new one
        # (due to unique_together constraint)
        existing_declined = StudioCollaborationRequest.objects.filter(
            studio=studio,
            requester=request.user,
            status='declined'
        ).first()
        
        if existing_declined:
            existing_declined.delete()
        
        serializer = CreateStudioCollaborationRequestSerializer(data=request.data)
        if serializer.is_valid():
            role = serializer.validated_data.get('role', 'writer')
            message = serializer.validated_data.get('message', '')
            
            try:
                collaboration_request = StudioCollaborationRequest.objects.create(
                    studio=studio,
                    requester=request.user,
                    role=role,
                    message=message
                )
                
                # Send email notification to studio owner
                try:
                    collaboration_request.send_notification_email()
                except Exception as e:
                    # Log email error but don't fail the request
                    print(f"Failed to send collaboration request notification email: {e}")
                
            except Exception as e:
                # Handle unique constraint violation
                return Response(
                    {'detail': f'Failed to create request: {str(e)}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            serializer = StudioCollaborationRequestSerializer(collaboration_request)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Studio.DoesNotExist:
        return Response(
            {'detail': 'Studio not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_studio_collaboration_request(request, studio_id, request_id):
    """Accept a collaboration request (only studio owner can accept)"""
    try:
        studio = Studio.objects.get(id=studio_id)
        
        # Check if user is the owner
        if studio.owner != request.user:
            return Response(
                {'detail': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        collaboration_request = StudioCollaborationRequest.objects.get(
            id=request_id,
            studio=studio
        )
        
        if collaboration_request.status != 'pending':
            return Response(
                {'detail': 'Request is not pending'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if collaboration_request.accept():
            serializer = StudioCollaborationRequestSerializer(collaboration_request)
            return Response(serializer.data)
        
        return Response(
            {'detail': 'Failed to accept request'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Studio.DoesNotExist:
        return Response(
            {'detail': 'Studio not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except StudioCollaborationRequest.DoesNotExist:
        return Response(
            {'detail': 'Collaboration request not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def decline_studio_collaboration_request(request, studio_id, request_id):
    """Decline a collaboration request (only studio owner can decline)"""
    try:
        studio = Studio.objects.get(id=studio_id)
        
        # Check if user is the owner
        if studio.owner != request.user:
            return Response(
                {'detail': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        collaboration_request = StudioCollaborationRequest.objects.get(
            id=request_id,
            studio=studio
        )
        
        if collaboration_request.status != 'pending':
            return Response(
                {'detail': 'Request is not pending'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if collaboration_request.decline():
            serializer = StudioCollaborationRequestSerializer(collaboration_request)
            return Response(serializer.data)
        
        return Response(
            {'detail': 'Failed to decline request'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Studio.DoesNotExist:
        return Response(
            {'detail': 'Studio not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except StudioCollaborationRequest.DoesNotExist:
        return Response(
            {'detail': 'Collaboration request not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


# Authentication API Views
@api_view(['POST'])
@permission_classes([AllowAny])
def login_api(request):
    """
    Login endpoint that returns token and user data.
    Uses DRF's standard token authentication.
    IMPORTANT: Preserves cart from anonymous session to authenticated session.
    Includes rate limiting for security (OWASP A07).
    """
    from snmov.utils.security import rate_limit_check, log_security_event, get_client_ip
    
    # Rate limiting for login attempts (prevent brute force)
    client_ip = get_client_ip(request)
    is_allowed, remaining, reset_time = rate_limit_check(
        request, 
        'login_attempt', 
        max_requests=5,  # 5 login attempts per hour
        window_seconds=3600
    )
    
    if not is_allowed:
        log_security_event(
            event_type='rate_limit_exceeded',
            request=request,
            details={'endpoint': 'login', 'ip': client_ip},
            severity='WARNING'
        )
        return Response({
            'error': 'Too many login attempts. Please try again later.',
            'reset_time': reset_time
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    # Preserve cart from anonymous session before authentication
    anonymous_cart = request.session.get('cart', {})
    
    serializer = AuthTokenSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        
        # Log successful login
        log_security_event(
            event_type='login_success',
            request=request,
            user=user,
            severity='INFO'
        )
        
        # Get or create token for user
        token, created = Token.objects.get_or_create(user=user)
        
        # CRITICAL: Preserve cart from anonymous session
        # After authentication, the session might be reset, so we need to restore the cart
        if anonymous_cart:
            # Ensure session is saved and cart is preserved
            request.session['cart'] = anonymous_cart
            request.session.modified = True
        
        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_active': user.is_active,
                'is_email_verified': getattr(user, 'is_email_verified', False),
            }
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_api(request):
    """
    API endpoint for password reset that sends email.
    Accepts JSON with email field and sends password reset email via Django's email system.
    """
    email = request.data.get('email')
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Use Django's PasswordResetForm to handle email sending
    form = PasswordResetForm({'email': email})
    if form.is_valid():
        # Get current site for email context
        current_site = get_current_site(request)
        domain = current_site.domain
        site_name = current_site.name
        
        # Save form which sends the email
        # Use justvybz@justvybz.com as the from email for password reset
        form.save(
            request=request,
            use_https=request.is_secure() or settings.ACCOUNT_DEFAULT_HTTP_PROTOCOL == 'https',
            from_email='justvybz@justvybz.com',
            email_template_name='registration/password_reset_email.html',
            subject_template_name='registration/password_reset_subject.txt',
            html_email_template_name='emails/password_reset_email.html',
            extra_email_context={
                'protocol': 'https' if (request.is_secure() or settings.ACCOUNT_DEFAULT_HTTP_PROTOCOL == 'https') else 'http',
                'domain': domain,
                'site_name': site_name,
            }
        )
        # Always return success (security best practice - don't reveal if email exists)
        return Response({
            'message': 'If an account exists with this email, a password reset link has been sent.'
        }, status=status.HTTP_200_OK)
    
    # Even if form is invalid (email doesn't exist), return success for security
    return Response({
        'message': 'If an account exists with this email, a password reset link has been sent.'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_api(request):
    """
    Logout endpoint that deletes the user's token.
    """
    try:
        # Check if token exists before trying to delete
        if hasattr(request.user, 'auth_token'):
            try:
                request.user.auth_token.delete()
            except Exception:
                # Token might already be deleted, that's okay
                pass
        
        return Response({
            'success': True,
            'message': 'Logged out successfully'
        })
    except Exception as e:
        # Even if there's an error, logout should succeed
        # This handles cases where authentication might fail during logout
        logger.warning(f"Logout error (non-critical): {e}")
        return Response({
            'success': True,
            'message': 'Logged out successfully'
        })


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def get_current_user_api(request):
    """
    Get or update current authenticated user information.
    """
    user = request.user
    
    if request.method == 'PATCH':
        # Update user profile
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        
        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        
        user.save()
    
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_active': user.is_active,
        'is_email_verified': getattr(user, 'is_email_verified', False),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def register_api(request):
    """
    Register a new user and create a token.
    Similar to existing registration but returns token immediately.
    """
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')
    password2 = request.data.get('password2')
    first_name = request.data.get('first_name', '')
    last_name = request.data.get('last_name', '')
    accept_terms = request.data.get('accept_terms', False)
    
    # Validation
    if not username or not email or not password:
        return Response({
            'error': 'Username, email, and password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if password != password2:
        return Response({
            'error': 'Passwords do not match'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if not accept_terms:
        return Response({
            'error': 'You must accept the Terms of Service and Privacy Policy'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user already exists
    if User.objects.filter(username=username).exists():
        return Response({
            'error': 'Username already exists'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if User.objects.filter(email=email).exists():
        return Response({
            'error': 'Email address already in use'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Create user (inactive until email verification)
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            is_active=False  # Require email verification
        )
        
        # Set email verification fields if User model has them
        if hasattr(user, 'is_email_verified'):
            user.is_email_verified = False
            token = default_token_generator.make_token(user)
            user.email_verification_token = token
            user.email_verification_sent_at = timezone.now()
            user.save()
            
            # Send verification email
            try:
                current_site = get_current_site(request)
                verification_url = f"{request.scheme}://{current_site.domain}{reverse('verify_email', kwargs={'user_id': user.id, 'token': token})}"
                
                subject = 'Verify Your Email - Justvybz'
                message = f"Hi {user.username},\n\nPlease verify your email address by clicking the link below:\n{verification_url}\n\nBest regards,\nJustVybz Team"
                
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception as e:
                # Log error but don't fail registration
                logger.error(f"Failed to send verification email: {e}")
        
        # Create token for immediate API access (user will need to verify email for full access)
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_active': user.is_active,
                'is_email_verified': getattr(user, 'is_email_verified', False),
            },
            'message': 'Registration successful. Please check your email to verify your account.',
            'email_verification_required': True
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Registration error: {e}")
        return Response({
            'error': f'Registration failed: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)