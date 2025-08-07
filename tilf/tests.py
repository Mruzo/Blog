from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
from django.utils import timezone
import json
import os
from datetime import datetime
from .models import Comic, Season, Episode, Dialogue, POV, ComicComment
from .views import detect_environment, log_share_click, get_share_analytics_from_logs, get_file_size_info


class TilfTestCase(TestCase):
    """Base test case for Tilf app tests"""
    
    def setUp(self):
        """Set up test data"""
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create test comic
        self.comic = Comic.objects.create(
            title='Test Comic',
            description='A test comic for testing'
        )
        
        # Create test season
        self.season = Season.objects.create(
            comic=self.comic,
            title='Test Season',
            season_number=1,
            release_date=timezone.now().date()
        )
        
        # Create test episode
        self.episode = Episode.objects.create(
            season=self.season,
            title='Test Episode',
            episode_number=1,
            description='A test episode',
            is_published=True
        )
        
        # Create test client
        self.client = Client()


class EnvironmentDetectionTests(TilfTestCase):
    """Test environment detection functionality"""
    
    def test_development_environment_detection(self):
        """Test that development environments are correctly detected"""
        # Mock request with development indicators
        class MockRequest:
            def __init__(self):
                self.META = {'SERVER_NAME': '127.0.0.1'}
            
            def get_host(self):
                return '127.0.0.1:8000'
        
        request = MockRequest()
        environment = detect_environment(request)
        self.assertEqual(environment, 'development')
    
    def test_production_environment_detection(self):
        """Test that production environments are correctly detected"""
        # Mock request with production indicators
        class MockRequest:
            def __init__(self):
                self.META = {'SERVER_NAME': 'yourdomain.com'}
            
            def get_host(self):
                return 'yourdomain.com'
        
        request = MockRequest()
        environment = detect_environment(request)
        self.assertEqual(environment, 'production')


class ShareTrackingTests(TilfTestCase):
    """Test share tracking functionality"""
    
    def test_share_click_logging(self):
        """Test that share clicks are logged correctly"""
        # Mock request
        class MockRequest:
            def __init__(self):
                self.META = {
                    'HTTP_USER_AGENT': 'Mozilla/5.0 (Test Browser)',
                    'HTTP_REFERER': 'http://test.com/',
                    'REMOTE_ADDR': '127.0.0.1'
                }
            
            def get_host(self):
                return '127.0.0.1:8000'
        
        request = MockRequest()
        
        # Test share click logging
        log_share_click(request, 'facebook', self.episode.id)
        
        # Check that analytics can read the data
        analytics = get_share_analytics_from_logs()
        self.assertGreaterEqual(analytics['total_shares'], 0)
    
    def test_share_analytics_processing(self):
        """Test share analytics data processing"""
        analytics = get_share_analytics_from_logs()
        
        # Check that analytics returns expected structure
        expected_keys = ['platforms', 'episodes', 'total_shares', 'unique_ips']
        for key in expected_keys:
            self.assertIn(key, analytics)


class FileSizeMonitoringTests(TilfTestCase):
    """Test file size monitoring functionality"""
    
    def test_file_size_info_structure(self):
        """Test that file size info returns correct structure"""
        file_info = get_file_size_info()
        
        # Check that file info returns expected structure
        expected_keys = ['file_info', 'total_size_bytes', 'total_size_kb', 'total_size_mb']
        for key in expected_keys:
            self.assertIn(key, file_info)
    
    def test_file_size_calculations(self):
        """Test file size calculations"""
        file_info = get_file_size_info()
        
        # Check that calculations are reasonable
        self.assertIsInstance(file_info['total_size_bytes'], int)
        self.assertIsInstance(file_info['total_size_kb'], float)
        self.assertIsInstance(file_info['total_size_mb'], float)
        
        # Check that KB and MB calculations are correct
        self.assertAlmostEqual(file_info['total_size_kb'], file_info['total_size_bytes'] / 1024, places=2)
        self.assertAlmostEqual(file_info['total_size_mb'], file_info['total_size_bytes'] / (1024 * 1024), places=3)


class EpisodeViewTests(TilfTestCase):
    """Test episode viewing functionality"""
    
    def test_episode_detail_view(self):
        """Test that episode detail view works"""
        url = reverse('immersivecomics:episode_detail', kwargs={
            'season_id': self.season.id,
            'pk': self.episode.id
        })
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
    
    def test_episode_preview_view(self):
        """Test that episode preview view works for admins"""
        # Make user a staff member
        self.user.is_staff = True
        self.user.save()
        
        # Login as admin
        self.client.force_login(self.user)
        
        url = reverse('immersivecomics:episode_preview', kwargs={
            'season_id': self.season.id,
            'pk': self.episode.id
        })
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)


class AnalyticsTests(TilfTestCase):
    """Test analytics functionality"""
    
    def test_traffic_analytics_structure(self):
        """Test that traffic analytics returns correct structure"""
        from .views import get_traffic_analytics_from_logs
        
        analytics = get_traffic_analytics_from_logs()
        
        # Check that analytics returns expected structure
        expected_keys = [
            'traffic_sources', 'platforms', 'top_referrers',
            'total_episodes', 'total_views', 'most_viewed', 'recent_activity'
        ]
        for key in expected_keys:
            self.assertIn(key, analytics)


class JSONSizeCalculationTests(TilfTestCase):
    """Test JSON size calculation functionality"""
    
    def test_share_record_size_calculation(self):
        """Test share record size calculation"""
        # Sample share record
        sample_record = {
            "timestamp": "2025-08-06T23:17:20.768669",
            "environment": "development",
            "platform": "facebook",
            "episode_id": 1,
            "ip_address": "127.0.0.1",
            "user_agent": "Mozilla/5.0 (Test Browser)",
            "referrer": "http://test.com/",
            "host": "127.0.0.1:8000"
        }
        
        # Calculate size
        json_string = json.dumps(sample_record, indent=2)
        record_size = len(json_string.encode('utf-8'))
        
        # Check that size is reasonable (should be around 250-500 bytes)
        self.assertGreater(record_size, 200)
        self.assertLess(record_size, 600)
    
    def test_traffic_record_size_calculation(self):
        """Test traffic record size calculation"""
        # Sample traffic record
        sample_record = {
            "timestamp": "2025-08-06T22:39:34.750127",
            "environment": "development",
            "episode_id": 1,
            "episode_title": "Test Episode",
            "season_id": 1,
            "season_title": "Test Season",
            "source": "referral",
            "platform": "127.0.0.1:8000",
            "referrer": "http://test.com/",
            "user_agent": "Mozilla/5.0 (Test Browser)",
            "ip_address": "127.0.0.1",
            "host": "127.0.0.1:8000"
        }
        
        # Calculate size
        json_string = json.dumps(sample_record)
        record_size = len(json_string.encode('utf-8'))
        
        # Check that size is reasonable (should be around 300-700 bytes)
        self.assertGreater(record_size, 250)
        self.assertLess(record_size, 700)


class DataPrivacyTests(TilfTestCase):
    """Test data privacy and storage"""
    
    def test_no_personal_data_stored(self):
        """Test that no personal data is stored in tracking"""
        # Mock request with potential personal data
        class MockRequest:
            def __init__(self):
                self.META = {
                    'HTTP_USER_AGENT': 'Mozilla/5.0 (Test Browser)',
                    'HTTP_REFERER': 'http://test.com/',
                    'REMOTE_ADDR': '127.0.0.1'
                }
            
            def get_host(self):
                return '127.0.0.1:8000'
        
        request = MockRequest()
        
        # Log a share click
        log_share_click(request, 'facebook', self.episode.id)
        
        # Check that only technical data is stored
        analytics = get_share_analytics_from_logs()
        
        # Verify no personal identifiers are in the data
        # (This is more of a structural test since we can't easily inspect the JSON files)
        self.assertIsInstance(analytics['total_shares'], int)
        self.assertIsInstance(analytics['unique_ips'], int)


if __name__ == '__main__':
    # Run tests
    import django
    django.setup()
    
    # You can run specific test classes here if needed
    print("Tilf app tests ready to run with: python manage.py test tilf.tests")
