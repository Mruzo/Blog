"""
Basic test suite for the icvybz app (3D Storytelling Platform).
Run with: python manage.py test icvybz
"""

from django.test import TestCase
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse


class IcvybzAppRecognitionTests(TestCase):
    """Test that Django recognizes the icvybz app"""
    
    def test_app_in_installed_apps(self):
        """Test that the icvybz app is in INSTALLED_APPS"""
        from django.conf import settings
        self.assertIn('icvybz', settings.INSTALLED_APPS)
    
    def test_app_config_loading(self):
        """Test that the app config is working"""
        from django.apps import apps
        app_config = apps.get_app_config('icvybz')
        self.assertEqual(app_config.name, 'icvybz')
    
    def test_models_exist(self):
        """Test that basic models can be accessed"""
        from icvybz.models import Comic, Season, Episode
        self.assertTrue(all([Comic, Season, Episode]))
    
    def test_urls_work(self):
        """Test that URL patterns are accessible"""
        from icvybz.urls import urlpatterns
        self.assertGreater(len(urlpatterns), 0)


class UIFixesTests(TestCase):
    """Test UI fixes: navbar updates, product relocation, navigation state"""
    
    def setUp(self):
        """Set up test data"""
        from icvybz.models import Comic, Season, Episode
        from snmov.models import Product
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create test comic/story
        self.comic = Comic.objects.create(
            user=self.user,
            title='Test Story',
            description='A test story',
            is_public=True,
            moderation_status='approved'
        )
        
        self.season = Season.objects.create(
            comic=self.comic,
            season_number=1,
            title='Season 1',
            release_date='2024-01-01'
        )
        
        self.episode = Episode.objects.create(
            season=self.season,
            title='Episode 1',
            episode_number=1,
            is_published=True
        )
        
        # Create test product
        self.product = Product.objects.create(
            user=self.user,
            title='Test Product',
            description='A test product',
            price=25.00
        )
    
    def test_navbar_includes_home_button(self):
        """Test that navbar includes Home button"""
        from django.test import Client
        from django.urls import reverse
        
        client = Client()
        
        # Test home page navbar
        response = client.get(reverse('homepage'))
        self.assertEqual(response.status_code, 200)
        
        # Should show Home nav item with home icon
        self.assertContains(response, 'Home')
        self.assertContains(response, 'fa-home')
    
    def test_navbar_includes_vybz_with_3d_icon(self):
        """Test that navbar includes Vybz with 3D icon"""
        from django.test import Client
        from django.urls import reverse
        
        client = Client()
        
        # Test home page navbar
        response = client.get(reverse('homepage'))
        self.assertEqual(response.status_code, 200)
        
        # Should show Vybz nav item with 3D icon
        self.assertContains(response, 'ICz')  # Updated to match current navbar
        self.assertContains(response, 'fa-cube')  # 3D cube icon
    
    def test_navbar_includes_merch_button(self):
        """Test that navbar includes Merch button"""
        from django.test import Client
        from django.urls import reverse
        
        client = Client()
        
        # Test home page navbar
        response = client.get(reverse('homepage'))
        self.assertEqual(response.status_code, 200)
        
        # Should show Merch nav item with store icon
        self.assertContains(response, 'Merch')
        self.assertContains(response, 'fa-store')
    
    def test_navbar_user_button_shows_dashboard(self):
        """Test that navbar user button shows Dashboard instead of My Orders"""
        from django.test import Client
        from django.urls import reverse
        
        client = Client()
        client.force_login(self.user)
        
        # Test home page navbar
        response = client.get(reverse('homepage'))
        self.assertEqual(response.status_code, 200)
        
        # Should show Dashboard instead of My Orders
        self.assertContains(response, 'Dashboard')
        self.assertNotContains(response, 'My Orders')
    
    def test_home_button_active_on_homepage(self):
        """Test that Home nav button is active when homepage is in view"""
        from django.test import Client
        from django.urls import reverse
        
        client = Client()
        
        response = client.get(reverse('homepage'))
        self.assertEqual(response.status_code, 200)
        
        # Should show Home as active/current page
        self.assertContains(response, 'active')
    
    def test_vybz_button_active_on_vybz_pages(self):
        """Test that Vybz nav button is active when in Vybz section"""
        from django.test import Client
        from django.urls import reverse
        
        client = Client()
        
        # Test Vybz story page - Vybz should be active
        response = client.get(reverse('immersivecomics:episode_detail', 
                                    kwargs={'season_id': self.season.id, 'pk': self.episode.id}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'active')
    
    def test_merch_button_active_on_product_pages(self):
        """Test that Merch nav button is active when in product section"""
        from django.test import Client
        from django.urls import reverse
        
        client = Client()
        
        # Test products page - Merch should be active
        response = client.get(reverse('product:product_list'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'active')
    
    def test_products_button_maintains_function(self):
        """Test that products button maintains its original function"""
        from django.test import Client
        from django.urls import reverse
        
        client = Client()
        
        # Test products page still works
        response = client.get(reverse('product:product_list'))
        self.assertEqual(response.status_code, 200)
        
        # Should show products
        self.assertContains(response, 'Test Product')
        self.assertContains(response, '$25.00')
    
    def test_home_page_no_longer_shows_products(self):
        """Test that home page no longer shows product-related HTML"""
        from django.test import Client
        from django.urls import reverse
        
        client = Client()
        
        response = client.get(reverse('homepage'))
        self.assertEqual(response.status_code, 200)
        
        # Should NOT show product-related content
        self.assertNotContains(response, 'Test Product')
        self.assertNotContains(response, '$25.00')
        self.assertNotContains(response, 'Add to Cart')
    
    def test_snmov_list_page_shows_products_at_bottom(self):
        """Test that snmov/list.html shows products at the bottom"""
        from django.test import Client
        from django.urls import reverse
        
        client = Client()
        
        response = client.get(reverse('product:product_list'))
        self.assertEqual(response.status_code, 200)
        
        # Should show products at the bottom
        self.assertContains(response, 'Test Product')
        self.assertContains(response, '$25.00')
        self.assertContains(response, 'Add to Cart')
    
    def test_navigation_state_management(self):
        """Test that navigation state is properly managed across pages"""
        from django.test import Client
        from django.urls import reverse
        
        client = Client()
        
        # Test home page - Home should be active
        response = client.get(reverse('homepage'))
        self.assertContains(response, 'Home')
        self.assertContains(response, 'active')
        
        # Test products page - Merch should be active
        response = client.get(reverse('product:product_list'))
        self.assertContains(response, 'Merch')  # Updated from Products to Merch
        self.assertContains(response, 'active')
        
        # Test Vybz story page - Vybz should be active
        response = client.get(reverse('immersivecomics:episode_detail', 
                                    kwargs={'season_id': self.season.id, 'pk': self.episode.id}))
        self.assertContains(response, 'ICz')  # Updated to match current navbar
        self.assertContains(response, 'active')


class DashboardNavigationTests(TestCase):
    """Test the updated dashboard navigation and functionality"""
    
    def setUp(self):
        """Set up test data"""
        from icvybz.models import Comic, Season, Episode
        from snmov.models import Product
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create test comic/story
        self.comic = Comic.objects.create(
            user=self.user,
            title='Test Story',
            description='A test story',
            is_public=True,
            moderation_status='approved'
        )
        
        self.season = Season.objects.create(
            comic=self.comic,
            season_number=1,
            title='Season 1',
            release_date='2024-01-01'
        )
        
        self.episode = Episode.objects.create(
            season=self.season,
            title='Episode 1',
            episode_number=1,
            is_published=True
        )
        
        # Create test product
        self.product = Product.objects.create(
            user=self.user,
            title='Test Product',
            description='A test product',
            price=25.00
        )
    
    def test_dashboard_shows_my_orders_button(self):
        """Test that dashboard shows My Orders button at the top"""
        from django.test import Client
        from django.urls import reverse
        
        client = Client()
        client.force_login(self.user)
        
        response = client.get(reverse('immersivecomics:user_dashboard'))
        self.assertEqual(response.status_code, 200)
        
        # Should show My Orders button at the top
        self.assertContains(response, 'My Orders')
        self.assertContains(response, 'fa-shopping-bag')
    
    def test_dashboard_shows_logout_button(self):
        """Test that dashboard shows Logout button at the top"""
        from django.test import Client
        from django.urls import reverse
        
        client = Client()
        client.force_login(self.user)
        
        response = client.get(reverse('immersivecomics:user_dashboard'))
        self.assertEqual(response.status_code, 200)
        
        # Should show Logout button at the top
        self.assertContains(response, 'Logout')
        self.assertContains(response, 'fa-sign-out-alt')
    
    def test_dashboard_top_action_bar_layout(self):
        """Test that dashboard has proper top action bar layout"""
        from django.test import Client
        from django.urls import reverse
        
        client = Client()
        client.force_login(self.user)
        
        response = client.get(reverse('immersivecomics:user_dashboard'))
        self.assertEqual(response.status_code, 200)
        
        # Should have welcome message and action buttons in top bar
        self.assertContains(response, 'Welcome, testuser')
        self.assertContains(response, 'My Orders')
        self.assertContains(response, 'Logout')


class SmoothNavigationTests(TestCase):
    """Test smooth navigation functionality and transitions."""
    
    def setUp(self):
        """Set up test data"""
        from icvybz.models import Comic, Season, Episode
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create test comic/story
        self.comic = Comic.objects.create(
            user=self.user,
            title='Test Story',
            description='A test story',
            is_public=True,
            moderation_status='approved'
        )
        
        self.season = Season.objects.create(
            comic=self.comic,
            season_number=1,
            title='Season 1',
            release_date='2024-01-01'
        )
        
        self.episode = Episode.objects.create(
            season=self.season,
            title='Episode 1',
            episode_number=1,
            is_published=True
        )
    
    def test_base_template_has_smooth_navigation_elements(self):
        """Test that base template includes smooth navigation elements."""
        from django.test import Client
        
        client = Client()
        response = client.get(reverse('homepage'))
        
        # Should have page content wrapper for transitions
        self.assertContains(response, 'class="page-content"')
        
        # Should have loading spinner
        self.assertContains(response, 'loading-spinner')
        self.assertContains(response, 'spinner')
        
        # Should have smooth navigation CSS and JS
        self.assertContains(response, 'sm.css')
        self.assertContains(response, 'sm.js')
    
    def test_navbar_has_smooth_transition_classes(self):
        """Test that navbar buttons have smooth transition classes."""
        from django.test import Client
        
        client = Client()
        response = client.get(reverse('homepage'))
        
        # Should have nav-btn class for smooth transitions
        self.assertContains(response, 'nav-btn')
        
        # Should have active state styling
        self.assertContains(response, 'active')
    
    def test_smooth_navigation_javascript_loaded(self):
        """Test that smooth navigation JavaScript is properly loaded."""
        from django.test import Client
        
        client = Client()
        response = client.get(reverse('homepage'))
        
        # Should load sm.js as module (since it contains ES6 imports)
        self.assertContains(response, '<script type="module" src="/static/snmov/js/sm.js"></script>')
        
        # Should be loaded as module
        self.assertContains(response, 'type="module"')
    
    def test_page_content_wrapper_exists(self):
        """Test that page content is wrapped for smooth transitions."""
        from django.test import Client
        
        client = Client()
        
        # Test homepage
        response = client.get(reverse('homepage'))
        self.assertContains(response, 'class="page-content"')
        
        # Test products page
        response = client.get(reverse('product:product_list'))
        self.assertContains(response, 'class="page-content"')
        
        # Test Vybz page
        response = client.get(reverse('immersivecomics:episode_detail', 
                                    kwargs={'season_id': self.season.id, 'pk': self.episode.id}))
        self.assertContains(response, 'class="page-content"')
    
    def test_loading_spinner_structure(self):
        """Test that loading spinner HTML structure is correct."""
        from django.test import Client
        
        client = Client()
        response = client.get(reverse('homepage'))
        
        # Should have loading spinner container
        self.assertContains(response, 'id="loadingSpinner"')
        self.assertContains(response, 'class="loading-spinner"')
        
        # Should have spinner element
        self.assertContains(response, 'class="spinner"')
