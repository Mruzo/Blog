from django.test import TestCase, Client
from django.contrib.auth import get_user_model

User = get_user_model()
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
import json
import uuid

from .models import Comic, Season, Character, Episode, Dialogue, POV, ComicComment


class StoryCreationAPITestCase(APITestCase):
    def setUp(self):
        """Set up test data"""
        # Use unique username to avoid conflicts
        unique_suffix = str(uuid.uuid4())[:8]
        self.user = User.objects.create_user(
            username=f'testuser_{unique_suffix}',
            email=f'test_{unique_suffix}@example.com',
            password='testpass123'
        )
        # Use session authentication instead of token
        self.client.force_authenticate(user=self.user)
        
        self.story_data = {
            'title': 'Test Story',
            'description': 'A test story',
            'is_public': True
        }
        
        self.season_data = {
            'title': 'Season 1',
            'season_number': 1,
            'description': 'First season'
        }
        
        self.character_data = {
            'name': 'Test Character',
            'bio': 'Test character bio',
            'personality': 'Protagonist',
            'love_interest': 'Test appearance'
        }
        
        self.episode_data = {
            'title': 'Episode 1',
            'episode_number': 1,
            'description': 'First episode'
        }
        
        self.dialogue_data = {
            'pov': 1,  # Will be updated with actual POV ID
            'text': 'Test dialogue text',
            'order': 1,
            'scene_title': 'Test Scene',
            'scene_description': 'A test scene',
            'shot_type': 'mediumShot',
            'camera_orbit': '0deg 75deg 3m',
            'camera_target': '0m 1.6m 0m',
            'field_of_view': 45.0,
            'zoom_speed': 1.0,
            'rotation': '0deg 0deg 0deg'
        }

    def test_create_story_success(self):
        """Test creating a story successfully"""
        url = reverse('icvybz-api:story-list-create')
        response = self.client.post(url, self.story_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Comic.objects.count(), 1)
        
        story = Comic.objects.first()
        self.assertEqual(story.title, 'Test Story')
        self.assertEqual(story.user, self.user)

    def test_create_private_story_draft(self):
        """Private/draft stories must not 500 on create (wizard default)."""
        url = reverse('icvybz-api:story-list-create')
        response = self.client.post(
            url,
            {
                'title': 'Draft Story',
                'description': 'A private draft',
                'is_public': False,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        story = Comic.objects.get(title='Draft Story')
        self.assertFalse(story.is_public)
        self.assertEqual(story.moderation_status, 'pending')

    def test_create_story_unauthorized(self):
        """Test creating a story without authentication"""
        self.client.force_authenticate(user=None)  # Remove authentication
        url = reverse('icvybz-api:story-list-create')
        response = self.client.post(url, self.story_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_season_success(self):
        """Test creating a season successfully"""
        # First create a story
        story = Comic.objects.create(
            title='Test Story',
            description='A test story',
            user=self.user
        )
        
        url = reverse('icvybz-api:season-list-create', kwargs={'story_id': story.id})
        data = {**self.season_data}  # Remove comic from data, it's set automatically
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Season.objects.count(), 1)
        
        season = Season.objects.first()
        self.assertEqual(season.title, 'Season 1')
        self.assertEqual(season.comic, story)

    def test_create_season_wizard_default_title(self):
        """Wizard uses 'Season 1' when season title is empty (not 'Season 1 of …')."""
        story = Comic.objects.create(
            title='My Long Story Title Here',
            description='A test story',
            user=self.user,
        )
        url = reverse('icvybz-api:season-list-create', kwargs={'story_id': story.id})
        response = self.client.post(
            url,
            {
                'title': 'Season 1',
                'season_number': 1,
                'description': '',
                'release_date': '2024-06-14',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Season 1')

    def test_create_character_success(self):
        """Test creating a character successfully"""
        # First create a story
        story = Comic.objects.create(
            title='Test Story',
            description='A test story',
            user=self.user
        )
        
        url = reverse('icvybz-api:character-list-create', kwargs={'story_id': story.id})
        data = {**self.character_data}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Character.objects.count(), 1)
        
        character = Character.objects.first()
        self.assertEqual(character.name, 'Test Character')
        self.assertEqual(character.user, self.user)

    def test_create_episode_success(self):
        """Test creating an episode successfully"""
        # First create a story and season
        story = Comic.objects.create(
            title='Test Story',
            description='A test story',
            user=self.user
        )
        season = Season.objects.create(
            title='Season 1',
            season_number=1,
            comic=story,
            release_date='2024-01-01'
        )
        
        url = reverse('icvybz-api:episode-list-create', kwargs={'season_id': season.id})
        data = {**self.episode_data, 'season_id': season.id}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Episode.objects.count(), 1)
        
        episode = Episode.objects.first()
        self.assertEqual(episode.title, 'Episode 1')
        self.assertEqual(episode.season, season)

    def test_create_dialogue_success(self):
        """Test creating a dialogue successfully"""
        # First create a story, season, and episode
        story = Comic.objects.create(
            title='Test Story',
            description='A test story',
            user=self.user
        )
        season = Season.objects.create(
            title='Season 1',
            season_number=1,
            comic=story,
            release_date='2024-01-01'
        )
        episode = Episode.objects.create(
            title='Episode 1',
            episode_number=1,
            season=season
        )
        
        # Create a character and POV for the dialogue
        character = Character.objects.create(
            name='Test Character',
            bio='Test character bio',
            personality='Protagonist',
            love_interest='Test appearance',
            user=self.user
        )
        pov = POV.objects.create(
            title='Test POV',
            character=character
        )
        
        url = reverse('icvybz-api:dialogue-list-create', kwargs={'episode_id': episode.id})
        data = {**self.dialogue_data, 'pov': pov.id}  # Use actual POV ID
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Dialogue.objects.count(), 1)
        
        dialogue = Dialogue.objects.first()
        self.assertEqual(dialogue.pov, pov)
        self.assertEqual(dialogue.episode, episode)

    def test_create_complete_story_success(self):
        """Test creating a complete story with all related objects"""
        url = reverse('icvybz-api:create-complete-story')
        data = {
            'story': self.story_data,
            'season': self.season_data,
            'characters': [self.character_data],
            'episode': self.episode_data,
            'dialogues': [self.dialogue_data]
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify all objects were created
        self.assertEqual(Comic.objects.count(), 1)
        self.assertEqual(Season.objects.count(), 1)
        self.assertEqual(Character.objects.count(), 1)
        self.assertEqual(Episode.objects.count(), 1)
        self.assertEqual(Dialogue.objects.count(), 1)
        
        # Verify relationships
        story = Comic.objects.first()
        season = Season.objects.first()
        character = Character.objects.first()
        episode = Episode.objects.first()
        dialogue = Dialogue.objects.first()
        
        self.assertEqual(season.comic, story)
        self.assertEqual(character.user, self.user)
        self.assertEqual(episode.season, season)
        self.assertEqual(dialogue.episode, episode)

    def test_create_complete_story_with_model_upload(self):
        """Test creating a complete story with 3D model upload"""
        url = reverse('icvybz-api:create-complete-story')
        
        # Create a test file
        from django.core.files.uploadedfile import SimpleUploadedFile
        test_file = SimpleUploadedFile(
            "test_model.glb",
            b"fake model content",
            content_type="model/gltf-binary"
        )
        
        data = {
            'story': self.story_data,
            'season': self.season_data,
            'characters': [self.character_data],
            'episode': self.episode_data,
            'dialogues': [self.dialogue_data],
            'model': test_file
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify all objects were created
        self.assertEqual(Comic.objects.count(), 1)
        self.assertEqual(Season.objects.count(), 1)
        self.assertEqual(Character.objects.count(), 1)
        self.assertEqual(Episode.objects.count(), 1)
        self.assertEqual(Dialogue.objects.count(), 1)

    def test_create_story_validation_errors(self):
        """Test creating a story with validation errors"""
        url = reverse('icvybz-api:story-list-create')
        invalid_data = {
            'title': '',  # Empty title should fail validation
            'description': 'A test story'
        }
        response = self.client.post(url, invalid_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_character_without_story(self):
        """Test creating a character without a story"""
        # Create a story first
        story = Comic.objects.create(
            title='Test Story',
            description='A test story',
            user=self.user
        )
        url = reverse('icvybz-api:character-list-create', kwargs={'story_id': story.id})
        response = self.client.post(url, self.character_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_episode_without_season(self):
        """Test creating an episode without a season"""
        # Create a story and season first
        story = Comic.objects.create(
            title='Test Story',
            description='A test story',
            user=self.user
        )
        season = Season.objects.create(
            title='Season 1',
            season_number=1,
            comic=story,
            release_date='2024-01-01'
        )
        url = reverse('icvybz-api:episode-list-create', kwargs={'season_id': season.id})
        response = self.client.post(url, self.episode_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_dialogue_without_episode(self):
        """Test creating a dialogue without an episode"""
        # Create a story, season, and episode first
        story = Comic.objects.create(
            title='Test Story',
            description='A test story',
            user=self.user
        )
        season = Season.objects.create(
            title='Season 1',
            season_number=1,
            comic=story,
            release_date='2024-01-01'
        )
        episode = Episode.objects.create(
            title='Episode 1',
            episode_number=1,
            season=season
        )
        
        # Create a character and POV for the dialogue
        character = Character.objects.create(
            name='Test Character',
            bio='Test character bio',
            personality='Protagonist',
            love_interest='Test appearance',
            user=self.user
        )
        pov = POV.objects.create(
            title='Test POV',
            character=character
        )
        
        url = reverse('icvybz-api:dialogue-list-create', kwargs={'episode_id': episode.id})
        data = {**self.dialogue_data, 'pov': pov.id}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_progressive_saving_workflow(self):
        """Test the complete progressive saving workflow"""
        # Step 1: Create story
        story_url = reverse('icvybz-api:story-list-create')
        story_response = self.client.post(story_url, self.story_data, format='json')
        self.assertEqual(story_response.status_code, status.HTTP_201_CREATED)
        story_id = story_response.data['id']
        
        # Step 2: Create season
        season_url = reverse('icvybz-api:season-list-create', kwargs={'story_id': story_id})
        season_data = {**self.season_data}  # Remove comic from data, it's set automatically
        season_response = self.client.post(season_url, season_data, format='json')
        self.assertEqual(season_response.status_code, status.HTTP_201_CREATED)
        season_id = season_response.data['id']
        
        # Step 3: Create characters
        character_url = reverse('icvybz-api:character-list-create', kwargs={'story_id': story_id})
        character_data = {**self.character_data}
        character_response = self.client.post(character_url, character_data, format='json')
        self.assertEqual(character_response.status_code, status.HTTP_201_CREATED)
        character_id = character_response.data['id']
        
        # Step 4: Create episode
        episode_url = reverse('icvybz-api:episode-list-create', kwargs={'season_id': season_id})
        episode_data = {**self.episode_data}
        episode_response = self.client.post(episode_url, episode_data, format='json')
        self.assertEqual(episode_response.status_code, status.HTTP_201_CREATED)
        episode_id = episode_response.data['id']
        
        # Step 5: Create POV for dialogue
        character = Character.objects.get(id=character_id)
        episode = Episode.objects.get(id=episode_id)
        pov = POV.objects.create(title='Test POV', character=character)
        
        # Step 6: Create dialogues
        dialogue_url = reverse('icvybz-api:dialogue-list-create', kwargs={'episode_id': episode_id})
        dialogue_data = {**self.dialogue_data, 'pov': pov.id}
        dialogue_response = self.client.post(dialogue_url, dialogue_data, format='json')
        self.assertEqual(dialogue_response.status_code, status.HTTP_201_CREATED)
        
        # Verify all objects exist and are properly linked
        story = Comic.objects.get(id=story_id)
        season = Season.objects.get(id=season_id)
        character = Character.objects.get(id=character_id)
        episode = Episode.objects.get(id=episode_id)
        dialogue = Dialogue.objects.first()
        
        self.assertEqual(season.comic, story)
        self.assertEqual(character.user, self.user)
        self.assertEqual(episode.season, season)
        self.assertEqual(dialogue.pov, pov)
        self.assertEqual(dialogue.episode, episode)
        
        # Verify the complete hierarchy
        self.assertEqual(story.seasons.count(), 1)
        self.assertEqual(story.characters.count(), 1)
        self.assertEqual(season.episodes.count(), 1)
        self.assertEqual(episode.dialogues.count(), 1)


class EpisodeCommentAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='commenter',
            email='commenter@example.com',
            password='testpass123',
        )
        self.owner = User.objects.create_user(
            username='creator',
            email='creator@example.com',
            password='testpass123',
        )
        self.story = Comic.objects.create(
            title='Public Story',
            description='A public story',
            user=self.owner,
            is_public=True,
            moderation_status='approved',
        )
        self.season = Season.objects.create(
            title='Season 1',
            season_number=1,
            description='Public season',
            comic=self.story,
            release_date='2024-01-01',
            is_public=True,
        )
        self.episode1 = Episode.objects.create(
            title='Episode One',
            episode_number=1,
            season=self.season,
            is_published=True,
        )
        self.episode2 = Episode.objects.create(
            title='Episode Two',
            episode_number=2,
            season=self.season,
            is_published=True,
        )

    def test_list_season_comments_in_episode_order(self):
        ComicComment.objects.create(
            episode=self.episode2,
            user_name=self.user,
            comment_cont='Second episode comment',
            approved_comment=True,
        )
        ComicComment.objects.create(
            episode=self.episode1,
            user_name=self.user,
            comment_cont='First episode comment',
            approved_comment=True,
        )
        ComicComment.objects.create(
            episode=self.episode1,
            user_name=self.user,
            comment_cont='Hidden comment',
            approved_comment=False,
        )

        url = reverse('icvybz-api:season-comment-list', kwargs={'season_id': self.season.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertEqual([item['episode_number'] for item in response.data], [1, 2])
        self.assertEqual(response.data[0]['comment_cont'], 'First episode comment')
        self.assertEqual(response.data[1]['comment_cont'], 'Second episode comment')

    def test_authenticated_user_can_create_episode_comment(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('icvybz-api:episode-comment-create', kwargs={'episode_id': self.episode1.id})
        response = self.client.post(url, {'comment_cont': 'Great opening!'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ComicComment.objects.count(), 1)
        comment = ComicComment.objects.first()
        self.assertEqual(comment.user_name, self.user)
        self.assertEqual(comment.episode, self.episode1)
        self.assertTrue(comment.approved_comment)
        self.assertEqual(response.data['episode_number'], 1)

    def test_anonymous_user_cannot_create_episode_comment(self):
        url = reverse('icvybz-api:episode-comment-create', kwargs={'episode_id': self.episode1.id})
        response = self.client.post(url, {'comment_cont': 'Anonymous comment'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(ComicComment.objects.count(), 0)

    def test_cannot_comment_on_unpublished_episode(self):
        self.episode1.is_published = False
        self.episode1.save(update_fields=['is_published'])
        self.client.force_authenticate(user=self.user)

        url = reverse('icvybz-api:episode-comment-create', kwargs={'episode_id': self.episode1.id})
        response = self.client.post(url, {'comment_cont': 'Should be blocked'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(ComicComment.objects.count(), 0)
