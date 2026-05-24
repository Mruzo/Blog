from django.test import TestCase, Client
from django.contrib.auth import get_user_model

User = get_user_model()
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
import json
import requests
from unittest.mock import patch, Mock

from .models import Comic, Season, Character, Episode, Dialogue


class ProgressiveSavingIntegrationTestCase(APITestCase):
    """Integration tests for the progressive saving workflow"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        # Use session authentication instead of token
        self.client.force_authenticate(user=self.user)
        
        # Base URL for API endpoints
        self.base_url = 'http://localhost:8000/api/'
        
        # Test data
        self.story_data = {
            'title': 'Integration Test Story',
            'description': 'A story for integration testing',
            'summary': 'Integration test summary',
            'genre': 'Science Fiction',
            'target_audience': 'Teens'
        }
        
        self.season_data = {
            'title': 'Season 1',
            'season_number': 1,
            'description': 'First season of integration test'
        }
        
        self.characters_data = [
            {
                'name': 'Hero Character',
                'bio': 'The main protagonist',
                'role': 'Protagonist',
                'appearance': 'Tall and heroic'
            },
            {
                'name': 'Villain Character',
                'bio': 'The main antagonist',
                'role': 'Antagonist',
                'appearance': 'Dark and menacing'
            }
        ]
        
        self.episode_data = {
            'title': 'Episode 1: The Beginning',
            'episode_number': 1,
            'description': 'The first episode of the story'
        }
        
        self.dialogues_data = [
            {
                'character': 'Hero Character',
                'text': 'I must save the world!',
                'order': 1,
                'camera_angle': {'x': 0, 'y': 0, 'z': 0}
            },
            {
                'character': 'Villain Character',
                'text': 'You will never stop me!',
                'order': 2,
                'camera_angle': {'x': 1, 'y': 1, 'z': 1}
            }
        ]

    def test_complete_progressive_saving_workflow(self):
        """Test the complete progressive saving workflow as it would happen in the React app"""
        
        # Step 1: Create Story (CharactersStep)
        story_url = reverse('api:create-story')
        story_response = self.client.post(story_url, self.story_data, format='json')
        self.assertEqual(story_response.status_code, status.HTTP_201_CREATED)
        story_id = story_response.data['id']
        
        # Verify story was created
        story = Comic.objects.get(id=story_id)
        self.assertEqual(story.title, 'Integration Test Story')
        self.assertEqual(story.author, self.user)
        
        # Step 2: Create Season (CharactersStep)
        season_url = reverse('api:create-season')
        season_data = {**self.season_data, 'story_id': story_id}
        season_response = self.client.post(season_url, season_data, format='json')
        self.assertEqual(season_response.status_code, status.HTTP_201_CREATED)
        season_id = season_response.data['id']
        
        # Verify season was created
        season = Season.objects.get(id=season_id)
        self.assertEqual(season.title, 'Season 1')
        self.assertEqual(season.story, story)
        
        # Step 3: Create Characters (CharactersStep)
        character_url = reverse('api:create-character')
        created_characters = []
        
        for character_data in self.characters_data:
            char_data = {**character_data, 'story_id': story_id}
            char_response = self.client.post(character_url, char_data, format='json')
            self.assertEqual(char_response.status_code, status.HTTP_201_CREATED)
            created_characters.append(char_response.data)
        
        # Verify characters were created
        self.assertEqual(Character.objects.count(), 2)
        characters = Character.objects.filter(story=story)
        self.assertEqual(characters.count(), 2)
        
        # Step 4: Create Episode (EpisodeSetupStep)
        episode_url = reverse('api:create-episode')
        episode_data = {**self.episode_data, 'season_id': season_id}
        episode_response = self.client.post(episode_url, episode_data, format='json')
        self.assertEqual(episode_response.status_code, status.HTTP_201_CREATED)
        episode_id = episode_response.data['id']
        
        # Verify episode was created
        episode = Episode.objects.get(id=episode_id)
        self.assertEqual(episode.title, 'Episode 1: The Beginning')
        self.assertEqual(episode.season, season)
        
        # Step 5: Create Dialogues (DialoguesStep)
        dialogue_url = reverse('api:create-dialogue')
        created_dialogues = []
        
        for dialogue_data in self.dialogues_data:
            # Find the character ID for the dialogue
            character_name = dialogue_data['character']
            character = Character.objects.get(name=character_name, story=story)
            
            dialogue_data_with_character = {
                **dialogue_data,
                'episode_id': episode_id,
                'character_id': character.id
            }
            
            dialogue_response = self.client.post(dialogue_url, dialogue_data_with_character, format='json')
            self.assertEqual(dialogue_response.status_code, status.HTTP_201_CREATED)
            created_dialogues.append(dialogue_response.data)
        
        # Verify dialogues were created
        self.assertEqual(Dialogue.objects.count(), 2)
        dialogues = Dialogue.objects.filter(episode=episode)
        self.assertEqual(dialogues.count(), 2)
        
        # Verify the complete hierarchy
        self.assertEqual(story.seasons.count(), 1)
        self.assertEqual(story.characters.count(), 2)
        self.assertEqual(season.episodes.count(), 1)
        self.assertEqual(episode.dialogues.count(), 2)
        
        # Verify data integrity
        hero_dialogue = Dialogue.objects.get(character='Hero Character', episode=episode)
        villain_dialogue = Dialogue.objects.get(character='Villain Character', episode=episode)
        
        self.assertEqual(hero_dialogue.text, 'I must save the world!')
        self.assertEqual(villain_dialogue.text, 'You will never stop me!')
        self.assertEqual(hero_dialogue.order, 1)
        self.assertEqual(villain_dialogue.order, 2)

    def test_progressive_saving_with_errors(self):
        """Test progressive saving workflow with error handling"""
        
        # Test story creation with invalid data
        story_url = reverse('api:create-story')
        invalid_story_data = {
            'title': '',  # Empty title should fail
            'description': 'A test story'
        }
        story_response = self.client.post(story_url, invalid_story_data, format='json')
        self.assertEqual(story_response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test character creation without story
        character_url = reverse('api:create-character')
        character_response = self.client.post(character_url, self.characters_data[0], format='json')
        self.assertEqual(character_response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test episode creation without season
        episode_url = reverse('api:create-episode')
        episode_response = self.client.post(episode_url, self.episode_data, format='json')
        self.assertEqual(episode_response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test dialogue creation without episode
        dialogue_url = reverse('api:create-dialogue')
        dialogue_response = self.client.post(dialogue_url, self.dialogues_data[0], format='json')
        self.assertEqual(dialogue_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_data_consistency_after_progressive_saving(self):
        """Test that data remains consistent after progressive saving"""
        
        # Create the complete hierarchy
        story = Comic.objects.create(
            title='Consistency Test Story',
            description='A story for consistency testing',
            author=self.user
        )
        
        season = Season.objects.create(
            title='Season 1',
            season_number=1,
            story=story
        )
        
        character1 = Character.objects.create(
            name='Character 1',
            bio='First character',
            role='Protagonist',
            appearance='Tall',
            story=story
        )
        
        character2 = Character.objects.create(
            name='Character 2',
            bio='Second character',
            role='Antagonist',
            appearance='Short',
            story=story
        )
        
        episode = Episode.objects.create(
            title='Episode 1',
            episode_number=1,
            season=season
        )
        
        dialogue1 = Dialogue.objects.create(
            character='Character 1',
            text='First dialogue',
            order=1,
            episode=episode
        )
        
        dialogue2 = Dialogue.objects.create(
            character='Character 2',
            text='Second dialogue',
            order=2,
            episode=episode
        )
        
        # Verify all relationships are correct
        self.assertEqual(season.story, story)
        self.assertEqual(character1.story, story)
        self.assertEqual(character2.story, story)
        self.assertEqual(episode.season, season)
        self.assertEqual(dialogue1.episode, episode)
        self.assertEqual(dialogue2.episode, episode)
        
        # Verify counts
        self.assertEqual(story.seasons.count(), 1)
        self.assertEqual(story.characters.count(), 2)
        self.assertEqual(season.episodes.count(), 1)
        self.assertEqual(episode.dialogues.count(), 2)
        
        # Verify data integrity
        self.assertEqual(Comic.objects.count(), 1)
        self.assertEqual(Season.objects.count(), 1)
        self.assertEqual(Character.objects.count(), 2)
        self.assertEqual(Episode.objects.count(), 1)
        self.assertEqual(Dialogue.objects.count(), 2)

    def test_concurrent_progressive_saving(self):
        """Test that concurrent progressive saving doesn't cause conflicts"""
        
        # Create multiple stories simultaneously
        story1_data = {
            'title': 'Concurrent Story 1',
            'description': 'First concurrent story',
            'summary': 'Summary 1',
            'genre': 'Fantasy',
            'target_audience': 'Adults'
        }
        
        story2_data = {
            'title': 'Concurrent Story 2',
            'description': 'Second concurrent story',
            'summary': 'Summary 2',
            'genre': 'Sci-Fi',
            'target_audience': 'Teens'
        }
        
        # Create both stories
        story_url = reverse('api:create-story')
        story1_response = self.client.post(story_url, story1_data, format='json')
        story2_response = self.client.post(story_url, story2_data, format='json')
        
        self.assertEqual(story1_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(story2_response.status_code, status.HTTP_201_CREATED)
        
        story1_id = story1_response.data['id']
        story2_id = story2_response.data['id']
        
        # Create seasons for both stories
        season_url = reverse('api:create-season')
        season1_data = {**self.season_data, 'story_id': story1_id}
        season2_data = {**self.season_data, 'story_id': story2_id}
        
        season1_response = self.client.post(season_url, season1_data, format='json')
        season2_response = self.client.post(season_url, season2_data, format='json')
        
        self.assertEqual(season1_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(season2_response.status_code, status.HTTP_201_CREATED)
        
        # Verify both stories and seasons exist
        self.assertEqual(Comic.objects.count(), 2)
        self.assertEqual(Season.objects.count(), 2)
        
        # Verify they are properly linked
        story1 = Comic.objects.get(id=story1_id)
        story2 = Comic.objects.get(id=story2_id)
        
        self.assertEqual(story1.seasons.count(), 1)
        self.assertEqual(story2.seasons.count(), 1)
        self.assertNotEqual(story1.seasons.first(), story2.seasons.first())

    def test_progressive_saving_with_large_dataset(self):
        """Test progressive saving with a large dataset"""
        
        # Create story
        story = Comic.objects.create(
            title='Large Dataset Story',
            description='A story with many characters and dialogues',
            author=self.user
        )
        
        # Create season
        season = Season.objects.create(
            title='Season 1',
            season_number=1,
            story=story
        )
        
        # Create many characters
        characters = []
        for i in range(10):
            character = Character.objects.create(
                name=f'Character {i+1}',
                bio=f'Bio for character {i+1}',
                role='Supporting Character',
                appearance=f'Appearance {i+1}',
                story=story
            )
            characters.append(character)
        
        # Create episode
        episode = Episode.objects.create(
            title='Episode 1',
            episode_number=1,
            season=season
        )
        
        # Create many dialogues
        for i in range(20):
            character = characters[i % len(characters)]
            Dialogue.objects.create(
                character=character.name,
                text=f'Dialogue {i+1} from {character.name}',
                order=i+1,
                episode=episode
            )
        
        # Verify all data was created
        self.assertEqual(Character.objects.count(), 10)
        self.assertEqual(Dialogue.objects.count(), 20)
        
        # Verify relationships
        self.assertEqual(story.characters.count(), 10)
        self.assertEqual(episode.dialogues.count(), 20)
        
        # Verify data integrity
        for dialogue in Dialogue.objects.filter(episode=episode):
            self.assertIn(dialogue.character, [c.name for c in characters])
            self.assertIsNotNone(dialogue.text)
            self.assertGreater(dialogue.order, 0)
