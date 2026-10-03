from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import (
    Character,
    Comic,
    Dialogue,
    DialogueEditRequest,
    Episode,
    EpisodeVersion,
    POV,
    Season,
    StoryChange,
    StoryCollaborator,
)

User = get_user_model()


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class StoryHistoryAPITestCase(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner', password='pass12345', email='owner@example.com'
        )
        self.editor = User.objects.create_user(
            username='editor', password='pass12345', email='editor@example.com'
        )
        self.viewer = User.objects.create_user(username='viewer', password='pass12345')
        self.outsider = User.objects.create_user(username='outsider', password='pass12345')
        self.story = Comic.objects.create(title='Corners', description='Test', user=self.owner)
        self.season = Season.objects.create(
            title='Season 1',
            season_number=1,
            comic=self.story,
            release_date='2024-01-01',
        )
        self.episode = Episode.objects.create(
            title='The Chase',
            episode_number=1,
            season=self.season,
            description='Draft',
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
            camera_transition='move',
        )
        StoryCollaborator.objects.create(story=self.story, user=self.editor, role='editor', is_active=True)
        StoryCollaborator.objects.create(story=self.story, user=self.viewer, role='viewer', is_active=True)

    def test_create_dialogue_writes_activity(self):
        self.client.force_authenticate(user=self.owner)
        url = reverse('icvybz-api:dialogue-list-create', kwargs={'episode_id': self.episode.id})
        response = self.client.post(
            url,
            {
                'text': 'Not a chance.',
                'order': 2,
                'character': self.character.id,
                'pov': self.pov.id,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        change = StoryChange.objects.filter(episode=self.episode, action='create').first()
        self.assertIsNotNone(change)
        self.assertIn('added line 2', change.summary)
        self.assertEqual(change.user, self.owner)

    def test_owner_can_save_and_restore_named_version(self):
        self.client.force_authenticate(user=self.owner)
        save_url = reverse('icvybz-api:episode-version-create', kwargs={'episode_id': self.episode.id})
        saved = self.client.post(save_url, {'name': 'Before rewrite'}, format='json')
        self.assertEqual(saved.status_code, status.HTTP_201_CREATED)
        version_id = saved.data['id']
        self.assertEqual(saved.data['line_count'], 1)

        self.line.text = 'Rewritten'
        self.line.camera_transition = 'snap'
        self.line.save()
        Dialogue.objects.create(
            episode=self.episode,
            character=self.character,
            pov=self.pov,
            text='Extra line',
            order=2,
        )

        restore_url = reverse(
            'icvybz-api:episode-version-restore',
            kwargs={'episode_id': self.episode.id, 'version_id': version_id},
        )
        restored = self.client.post(restore_url, {}, format='json')
        self.assertEqual(restored.status_code, status.HTTP_200_OK)
        lines = list(Dialogue.objects.filter(episode=self.episode).order_by('order'))
        self.assertEqual(len(lines), 1)
        self.assertEqual(lines[0].text, 'Hold still.')
        self.assertEqual(lines[0].camera_transition, 'move')
        self.assertTrue(StoryChange.objects.filter(episode=self.episode, action='restore').exists())

    def test_history_visible_to_collaborators_restore_denied_for_viewer(self):
        self.client.force_authenticate(user=self.owner)
        save_url = reverse('icvybz-api:episode-version-create', kwargs={'episode_id': self.episode.id})
        saved = self.client.post(save_url, {'name': 'Cut A'}, format='json')
        version_id = saved.data['id']

        history_url = reverse('icvybz-api:episode-history', kwargs={'episode_id': self.episode.id})
        self.client.force_authenticate(user=self.editor)
        editor_history = self.client.get(history_url)
        self.assertEqual(editor_history.status_code, status.HTTP_200_OK)
        self.assertTrue(editor_history.data['can_edit'])
        self.assertEqual(len(editor_history.data['versions']), 1)

        self.client.force_authenticate(user=self.viewer)
        viewer_history = self.client.get(history_url)
        self.assertEqual(viewer_history.status_code, status.HTTP_200_OK)
        self.assertFalse(viewer_history.data['can_edit'])

        restore_url = reverse(
            'icvybz-api:episode-version-restore',
            kwargs={'episode_id': self.episode.id, 'version_id': version_id},
        )
        denied = self.client.post(restore_url, {}, format='json')
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.outsider)
        blocked = self.client.get(history_url)
        self.assertEqual(blocked.status_code, status.HTTP_403_FORBIDDEN)

    def test_version_requires_a_name(self):
        self.client.force_authenticate(user=self.owner)
        url = reverse('icvybz-api:episode-version-create', kwargs={'episode_id': self.episode.id})
        response = self.client.post(url, {'name': '  '}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(EpisodeVersion.objects.count(), 0)

    def test_unset_last_editor_requires_story_owner_approval(self):
        detail_url = reverse('icvybz-api:dialogue-detail', kwargs={'pk': self.line.id})
        request_url = reverse('icvybz-api:dialogue-edit-request', kwargs={'pk': self.line.id})

        self.client.force_authenticate(user=self.editor)
        blocked = self.client.patch(detail_url, {'text': 'Not so fast.'}, format='json')
        self.assertEqual(blocked.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(blocked.data['last_editor_username'], 'owner')
        self.line.refresh_from_db()
        self.assertEqual(self.line.text, 'Hold still.')

        requested = self.client.post(request_url, {'text': 'Not so fast.'}, format='json')
        self.assertEqual(requested.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            DialogueEditRequest.objects.filter(
                id=requested.data['id'], status='pending', approver=self.owner
            ).exists()
        )
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('owner@example.com', mail.outbox[0].to)

        self.client.force_authenticate(user=self.owner)
        story = self.client.get(reverse('icvybz-api:story-detail', kwargs={'pk': self.story.id}))
        self.assertEqual(story.status_code, status.HTTP_200_OK)
        self.assertEqual(story.data['pending_approvals'], 1)
        self.assertEqual(story.data['season_count'], 1)
        self.assertEqual(story.data['episode_count'], 1)
        self.assertEqual(story.data['pending_edit_requests'][0]['requester_username'], 'editor')
        self.assertEqual(story.data['pending_edit_requests'][0]['episode_id'], self.episode.id)

        story_list = self.client.get(reverse('icvybz-api:story-list-create'))
        self.assertEqual(story_list.status_code, status.HTTP_200_OK)
        listed = next(row for row in story_list.data if row['id'] == self.story.id)
        self.assertEqual(listed['pending_approvals'], 1)
        self.assertEqual(listed['pending_edit_requests'], [])

    def test_last_editor_must_approve_teammate_change(self):
        self.line.last_edited_by = self.owner
        self.line.save(update_fields=['last_edited_by'])
        detail_url = reverse('icvybz-api:dialogue-detail', kwargs={'pk': self.line.id})

        self.client.force_authenticate(user=self.editor)
        blocked = self.client.patch(detail_url, {'text': 'Not so fast.'}, format='json')
        self.assertEqual(blocked.status_code, status.HTTP_409_CONFLICT)
        self.assertTrue(blocked.data['needs_approval'])
        self.assertEqual(self.line.text, 'Hold still.')

        request_url = reverse('icvybz-api:dialogue-edit-request', kwargs={'pk': self.line.id})
        requested = self.client.post(request_url, {'text': 'Not so fast.'}, format='json')
        self.assertEqual(requested.status_code, status.HTTP_201_CREATED)
        request_id = requested.data['id']
        self.assertTrue(
            DialogueEditRequest.objects.filter(id=request_id, status='pending', approver=self.owner).exists()
        )

        self.client.force_authenticate(user=self.owner)
        history = self.client.get(
            reverse('icvybz-api:episode-history', kwargs={'episode_id': self.episode.id})
        )
        self.assertEqual(len(history.data['edit_requests']), 1)
        self.assertTrue(history.data['edit_requests'][0]['can_approve'])

        approved = self.client.post(
            reverse('icvybz-api:dialogue-edit-approve', kwargs={'request_id': request_id}),
            {},
            format='json',
        )
        self.assertEqual(approved.status_code, status.HTTP_200_OK)
        self.line.refresh_from_db()
        self.assertEqual(self.line.text, 'Not so fast.')
        self.assertEqual(self.line.last_edited_by, self.editor)

        self.client.force_authenticate(user=self.owner)
        owner_edit = self.client.patch(detail_url, {'camera_transition': 'snap'}, format='json')
        self.assertEqual(owner_edit.status_code, status.HTTP_200_OK)
        self.line.refresh_from_db()
        self.assertEqual(self.line.camera_transition, 'snap')
        self.assertEqual(self.line.last_edited_by, self.owner)

        self.client.force_authenticate(user=self.editor)
        teammate_again = self.client.patch(detail_url, {'text': 'Still changing.'}, format='json')
        self.assertEqual(teammate_again.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(teammate_again.data['last_editor_username'], 'owner')
        self.line.refresh_from_db()
        self.assertEqual(self.line.text, 'Not so fast.')

    def test_owner_can_edit_after_teammate_is_removed(self):
        self.line.last_edited_by = self.editor
        self.line.save(update_fields=['last_edited_by'])
        StoryCollaborator.objects.filter(story=self.story, user=self.editor).update(is_active=False)
        detail_url = reverse('icvybz-api:dialogue-detail', kwargs={'pk': self.line.id})

        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(detail_url, {'text': 'Owner rewrite.'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.line.refresh_from_db()
        self.assertEqual(self.line.text, 'Owner rewrite.')
        self.assertEqual(self.line.last_edited_by, self.owner)

        leftover = DialogueEditRequest.objects.create(
            story=self.story,
            episode=self.episode,
            dialogue=self.line,
            requester=self.editor,
            approver=self.editor,
            action='update',
            payload={'text': 'Still waiting.'},
            summary='editor wants to change line 1',
        )
        approved = self.client.post(
            reverse('icvybz-api:dialogue-edit-approve', kwargs={'request_id': leftover.id}),
            {},
            format='json',
        )
        self.assertEqual(approved.status_code, status.HTTP_200_OK)

    def test_viewer_cannot_request_edit(self):
        self.line.last_edited_by = self.owner
        self.line.save(update_fields=['last_edited_by'])
        self.client.force_authenticate(user=self.viewer)
        response = self.client.post(
            reverse('icvybz-api:dialogue-edit-request', kwargs={'pk': self.line.id}),
            {'text': 'Nope.'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
