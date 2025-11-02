from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django.db import connection
import time
import logging
from .models import Comic, Season, Episode, Dialogue, Character, Studio, AudioTrack
from .serializers import (
    ComicSerializer, SeasonSerializer, EpisodeSerializer, 
    DialogueSerializer, CharacterSerializer, StudioSerializer, AudioTrackSerializer
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
        
        # Check cache first
        cache_key = f"user_comics_{self.request.user.id}"
        cached_queryset = cache.get(cache_key)
        if cached_queryset:
            end_time = time.time()
            logger.info(f"ComicListCreateView: Cache hit - {end_time - start_time:.3f}s, 0 queries")
            return cached_queryset
        
        queryset = Comic.objects.filter(user=self.request.user)
        # Cache for 5 minutes
        cache.set(cache_key, queryset, 60 * 5)
        
        end_time = time.time()
        query_count = len(connection.queries) - initial_queries
        logger.info(f"ComicListCreateView: Cache miss - {end_time - start_time:.3f}s, {query_count} queries")
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
        return Comic.objects.filter(user=self.request.user)

# Public Stories View - shows all published stories from all users
class PublicStoriesView(generics.ListAPIView):
    serializer_class = ComicSerializer
    permission_classes = [AllowAny]  # No authentication required
    
    def get_queryset(self):
        # Check cache first
        cache_key = "public_stories"
        cached_queryset = cache.get(cache_key)
        if cached_queryset:
            return cached_queryset
        
        # Only show stories that are both public AND approved (published)
        queryset = Comic.objects.filter(
            is_public=True,
            moderation_status='approved'
        ).order_by('-created_at')
        # Cache for 10 minutes (public data changes less frequently)
        cache.set(cache_key, queryset, 60 * 10)
        return queryset

# Season API Views
class SeasonListCreateView(generics.ListCreateAPIView):
    serializer_class = SeasonSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        story_id = self.kwargs.get('story_id')
        # Check cache first
        cache_key = f"seasons_{story_id}_{self.request.user.id}"
        cached_queryset = cache.get(cache_key)
        if cached_queryset:
            return cached_queryset
        
        queryset = Season.objects.filter(comic_id=story_id, comic__user=self.request.user)
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

class SeasonDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SeasonSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Season.objects.filter(comic__user=self.request.user)

# Character API Views
class CharacterListCreateView(generics.ListCreateAPIView):
    serializer_class = CharacterSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        story_id = self.kwargs.get('story_id')
        if story_id:
            return Character.objects.filter(user=self.request.user, story_id=story_id)
        return Character.objects.filter(user=self.request.user)
    
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
        return Character.objects.filter(user=self.request.user)

# Episode API Views
class EpisodeListCreateView(generics.ListCreateAPIView):
    serializer_class = EpisodeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        season_id = self.kwargs.get('season_id')
        # Check cache first
        cache_key = f"episodes_{season_id}_{self.request.user.id}"
        cached_queryset = cache.get(cache_key)
        if cached_queryset:
            return cached_queryset
        
        queryset = Episode.objects.filter(season_id=season_id, season__comic__user=self.request.user)
        # Cache for 5 minutes
        cache.set(cache_key, queryset, 60 * 5)
        return queryset
    
    def perform_create(self, serializer):
        season_id = self.kwargs.get('season_id')
        season = Season.objects.get(id=season_id, comic__user=self.request.user)
        serializer.save(season=season)
        # Clear cache when new episode is created
        cache_key = f"episodes_{season_id}_{self.request.user.id}"
        cache.delete(cache_key)

class EpisodeDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EpisodeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Episode.objects.filter(season__comic__user=self.request.user)

# Dialogue API Views
class DialogueListCreateView(generics.ListCreateAPIView):
    serializer_class = DialogueSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        episode_id = self.kwargs.get('episode_id')
        return Dialogue.objects.filter(episode_id=episode_id, episode__season__comic__user=self.request.user)
    
    def perform_create(self, serializer):
        episode_id = self.kwargs.get('episode_id')
        episode = Episode.objects.get(id=episode_id, season__comic__user=self.request.user)
        serializer.save(episode=episode)

class DialogueDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DialogueSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Dialogue.objects.filter(episode__season__comic__user=self.request.user)

# Studio API Views
class StudioListCreateView(generics.ListCreateAPIView):
    serializer_class = StudioSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Studio.objects.filter(owner=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class StudioDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = StudioSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Studio.objects.filter(owner=self.request.user)

# Audio Track API Views
class AudioTrackListCreateView(generics.ListCreateAPIView):
    serializer_class = AudioTrackSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return AudioTrack.objects.filter(created_by=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class AudioTrackDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AudioTrackSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return AudioTrack.objects.filter(created_by=self.request.user)

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
        print(f"Creating story with data: {story_data}")
        story = Comic.objects.create(
            title=story_data.get('title', ''),
            description=story_data.get('description', ''),
            is_public=story_data.get('is_public', False),
            user=request.user
        )
        print(f"Story created with ID: {story.id}")
        
        # Create season
        season_data = data.get('season', {})
        season = Season.objects.create(
            title=season_data.get('title', ''),
            season_number=season_data.get('season_number', 1),
            description=season_data.get('description', ''),
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
        episode = Episode.objects.create(
            title=episode_data.get('title', ''),
            episode_number=episode_data.get('episode_number', 1),
            description=episode_data.get('description', ''),
            summary=episode_data.get('summary', ''),
            is_published=episode_data.get('is_published', False),
            season=season
        )
        
        # Create dialogues
        dialogues = []
        for dialogue_data in data.get('dialogues', []):
            # Get character ID from dialogue data
            character_id = dialogue_data.get('character')
            if character_id:
                try:
                    character = Character.objects.get(id=character_id)
                    
                    dialogue = Dialogue.objects.create(
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
                except Character.DoesNotExist:
                    # Skip dialogue if character doesn't exist
                    continue
        
        # Handle model upload if provided
        model_url = None
        if 'model' in request.FILES:
            # TODO: Handle file upload
            model_url = f"/media/models/{request.FILES['model'].name}"
        
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