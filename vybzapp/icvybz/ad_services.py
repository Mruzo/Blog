"""
Ad machine helpers: placement cache, platform-model gating, cache invalidation.
"""
import os

from django.conf import settings
from django.core.cache import cache
from django.db.models import Q
from django.utils import timezone

from .models import AdPlacement, Season


AD_PLACEMENT_CACHE_PREFIX = 'icvybz:ad-placements'


def _ad_placement_cache_seconds():
    return int(getattr(settings, 'AD_PLACEMENT_CACHE_SECONDS', 120))


def _enabled_model_basenames():
    return [name.lower() for name in getattr(settings, 'AD_ENABLED_MODEL_BASENAMES', [])]


def public_live_ad_placements():
    today = timezone.now().date()
    return (
        AdPlacement.objects.filter(
            is_active=True,
            campaign__is_active=True,
            campaign__advertiser__status='approved',
            creative__status='approved',
            creative__advertiser__status='approved',
        )
        .filter(Q(campaign__start_date__isnull=True) | Q(campaign__start_date__lte=today))
        .filter(Q(campaign__end_date__isnull=True) | Q(campaign__end_date__gte=today))
        .select_related(
            'season', 'season__comic', 'episode', 'campaign',
            'creative', 'creative__advertiser',
        )
    )


def season_supports_platform_ads(season):
    """
    Ads only run on seasons using the platform standard GLB (Risk 7).
    Empty AD_ENABLED_MODEL_BASENAMES disables this gate (dev/tests only).
    """
    basenames = _enabled_model_basenames()
    if not basenames:
        return True

    model_name = ''
    if season and season.model_gltf:
        model_name = season.model_gltf.name or ''
    filename = os.path.basename(model_name).lower()
    if not filename:
        return False
    return any(token in filename for token in basenames)


def _placement_cache_key(season_id, episode_id):
    return f'{AD_PLACEMENT_CACHE_PREFIX}:{season_id}:{episode_id or "all"}'


def invalidate_ad_placement_cache(season_id):
    if not season_id:
        return
    cache.delete(_placement_cache_key(season_id, 'all'))


def get_live_ad_placement_ids(season_id, episode_id=None):
    """
    Return IDs of live placements for a season/episode, with short TTL cache.
    """
    cache_key = _placement_cache_key(season_id, episode_id)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    season = Season.objects.filter(pk=season_id).first()
    if not season or not season_supports_platform_ads(season):
        cache.set(cache_key, [], _ad_placement_cache_seconds())
        return []

    queryset = public_live_ad_placements().filter(season_id=season_id)
    if episode_id:
        queryset = queryset.filter(Q(episode_id=episode_id) | Q(episode__isnull=True))

    placement_ids = list(queryset.order_by('-priority', 'id').values_list('id', flat=True))
    cache.set(cache_key, placement_ids, _ad_placement_cache_seconds())
    return placement_ids


def live_ad_placements_queryset(season_id, episode_id=None):
    placement_ids = get_live_ad_placement_ids(season_id, episode_id)
    if not placement_ids:
        return AdPlacement.objects.none()
    return (
        AdPlacement.objects.filter(id__in=placement_ids)
        .select_related(
            'season', 'season__comic', 'episode', 'campaign',
            'creative', 'creative__advertiser',
        )
        .order_by('-priority', 'id')
    )
