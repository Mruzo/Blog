"""
Tests for POV (Point of View) data handling in characters and dialogues.
These tests ensure POV data flows correctly from creation through serialization.
"""
from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

from .models import Comic, Season, Character, Episode, Dialogue, POV


class POVDataTestCase(APITestCase):
    """Test POV data handling in character creation and updates"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        # Create story and season for character tests
        self.story = Comic.objects.create(
            user=self.user,
            title='Test Story',
            description='A test story'
        )
        
        self.season = Season.objects.create(
            comic=self.story,
            title='Season 1',
            season_number=1,
            description='First season',
            release_date='2024-01-01'
        )
        
        self.character_data = {
            'name': 'Test Character',
            'bio': 'Test character bio',
            'personality': 'Brave',
            'love_interest': 'Test love interest'
        }
        
        self.character_data_with_pov = {
            **self.character_data,
            'pov_head_x': 2.5,
            'pov_head_y': 1.8,
            'pov_head_z': -1.2
        }

    def test_create_character_with_pov_data(self):
        """Test creating a character with POV head position data (POV is created on update, not creation)"""
        url = reverse('icvybz-api:character-list-create', kwargs={'story_id': self.story.id})
        response = self.client.post(url, self.character_data_with_pov, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        character_id = response.data['id']
        
        # Verify character was created
        character = Character.objects.get(id=character_id)
        self.assertEqual(character.name, 'Test Character')
        
        # Note: POV is not automatically created on character creation
        # It's only created when updating a character with POV data
        # So we verify POV data is NOT in the response initially
        self.assertIn('pov_data', response.data)
        self.assertIsNone(response.data['pov_data'], "POV should not be created on character creation")
        
        # Now update the character to create POV
        update_url = reverse('icvybz-api:character-detail', kwargs={'pk': character_id})
        update_response = self.client.put(update_url, self.character_data_with_pov, format='json')
        
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        
        # Verify POV was created with correct head positions after update
        pov = POV.objects.get(character=character)
        self.assertEqual(pov.head_x, 2.5)
        self.assertEqual(pov.head_y, 1.8)
        self.assertEqual(pov.head_z, -1.2)
        self.assertEqual(pov.default_camera_target, '2.5m 1.8m -1.2m')
        
        # Verify POV data is returned in update response
        self.assertIn('pov_data', update_response.data)
        self.assertIsNotNone(update_response.data['pov_data'])
        self.assertEqual(update_response.data['pov_data']['head_x'], 2.5)
        self.assertEqual(update_response.data['pov_data']['head_y'], 1.8)
        self.assertEqual(update_response.data['pov_data']['head_z'], -1.2)

    def test_create_character_without_pov_data_uses_defaults(self):
        """Test creating a character without POV data uses default values"""
        url = reverse('icvybz-api:character-list-create', kwargs={'story_id': self.story.id})
        response = self.client.post(url, self.character_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        character_id = response.data['id']
        
        # Verify character was created
        character = Character.objects.get(id=character_id)
        
        # Verify POV was NOT automatically created (only created on update with POV data)
        pov_exists = POV.objects.filter(character=character).exists()
        self.assertFalse(pov_exists, "POV should not be created automatically on character creation")

    def test_update_character_with_pov_data(self):
        """Test updating a character with POV head position data"""
        # First create a character
        character = Character.objects.create(
            user=self.user,
            story=self.story,
            name='Test Character',
            bio='Test bio',
            personality='Brave',
            love_interest='Test'
        )
        
        # Update character with POV data
        url = reverse('icvybz-api:character-detail', kwargs={'pk': character.id})
        update_data = {
            'name': 'Updated Character',
            'pov_head_x': 3.0,
            'pov_head_y': 2.0,
            'pov_head_z': -2.0
        }
        response = self.client.put(url, update_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify character was updated
        character.refresh_from_db()
        self.assertEqual(character.name, 'Updated Character')
        
        # Verify POV was created/updated with correct head positions
        pov = POV.objects.get(character=character)
        self.assertEqual(pov.head_x, 3.0)
        self.assertEqual(pov.head_y, 2.0)
        self.assertEqual(pov.head_z, -2.0)
        self.assertEqual(pov.default_camera_target, '3.0m 2.0m -2.0m')
        
        # Verify POV data is returned in response
        self.assertIn('pov_data', response.data)
        self.assertIsNotNone(response.data['pov_data'])
        self.assertEqual(response.data['pov_data']['head_x'], 3.0)

    def test_update_character_pov_data_partial(self):
        """Test updating only some POV fields"""
        # Create character with initial POV
        character = Character.objects.create(
            user=self.user,
            story=self.story,
            name='Test Character',
            bio='Test bio',
            personality='Brave',
            love_interest='Test'
        )
        pov = POV.objects.create(
            character=character,
            title="Test Character's POV",
            head_x=1.0,
            head_y=1.6,
            head_z=0.0,
            default_camera_target='1.0m 1.6m 0.0m'
        )
        
        # Update only head_y
        url = reverse('icvybz-api:character-detail', kwargs={'pk': character.id})
        update_data = {
            'name': 'Test Character',
            'pov_head_y': 2.5
        }
        response = self.client.put(url, update_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify only head_y was updated, others remain
        pov.refresh_from_db()
        self.assertEqual(pov.head_x, 1.0)  # Unchanged
        self.assertEqual(pov.head_y, 2.5)  # Updated
        self.assertEqual(pov.head_z, 0.0)  # Unchanged
        self.assertEqual(pov.default_camera_target, '1.0m 2.5m 0.0m')  # Updated

    def test_character_serialization_includes_pov_data(self):
        """Test that character serialization includes POV data when available"""
        # Create character and POV
        character = Character.objects.create(
            user=self.user,
            story=self.story,
            name='Test Character',
            bio='Test bio',
            personality='Brave',
            love_interest='Test'
        )
        pov = POV.objects.create(
            character=character,
            title="Test Character's POV",
            head_x=5.0,
            head_y=2.0,
            head_z=-3.0,
            default_camera_target='5.0m 2.0m -3.0m'
        )
        
        # Get character via API
        url = reverse('icvybz-api:character-detail', kwargs={'pk': character.id})
        response = self.client.get(url, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify POV data is included
        self.assertIn('pov_data', response.data)
        self.assertIsNotNone(response.data['pov_data'])
        self.assertEqual(response.data['pov_data']['id'], pov.id)
        self.assertEqual(response.data['pov_data']['head_x'], 5.0)
        self.assertEqual(response.data['pov_data']['head_y'], 2.0)
        self.assertEqual(response.data['pov_data']['head_z'], -3.0)
        self.assertEqual(response.data['pov_data']['default_camera_target'], '5.0m 2.0m -3.0m')

    def test_character_list_includes_pov_data(self):
        """Test that character list endpoint includes POV data"""
        # Create multiple characters with POVs
        char1 = Character.objects.create(
            user=self.user,
            story=self.story,
            name='Character 1',
            bio='Bio 1',
            personality='Brave',
            love_interest='Test'
        )
        POV.objects.create(
            character=char1,
            title="Character 1's POV",
            head_x=1.0,
            head_y=1.6,
            head_z=0.0
        )
        
        char2 = Character.objects.create(
            user=self.user,
            story=self.story,
            name='Character 2',
            bio='Bio 2',
            personality='Shy',
            love_interest='Test'
        )
        # Character 2 has no POV
        
        # Get characters list
        url = reverse('icvybz-api:character-list-create', kwargs={'story_id': self.story.id})
        response = self.client.get(url, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify both characters are returned
        characters = response.data if isinstance(response.data, list) else response.data.get('results', [])
        self.assertEqual(len(characters), 2)
        
        # Verify first character has POV data
        char1_data = next(c for c in characters if c['id'] == char1.id)
        self.assertIn('pov_data', char1_data)
        self.assertIsNotNone(char1_data['pov_data'])
        self.assertEqual(char1_data['pov_data']['head_x'], 1.0)
        
        # Verify second character has no POV data (or null)
        char2_data = next(c for c in characters if c['id'] == char2.id)
        self.assertIn('pov_data', char2_data)
        self.assertIsNone(char2_data['pov_data'])

    def test_create_complete_story_with_pov_data(self):
        """Test create_complete_story endpoint with POV data in characters"""
        complete_story_data = {
            'story': {
                'title': 'Complete Story',
                'description': 'A complete story',
                'is_public': False
            },
            'season': {
                'title': 'Season 1',
                'season_number': 1,
                'description': 'First season',
                'release_date': '2024-01-01'
            },
            'characters': [
                {
                    'name': 'Character 1',
                    'bio': 'Bio 1',
                    'personality': 'Brave',
                    'love_interest': 'Test',
                    'pov_head_x': 2.0,
                    'pov_head_y': 1.7,
                    'pov_head_z': -1.0
                },
                {
                    'name': 'Character 2',
                    'bio': 'Bio 2',
                    'personality': 'Shy',
                    'love_interest': 'Test',
                    'pov_head_x': -2.0,
                    'pov_head_y': 1.6,
                    'pov_head_z': 1.0
                }
            ],
            'episode': {
                'title': 'Episode 1',
                'episode_number': 1,
                'description': 'First episode',
                'summary': 'Episode summary',
                'is_published': False
            },
            'dialogues': []
        }
        
        url = reverse('icvybz-api:create-complete-story')
        response = self.client.post(url, complete_story_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify story was created
        story_id = response.data['story']['id']
        story = Comic.objects.get(id=story_id)
        self.assertEqual(story.title, 'Complete Story')
        
        # Verify characters were created with POVs
        characters = Character.objects.filter(story=story)
        self.assertEqual(characters.count(), 2)
        
        char1 = characters.get(name='Character 1')
        pov1 = POV.objects.get(character=char1)
        self.assertEqual(pov1.head_x, 2.0)
        self.assertEqual(pov1.head_y, 1.7)
        self.assertEqual(pov1.head_z, -1.0)
        self.assertEqual(pov1.default_camera_target, '2.0m 1.7m -1.0m')
        
        char2 = characters.get(name='Character 2')
        pov2 = POV.objects.get(character=char2)
        self.assertEqual(pov2.head_x, -2.0)
        self.assertEqual(pov2.head_y, 1.6)
        self.assertEqual(pov2.head_z, 1.0)
        self.assertEqual(pov2.default_camera_target, '-2.0m 1.6m 1.0m')

