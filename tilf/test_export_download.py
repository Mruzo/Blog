"""
Tests for the export download functionality - including browser download tests
"""
import os
import json
import tempfile
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.core.management import call_command
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from io import StringIO
import sys

from tilf.models import Comic, Season, Episode, Dialogue, Character, POV


class ExportDownloadTests(TestCase):
    """Test the export download functionality including browser downloads"""
    
    def setUp(self):
        """Set up test data"""
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create superuser for admin access
        self.superuser = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpass123'
        )
        
        # Create test comic
        self.comic = Comic.objects.create(
            title='Test Comic',
            description='A test comic for export testing'
        )
        
        # Create test season
        self.season = Season.objects.create(
            comic=self.comic,
            season_number=1,
            title='Test Season',
            description='A test season',
            release_date='2024-01-01'
        )
        
        # Create test character
        self.character = Character.objects.create(
            name='Test Character',
            personality='Test Personality',
            love_interest='Test Love Interest',
            bio='Test bio'
        )
        
        # Create test POV
        self.pov = POV.objects.create(
            title='Test POV',
            character=self.character,
            head_x=1.0,
            head_y=2.0,
            head_z=3.0,
            default_camera_target='1m 2m 3m'
        )
        
        # Create test episodes
        self.episode1 = Episode.objects.create(
            season=self.season,
            title='Episode 1',
            description='First episode',
            episode_number=1,
            is_published=True,
            summary='Episode 1 summary',
            summary_camera_orbit='0deg 75deg 3m',
            summary_field_of_view=60.0
        )
        
        self.episode2 = Episode.objects.create(
            season=self.season,
            title='Episode 2',
            description='Second episode',
            episode_number=2,
            is_published=False,  # Unpublished
            summary='Episode 2 summary',
            summary_camera_orbit='0deg 75deg 3m',
            summary_field_of_view=60.0
        )
        
        # Create test dialogues
        self.dialogue1 = Dialogue.objects.create(
            episode=self.episode1,
            pov=self.pov,
            text='Hello, this is dialogue 1',
            order=1,
            shot_type='mediumShot',
            camera_orbit='0deg 75deg 3m',
            camera_target='1m 2m 3m',
            field_of_view=45.0,
            zoom_speed=1.0,
            rotation='0deg 0deg 0deg'
        )
        
        self.dialogue2 = Dialogue.objects.create(
            episode=self.episode1,
            pov=self.pov,
            text='Hello, this is dialogue 2',
            order=2,
            shot_type='closeUp',
            camera_orbit='0deg 75deg 1m',
            camera_target='1m 2m 3m',
            field_of_view=30.0,
            zoom_speed=1.5,
            rotation='0deg 0deg 0deg'
        )
        
        self.dialogue3 = Dialogue.objects.create(
            episode=self.episode2,
            pov=self.pov,
            text='Unpublished episode dialogue',
            order=1,
            shot_type='wideShot',
            camera_orbit='0deg 75deg 5m',
            camera_target='1m 2m 3m',
            field_of_view=60.0,
            zoom_speed=2.0,
            rotation='0deg 0deg 0deg'
        )

    def test_download_export_view_comic_published_only(self):
        """Test the download export view for comics (published only)"""
        client = Client()
        client.login(username='admin', password='adminpass123')
        
        # Test comic export (published only)
        response = client.get(f'/admin/tilf/download-export/?type=comic&comic_ids={self.comic.id}&include_unpublished=false')
        
        # Should return a file download
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        self.assertIn('attachment', response['Content-Disposition'])
        self.assertIn('comic_export_', response['Content-Disposition'])
        self.assertIn('.json', response['Content-Disposition'])
        
        # Validate JSON content
        data = json.loads(response.content.decode('utf-8'))
        self.assertIn('export_info', data)
        self.assertIn('comics', data)
        self.assertEqual(data['export_info']['total_comics'], 1)
        self.assertFalse(data['export_info']['include_unpublished'])
        
        # Should only include published episodes
        episodes = data['comics'][0]['seasons'][0]['episodes']
        self.assertEqual(len(episodes), 1)
        self.assertEqual(episodes[0]['title'], 'Episode 1')
        self.assertTrue(episodes[0]['is_published'])

    def test_download_export_view_comic_all_episodes(self):
        """Test the download export view for comics (all episodes)"""
        client = Client()
        client.login(username='admin', password='adminpass123')
        
        # Test comic export (all episodes)
        response = client.get(f'/admin/tilf/download-export/?type=comic&comic_ids={self.comic.id}&include_unpublished=true')
        
        # Should return a file download
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        self.assertIn('attachment', response['Content-Disposition'])
        self.assertIn('comic_export_all_', response['Content-Disposition'])
        self.assertIn('.json', response['Content-Disposition'])
        
        # Validate JSON content
        data = json.loads(response.content.decode('utf-8'))
        self.assertIn('export_info', data)
        self.assertIn('comics', data)
        self.assertEqual(data['export_info']['total_comics'], 1)
        self.assertTrue(data['export_info']['include_unpublished'])
        
        # Should include both published and unpublished episodes
        episodes = data['comics'][0]['seasons'][0]['episodes']
        self.assertEqual(len(episodes), 2)
        
        episode_titles = [ep['title'] for ep in episodes]
        self.assertIn('Episode 1', episode_titles)
        self.assertIn('Episode 2', episode_titles)

    def test_download_export_view_episodes(self):
        """Test the download export view for episodes"""
        client = Client()
        client.login(username='admin', password='adminpass123')
        
        # Test episode export
        response = client.get(f'/admin/tilf/download-export/?type=episode&episode_ids={self.episode1.id}')
        
        # Should return a file download
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        self.assertIn('attachment', response['Content-Disposition'])
        self.assertIn('episode_export_', response['Content-Disposition'])
        self.assertIn('.json', response['Content-Disposition'])
        
        # Validate JSON content
        data = json.loads(response.content.decode('utf-8'))
        self.assertIn('export_info', data)
        self.assertIn('comics', data)
        self.assertEqual(data['export_info']['total_episodes'], 1)
        self.assertTrue(data['export_info']['include_unpublished'])
        
        # Should include the selected episode
        episodes = data['comics'][0]['seasons'][0]['episodes']
        self.assertEqual(len(episodes), 1)
        self.assertEqual(episodes[0]['title'], 'Episode 1')

    def test_download_export_view_multiple_comics(self):
        """Test the download export view with multiple comics"""
        # Create another comic
        comic2 = Comic.objects.create(
            title='Second Test Comic',
            description='Another test comic'
        )
        
        client = Client()
        client.login(username='admin', password='adminpass123')
        
        # Test export with multiple comics
        comic_ids = f"{self.comic.id},{comic2.id}"
        response = client.get(f'/admin/tilf/download-export/?type=comic&comic_ids={comic_ids}&include_unpublished=false')
        
        # Should return a file download
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        
        # Validate JSON content
        data = json.loads(response.content.decode('utf-8'))
        self.assertEqual(data['export_info']['total_comics'], 2)
        self.assertEqual(len(data['comics']), 2)

    def test_download_export_view_no_selection(self):
        """Test the download export view with no selection"""
        client = Client()
        client.login(username='admin', password='adminpass123')
        
        # Test with no comics selected
        response = client.get('/admin/tilf/download-export/?type=comic&comic_ids=')
        
        # Should return error
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content.decode('utf-8'))
        self.assertIn('error', data)
        self.assertIn('No comics selected', data['error'])

    def test_download_export_view_invalid_type(self):
        """Test the download export view with invalid type"""
        client = Client()
        client.login(username='admin', password='adminpass123')
        
        # Test with invalid export type
        response = client.get(f'/admin/tilf/download-export/?type=invalid&comic_ids={self.comic.id}')
        
        # Should return error
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content.decode('utf-8'))
        self.assertIn('error', data)
        self.assertIn('Invalid export type', data['error'])

    def test_download_export_view_unauthorized(self):
        """Test the download export view without authentication"""
        client = Client()
        
        # Test without login
        response = client.get(f'/admin/tilf/download-export/?type=comic&comic_ids={self.comic.id}')
        
        # Should redirect to login
        self.assertEqual(response.status_code, 302)

    def test_download_export_view_data_integrity(self):
        """Test that exported data maintains integrity"""
        client = Client()
        client.login(username='admin', password='adminpass123')
        
        response = client.get(f'/admin/tilf/download-export/?type=comic&comic_ids={self.comic.id}&include_unpublished=false')
        
        data = json.loads(response.content.decode('utf-8'))
        
        # Validate complete data structure
        comic_data = data['comics'][0]
        season_data = comic_data['seasons'][0]
        episode_data = season_data['episodes'][0]
        dialogue_data = episode_data['dialogues'][0]
        pov_data = dialogue_data['pov']
        character_data = pov_data['character']
        
        # Test all key fields are present and correct
        self.assertEqual(comic_data['title'], 'Test Comic')
        self.assertEqual(season_data['title'], 'Test Season')
        self.assertEqual(episode_data['title'], 'Episode 1')
        self.assertEqual(dialogue_data['text'], 'Hello, this is dialogue 1')
        self.assertEqual(pov_data['title'], 'Test POV')
        self.assertEqual(character_data['name'], 'Test Character')
        
        # Test camera settings
        self.assertEqual(dialogue_data['shot_type'], 'mediumShot')
        self.assertEqual(dialogue_data['camera_orbit'], '0deg 75deg 3m')
        self.assertEqual(dialogue_data['camera_target'], '1m 2m 3m')
        self.assertEqual(dialogue_data['field_of_view'], 45.0)
        self.assertEqual(dialogue_data['zoom_speed'], 1.0)
        
        # Test POV settings
        self.assertEqual(pov_data['head_x'], 1.0)
        self.assertEqual(pov_data['head_y'], 2.0)
        self.assertEqual(pov_data['head_z'], 3.0)
        self.assertEqual(pov_data['default_camera_target'], '1m 2m 3m')

    def test_download_export_view_file_naming(self):
        """Test that exported files have proper naming"""
        client = Client()
        client.login(username='admin', password='adminpass123')
        
        response = client.get(f'/admin/tilf/download-export/?type=comic&comic_ids={self.comic.id}&include_unpublished=false')
        
        # Check filename format
        content_disposition = response['Content-Disposition']
        self.assertIn('attachment', content_disposition)
        self.assertIn('comic_export_', content_disposition)
        self.assertIn('.json', content_disposition)
        
        # Check that filename contains timestamp
        self.assertRegex(content_disposition, r'comic_export_\d{8}_\d{6}\.json')

    def test_download_export_view_performance(self):
        """Test export performance with a larger dataset"""
        # Create additional test data
        for i in range(10):
            episode = Episode.objects.create(
                season=self.season,
                title=f'Episode {i+3}',
                description=f'Episode {i+3} description',
                episode_number=i+3,
                is_published=True
            )
            
            for j in range(5):  # 5 dialogues per episode
                Dialogue.objects.create(
                    episode=episode,
                    pov=self.pov,
                    text=f'Dialogue {j+1} in episode {i+3}',
                    order=j+1,
                    shot_type='mediumShot',
                    camera_orbit=f'{j*30}deg 75deg 3m',
                    camera_target='1m 2m 3m',
                    field_of_view=45.0
                )
        
        client = Client()
        client.login(username='admin', password='adminpass123')
        
        import time
        start_time = time.time()
        
        response = client.get(f'/admin/tilf/download-export/?type=comic&comic_ids={self.comic.id}&include_unpublished=false')
        
        end_time = time.time()
        export_time = end_time - start_time
        
        # Should complete within reasonable time (less than 5 seconds)
        self.assertLess(export_time, 5.0)
        
        # Should return valid JSON
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content.decode('utf-8'))
        self.assertIn('comics', data)
        
        # Should include all the test data
        total_episodes = sum(len(season['episodes']) for season in data['comics'][0]['seasons'])
        self.assertGreaterEqual(total_episodes, 10)  # At least 10 episodes

    def test_admin_action_redirects(self):
        """Test that admin actions redirect to download view"""
        client = Client()
        client.login(username='admin', password='adminpass123')
        
        # Test that the download view works with comic parameters
        response = client.get(f'/admin/tilf/download-export/?type=comic&comic_ids={self.comic.id}&include_unpublished=false')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        self.assertIn('attachment', response['Content-Disposition'])
        
        # Test that the download view works with episode parameters
        response = client.get(f'/admin/tilf/download-export/?type=episode&episode_ids={self.episode1.id}')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        self.assertIn('attachment', response['Content-Disposition'])
        
        # Test that the download view requires parameters (should return 400)
        response = client.get('/admin/tilf/download-export/')
        self.assertEqual(response.status_code, 400)

    def test_browser_download_simulation(self):
        """Test that the download view properly triggers browser download"""
        client = Client()
        client.login(username='admin', password='adminpass123')
        
        response = client.get(f'/admin/tilf/download-export/?type=comic&comic_ids={self.comic.id}&include_unpublished=false')
        
        # Check all required headers for browser download
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        
        # Check Content-Disposition header
        content_disposition = response['Content-Disposition']
        self.assertIn('attachment', content_disposition)
        self.assertIn('filename=', content_disposition)
        
        # Check that the response contains valid JSON
        data = json.loads(response.content.decode('utf-8'))
        self.assertIsInstance(data, dict)
        self.assertIn('export_info', data)
        self.assertIn('comics', data)
        
        # Verify the JSON structure is complete
        self.assertIsInstance(data['comics'], list)
        self.assertEqual(len(data['comics']), 1)
        
        comic_data = data['comics'][0]
        self.assertIn('title', comic_data)
        self.assertIn('seasons', comic_data)
        self.assertEqual(comic_data['title'], 'Test Comic')

    def test_management_command_vs_download_view_consistency(self):
        """Test that management command and download view produce consistent results"""
        # Export using management command
        with tempfile.TemporaryDirectory() as temp_dir:
            cmd_file = os.path.join(temp_dir, 'cmd_export.json')
            call_command('export_stories', output_file=cmd_file, verbosity=0)
            
            with open(cmd_file, 'r') as f:
                cmd_data = json.load(f)
        
        # Export using download view
        client = Client()
        client.login(username='admin', password='adminpass123')
        
        response = client.get(f'/admin/tilf/download-export/?type=comic&comic_ids={self.comic.id}&include_unpublished=false')
        download_data = json.loads(response.content.decode('utf-8'))
        
        # Both should have same structure
        self.assertEqual(cmd_data['export_info']['total_comics'], download_data['export_info']['total_comics'])
        self.assertEqual(len(cmd_data['comics']), len(download_data['comics']))
        
        # Both should only include published episodes by default
        cmd_episodes = cmd_data['comics'][0]['seasons'][0]['episodes']
        download_episodes = download_data['comics'][0]['seasons'][0]['episodes']
        
        self.assertEqual(len(cmd_episodes), 1)  # Only published episode 1
        self.assertEqual(len(download_episodes), 1)  # Only published episode 1
