"""
Ad machine helpers: placement cache, platform-model gating, cache invalidation.
"""
import os

from django.conf import settings
from django.core.cache import cache
from django.db.models import Q
from django.utils import timezone

from .models import AdBoard, AdPlacement, Season

DEFAULT_AD_BOARD_COUNT = 12


def default_ad_board_specs():
    return [
        {
            'slot_name': f'panel_{index}',
            'label': f'Panel {index}',
            'node_name': f'panel {index}',
            'sort_order': index,
        }
        for index in range(1, DEFAULT_AD_BOARD_COUNT + 1)
    ]


def ensure_default_ad_boards():
    created = 0
    for spec in default_ad_board_specs():
        _, was_created = AdBoard.objects.get_or_create(
            slot_name=spec['slot_name'],
            defaults={
                'label': spec['label'],
                'node_name': spec['node_name'],
                'sort_order': spec['sort_order'],
                'is_active': True,
            },
        )
        if was_created:
            created += 1
    return created


def first_ad_enabled_season():
    for season in Season.objects.select_related('comic').exclude(model_gltf='').order_by('id'):
        if season_supports_platform_ads(season):
            return season
    return None


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
            'creative', 'creative__advertiser', 'board',
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


def invalidate_ad_placement_cache(season_id, all_seasons=False):
    if all_seasons:
        for sid in Season.objects.exclude(model_gltf='').values_list('id', flat=True):
            cache.delete(_placement_cache_key(sid, 'all'))
        return
    if not season_id:
        return
    cache.delete(_placement_cache_key(season_id, 'all'))


def get_live_ad_placement_ids(season_id, episode_id=None):
    """
    Return IDs of live placements for a season/episode, with short TTL cache.
    """
    season = Season.objects.filter(pk=season_id).first()
    if not season or not season_supports_platform_ads(season):
        return []

    cache_key = _placement_cache_key(season_id, episode_id)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    live = public_live_ad_placements()
    season_queryset = live.filter(season_id=season_id, board__isnull=True)
    board_queryset = live.filter(board__isnull=False, board__is_active=True)
    if episode_id:
        episode_scope = Q(episode_id=episode_id) | Q(episode__isnull=True)
        season_queryset = season_queryset.filter(episode_scope)
        board_queryset = board_queryset.filter(episode_scope)

    placement_ids = list(
        (season_queryset | board_queryset)
        .order_by('-priority', 'id')
        .values_list('id', flat=True)
    )
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
            'creative', 'creative__advertiser', 'board',
        )
        .order_by('-priority', 'id')
    )
