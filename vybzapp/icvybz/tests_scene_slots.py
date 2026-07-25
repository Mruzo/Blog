"""Tests for shared-scene character slots (North_SS / South_SS / East_SS / West_SS)."""
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Comic, Character, POV
from .scene_slots import (
    MAX_CHARACTERS_PER_STORY,
    SCENE_SLOT_EAST,
    SCENE_SLOT_NORTH,
    SCENE_SLOT_SOUTH,
    SCENE_SLOT_WEST,
    SCENE_SLOT_PRESETS,
)

User = get_user_model()


class SceneSlotTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='slotuser',
            email='slot@example.com',
            password='testpass123',
        )
        self.client.force_authenticate(user=self.user)
        self.story = Comic.objects.create(
            user=self.user,
            title='Slot Story',
            description='Scene slot tests',
        )
        self.url = reverse('icvybz-api:character-list-create', kwargs={'story_id': self.story.id})

    def _payload(self, name, slot, **extra):
        return {
            'name': name,
            'bio': f'{name} bio',
            'personality': 'Brave',
            'love_interest': '',
            'scene_slot': slot,
            **extra,
        }

    def test_create_character_with_scene_slot_sets_pov(self):
        response = self.client.post(self.url, self._payload('North Hero', SCENE_SLOT_NORTH), format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['scene_slot'], SCENE_SLOT_NORTH)

        character = Character.objects.get(id=response.data['id'])
        self.assertEqual(character.scene_slot, SCENE_SLOT_NORTH)
        pov = POV.objects.get(character=character)
        preset = SCENE_SLOT_PRESETS[SCENE_SLOT_NORTH]
        self.assertEqual(pov.head_x, preset['head_x'])
        self.assertEqual(pov.head_y, preset['head_y'])
        self.assertEqual(pov.head_z, preset['head_z'])

    def test_duplicate_scene_slot_rejected(self):
        first = self.client.post(self.url, self._payload('One', SCENE_SLOT_WEST), format='json')
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        second = self.client.post(self.url, self._payload('Two', SCENE_SLOT_WEST), format='json')
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('scene_slot', second.data)

    def test_max_four_characters_on_create(self):
        slots = [SCENE_SLOT_NORTH, SCENE_SLOT_SOUTH, SCENE_SLOT_EAST, SCENE_SLOT_WEST]
        for index, slot in enumerate(slots):
            response = self.client.post(
                self.url,
                self._payload(f'Char {index}', slot),
                format='json',
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertEqual(Character.objects.filter(story=self.story).count(), MAX_CHARACTERS_PER_STORY)

        # No free slot left; create without slot still blocked by max
        blocked = self.client.post(
            self.url,
            {
                'name': 'Overflow',
                'bio': 'Too many',
                'personality': 'Brave',
                'love_interest': '',
            },
            format='json',
        )
        self.assertEqual(blocked.status_code, status.HTTP_400_BAD_REQUEST)

    def test_grandfathered_cast_over_four_can_still_update(self):
        """Existing stories with >4 characters remain editable; only new adds are blocked."""
        characters = []
        for index in range(5):
            characters.append(
                Character.objects.create(
                    user=self.user,
                    story=self.story,
                    name=f'Legacy {index}',
                    bio='legacy',
                    personality='Brave',
                )
            )

        detail_url = reverse('icvybz-api:character-detail', kwargs={'pk': characters[0].id})
        response = self.client.patch(
            detail_url,
            {'name': 'Legacy 0 Updated', 'scene_slot': SCENE_SLOT_NORTH},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        characters[0].refresh_from_db()
        self.assertEqual(characters[0].name, 'Legacy 0 Updated')
        self.assertEqual(characters[0].scene_slot, SCENE_SLOT_NORTH)

        pov = POV.objects.get(character=characters[0])
        self.assertEqual(pov.head_x, SCENE_SLOT_PRESETS[SCENE_SLOT_NORTH]['head_x'])

        blocked = self.client.post(
            self.url,
            self._payload('Newcomer', SCENE_SLOT_SOUTH),
            format='json',
        )
        self.assertEqual(blocked.status_code, status.HTTP_400_BAD_REQUEST)

    def test_legacy_custom_pov_update_without_slot(self):
        character = Character.objects.create(
            user=self.user,
            story=self.story,
            name='Custom',
            bio='custom bio',
            personality='Shy',
        )
        detail_url = reverse('icvybz-api:character-detail', kwargs={'pk': character.id})
        response = self.client.put(
            detail_url,
            {
                'name': 'Custom',
                'bio': 'custom bio',
                'personality': 'Shy',
                'love_interest': '',
                'pov_head_x': 1.1,
                'pov_head_y': 2.2,
                'pov_head_z': 3.3,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        character.refresh_from_db()
        self.assertIsNone(character.scene_slot)
        pov = POV.objects.get(character=character)
        self.assertEqual(pov.head_x, 1.1)
        self.assertEqual(pov.head_y, 2.2)
        self.assertEqual(pov.head_z, 3.3)

    def test_invalid_scene_slot_rejected(self):
        response = self.client.post(
            self.url,
            self._payload('Bad', 'Center_SS'),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('scene_slot', response.data)
