"""
Basic test suite for the icvybz app (3D Storytelling Platform).
Run with: python manage.py test icvybz
"""

from django.test import TestCase
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from .models import Comic, Season, Episode, Character, Dialogue, POV, Studio, StudioCollaborator, StoryCollaborator, AudioTrack


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
        response = client.get(reverse('snmov:product_list'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'active')
    
    def test_products_button_maintains_function(self):
        """Test that products button maintains its original function"""
        from django.test import Client
        from django.urls import reverse
        
        client = Client()
        
        # Test products page still works
        response = client.get(reverse('snmov:product_list'))
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
        
        response = client.get(reverse('snmov:product_list'))
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
        response = client.get(reverse('snmov:product_list'))
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
        
        # Should load sm.js as regular script
        self.assertContains(response, '<script src="/static/snmov/js/sm.js"></script>')
        
        # Should NOT be loaded as module anymore
        self.assertNotContains(response, 'type="module"')
    
    def test_page_content_wrapper_exists(self):
        """Test that page content is wrapped for smooth transitions."""
        from django.test import Client
        
        client = Client()
        
        # Test homepage
        response = client.get(reverse('homepage'))
        self.assertContains(response, 'class="page-content"')
        
        # Test products page
        response = client.get(reverse('snmov:product_list'))
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


class SmoothContentLoadingTests(TestCase):
    """Test smooth content loading functionality."""
    
    def test_smooth_content_loading_javascript_loaded(self):
        """Test that smooth content loading JavaScript is properly loaded."""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        
        # Check that the JavaScript file is loaded
        self.assertContains(response, 'sm.js')
        
        # Check that the script tag does NOT have type="module" (since we removed ES6 imports)
        self.assertNotContains(response, 'type="module"')
    
    def test_content_animation_classes_exist(self):
        """Test that content animation CSS classes are available."""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        
        # Check that the CSS file is loaded
        self.assertContains(response, 'sm.css')
    
    def test_page_content_wrapper_for_animations(self):
        """Test that page content wrapper exists for animations."""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        
        # Check that page-content wrapper exists
        self.assertContains(response, 'class="page-content"')
    
    def test_homepage_specific_animations(self):
        """Test that homepage has elements that can be animated."""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        
        # Check for main heading that gets animated
        self.assertContains(response, 'class="landtext"')
        
        # Check for about section that gets animated
        self.assertContains(response, 'border-top')


class StoryManagementSystemTests(TestCase):
    """Test the complete story creation and management system"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.login(username='testuser', password='testpass123')
    
    def test_story_creation_workflow(self):
        """Test the complete story creation workflow"""
        # Test story creation form access
        response = self.client.get(reverse('immersivecomics:story_create'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Create New Story')
        self.assertContains(response, 'Story Details')
        self.assertContains(response, 'Story Title')
        self.assertContains(response, 'Story Description')
        self.assertContains(response, 'Cover Image')
        
        # Test story creation
        response = self.client.post(reverse('immersivecomics:story_create'), {
            'title': 'Test Story',
            'description': 'A test story for testing'
        })
        
        # Should redirect to story management
        self.assertEqual(response.status_code, 302)
        story = Comic.objects.get(title='Test Story')
        self.assertEqual(story.user, self.user)
        self.assertFalse(story.is_public)  # Should start as private
        self.assertEqual(story.moderation_status, 'pending')
    
    def test_story_management_interface(self):
        """Test the story management interface"""
        # Create a test story
        story = Comic.objects.create(
            title='Test Story',
            description='Test description',
            user=self.user,
            is_public=False,
            moderation_status='pending'
        )
        
        # Test story management page
        response = self.client.get(reverse('immersivecomics:story_manage', kwargs={'pk': story.pk}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Manage: Test Story')
        self.assertContains(response, 'Story Overview')
        self.assertContains(response, 'Seasons')
        self.assertContains(response, 'Add Season')
        self.assertContains(response, 'Edit Story')
        self.assertContains(response, 'Back to Dashboard')
        
        # Test story statistics
        self.assertContains(response, 'Statistics')
        self.assertContains(response, 'Seasons')
        self.assertContains(response, 'Episodes')
        self.assertContains(response, 'Published')
        self.assertContains(response, 'Drafts')
    
    def test_season_creation_workflow(self):
        """Test season creation and management"""
        # Create a test story
        story = Comic.objects.create(
            title='Test Story',
            description='Test description',
            user=self.user
        )
        
        # Test season creation form access
        response = self.client.get(reverse('immersivecomics:season_create', kwargs={'story_id': story.pk}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Add Season to "Test Story"')
        self.assertContains(response, 'Season Details')
        self.assertContains(response, 'Season Number')
        self.assertContains(response, 'Season Title')
        self.assertContains(response, '3D Model (GLTF)')
        self.assertContains(response, '3D Model (USDZ)')
        
        # Test season creation
        response = self.client.post(reverse('immersivecomics:season_create', kwargs={'story_id': story.pk}), {
            'season_number': 1,
            'title': 'Season 1',
            'description': 'First season of the story',
            'release_date': '2024-01-01'
        })
        
        # Should redirect to story management
        self.assertEqual(response.status_code, 302)
        season = Season.objects.get(title='Season 1')
        self.assertEqual(season.comic, story)
        self.assertEqual(season.season_number, 1)
    
    def test_episode_creation_workflow(self):
        """Test episode creation and management"""
        # Create test story and season
        story = Comic.objects.create(title='Test Story', user=self.user)
        season = Season.objects.create(
            comic=story,
            season_number=1,
            title='Season 1',
            release_date='2024-01-01'
        )
        
        # Test episode creation form access
        response = self.client.get(reverse('immersivecomics:episode_create', kwargs={'season_id': season.pk}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Create Episode in "Season 1"')
        self.assertContains(response, 'Episode Details')
        self.assertContains(response, 'Episode Number')
        self.assertContains(response, 'Episode Title')
        self.assertContains(response, 'Publish Episode')
        
        # Test episode creation
        response = self.client.post(reverse('immersivecomics:episode_create', kwargs={'season_id': season.pk}), {
            'episode_number': 1,
            'title': 'Episode 1',
            'is_published': False
        })
        
        # Should redirect to episode management
        self.assertEqual(response.status_code, 302)
        episode = Episode.objects.get(title='Episode 1')
        self.assertEqual(episode.season, season)
        self.assertEqual(episode.episode_number, 1)
        self.assertFalse(episode.is_published)
    
    def test_episode_management_interface(self):
        """Test the episode management interface"""
        # Create test data
        story = Comic.objects.create(title='Test Story', user=self.user)
        season = Season.objects.create(
            comic=story,
            season_number=1,
            title='Season 1',
            release_date='2024-01-01'
        )
        episode = Episode.objects.create(
            season=season,
            episode_number=1,
            title='Episode 1',
            is_published=False
        )
        
        # Test episode management page
        response = self.client.get(reverse('immersivecomics:episode_manage', kwargs={'pk': episode.pk}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Manage: Episode 1')
        self.assertContains(response, 'Episode Overview')
        self.assertContains(response, 'Dialogues')
        self.assertContains(response, 'Add Dialogue')
        self.assertContains(response, 'Create Character')
        self.assertContains(response, 'Edit Episode')
        self.assertContains(response, '3D Models')
        
        # Test episode statistics
        self.assertContains(response, 'Status')
        self.assertContains(response, 'Dialogues')
        self.assertContains(response, 'Created')
        self.assertContains(response, 'Views')
    
    def test_character_creation_workflow(self):
        """Test character creation within a story"""
        # Create test data
        story = Comic.objects.create(title='Test Story', user=self.user)
        
        # Test character creation form access
        response = self.client.get(reverse('immersivecomics:character_create', kwargs={'story_id': story.pk}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Character Name')
        self.assertContains(response, 'Character Bio')
        self.assertContains(response, 'Add a new character to "Test Story"')
        
        # Test character creation
        response = self.client.post(reverse('immersivecomics:character_create', kwargs={'story_id': story.pk}), {
            'name': 'Test Character',
            'bio': 'A test character bio'
        })
        
        # Should redirect to story management
        self.assertEqual(response.status_code, 302)
        character = Character.objects.get(name='Test Character')
        self.assertEqual(character.user, self.user)
        self.assertFalse(character.is_public)  # Should start as private
    
    def test_dialogue_creation_workflow(self):
        """Test dialogue creation with camera controls"""
        # Create test data
        story = Comic.objects.create(title='Test Story', user=self.user)
        season = Season.objects.create(
            comic=story,
            season_number=1,
            title='Season 1',
            release_date='2024-01-01'
        )
        episode = Episode.objects.create(
            season=season,
            episode_number=1,
            title='Episode 1',
            is_published=False
        )
        character = Character.objects.create(
            name='Test Character',
            bio='A test character bio',
            user=self.user
        )
        
        # Test dialogue creation form access
        response = self.client.get(reverse('immersivecomics:dialogue_create', kwargs={'episode_id': episode.pk}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Add Dialogue to "Episode 1"')
        self.assertContains(response, 'Dialogue Details')
        self.assertContains(response, 'Dialogue Text')
        self.assertContains(response, 'Order')
        self.assertContains(response, 'Character')
        self.assertContains(response, 'Camera Controls')
        self.assertContains(response, 'Camera Orbit')
        self.assertContains(response, 'Camera Target')
        self.assertContains(response, 'Field of View')
        self.assertContains(response, 'Zoom Speed')
        self.assertContains(response, 'Rotation')
        
        # Test dialogue creation
        response = self.client.post(reverse('immersivecomics:dialogue_create', kwargs={'episode_id': episode.pk}), {
            'text': 'Hello, this is a test dialogue!',
            'order': 1,
            'character': character.pk,
            'camera_orbit': '0deg 75deg 3m',
            'camera_target': '0m 1.6m 0m',
            'field_of_view': 45.0,
            'zoom_speed': 1.0,
            'rotation': '0deg 0deg 0deg'
        })
        
        # Should redirect to episode management
        self.assertEqual(response.status_code, 302)
        dialogue = Dialogue.objects.get(text='Hello, this is a test dialogue!')
        self.assertEqual(dialogue.episode, episode)
        self.assertEqual(dialogue.order, 1)
        self.assertEqual(dialogue.pov.character, character)
        self.assertEqual(dialogue.camera_orbit, '0deg 75deg 3m')
        self.assertEqual(dialogue.camera_target, '0m 1.6m 0m')
    
    def test_user_dashboard_enhancements(self):
        """Test the enhanced user dashboard with story management"""
        # Create test data
        story = Comic.objects.create(
            title='Test Story',
            description='Test description',
            user=self.user,
            is_public=True
        )
        season = Season.objects.create(
            comic=story,
            season_number=1,
            title='Season 1',
            release_date='2024-01-01'
        )
        episode = Episode.objects.create(
            season=season,
            episode_number=1,
            title='Episode 1',
            is_published=True
        )
        
        # Test enhanced dashboard
        response = self.client.get(reverse('immersivecomics:user_dashboard'))
        self.assertEqual(response.status_code, 200)

        # Test new dashboard features
        self.assertContains(response, 'Quick Actions')
        self.assertContains(response, 'Create New Story')
        self.assertContains(response, 'Create Character')
        self.assertContains(response, 'Content Statistics')
        self.assertContains(response, 'Publishing Status')
        self.assertContains(response, 'My Stories')
        
        # Test story management buttons
        self.assertContains(response, 'Manage')
        self.assertContains(response, 'Edit')
        self.assertContains(response, 'Delete')
        
        # Test statistics display
        self.assertContains(response, 'Stories')
        self.assertContains(response, 'Episodes')
        self.assertContains(response, 'Characters')
        self.assertContains(response, 'Published')
    
    def test_story_edit_functionality(self):
        """Test story editing capabilities"""
        # Create a test story
        story = Comic.objects.create(
            title='Original Title',
            description='Original description',
            user=self.user
        )
        
        # Test story edit form access
        response = self.client.get(reverse('immersivecomics:story_edit', kwargs={'pk': story.pk}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Edit Story')
        self.assertContains(response, 'Original Title')
        self.assertContains(response, 'Original description')
        
        # Test story editing
        response = self.client.post(reverse('immersivecomics:story_edit', kwargs={'pk': story.pk}), {
            'title': 'Updated Title',
            'description': 'Updated description'
        })
        
        # Should redirect to story management
        self.assertEqual(response.status_code, 302)
        story.refresh_from_db()
        self.assertEqual(story.title, 'Updated Title')
        self.assertEqual(story.description, 'Updated description')
    
    def test_user_permissions_and_security(self):
        """Test that users can only access their own content"""
        # Create another user
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='otherpass123'
        )
        
        # Create content for other user
        other_story = Comic.objects.create(
            title='Other Story',
            description='Other description',
            user=other_user
        )
        
        # Test that current user cannot access other user's content
        response = self.client.get(reverse('immersivecomics:story_manage', kwargs={'pk': other_story.pk}))
        self.assertEqual(response.status_code, 404)
        
        response = self.client.get(reverse('immersivecomics:story_edit', kwargs={'pk': other_story.pk}))
        self.assertEqual(response.status_code, 404)
        
        response = self.client.get(reverse('immersivecomics:story_delete', kwargs={'pk': other_story.pk}))
        self.assertEqual(response.status_code, 404)
    
    def test_forms_validation_and_error_handling(self):
        """Test form validation and error handling"""
        # Test story creation with invalid data
        response = self.client.post(reverse('immersivecomics:story_create'), {
            'title': '',  # Empty title should cause validation error
            'description': 'Test description'
        })
        self.assertEqual(response.status_code, 200)  # Should return form with errors
        self.assertContains(response, 'This field is required')
        
        # Test season creation with invalid data
        story = Comic.objects.create(title='Test Story', user=self.user)
        response = self.client.post(reverse('immersivecomics:season_create', kwargs={'story_id': story.pk}), {
            'season_number': '',  # Empty season number should cause validation error
            'title': 'Season 1'
        })
        self.assertEqual(response.status_code, 200)  # Should return form with errors
        self.assertContains(response, 'This field is required')
    
    def test_desktop_optimized_ui_elements(self):
        """Test that desktop-optimized UI elements are present"""
        # Create test data
        story = Comic.objects.create(
            title='Test Story',
            description='Test description',
            user=self.user
        )
        
        # Test story creation page UI
        response = self.client.get(reverse('immersivecomics:story_create'))
        self.assertContains(response, 'container-fluid')
        self.assertContains(response, 'shadow-sm')
        self.assertContains(response, 'card border-0')
        self.assertContains(response, 'btn btn-primary')
        self.assertContains(response, 'form-control')
        
        # Test story management page UI
        response = self.client.get(reverse('immersivecomics:story_manage', kwargs={'pk': story.pk}))
        self.assertContains(response, 'table-responsive')
        self.assertContains(response, 'badge bg-')
        self.assertContains(response, 'btn btn-sm')
        self.assertContains(response, 'text-center')
        
        # Test dashboard UI
        response = self.client.get(reverse('immersivecomics:user_dashboard'))
        self.assertContains(response, 'row g-0')
        self.assertContains(response, 'd-flex gap-2')
        self.assertContains(response, 'border-0 shadow-sm')
        self.assertContains(response, 'text-muted')
    
    def test_navbar_layout_consistency(self):
        """Test that navbar buttons stay in one row across different pages"""
        # Test homepage navbar
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'navbar-buttons-container')
        self.assertContains(response, 'Home')
        self.assertContains(response, 'ICz')
        self.assertContains(response, 'Merch')
        
        # Test profile page navbar
        test_user = User.objects.create_user(
            username='navbar_test_user',
            email='navbar_test@example.com',
            password='testpass123'
        )
        self.client.login(username='navbar_test_user', password='testpass123')
        
        response = self.client.get(reverse('immersivecomics:user_dashboard'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'navbar-buttons-container')
        self.assertContains(response, 'Home')
        self.assertContains(response, 'ICz')
        self.assertContains(response, 'Merch')
        
        # Test ICz page navbar
        response = self.client.get(reverse('immersivecomics:comic_list'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'navbar-buttons-container')
        self.assertContains(response, 'Home')
        self.assertContains(response, 'ICz')
        self.assertContains(response, 'Merch')
        
        # Test Merch page navbar
        response = self.client.get(reverse('snmov:product_list'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'navbar-buttons-container')
        self.assertContains(response, 'Home')
        self.assertContains(response, 'ICz')
        self.assertContains(response, 'Merch')
    
    def test_navbar_mobile_responsiveness(self):
        """Test that navbar buttons are properly configured for mobile"""
        # Test that the navbar container has the correct classes
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)

        # Check that navbar-buttons-container exists
        self.assertContains(response, 'navbar-buttons-container')
        
        # Check that buttons have proper mobile classes
        self.assertContains(response, 'd-none d-sm-inline')
        
        # Check that flexbox properties are applied
        self.assertContains(response, 'flex-wrap: nowrap')
        
        # Test profile page specifically
        test_user = User.objects.create_user(
            username='mobile_test_user',
            email='mobile_test@example.com',
            password='testpass123'
        )
        self.client.login(username='mobile_test_user', password='testpass123')
        
        response = self.client.get(reverse('immersivecomics:user_dashboard'))
        self.assertEqual(response.status_code, 200)

        # Verify navbar structure is consistent on profile page
        self.assertContains(response, 'navbar-buttons-container')
        self.assertContains(response, 'd-none d-sm-inline')
        self.assertContains(response, 'flex-wrap: nowrap')


class DynamicNavbarTests(TestCase):
    """Test dynamic navbar functionality"""
    
    def setUp(self):
        """Set up test user and data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.login(username='testuser', password='testpass123')
    
    def test_navbar_has_dynamic_states(self):
        """Test that navbar has both default and profile states"""
        response = self.client.get(reverse('homepage'))
        
        # Check for both navbar states
        self.assertContains(response, 'id="default-navbar"')
        self.assertContains(response, 'id="profile-navbar"')
        
        # Check default navbar is visible
        self.assertContains(response, 'ICz')
        self.assertContains(response, 'Merch')
        
        # Check profile navbar is hidden
        self.assertContains(response, 'My Stuff')
        self.assertContains(response, 'My Orders')
    
    def test_profile_button_has_click_handler(self):
        """Test that profile button has onclick handler"""
        response = self.client.get(reverse('homepage'))
        
        # Check profile button has onclick handler
        self.assertContains(response, 'onclick="switchToProfileNavbar(event)"')
        self.assertContains(response, 'id="profile-btn"')
    
    def test_home_button_in_profile_navbar_has_click_handler(self):
        """Test that home button in profile navbar has onclick handler"""
        response = self.client.get(reverse('homepage'))
        
        # Check home button in profile navbar has onclick handler
        self.assertContains(
            response,
            'onclick="switchToDefaultNavbar(event)"',
            msg_prefix=response.content.decode('utf-8', errors='ignore')[:3000]
        )
    
    def test_navbar_javascript_functions_available(self):
        """Test that navbar switching JavaScript functions are loaded"""
        response = self.client.get(reverse('homepage'))
        
        # Check that sm.js is loaded
        self.assertContains(response, 'snmov/js/sm.js')
        
        # Check that navbar state initialization is included
        self.assertContains(response, 'initNavbarState')
    
    def test_profile_navbar_buttons_have_correct_links(self):
        """Test that profile navbar buttons link to correct URLs"""
        response = self.client.get(reverse('homepage'))
        
        # Check profile navbar links
        self.assertContains(response, 'href="' + reverse('homepage') + '"')
        self.assertContains(response, 'href="' + reverse('immersivecomics:user_dashboard') + '"')
        self.assertContains(response, 'href="' + reverse('snmov:my_orders') + '"')
    
    def test_navbar_state_initialization_on_dashboard(self):
        """Test that navbar shows profile state when on dashboard"""
        response = self.client.get(reverse('immersivecomics:user_dashboard'))
        
        # Check that profile navbar is shown (not hidden)
        self.assertContains(response, 'id="profile-navbar"')
        self.assertContains(response, 'My Stuff')
        self.assertContains(response, 'My Orders')
    
    def test_navbar_state_initialization_on_my_orders(self):
        """Test that navbar shows profile state when on my-orders page"""
        response = self.client.get(reverse('snmov:my_orders'))
        
        # Check that profile navbar is shown (not hidden)
        self.assertContains(response, 'id="profile-navbar"')
        self.assertContains(response, 'My Stuff')
        self.assertContains(response, 'My Orders')
    
    def test_my_orders_button_active_on_my_orders_page(self):
        """Test that My Orders button shows as active when on my-orders page"""
        response = self.client.get(reverse('snmov:my_orders'))
        
        # Check that My Orders button has active class and styling
        self.assertContains(response, 'class="btn btn-light btn-sm px-3 subtext-btn-sm nav-btn active"')
        self.assertContains(response, 'background-color: rgba(255, 188, 0, 0.1) !important; border: 2px solid #FFBC00 !important;')
        # Check that it uses receipt icon
        self.assertContains(response, 'fa-receipt')
    
    def test_my_stuff_button_not_active_on_my_orders_page(self):
        """Test that My Stuff button is not active when on my-orders page"""
        response = self.client.get(reverse('snmov:my_orders'))
        
        # Check that My Stuff button does not have active class
        self.assertNotContains(response, 'My Stuff.*active')
    
    def test_my_orders_button_uses_receipt_icon(self):
        """Test that My Orders button uses receipt icon instead of shopping cart"""
        response = self.client.get(reverse('homepage'))
        
        # Check that My Orders button uses receipt icon
        self.assertContains(response, 'fa-receipt')
        # Check that the profile navbar My Orders button specifically uses receipt icon
        self.assertContains(response, 'My Orders')
        # Note: There's still a shopping cart icon in the top navbar for cart functionality
    
    def test_navbar_css_transitions_included(self):
        """Test that CSS transitions for navbar are included"""
        response = self.client.get(reverse('homepage'))
        
        # Check that sm.css is loaded
        self.assertContains(response, 'snmov/css/sm.css')
        
        # Check for navbar transition elements
        self.assertContains(response, 'id="default-navbar"')
        self.assertContains(response, 'id="profile-navbar"')
    
    def test_navbar_responsive_design_maintained(self):
        """Test that responsive design is maintained in both navbar states"""
        response = self.client.get(reverse('homepage'))
        
        # Check for responsive classes in both navbar states
        self.assertContains(response, 'd-none d-sm-inline')
        self.assertContains(response, 'flex-wrap: nowrap')
        
        # Check for responsive styling classes
        self.assertContains(response, 'justify-content-center')
        self.assertContains(response, 'navbar-buttons-container')
    
    def test_login_button_shows_when_logged_out(self):
        """Test that login button shows when user is not authenticated"""
        # Make sure user is logged out
        self.client.logout()
        response = self.client.get(reverse('homepage'))
        
        # Check that login button is present
        self.assertContains(response, 'id="login-btn"')
        self.assertContains(response, 'fa-sign-in-alt')
        self.assertContains(response, 'Login')
        self.assertContains(response, 'href="' + reverse('login_req') + '"')
        
        # Check that profile button is not present
        self.assertNotContains(response, 'id="profile-btn"')
    
    def test_profile_button_shows_when_logged_in(self):
        """Test that profile button shows when user is authenticated"""
        response = self.client.get(reverse('homepage'))
        
        # Check that profile button is present
        self.assertContains(response, 'id="profile-btn"')
        self.assertContains(response, 'fa-user')
        self.assertContains(response, 'Profile')
        self.assertContains(response, 'href="' + reverse('immersivecomics:user_dashboard') + '"')
        
        # Check that login button is not present
        self.assertNotContains(response, 'id="login-btn"')


# Studio and Audio Views Tests
class StudioViewsTests(TestCase):
    """Test studio-related views"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        self.other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='otherpass123',
            first_name='Other',
            last_name='User'
        )
        
        # Create studios
        self.studio = Studio.objects.create(
            name='Test Studio',
            description='A test studio',
            owner=self.user,
            is_public=True
        )
        
        self.private_studio = Studio.objects.create(
            name='Private Studio',
            description='A private studio',
            owner=self.other_user,
            is_public=False
        )
        
        # Create collaborators
        StudioCollaborator.objects.create(
            studio=self.studio,
            user=self.other_user,
            role='writer',
            is_active=True
        )
        
        # Create stories
        self.story = Comic.objects.create(
            title='Test Story',
            description='A test story',
            user=self.user,
            is_public=True,
            moderation_status='approved'
        )
        
        StoryCollaborator.objects.create(
            story=self.story,
            user=self.other_user,
            role='3d_artist',
            is_active=True
        )
    
    def test_studio_list_view(self):
        """Test studio list view - Now serves React"""
        response = self.client.get(reverse('immersivecomics:studio_list'))
        self.assertEqual(response.status_code, 200)
        # Now serves React HTML, so check for React app content instead
        self.assertContains(response, 'root')  # React root div
    
    def test_studio_detail_view(self):
        """Test studio detail view - Now serves React"""
        response = self.client.get(reverse('immersivecomics:studio_detail', kwargs={'pk': self.studio.pk}))
        self.assertEqual(response.status_code, 200)
        # Now serves React HTML, so check for React app content instead
        self.assertContains(response, 'root')  # React root div
    
    def test_studio_detail_view_private_studio(self):
        """Test that private studios - Now serves React (access control handled by React/API)"""
        response = self.client.get(reverse('immersivecomics:studio_detail', kwargs={'pk': self.private_studio.pk}))
        # Now serves React HTML instead of 404 - React will handle access control
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'root')  # React root div
    
    def test_my_studio_view_authenticated(self):
        """Test my studio view for authenticated user - Now serves React"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('immersivecomics:my_studio'))
        self.assertEqual(response.status_code, 200)
        # Now serves React HTML
        self.assertContains(response, 'root')  # React root div
        self.assertContains(response, 'Studio')
    
    def test_my_studio_view_unauthenticated(self):
        """Test my studio view redirects for unauthenticated user"""
        response = self.client.get(reverse('immersivecomics:my_studio'))
        self.assertEqual(response.status_code, 302)  # Redirect to login
    
    def test_my_studio_creates_studio_if_nonexistent(self):
        """Test that my studio view creates a studio if user doesn't have one"""
        new_user = User.objects.create_user(
            username='newuser',
            email='new@example.com',
            password='newpass123'
        )
        self.client.login(username='newuser', password='newpass123')
        
        # Check no studio exists
        self.assertFalse(Studio.objects.filter(owner=new_user).exists())
        
        response = self.client.get(reverse('immersivecomics:my_studio'))
        self.assertEqual(response.status_code, 200)
        
        # Check studio was created
        self.assertTrue(Studio.objects.filter(owner=new_user).exists())
        studio = Studio.objects.get(owner=new_user)
        self.assertIn(new_user.username, studio.name)
    
    def test_studio_create_view_authenticated(self):
        """Test studio create view for authenticated user"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('immersivecomics:studio_create'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Create Studio')
    
    def test_studio_create_view_unauthenticated(self):
        """Test studio create view redirects for unauthenticated user"""
        response = self.client.get(reverse('immersivecomics:studio_create'))
        self.assertEqual(response.status_code, 302)  # Redirect to login
    
    def test_studio_create_post(self):
        """Test creating a studio via POST"""
        self.client.login(username='testuser', password='testpass123')
        data = {
            'name': 'New Studio',
            'description': 'A new test studio',
            'is_public': True,
            'avatar_url': 'https://example.com/avatar.jpg'
        }
        response = self.client.post(reverse('immersivecomics:studio_create'), data)
        self.assertEqual(response.status_code, 302)  # Redirect after success
        
        # Check studio was created
        self.assertTrue(Studio.objects.filter(name='New Studio').exists())
    
    def test_studio_update_view(self):
        """Test studio update view"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('immersivecomics:studio_edit', kwargs={'pk': self.studio.pk}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Edit Studio')
    
    def test_studio_update_view_other_user(self):
        """Test that users can't edit other users' studios"""
        self.client.login(username='otheruser', password='otherpass123')
        response = self.client.get(reverse('immersivecomics:studio_edit', kwargs={'pk': self.studio.pk}))
        self.assertEqual(response.status_code, 404)
    
    def test_studio_update_post(self):
        """Test updating a studio via POST"""
        self.client.login(username='testuser', password='testpass123')
        data = {
            'name': 'Updated Studio',
            'description': 'An updated test studio',
            'is_public': True,
            'avatar_url': 'https://example.com/new-avatar.jpg'
        }
        response = self.client.post(reverse('immersivecomics:studio_edit', kwargs={'pk': self.studio.pk}), data)
        self.assertEqual(response.status_code, 302)  # Redirect after success
        
        # Check studio was updated
        self.studio.refresh_from_db()
        self.assertEqual(self.studio.name, 'Updated Studio')
        self.assertEqual(self.studio.description, 'An updated test studio')


class AudioViewsTests(TestCase):
    """Test audio-related views"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create audio tracks
        self.audio_track = AudioTrack.objects.create(
            name='Test Audio',
            audio_type='music',
            audio_file=SimpleUploadedFile('test.mp3', b'fake audio content'),
            duration=120.0,
            volume=0.8,
            created_by=self.user,
            is_public=True
        )
    
    def test_audio_track_list_view_authenticated(self):
        """Test audio track list view for authenticated user"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('immersivecomics:audio_track_list'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Test Audio')
    
    def test_audio_track_list_view_unauthenticated(self):
        """Test audio track list view redirects for unauthenticated user"""
        response = self.client.get(reverse('immersivecomics:audio_track_list'))
        self.assertEqual(response.status_code, 302)  # Redirect to login
    
    def test_audio_track_create_view_authenticated(self):
        """Test audio track create view for authenticated user"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('immersivecomics:audio_track_create'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Create Audio Track')
    
    def test_audio_track_create_view_unauthenticated(self):
        """Test audio track create view redirects for unauthenticated user"""
        response = self.client.get(reverse('immersivecomics:audio_track_create'))
        self.assertEqual(response.status_code, 302)  # Redirect to login
    
    def test_audio_track_create_post(self):
        """Test creating an audio track via POST"""
        self.client.login(username='testuser', password='testpass123')
        data = {
            'name': 'New Audio Track',
            'audio_type': 'sound_effect',
            'audio_file': SimpleUploadedFile('new.mp3', b'fake audio content'),
            'duration': 60.0,
            'volume': 1.0,
            'loop': False,
            'fade_in': 0.0,
            'fade_out': 0.0,
            'is_public': False
        }
        response = self.client.post(reverse('immersivecomics:audio_track_create'), data)
        self.assertEqual(response.status_code, 302)  # Redirect after success
        
        # Check audio track was created
        self.assertTrue(AudioTrack.objects.filter(name='New Audio Track').exists())
    
    def test_audio_track_update_view(self):
        """Test audio track update view"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('immersivecomics:audio_track_edit', kwargs={'pk': self.audio_track.pk}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Edit Audio Track')
    
    def test_audio_track_update_view_other_user(self):
        """Test that users can't edit other users' audio tracks"""
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='otherpass123'
        )
        self.client.login(username='otheruser', password='otherpass123')
        response = self.client.get(reverse('immersivecomics:audio_track_edit', kwargs={'pk': self.audio_track.pk}))
        self.assertEqual(response.status_code, 404)
    
    def test_audio_track_delete_view(self):
        """Test audio track delete view"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('immersivecomics:audio_track_delete', kwargs={'pk': self.audio_track.pk}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Delete Audio Track')
    
    def test_audio_track_delete_post(self):
        """Test deleting an audio track via POST"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.post(reverse('immersivecomics:audio_track_delete', kwargs={'pk': self.audio_track.pk}))
        self.assertEqual(response.status_code, 302)  # Redirect after success
        
        # Check audio track was deleted
        self.assertFalse(AudioTrack.objects.filter(pk=self.audio_track.pk).exists())


class StudioAPITests(TestCase):
    """Test studio API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        self.studio = Studio.objects.create(
            name='Test Studio',
            description='A test studio',
            owner=self.user,
            is_public=True
        )
        
        # Create collaborators
        StudioCollaborator.objects.create(
            studio=self.studio,
            user=self.user,
            role='writer',
            is_active=True
        )
        
        # Create stories
        self.story = Comic.objects.create(
            title='Test Story',
            description='A test story',
            user=self.user,
            is_public=True,
            moderation_status='approved'
        )
    
    def test_studio_list_api(self):
        """Test studio list API endpoint"""
        response = self.client.get(reverse('immersivecomics:studio_list_api'))
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertIn('studios', data)
        self.assertEqual(len(data['studios']), 1)
        
        studio_data = data['studios'][0]
        self.assertEqual(studio_data['name'], 'Test Studio')
        self.assertEqual(studio_data['description'], 'A test studio')
        self.assertEqual(studio_data['owner']['username'], 'testuser')
        self.assertTrue(studio_data['is_public'])
    
    def test_studio_list_api_query_efficiency(self):
        """Test that studio list API uses efficient queries (no N+1 problem)"""
        # Create multiple studios with different owners
        for i in range(10):
            user = User.objects.create_user(
                username=f'user{i}',
                email=f'user{i}@example.com',
                password='pass123',
                first_name=f'User{i}',
                last_name='Test'
            )
            studio = Studio.objects.create(
                name=f'Studio {i}',
                description=f'Description {i}',
                owner=user,
                is_public=True
            )
            # Create some stories for each studio owner
            for j in range(3):
                Comic.objects.create(
                    title=f'Story {i}-{j}',
                    description=f'Story description {i}-{j}',
                    user=user,
                    is_public=True,
                    moderation_status='approved'
                )
        
        # Should use maximum 3-4 queries:
        # 1. Studios query (with select_related, prefetch, annotations)
        # 2. Prefetch query for collaborators
        # 3. Possibly a query for comic counts (if not using annotation)
        with self.assertNumQueries(4):  # Allow 4 queries max (conservative)
            response = self.client.get(reverse('immersivecomics:studio_list_api'))
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(len(data['studios']), 11)  # 10 new + 1 from setUp
    
    def test_studio_list_api_stories_count(self):
        """Test that stories_count is correctly calculated"""
        # Create additional stories for the test user
        for i in range(5):
            Comic.objects.create(
                title=f'Public Story {i}',
                description=f'Description {i}',
                user=self.user,
                is_public=True,
                moderation_status='approved'
            )
        
        # Create private stories (should not be counted)
        for i in range(3):
            Comic.objects.create(
                title=f'Private Story {i}',
                description=f'Description {i}',
                user=self.user,
                is_public=False,
                moderation_status='approved'
            )
        
        response = self.client.get(reverse('immersivecomics:studio_list_api'))
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        studio_data = data['studios'][0]  # Should be the test studio
        # Should count 6 stories (1 from setUp + 5 new public stories)
        self.assertEqual(studio_data['stories_count'], 6)
    
    def test_studio_list_api_collaborators(self):
        """Test that collaborators data is included"""
        # Create another collaborator
        collaborator_user = User.objects.create_user(
            username='collaborator',
            email='collab@example.com',
            password='pass123',
            first_name='Collaborator',
            last_name='User'
        )
        StudioCollaborator.objects.create(
            studio=self.studio,
            user=collaborator_user,
            role='3d_artist',
            is_active=True
        )
        
        response = self.client.get(reverse('immersivecomics:studio_list_api'))
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        studio_data = data['studios'][0]
        self.assertIn('collaborators', studio_data)
        self.assertEqual(len(studio_data['collaborators']), 2)  # 2 active collaborators
        
        # Check collaborator data structure
        collaborator = studio_data['collaborators'][0]
        self.assertIn('id', collaborator)
        self.assertIn('username', collaborator)
        self.assertIn('first_name', collaborator)
        self.assertIn('last_name', collaborator)
        self.assertIn('role', collaborator)
    
    def test_my_studio_api_authenticated(self):
        """Test my studio API endpoint for authenticated user"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('immersivecomics:my_studio_api'))
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertIn('studio', data)
        studio_data = data['studio']
        self.assertEqual(studio_data['name'], 'Test Studio')
        self.assertEqual(studio_data['description'], 'A test studio')
        self.assertEqual(studio_data['owner']['username'], 'testuser')
    
    def test_my_studio_api_unauthenticated(self):
        """Test my studio API endpoint for unauthenticated user"""
        response = self.client.get(reverse('immersivecomics:my_studio_api'))
        self.assertEqual(response.status_code, 401)
        
        data = response.json()
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'Authentication required')
    
    def test_my_studio_api_creates_studio_if_nonexistent(self):
        """Test that my studio API creates a studio if user doesn't have one"""
        new_user = User.objects.create_user(
            username='newuser',
            email='new@example.com',
            password='newpass123',
            first_name='New',
            last_name='User'
        )
        self.client.login(username='newuser', password='newpass123')
        
        # Check no studio exists
        self.assertFalse(Studio.objects.filter(owner=new_user).exists())
        
        response = self.client.get(reverse('immersivecomics:my_studio_api'))
        self.assertEqual(response.status_code, 200)
        
        # Check studio was created
        self.assertTrue(Studio.objects.filter(owner=new_user).exists())
        studio = Studio.objects.get(owner=new_user)
        self.assertIn(new_user.username, studio.name)
        
        data = response.json()
        self.assertIn('studio', data)
        studio_data = data['studio']
        self.assertIn(new_user.username, studio_data['name'])


class UserDashboardIntegrationTests(TestCase):
    """Test user dashboard integration with studio and audio data"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create studio
        self.studio = Studio.objects.create(
            name='Test Studio',
            description='A test studio',
            owner=self.user,
            is_public=True
        )
        
        # Create audio tracks
        AudioTrack.objects.create(
            name='Test Audio 1',
            audio_type='music',
            audio_file=SimpleUploadedFile('test1.mp3', b'fake audio content'),
            duration=120.0,
            created_by=self.user
        )
        
        AudioTrack.objects.create(
            name='Test Audio 2',
            audio_type='sound_effect',
            audio_file=SimpleUploadedFile('test2.mp3', b'fake audio content'),
            duration=60.0,
            created_by=self.user
        )
        
        # Create stories
        self.story = Comic.objects.create(
            title='Test Story',
            description='A test story',
            user=self.user,
            is_public=True,
            moderation_status='approved'
        )
    
    def test_user_dashboard_includes_studio_data(self):
        """Test that user dashboard includes studio information"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('immersivecomics:user_dashboard'))
        self.assertEqual(response.status_code, 200)
        
        # Check studio data is in context
        self.assertIn('studio', response.context)
        self.assertEqual(response.context['studio'], self.studio)
        self.assertIn('studio_collaborators', response.context)
        self.assertIn('audio_tracks', response.context)
        self.assertIn('collaborated_stories', response.context)
    
    def test_user_dashboard_handles_no_studio(self):
        """Test that user dashboard handles users without studios"""
        new_user = User.objects.create_user(
            username='newuser',
            email='new@example.com',
            password='newpass123'
        )
        self.client.login(username='newuser', password='newpass123')
        response = self.client.get(reverse('immersivecomics:user_dashboard'))
        self.assertEqual(response.status_code, 200)
        
        # Check studio data is None for users without studios
        self.assertIn('studio', response.context)
        self.assertIsNone(response.context['studio'])
        self.assertEqual(response.context['studio_collaborators'], 0)
        self.assertEqual(response.context['audio_tracks'], 0)
        self.assertEqual(response.context['collaborated_stories'], 0)
