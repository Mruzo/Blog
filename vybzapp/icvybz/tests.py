"""
Studio and API tests for the icvybz app.
Legacy Django form/template tests were removed — ReactAppView is canonical for page routes.
Run with: python manage.py test icvybz.tests
"""

from datetime import date

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse

from .models import (
    Comic,
    Season,
    Episode,
    Studio,
    StudioCollaborator,
    StoryCollaborator,
)

User = get_user_model()


def create_publishable_catalog_story(studio, owner, **comic_overrides):
    """Story visible on public studio catalogue (studio-linked + published season/episode)."""
    defaults = {
        'title': 'Catalog Story',
        'description': 'Public catalogue story',
        'user': owner,
        'studio': studio,
        'is_public': True,
        'moderation_status': 'approved',
    }
    defaults.update(comic_overrides)
    comic = Comic.objects.create(**defaults)
    season = Season.objects.create(
        comic=comic,
        season_number=1,
        title='Season 1',
        release_date=date.today(),
        is_public=True,
    )
    Episode.objects.create(
        season=season,
        title='Episode 1',
        episode_number=1,
        is_published=True,
    )
    return comic


class StudioSPARouteTests(TestCase):
    """Smoke tests: immersive routes serve the React shell."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
        )
        self.studio = Studio.objects.create(
            name='Test Studio',
            description='A test studio',
            owner=self.user,
            is_public=True,
        )

    def test_studio_list_route_serves_react_shell(self):
        response = self.client.get(reverse('immersivecomics:studio_list'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'root')

    def test_studio_detail_route_serves_react_shell(self):
        response = self.client.get(
            reverse('immersivecomics:studio_detail', kwargs={'pk': self.studio.pk})
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'root')

    def test_my_studio_route_serves_react_shell(self):
        response = self.client.get(reverse('immersivecomics:my_studio'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'root')

    def test_audio_route_serves_react_shell(self):
        response = self.client.get(reverse('immersivecomics:audio_track_list'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'root')


class StudioAPITests(TestCase):
    """Test studio API endpoints"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
        )
        self.studio = Studio.objects.create(
            name='Test Studio',
            description='A test studio',
            owner=self.user,
            is_public=True,
        )
        StudioCollaborator.objects.create(
            studio=self.studio,
            user=self.user,
            role='writer',
            is_active=True,
        )
        create_publishable_catalog_story(self.studio, self.user, title='Test Story')

    def test_studio_list_api(self):
        response = self.client.get(reverse('immersivecomics:studio_list_api'))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('studios', data)
        self.assertEqual(len(data['studios']), 1)
        studio_data = data['studios'][0]
        self.assertEqual(studio_data['name'], 'Test Studio')
        self.assertEqual(studio_data['owner']['username'], 'testuser')
        self.assertTrue(studio_data['is_public'])

    def test_studio_list_api_query_efficiency(self):
        for i in range(10):
            user = User.objects.create_user(
                username=f'user{i}',
                email=f'user{i}@example.com',
                password='pass123',
                first_name=f'User{i}',
                last_name='Test',
            )
            studio = Studio.objects.create(
                name=f'Studio {i}',
                description=f'Description {i}',
                owner=user,
                is_public=True,
            )
            for j in range(3):
                create_publishable_catalog_story(
                    studio,
                    user,
                    title=f'Story {i}-{j}',
                )

        with self.assertNumQueries(4):
            response = self.client.get(reverse('immersivecomics:studio_list_api'))
            self.assertEqual(response.status_code, 200)
            self.assertEqual(len(response.json()['studios']), 11)

    def test_studio_list_api_stories_count(self):
        for i in range(5):
            create_publishable_catalog_story(
                self.studio,
                self.user,
                title=f'Public Story {i}',
            )
        for i in range(3):
            Comic.objects.create(
                title=f'Private Story {i}',
                description=f'Description {i}',
                user=self.user,
                studio=self.studio,
                is_public=False,
                moderation_status='approved',
            )

        response = self.client.get(reverse('immersivecomics:studio_list_api'))
        self.assertEqual(response.status_code, 200)
        studio_data = response.json()['studios'][0]
        self.assertEqual(studio_data['stories_count'], 6)

    def test_studio_list_api_stories_count_not_inflated_by_episodes(self):
        create_publishable_catalog_story(
            self.studio,
            self.user,
            title='Story With Episodes',
            description='Has multiple episodes',
        )
        comic = Comic.objects.get(title='Story With Episodes')
        season = comic.seasons.first()
        for i in range(2, 4):
            Episode.objects.create(
                season=season,
                title=f'Episode {i}',
                episode_number=i,
                is_published=True,
            )

        response = self.client.get(reverse('immersivecomics:studio_list_api'))
        self.assertEqual(response.status_code, 200)
        studio_data = response.json()['studios'][0]
        self.assertEqual(studio_data['stories_count'], 2)

    def test_studio_list_api_collaborators(self):
        collaborator_user = User.objects.create_user(
            username='collaborator',
            email='collab@example.com',
            password='pass123',
            first_name='Collaborator',
            last_name='User',
        )
        StudioCollaborator.objects.create(
            studio=self.studio,
            user=collaborator_user,
            role='3d_artist',
            is_active=True,
        )

        response = self.client.get(reverse('immersivecomics:studio_list_api'))
        self.assertEqual(response.status_code, 200)
        studio_data = response.json()['studios'][0]
        self.assertIn('collaborators', studio_data)
        self.assertEqual(len(studio_data['collaborators']), 2)

    def test_my_studio_api_authenticated(self):
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('immersivecomics:my_studio_api'))
        self.assertEqual(response.status_code, 200)
        studio_data = response.json()['studio']
        self.assertEqual(studio_data['name'], 'Test Studio')
        self.assertEqual(studio_data['owner']['username'], 'testuser')

    def test_my_studio_api_unauthenticated(self):
        response = self.client.get(reverse('immersivecomics:my_studio_api'))
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()['error'], 'Authentication required')

    def test_my_studio_api_creates_studio_if_nonexistent(self):
        new_user = User.objects.create_user(
            username='newuser',
            email='new@example.com',
            password='newpass123',
            first_name='New',
            last_name='User',
        )
        self.client.login(username='newuser', password='newpass123')
        self.assertFalse(Studio.objects.filter(owner=new_user).exists())

        response = self.client.get(reverse('immersivecomics:my_studio_api'))
        self.assertEqual(response.status_code, 200)
        self.assertTrue(Studio.objects.filter(owner=new_user).exists())
        studio_data = response.json()['studio']
        self.assertIn("New's Studio", studio_data['name'])
