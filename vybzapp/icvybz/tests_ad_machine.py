from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import (
    Comic,
    Season,
    Episode,
    AdvertiserProfile,
    AdCampaign,
    AdCreative,
    AdPlacement,
    AdEvent,
    AdRevenueSplitConfig,
    AdRevenueShareSnapshot,
)


User = get_user_model()


class AdMachineAPITestCase(APITestCase):
    def setUp(self):
        self.creator = User.objects.create_user(username='creator', email='creator@example.com', password='pass')
        self.ad_user = User.objects.create_user(username='advertiser', email='ad@example.com', password='pass')
        self.story = Comic.objects.create(title='Ad Story', description='Story', user=self.creator, is_public=True, moderation_status='approved')
        self.season = Season.objects.create(
            comic=self.story,
            season_number=1,
            title='Season 1',
            description='Season',
            release_date='2026-01-01',
            is_public=True,
        )
        self.season.model_gltf = SimpleUploadedFile(
            'cof_animation_clean.v3.2.glb',
            b'glTF',
            content_type='model/gltf-binary',
        )
        self.season.save()
        self.episode = Episode.objects.create(
            season=self.season,
            title='Episode 1',
            description='Episode',
            episode_number=1,
            is_published=True,
        )
        self.advertiser = AdvertiserProfile.objects.create(
            user=self.ad_user,
            business_name='Test Brand',
            contact_email='brand@example.com',
            status='approved',
        )
        self.campaign = AdCampaign.objects.create(advertiser=self.advertiser, name='Launch', is_active=True)
        image = SimpleUploadedFile('ad.gif', b'GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02L\x01\x00;', content_type='image/gif')
        self.creative = AdCreative.objects.create(
            advertiser=self.advertiser,
            campaign=self.campaign,
            title='Test Creative',
            image=image,
            destination_url='https://example.com',
            status='approved',
        )
        self.placement = AdPlacement.objects.create(
            season=self.season,
            campaign=self.campaign,
            creative=self.creative,
            position_x=1,
            position_y=2,
            position_z=3,
        )

    def test_public_placement_endpoint_returns_active_approved_ads(self):
        url = reverse('icvybz-api:season-ad-placement-list-create', kwargs={'season_id': self.season.id})
        response = self.client.get(url, {'episode': self.episode.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], self.placement.id)
        self.assertEqual(response.data[0]['slot_name'], 'ed_bb')
        self.assertEqual(response.data[0]['creative_title'], 'Test Creative')
        self.assertIn('creative_image_url', response.data[0])
        self.assertTrue(response.data[0]['event_token'])

    def _event_token(self):
        url = reverse('icvybz-api:season-ad-placement-list-create', kwargs={'season_id': self.season.id})
        response = self.client.get(url, {'episode': self.episode.id})
        return response.data[0]['event_token']

    def test_ad_event_is_deduped_and_snapshots_active_split(self):
        AdRevenueSplitConfig.objects.create(creator_percentage=65, platform_percentage=35, is_active=True)
        url = reverse('icvybz-api:ad-event-create')
        payload = {
            'placement': self.placement.id,
            'episode': self.episode.id,
            'event_type': 'impression',
            'session_key': 'session-1',
            'event_token': self._event_token(),
        }

        first = self.client.post(url, payload, format='json')
        second = self.client.post(url, payload, format='json')

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertTrue(first.data['created'])
        self.assertFalse(second.data['created'])
        self.assertEqual(AdEvent.objects.count(), 1)
        self.assertEqual(AdRevenueShareSnapshot.objects.count(), 1)
        snapshot = AdRevenueShareSnapshot.objects.get()
        self.assertEqual(snapshot.creator_percentage, 65)
        self.assertEqual(snapshot.platform_percentage, 35)
        self.assertEqual(snapshot.creator, self.creator)

    def test_invalid_ad_event_token_is_reportable_but_not_revenue_bearing(self):
        response = self.client.post(reverse('icvybz-api:ad-event-create'), {
            'placement': self.placement.id,
            'episode': self.episode.id,
            'event_type': 'click',
            'session_key': 'bad-token-session',
            'event_token': 'not-valid',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['is_suspicious'])
        self.assertEqual(response.data['fraud_reason'], 'invalid_token')
        self.assertEqual(AdEvent.objects.filter(is_suspicious=True, fraud_reason='invalid_token').count(), 1)
        self.assertEqual(AdRevenueShareSnapshot.objects.count(), 0)

    def test_duplicate_device_window_is_reportable_but_not_revenue_bearing(self):
        token = self._event_token()
        url = reverse('icvybz-api:ad-event-create')
        first = self.client.post(url, {
            'placement': self.placement.id,
            'episode': self.episode.id,
            'event_type': 'click',
            'session_key': 'device-session-1',
            'event_token': token,
        }, format='json', HTTP_USER_AGENT='Mozilla/5.0 Test Browser')
        second = self.client.post(url, {
            'placement': self.placement.id,
            'episode': self.episode.id,
            'event_type': 'click',
            'session_key': 'device-session-2',
            'event_token': token,
        }, format='json', HTTP_USER_AGENT='Mozilla/5.0 Test Browser')

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertFalse(first.data['is_suspicious'])
        self.assertTrue(second.data['is_suspicious'])
        self.assertEqual(second.data['fraud_reason'], 'duplicate_device_window')
        self.assertEqual(AdEvent.objects.filter(event_type='click').count(), 2)
        self.assertEqual(AdRevenueShareSnapshot.objects.count(), 1)

    def test_episode_view_does_not_create_billboard_load_events(self):
        url = reverse('icvybz-api:episode-increment-view', kwargs={'episode_id': self.episode.id})
        payload = {'ad_session_key': 'episode-session-1'}

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn('ad_impressions_created', response.data)
        self.assertEqual(AdEvent.objects.filter(event_type='impression').count(), 0)

    def test_placements_not_served_without_platform_glb(self):
        other_season = Season.objects.create(
            comic=self.story,
            season_number=2,
            title='Season 2',
            description='Season',
            release_date='2026-01-01',
            is_public=True,
            model_gltf=SimpleUploadedFile('custom_scene.glb', b'glTF', content_type='model/gltf-binary'),
        )
        other_episode = Episode.objects.create(
            season=other_season,
            title='Episode 1',
            description='Episode',
            episode_number=1,
            is_published=True,
        )
        AdPlacement.objects.create(
            season=other_season,
            campaign=self.campaign,
            creative=self.creative,
        )
        url = reverse('icvybz-api:season-ad-placement-list-create', kwargs={'season_id': other_season.id})
        response = self.client.get(url, {'episode': other_episode.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_ad_report_includes_advertiser_and_creator_reach(self):
        token = self._event_token()
        self.client.post(reverse('icvybz-api:ad-event-create'), {
            'placement': self.placement.id,
            'episode': self.episode.id,
            'event_type': 'impression',
            'session_key': 'session-2',
            'event_token': token,
        }, format='json')
        self.client.post(reverse('icvybz-api:ad-event-create'), {
            'placement': self.placement.id,
            'episode': self.episode.id,
            'event_type': 'click',
            'session_key': 'session-2',
            'event_token': token,
        }, format='json')
        self.client.post(reverse('icvybz-api:ad-event-create'), {
            'placement': self.placement.id,
            'episode': self.episode.id,
            'event_type': 'click',
            'session_key': 'session-flagged',
            'event_token': 'bad-token',
        }, format='json')

        self.client.force_authenticate(user=self.ad_user)
        advertiser_response = self.client.get(reverse('icvybz-api:ad-report'))
        self.assertEqual(advertiser_response.status_code, status.HTTP_200_OK)
        self.assertEqual(advertiser_response.data['advertiser']['campaigns'][0]['impressions'], 1)
        self.assertEqual(advertiser_response.data['advertiser']['campaigns'][0]['clicks'], 1)
        self.assertEqual(advertiser_response.data['advertiser']['campaigns'][0]['suspicious_events'], 1)

        self.client.force_authenticate(user=self.creator)
        creator_response = self.client.get(reverse('icvybz-api:ad-report'))
        self.assertEqual(creator_response.status_code, status.HTTP_200_OK)
        self.assertEqual(creator_response.data['creator']['totals']['impressions'], 1)
        self.assertEqual(creator_response.data['creator']['totals']['clicks'], 1)
        self.assertEqual(creator_response.data['creator']['totals']['suspicious_events'], 1)
        self.assertEqual(creator_response.data['creator']['totals']['fraud_breakdown'][0]['reason'], 'invalid_token')
