from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import (
    Character,
    Comic,
    Dialogue,
    Episode,
    POV,
    Season,
    Studio,
    StudioCollaborator,
)

User = get_user_model()


class StudioMemberStoryAccessTestCase(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username='owner', password='pass12345')
        self.member = User.objects.create_user(username='member', password='pass12345')
        self.outsider = User.objects.create_user(username='outsider', password='pass12345')
        self.studio = Studio.objects.create(
            name='Chase Studio',
            owner=self.owner,
            is_public=False,
        )
        StudioCollaborator.objects.create(
            studio=self.studio,
            user=self.member,
            role='writer',
            is_active=True,
        )
        self.story = Comic.objects.create(
            title='The Chase',
            description='Draft story',
            user=self.owner,
            studio=self.studio,
            is_public=False,
            moderation_status='pending',
        )
        self.season = Season.objects.create(
            title='Season 1',
            season_number=1,
            comic=self.story,
            release_date='2024-01-01',
            is_public=False,
        )
        self.episode = Episode.objects.create(
            title='Line work',
            episode_number=1,
            season=self.season,
            is_published=False,
        )
        self.character = Character.objects.create(
            name='Ed',
            user=self.owner,
            story=self.story,
        )
        self.pov = POV.objects.create(title='Ed POV', character=self.character)
        self.line = Dialogue.objects.create(
            episode=self.episode,
            character=self.character,
            pov=self.pov,
            text='Hold still.',
            order=1,
        )

    def test_member_can_open_private_studio(self):
        url = reverse('icvybz-api:studio-detail', kwargs={'pk': self.studio.id})
        self.client.force_authenticate(user=self.outsider)
        blocked = self.client.get(url)
        self.assertEqual(blocked.status_code, status.HTTP_404_NOT_FOUND)

        self.client.force_authenticate(user=self.member)
        allowed = self.client.get(url)
        self.assertEqual(allowed.status_code, status.HTTP_200_OK)
        self.assertEqual(allowed.data['name'], 'Chase Studio')

    def test_member_sees_studio_draft_in_story_list(self):
        url = reverse('icvybz-api:story-list-create')
        self.client.force_authenticate(user=self.outsider)
        outsider_list = self.client.get(url)
        self.assertEqual(outsider_list.status_code, status.HTTP_200_OK)
        self.assertEqual(outsider_list.data, [])

        self.client.force_authenticate(user=self.member)
        member_list = self.client.get(url)
        self.assertEqual(member_list.status_code, status.HTTP_200_OK)
        ids = [row['id'] for row in member_list.data]
        self.assertIn(self.story.id, ids)

    def test_member_can_open_draft_story_and_seasons(self):
        story_url = reverse('icvybz-api:story-detail', kwargs={'pk': self.story.id})
        seasons_url = reverse('icvybz-api:season-list-create', kwargs={'story_id': self.story.id})
        episodes_url = reverse('icvybz-api:episode-list-create', kwargs={'season_id': self.season.id})
        dialogues_url = reverse(
            'icvybz-api:dialogue-list-create', kwargs={'episode_id': self.episode.id}
        )

        self.client.force_authenticate(user=self.outsider)
        self.assertEqual(self.client.get(story_url).status_code, status.HTTP_404_NOT_FOUND)

        self.client.force_authenticate(user=self.member)
        story = self.client.get(story_url)
        self.assertEqual(story.status_code, status.HTTP_200_OK)
        self.assertEqual(story.data['title'], 'The Chase')

        seasons = self.client.get(seasons_url)
        self.assertEqual(seasons.status_code, status.HTTP_200_OK)
        season_rows = seasons.data if isinstance(seasons.data, list) else seasons.data.get('results', [])
        self.assertEqual([row['id'] for row in season_rows], [self.season.id])

        episodes = self.client.get(episodes_url)
        self.assertEqual(episodes.status_code, status.HTTP_200_OK)
        episode_rows = episodes.data if isinstance(episodes.data, list) else episodes.data.get('results', [])
        self.assertEqual([row['id'] for row in episode_rows], [self.episode.id])

        dialogues = self.client.get(dialogues_url)
        self.assertEqual(dialogues.status_code, status.HTTP_200_OK)
        dialogue_rows = dialogues.data if isinstance(dialogues.data, list) else dialogues.data.get('results', [])
        self.assertEqual(dialogue_rows[0]['text'], 'Hold still.')

    def test_member_cannot_apply_unowned_line_without_owner_approval(self):
        detail_url = reverse('icvybz-api:dialogue-detail', kwargs={'pk': self.line.id})
        request_url = reverse('icvybz-api:dialogue-edit-request', kwargs={'pk': self.line.id})

        self.client.force_authenticate(user=self.member)
        blocked = self.client.patch(detail_url, {'text': 'Keep moving.'}, format='json')
        self.assertEqual(blocked.status_code, status.HTTP_409_CONFLICT)
        self.assertTrue(blocked.data['needs_approval'])
        self.assertEqual(blocked.data['last_editor_username'], 'owner')
        self.line.refresh_from_db()
        self.assertEqual(self.line.text, 'Hold still.')
        self.assertIsNone(self.line.last_edited_by_id)

        requested = self.client.post(request_url, {'text': 'Keep moving.'}, format='json')
        self.assertEqual(requested.status_code, status.HTTP_201_CREATED)
        self.assertEqual(requested.data['approver_username'], 'owner')

        self.client.force_authenticate(user=self.owner)
        applied = self.client.patch(detail_url, {'text': 'Owner rewrite.'}, format='json')
        self.assertEqual(applied.status_code, status.HTTP_200_OK)
        self.line.refresh_from_db()
        self.assertEqual(self.line.text, 'Owner rewrite.')
        self.assertEqual(self.line.last_edited_by, self.owner)

    def test_member_can_see_story_team_but_cannot_manage_it(self):
        list_url = reverse('icvybz-api:story-studio-collaborators', kwargs={'story_id': self.story.id})
        assign_url = reverse('icvybz-api:bulk-assign-story-collaborators', kwargs={'story_id': self.story.id})

        self.client.force_authenticate(user=self.outsider)
        self.assertEqual(self.client.get(list_url).status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.member)
        visible = self.client.get(list_url)
        self.assertEqual(visible.status_code, status.HTTP_200_OK)
        usernames = [row['user']['username'] for row in visible.data['results']]
        self.assertIn('member', usernames)
        self.assertIn('owner', usernames)
        self.assertTrue(visible.data['results'][0]['is_owner'])

        denied = self.client.post(assign_url, {'user_roles': []}, format='json')
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)
