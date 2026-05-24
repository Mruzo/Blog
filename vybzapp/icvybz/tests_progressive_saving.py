from django.test import TestCase, Client
from django.contrib.auth import get_user_model

User = get_user_model()
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
import json

from .models import Comic, Season, Character, Episode, Dialogue


class ProgressiveSavingTestCase(APITestCase):
    """Simplified tests for progressive saving workflow"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.story_data = {
            'title': 'Test Story',
            'description': 'A test story',
            'is_public': False
        }
        
        self.season_data = {
            'title': 'Season 1',
            'season_number': 1,
            'description': 'First season',
            'release_date': '2024-01-01'
        }
        
        self.character_data = {
            'name': 'Test Character',
            'bio': 'Test character bio',
            'personality': 'Brave',
            'love_interest': 'Test love interest'
        }
        
        self.episode_data = {
            'title': 'Episode 1',
            'episode_number': 1,
            'description': 'First episode',
            'summary': 'Episode summary',
            'is_published': False
        }
        
        self.dialogue_data = {
            'pov': 1,  # Will be set to actual POV ID in test
            'text': 'Test dialogue text',
            'order': 1,
            'scene_title': 'Test Scene',
            'scene_description': 'Test scene description',
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

    def test_create_season_success(self):
        """Test creating a season successfully"""
        # First create a story
        story = Comic.objects.create(
            title='Test Story',
            description='A test story',
            is_public=False,
            user=self.user
        )
        
        url = reverse('icvybz-api:season-list-create', kwargs={'story_id': story.id})
        response = self.client.post(url, self.season_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Season.objects.count(), 1)
        
        season = Season.objects.first()
        self.assertEqual(season.title, 'Season 1')
        self.assertEqual(season.comic, story)

    def test_create_character_success(self):
        """Test creating a character successfully"""
        # First create a story
        story = Comic.objects.create(
            title='Test Story',
            description='A test story',
            is_public=False,
            user=self.user
        )
        
        url = reverse('icvybz-api:character-list-create', kwargs={'story_id': story.id})
        response = self.client.post(url, self.character_data, format='json')
        
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
            is_public=False,
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
        
        if response.status_code != status.HTTP_201_CREATED:
            print(f"Response status: {response.status_code}")
            print(f"Response content: {response.content}")
        
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
            is_public=False,
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
            season=season,
            summary='Episode summary',
            is_published=False
        )
        
        # Create a character and POV for the dialogue
        character = Character.objects.create(
            name='Test Character',
            bio='Test character bio',
            personality='Brave',
            love_interest='Test love interest',
            user=self.user
        )
        
        # Create a POV for the character
        from .models import POV
        pov = POV.objects.create(
            title='Test POV',
            character=character
        )
        
        # Update dialogue data with POV ID
        dialogue_data = self.dialogue_data.copy()
        dialogue_data['pov'] = pov.id
        
        url = reverse('icvybz-api:dialogue-list-create', kwargs={'episode_id': episode.id})
        response = self.client.post(url, dialogue_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Dialogue.objects.count(), 1)
        
        dialogue = Dialogue.objects.first()
        self.assertEqual(dialogue.pov, pov)
        self.assertEqual(dialogue.episode, episode)

    def test_complete_progressive_saving_workflow(self):
        """Test the complete progressive saving workflow"""
        
        # Step 1: Create Story
        story_url = reverse('icvybz-api:story-list-create')
        story_response = self.client.post(story_url, self.story_data, format='json')
        self.assertEqual(story_response.status_code, status.HTTP_201_CREATED)
        story_id = story_response.data['id']
        
        # Step 2: Create Season
        season_url = reverse('icvybz-api:season-list-create', kwargs={'story_id': story_id})
        season_response = self.client.post(season_url, self.season_data, format='json')
        self.assertEqual(season_response.status_code, status.HTTP_201_CREATED)
        season_id = season_response.data['id']
        
        # Step 3: Create Character
        character_url = reverse('icvybz-api:character-list-create', kwargs={'story_id': story_id})
        character_response = self.client.post(character_url, self.character_data, format='json')
        self.assertEqual(character_response.status_code, status.HTTP_201_CREATED)
        character_id = character_response.data['id']
        
        # Step 4: Create Episode
        episode_url = reverse('icvybz-api:episode-list-create', kwargs={'season_id': season_id})
        episode_response = self.client.post(episode_url, self.episode_data, format='json')
        self.assertEqual(episode_response.status_code, status.HTTP_201_CREATED)
        episode_id = episode_response.data['id']
        
        # Step 4.5: Create POV for the character
        from .models import POV
        character = Character.objects.get(id=character_id)
        pov = POV.objects.create(
            title='Test POV',
            character=character
        )
        
        # Step 5: Create Dialogue
        dialogue_data = self.dialogue_data.copy()
        dialogue_data['pov'] = pov.id
        dialogue_url = reverse('icvybz-api:dialogue-list-create', kwargs={'episode_id': episode_id})
        dialogue_response = self.client.post(dialogue_url, dialogue_data, format='json')
        
        if dialogue_response.status_code != status.HTTP_201_CREATED:
            print(f"Dialogue response status: {dialogue_response.status_code}")
            print(f"Dialogue response content: {dialogue_response.content}")
        
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
        self.assertEqual(dialogue.episode, episode)
        
        # Verify the complete hierarchy
        self.assertEqual(story.seasons.count(), 1)
        self.assertEqual(Character.objects.filter(user=self.user).count(), 1)
        self.assertEqual(season.episodes.count(), 1)
        self.assertEqual(episode.dialogues.count(), 1)

    def test_create_complete_story_api(self):
        """Test the create-complete-story API endpoint"""
        url = reverse('icvybz-api:create-complete-story')
        data = {
            'story': self.story_data,
            'season': self.season_data,
            'characters': [self.character_data],
            'episode': self.episode_data,
            'dialogues': [self.dialogue_data]
        }
        response = self.client.post(url, data, format='json')
        
        if response.status_code != status.HTTP_201_CREATED:
            print(f"Create complete story response status: {response.status_code}")
            print(f"Create complete story response content: {response.content}")
        
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
