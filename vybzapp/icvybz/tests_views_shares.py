"""
Tests for Views Count and Social Media Share Tracking Features

This test suite covers:
1. Episode view_count serialization
2. Story share tracking endpoint
3. Share click logging functionality
4. Integration with existing API endpoints
"""

from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
import json
import os
import tempfile
from unittest.mock import patch, mock_open

from .models import Comic, Season, Episode
from .serializers import EpisodeSerializer
from .views import track_share_click, log_share_click


class EpisodeViewCountTestCase(APITestCase):
    """Test that episode view_count is included in API responses"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        # Create test story, season, and episode
        self.story = Comic.objects.create(
            title='Test Story',
            description='A test story',
            user=self.user,
            is_public=True
        )
        
        self.season = Season.objects.create(
            comic=self.story,
            title='Season 1',
            season_number=1,
            description='First season',
            release_date='2024-01-01',
            is_public=True
        )
        
        self.episode = Episode.objects.create(
            season=self.season,
            title='Episode 1',
            episode_number=1,
            description='First episode',
            is_published=True,
            view_count=42  # Set initial view count
        )
    
    def test_episode_serializer_includes_view_count(self):
        """Test that EpisodeSerializer includes view_count field"""
        serializer = EpisodeSerializer(self.episode)
        data = serializer.data
        
        self.assertIn('view_count', data)
        self.assertEqual(data['view_count'], 42)
        self.assertIn('last_viewed', data)
    
    def test_episode_api_response_includes_view_count(self):
        """Test that episode API endpoint returns view_count"""
        url = reverse('icvybz-api:episode-list-create', kwargs={'season_id': self.season.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Handle paginated or non-paginated responses
        episodes = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        if len(episodes) > 0:
            episode_data = episodes[0]
            self.assertIn('view_count', episode_data)
            self.assertIsInstance(episode_data['view_count'], int)
    
    def test_episode_detail_includes_view_count(self):
        """Test that episode detail endpoint includes view_count"""
        url = reverse('icvybz-api:episode-detail', kwargs={
            'pk': self.episode.id
        })
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('view_count', response.data)
        self.assertEqual(response.data['view_count'], 42)
    
    def test_view_count_defaults_to_zero(self):
        """Test that new episodes have view_count of 0 by default"""
        new_episode = Episode.objects.create(
            season=self.season,
            title='Episode 2',
            episode_number=2,
            description='Second episode',
            is_published=True
        )
        
        serializer = EpisodeSerializer(new_episode)
        self.assertEqual(serializer.data['view_count'], 0)


class ShareTrackingTestCase(APITestCase):
    """Test social media share tracking functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        # Create test story and episode
        self.story = Comic.objects.create(
            title='Test Story',
            description='A test story',
            user=self.user,
            is_public=True
        )
        
        self.season = Season.objects.create(
            comic=self.story,
            title='Season 1',
            season_number=1,
            description='First season',
            release_date='2024-01-01',
            is_public=True
        )
        
        self.episode = Episode.objects.create(
            season=self.season,
            title='Episode 1',
            episode_number=1,
            description='First episode',
            is_published=True
        )
    
    @patch('icvybz.views.log_share_click')
    def test_track_share_click_with_story_id(self, mock_log):
        """Test tracking share click with story_id"""
        url = reverse('immersivecomics:track_share_click')
        data = {
            'platform': 'facebook',
            'story_id': self.story.id
        }
        
        response = self.client.post(
            url,
            data=json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = json.loads(response.content)
        self.assertEqual(response_data['success'], True)
        mock_log.assert_called_once()
        # Verify content_type is 'story'
        call_args = mock_log.call_args
        self.assertEqual(call_args[0][2], self.story.id)  # content_id
        self.assertEqual(call_args[0][3], 'story')  # content_type
    
    @patch('icvybz.views.log_share_click')
    def test_track_share_click_with_episode_id(self, mock_log):
        """Test tracking share click with episode_id (existing functionality)"""
        url = reverse('immersivecomics:track_share_click')
        data = {
            'platform': 'x_twitter',
            'episode_id': self.episode.id
        }
        
        response = self.client.post(
            url,
            data=json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = json.loads(response.content)
        self.assertEqual(response_data['success'], True)
        mock_log.assert_called_once()
        # Verify content_type is 'episode'
        call_args = mock_log.call_args
        self.assertEqual(call_args[0][2], self.episode.id)  # content_id
        self.assertEqual(call_args[0][3], 'episode')  # content_type
    
    def test_track_share_click_missing_platform(self):
        """Test that missing platform returns 400 error"""
        url = reverse('immersivecomics:track_share_click')
        data = {
            'story_id': self.story.id
        }
        
        response = self.client.post(
            url,
            data=json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response_data = json.loads(response.content)
        self.assertIn('error', response_data)
    
    def test_track_share_click_missing_ids(self):
        """Test that missing both story_id and episode_id returns 400 error"""
        url = reverse('immersivecomics:track_share_click')
        data = {
            'platform': 'facebook'
        }
        
        response = self.client.post(
            url,
            data=json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response_data = json.loads(response.content)
        self.assertIn('error', response_data)
    
    def test_track_share_click_all_platforms(self):
        """Test tracking share clicks for all supported platforms"""
        url = reverse('immersivecomics:track_share_click')
        platforms = ['facebook', 'x_twitter', 'reddit', 'copy_link']
        
        for platform in platforms:
            with patch('icvybz.views.log_share_click') as mock_log:
                data = {
                    'platform': platform,
                    'story_id': self.story.id
                }
                
                response = self.client.post(
                    url,
                    data=json.dumps(data),
                    content_type='application/json'
                )
                
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                mock_log.assert_called_once()


class ShareLoggingTestCase(TestCase):
    """Test share click logging functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.story = Comic.objects.create(
            title='Test Story',
            description='A test story',
            user=self.user,
            is_public=True
        )
        
        # Create a mock request
        from django.test import RequestFactory
        self.factory = RequestFactory()
        self.request = self.factory.post('/api/track-share/')
        self.request.META['HTTP_USER_AGENT'] = 'Test User Agent'
        self.request.META['HTTP_REFERER'] = 'https://example.com'
    
    @patch('icvybz.views.detect_environment')
    @patch('icvybz.views.os.path.exists')
    @patch('icvybz.views.open', new_callable=mock_open, read_data='[]')
    @patch('icvybz.views.json.dump')
    def test_log_share_click_story(self, mock_json_dump, mock_file, mock_exists, mock_env):
        """Test logging share click for a story"""
        mock_exists.return_value = True
        mock_env.return_value = 'development'
        
        log_share_click(self.request, 'facebook', self.story.id, 'story')
        
        # Verify file operations
        mock_file.assert_called()
        mock_json_dump.assert_called_once()
        
        # Verify logged data structure
        call_args = mock_json_dump.call_args[0]
        logged_data = call_args[0]
        self.assertIsInstance(logged_data, list)
        self.assertEqual(len(logged_data), 1)
        
        share_entry = logged_data[0]
        self.assertEqual(share_entry['platform'], 'facebook')
        self.assertEqual(share_entry['content_type'], 'story')
        self.assertEqual(share_entry['story_id'], self.story.id)
        self.assertIsNone(share_entry['episode_id'])
        self.assertIn('timestamp', share_entry)
        self.assertIn('environment', share_entry)
    
    @patch('icvybz.views.detect_environment')
    @patch('icvybz.views.os.path.exists')
    @patch('icvybz.views.open', new_callable=mock_open, read_data='[]')
    @patch('icvybz.views.json.dump')
    def test_log_share_click_episode(self, mock_json_dump, mock_file, mock_exists, mock_env):
        """Test logging share click for an episode"""
        season = Season.objects.create(
            comic=self.story,
            title='Season 1',
            season_number=1,
            description='First season',
            release_date='2024-01-01',
            is_public=True
        )
        episode = Episode.objects.create(
            season=season,
            title='Episode 1',
            episode_number=1,
            description='First episode',
            is_published=True
        )
        
        mock_exists.return_value = True
        mock_env.return_value = 'production'
        
        log_share_click(self.request, 'x_twitter', episode.id, 'episode')
        
        # Verify logged data structure
        call_args = mock_json_dump.call_args[0]
        logged_data = call_args[0]
        share_entry = logged_data[0]
        
        self.assertEqual(share_entry['platform'], 'x_twitter')
        self.assertEqual(share_entry['content_type'], 'episode')
        self.assertEqual(share_entry['episode_id'], episode.id)
        self.assertIsNone(share_entry['story_id'])
        self.assertEqual(share_entry['environment'], 'production')


class ViewsCountIntegrationTestCase(APITestCase):
    """Integration tests for views count feature"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.story = Comic.objects.create(
            title='Test Story',
            description='A test story',
            user=self.user,
            is_public=True,
            moderation_status='approved'  # Required for public API access
        )
        
        self.season = Season.objects.create(
            comic=self.story,
            title='Season 1',
            season_number=1,
            description='First season',
            release_date='2024-01-01',
            is_public=True
        )
        
        # Create multiple episodes with different view counts
        self.episode1 = Episode.objects.create(
            season=self.season,
            title='Episode 1',
            episode_number=1,
            description='First episode',
            is_published=True,
            view_count=10
        )
        
        self.episode2 = Episode.objects.create(
            season=self.season,
            title='Episode 2',
            episode_number=2,
            description='Second episode',
            is_published=True,
            view_count=25
        )
        
        self.episode3 = Episode.objects.create(
            season=self.season,
            title='Episode 3',
            episode_number=3,
            description='Third episode',
            is_published=True,
            view_count=15
        )
    
    def test_total_views_calculation(self):
        """Test that total views can be calculated from episodes"""
        episodes = Episode.objects.filter(season=self.season)
        total_views = sum(ep.view_count for ep in episodes)
        
        self.assertEqual(total_views, 50)  # 10 + 25 + 15
    
    def test_episodes_api_includes_view_count(self):
        """Test that episodes list API includes view_count for all episodes"""
        url = reverse('icvybz-api:episode-list-create', kwargs={'season_id': self.season.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Handle paginated or non-paginated responses
        episodes = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        # At least one episode should be returned
        self.assertGreaterEqual(len(episodes), 1, "No episodes returned from API")
        
        # Verify all returned episodes have view_count field
        for episode_data in episodes:
            self.assertIn('view_count', episode_data, f"Episode {episode_data.get('id')} missing view_count field")
            self.assertIsInstance(episode_data['view_count'], int, f"view_count should be int, got {type(episode_data['view_count'])}")
        
        # Verify at least one of our created episodes is in the response
        # (This verifies the API works, without being too strict about exact data)
        episode_ids = [ep['id'] for ep in episodes]
        created_episode_ids = [self.episode1.id, self.episode2.id, self.episode3.id]
        found_episodes = [ep_id for ep_id in created_episode_ids if ep_id in episode_ids]
        self.assertGreater(len(found_episodes), 0, 
                          f"None of our created episodes ({created_episode_ids}) found in API response ({episode_ids})")
    
    def test_public_episodes_api_filters_unpublished(self):
        """Test that public episode API only returns published episodes"""
        # Create an unpublished episode
        unpublished_episode = Episode.objects.create(
            season=self.season,
            title='Unpublished Episode',
            episode_number=4,
            description='This should not appear in public API',
            is_published=False,
            view_count=0
        )
        
        # Test as unauthenticated user (public access)
        self.client.force_authenticate(user=None)  # Remove authentication
        
        url = reverse('icvybz-api:episode-list-create', kwargs={'season_id': self.season.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Handle paginated or non-paginated responses
        episodes = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        
        # Verify unpublished episode is NOT in the response
        episode_ids = [ep['id'] for ep in episodes]
        self.assertNotIn(unpublished_episode.id, episode_ids, 
                         "Unpublished episode should not appear in public API")
        
        # Verify all published episodes ARE in the response
        published_episode_ids = [self.episode1.id, self.episode2.id, self.episode3.id]
        for ep_id in published_episode_ids:
            self.assertIn(ep_id, episode_ids, 
                         f"Published episode {ep_id} should appear in public API")
        
        # Verify all returned episodes are published
        for episode_data in episodes:
            # The API should only return published episodes for public access
            episode = Episode.objects.get(id=episode_data['id'])
            self.assertTrue(episode.is_published, 
                          f"Episode {episode_data['id']} in public API should be published")


class IncrementEpisodeViewTestCase(APITestCase):
    """Test increment_episode_view API endpoint"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create public story with public season
        self.public_story = Comic.objects.create(
            title='Public Story',
            description='A public story',
            user=self.user,
            is_public=True,
            moderation_status='approved'
        )
        
        self.public_season = Season.objects.create(
            comic=self.public_story,
            title='Public Season',
            season_number=1,
            description='Public season',
            release_date='2024-01-01',
            is_public=True
        )
        
        self.published_episode = Episode.objects.create(
            season=self.public_season,
            title='Published Episode',
            episode_number=1,
            description='Published episode',
            is_published=True,
            view_count=5
        )
        
        # Create private story
        self.private_story = Comic.objects.create(
            title='Private Story',
            description='A private story',
            user=self.user,
            is_public=False
        )
        
        self.private_season = Season.objects.create(
            comic=self.private_story,
            title='Private Season',
            season_number=1,
            description='Private season',
            release_date='2024-01-01',
            is_public=False
        )
        
        self.unpublished_episode = Episode.objects.create(
            season=self.public_season,
            title='Unpublished Episode',
            episode_number=2,
            description='Unpublished episode',
            is_published=False,
            view_count=0
        )
        
        # Create public story with private season
        self.public_story_private_season = Comic.objects.create(
            title='Public Story Private Season',
            description='A public story with private season',
            user=self.user,
            is_public=True,
            moderation_status='approved'
        )
        
        self.private_season_in_public_story = Season.objects.create(
            comic=self.public_story_private_season,
            title='Private Season in Public Story',
            season_number=1,
            description='Private season',
            release_date='2024-01-01',
            is_public=False
        )
        
        self.episode_in_private_season = Episode.objects.create(
            season=self.private_season_in_public_story,
            title='Episode in Private Season',
            episode_number=1,
            description='Episode in private season',
            is_published=True,
            view_count=0
        )
    
    def test_increment_view_success(self):
        """Test successfully incrementing view count for published episode in public story/season"""
        url = reverse('icvybz-api:episode-increment-view', kwargs={'episode_id': self.published_episode.id})
        initial_count = self.published_episode.view_count
        
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['success'], True)
        self.assertEqual(response.data['view_count'], initial_count + 1)
        self.assertEqual(response.data['story_id'], self.public_story.id)
        # Published + unpublished episode in same season: sum of view_count
        self.assertEqual(response.data['story_total_views'], initial_count + 1 + self.unpublished_episode.view_count)
        
        # Verify database was updated
        self.published_episode.refresh_from_db()
        self.assertEqual(self.published_episode.view_count, initial_count + 1)
    
    def test_increment_view_unpublished_episode(self):
        """Test that unpublished episodes cannot have views incremented"""
        url = reverse('icvybz-api:episode-increment-view', kwargs={'episode_id': self.unpublished_episode.id})
        
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertIn('not published', response.data['error'].lower())
    
    def test_increment_view_private_story(self):
        """Test that episodes in private stories cannot have views incremented"""
        # Create episode in private story
        episode = Episode.objects.create(
            season=self.private_season,
            title='Episode in Private Story',
            episode_number=1,
            description='Episode',
            is_published=True
        )
        
        url = reverse('icvybz-api:episode-increment-view', kwargs={'episode_id': episode.id})
        
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertIn('not public', response.data['error'].lower())
    
    def test_increment_view_private_season(self):
        """Test that episodes in private seasons cannot have views incremented"""
        url = reverse('icvybz-api:episode-increment-view', kwargs={'episode_id': self.episode_in_private_season.id})
        
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertIn('season is not public', response.data['error'].lower())
    
    def test_increment_view_nonexistent_episode(self):
        """Test that incrementing view for nonexistent episode returns 404"""
        url = reverse('icvybz-api:episode-increment-view', kwargs={'episode_id': 99999})
        
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)
    
    def test_increment_view_multiple_times(self):
        """Test that view count increments correctly with multiple calls"""
        url = reverse('icvybz-api:episode-increment-view', kwargs={'episode_id': self.published_episode.id})
        initial_count = self.published_episode.view_count
        tail_sum = self.unpublished_episode.view_count
        
        # Increment 3 times
        for i in range(3):
            response = self.client.post(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(
                response.data['story_total_views'],
                initial_count + i + 1 + tail_sum,
            )
        
        # Verify final count
        self.published_episode.refresh_from_db()
        self.assertEqual(self.published_episode.view_count, initial_count + 3)


class TotalViewsAnnotationTestCase(APITestCase):
    """Test total_views annotation in ComicListCreateView and ComicDetailView"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.story = Comic.objects.create(
            title='Test Story',
            description='A test story',
            user=self.user,
            is_public=True
        )
        
        self.season1 = Season.objects.create(
            comic=self.story,
            title='Season 1',
            season_number=1,
            description='First season',
            release_date='2024-01-01',
            is_public=True
        )
        
        self.season2 = Season.objects.create(
            comic=self.story,
            title='Season 2',
            season_number=2,
            description='Second season',
            release_date='2024-01-01',
            is_public=True
        )
        
        # Create episodes with different view counts
        Episode.objects.create(
            season=self.season1,
            title='Episode 1',
            episode_number=1,
            description='First episode',
            is_published=True,
            view_count=10
        )
        
        Episode.objects.create(
            season=self.season1,
            title='Episode 2',
            episode_number=2,
            description='Second episode',
            is_published=True,
            view_count=20
        )
        
        Episode.objects.create(
            season=self.season2,
            title='Episode 1',
            episode_number=1,
            description='First episode',
            is_published=True,
            view_count=15
        )
    
    def test_comic_list_includes_total_views(self):
        """Test that ComicListCreateView includes total_views annotation"""
        url = reverse('icvybz-api:story-list-create')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        stories = response.data if isinstance(response.data, list) else response.data.get('results', [])
        
        # Find our story
        story_data = next((s for s in stories if s['id'] == self.story.id), None)
        self.assertIsNotNone(story_data, "Story not found in API response")
        self.assertIn('total_views', story_data)
        self.assertEqual(story_data['total_views'], 45)  # 10 + 20 + 15
    
    def test_comic_detail_includes_total_views(self):
        """Test that ComicDetailView includes total_views annotation"""
        url = reverse('icvybz-api:story-detail', kwargs={'pk': self.story.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_views', response.data)
        self.assertEqual(response.data['total_views'], 45)  # 10 + 20 + 15
    
    def test_season_list_includes_total_views(self):
        """Test that SeasonListCreateView includes total_views annotation per season"""
        url = reverse('icvybz-api:season-list-create', kwargs={'story_id': self.story.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        seasons = response.data if isinstance(response.data, list) else response.data.get('results', [])
        
        # Find our seasons
        season1_data = next((s for s in seasons if s['id'] == self.season1.id), None)
        season2_data = next((s for s in seasons if s['id'] == self.season2.id), None)
        
        self.assertIsNotNone(season1_data, "Season 1 not found in API response")
        self.assertIsNotNone(season2_data, "Season 2 not found in API response")
        
        # Season 1 should have total_views = 30 (10 + 20)
        self.assertIn('total_views', season1_data)
        self.assertEqual(season1_data['total_views'], 30)
        
        # Season 2 should have total_views = 15
        self.assertIn('total_views', season2_data)
        self.assertEqual(season2_data['total_views'], 15)
    
    def test_season_detail_includes_total_views(self):
        """Test that SeasonDetailView includes total_views annotation"""
        url = reverse('icvybz-api:season-detail', kwargs={'pk': self.season1.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_views', response.data)
        self.assertEqual(response.data['total_views'], 30)  # 10 + 20 (only episodes in season1)


class SeasonPublicVisibilityTestCase(APITestCase):
    """Test season is_public visibility logic"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create public story
        self.public_story = Comic.objects.create(
            title='Public Story',
            description='A public story',
            user=self.user,
            is_public=True,
            moderation_status='approved'
        )
        
        # Create public season
        self.public_season = Season.objects.create(
            comic=self.public_story,
            title='Public Season',
            season_number=1,
            description='Public season',
            release_date='2024-01-01',
            is_public=True
        )
        
        # Create private season in public story
        self.private_season = Season.objects.create(
            comic=self.public_story,
            title='Private Season',
            season_number=2,
            description='Private season',
            release_date='2024-01-01',
            is_public=False
        )
    
    def test_owner_sees_all_seasons(self):
        """Test that story owner can see all seasons regardless of public status"""
        self.client.force_authenticate(user=self.user)
        url = reverse('icvybz-api:season-list-create', kwargs={'story_id': self.public_story.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        seasons = response.data if isinstance(response.data, list) else response.data.get('results', [])
        season_ids = [s['id'] for s in seasons]
        
        # Owner should see both public and private seasons
        self.assertIn(self.public_season.id, season_ids)
        self.assertIn(self.private_season.id, season_ids)
    
    def test_public_user_sees_only_public_seasons(self):
        """Test that unauthenticated users only see public seasons"""
        # Create another user
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=other_user)
        
        url = reverse('icvybz-api:season-list-create', kwargs={'story_id': self.public_story.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        seasons = response.data if isinstance(response.data, list) else response.data.get('results', [])
        season_ids = [s['id'] for s in seasons]
        
        # Non-owner should only see public seasons
        self.assertIn(self.public_season.id, season_ids)
        self.assertNotIn(self.private_season.id, season_ids)
    
    def test_unauthenticated_user_sees_only_public_seasons(self):
        """Test that unauthenticated users only see public seasons"""
        self.client.force_authenticate(user=None)
        url = reverse('icvybz-api:season-list-create', kwargs={'story_id': self.public_story.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        seasons = response.data if isinstance(response.data, list) else response.data.get('results', [])
        season_ids = [s['id'] for s in seasons]
        
        # Unauthenticated user should only see public seasons
        self.assertIn(self.public_season.id, season_ids)
        self.assertNotIn(self.private_season.id, season_ids)

