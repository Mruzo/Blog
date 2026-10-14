"""
Ad campaign status helpers, staff snapshot payloads, and invoice generation.
"""
from calendar import monthrange
from datetime import date, datetime

from django.conf import settings
from django.db.models import Count, Q

from .ad_services import ensure_default_ad_boards, season_supports_platform_ads
from .models import AdBoard, AdCampaign, AdCreative, AdEvent, AdPlacement, AdvertiserProfile


def _user_is_ad_staff(user):
    return getattr(user, 'is_authenticated', False) and (
        getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False)
    )


def placement_go_live_checks(placement):
    season = placement.season
    return {
        'advertiser_approved': placement.campaign.advertiser.status == 'approved',
        'creative_approved': placement.creative.status == 'approved',
        'campaign_active': placement.campaign.is_live(),
        'placement_active': placement.is_active,
        'ad_enabled_season': season_supports_platform_ads(season),
    }


def placement_runtime_status(placement):
    checks = placement_go_live_checks(placement)
    is_live = placement.is_live() and checks['ad_enabled_season']
    if is_live:
        status = 'live'
    elif not checks['advertiser_approved'] or not checks['creative_approved']:
        status = 'pending_approval'
    elif not checks['placement_active'] or not checks['campaign_active']:
        status = 'inactive'
    elif not checks['ad_enabled_season']:
        status = 'needs_platform_scene'
    else:
        status = 'ready'
    return status, checks, is_live


def _episode_scope_label(placement):
    if placement.episode_id is None:
        return 'All episodes (season-wide)'
    episode = placement.episode
    return f"E{episode.episode_number}: {episode.title}"


def _season_label(placement):
    season = placement.season
    story_title = season.comic.title if season.comic else 'Story'
    return f"{story_title} — S{season.season_number}: {season.title}"


def build_ad_staff_snapshot():
    placements = (
        AdPlacement.objects.select_related(
            'season', 'season__comic', 'episode', 'campaign',
            'campaign__advertiser', 'creative', 'creative__advertiser', 'board',
        )
        .annotate(
            billboard_loads=Count(
                'events',
                filter=Q(events__event_type='impression', events__is_suspicious=False),
            ),
            clicks=Count(
                'events',
                filter=Q(events__event_type='click', events__is_suspicious=False),
            ),
        )
        .order_by('-is_active', '-priority', 'campaign__advertiser__business_name', 'id')
    )

    rows = []
    for placement in placements:
        status, checks, is_live = placement_runtime_status(placement)
        rows.append({
            'id': placement.id,
            'advertiser_id': placement.campaign.advertiser_id,
            'advertiser_name': placement.campaign.advertiser.business_name,
            'campaign_id': placement.campaign_id,
            'campaign_name': placement.campaign.name,
            'creative_id': placement.creative_id,
            'creative_title': placement.creative.title,
            'creative_status': placement.creative.status,
            'advertiser_status': placement.campaign.advertiser.status,
            'season_id': placement.season_id,
            'season_label': _season_label(placement),
            'episode_scope': _episode_scope_label(placement),
            'slot_name': placement.slot_name,
            'board_id': placement.board_id,
            'board_label': placement.board.label if placement.board_id else None,
            'status': status,
            'is_live': is_live,
            'go_live': checks,
            'billboard_loads': placement.billboard_loads,
            'clicks': placement.clicks,
            'priority': placement.priority,
        })

    advertisers = [
        {
            'id': profile.id,
            'business_name': profile.business_name,
            'contact_name': profile.contact_name,
            'contact_email': profile.contact_email,
            'status': profile.status,
            'campaign_count': profile.campaigns.count(),
        }
        for profile in AdvertiserProfile.objects.order_by('business_name')
    ]

    live_count = sum(1 for row in rows if row['is_live'])
    ensure_default_ad_boards()
    board_rows = []
    active_rows = [row for row in rows if row['go_live']['placement_active']]
    for board in AdBoard.objects.filter(is_active=True).order_by('sort_order', 'slot_name'):
        booking = next((row for row in active_rows if row['board_id'] == board.id), None)
        if booking is None:
            booking = next(
                (row for row in active_rows if row['slot_name'] == board.slot_name and not row['board_id']),
                None,
            )
        board_rows.append({
            'id': board.id,
            'slot_name': board.slot_name,
            'label': board.label,
            'node_name': board.node_name,
            'sort_order': board.sort_order,
            'status': booking['status'] if booking else 'vacant',
            'is_live': bool(booking and booking['is_live']),
            'booking': booking,
        })
    vacant_count = sum(1 for row in board_rows if not row['booking'])
    campaigns = [
        {
            'id': campaign.id,
            'advertiser_id': campaign.advertiser_id,
            'name': campaign.name,
            'start_date': campaign.start_date,
            'end_date': campaign.end_date,
            'is_active': campaign.is_active,
            'budget_label': campaign.budget_label,
        }
        for campaign in AdCampaign.objects.order_by('advertiser__business_name', '-created_at', 'id')
    ]
    creatives = [
        {
            'id': creative.id,
            'advertiser_id': creative.advertiser_id,
            'campaign': creative.campaign_id,
            'title': creative.title,
            'status': creative.status,
        }
        for creative in AdCreative.objects.order_by('advertiser__business_name', '-created_at', 'id')
    ]
    return {
        'totals': {
            'placements': len(rows),
            'live': live_count,
            'advertisers': len(advertisers),
            'boards': len(board_rows),
            'vacant_boards': vacant_count,
        },
        'boards': board_rows,
        'placements': rows,
        'campaigns': campaigns,
        'creatives': creatives,
        'advertisers': advertisers,
    }


def campaign_metrics_for_period(campaign, start_date, end_date):
    events = AdEvent.objects.filter(
        placement__campaign=campaign,
        is_suspicious=False,
        created_at__date__gte=start_date,
        created_at__date__lte=end_date,
    )
    loads = events.filter(event_type='impression').count()
    clicks = events.filter(event_type='click').count()
    ctr = round((clicks / loads) * 100, 2) if loads else 0
    return {'billboard_loads': loads, 'clicks': clicks, 'ctr': ctr}


def generate_ad_campaign_invoice_pdf(advertiser, campaign, start_date, end_date, amount, notes=''):
    from snmov.utils.pdf_generation import generate_pdf

    metrics = campaign_metrics_for_period(campaign, start_date, end_date)
    period_label = start_date.strftime('%B %Y')
    invoice_number = f"ADV-INV-{datetime.now().strftime('%Y%m%d')}-{campaign.id}"

    line_items = [{
        'description': f'3D Billboard Advertising — {campaign.name} ({period_label})',
        'quantity': 1,
        'unit_price': float(amount),
        'amount': float(amount),
    }]

    metrics_note = (
        f"Billboard loads: {metrics['billboard_loads']}, "
        f"Clicks: {metrics['clicks']}, CTR: {metrics['ctr']}%"
    )
    full_notes = metrics_note
    if notes:
        full_notes = f"{metrics_note}\n{notes.strip()}"

    context = {
        'ad_invoice': {
            'invoice_number': invoice_number,
            'period_label': period_label,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'amount': float(amount),
            'notes': full_notes,
            'metrics': metrics,
        },
        'advertiser': advertiser,
        'campaign': campaign,
        'line_items': line_items,
    }

    filename = f'ad_invoice_{campaign.id}_{start_date.strftime("%Y%m")}.pdf'
    return generate_pdf(
        template_name='pdf/invoice.html',
        context=context,
        filename=filename,
        pdf_type='ad_invoice',
    ), invoice_number, metrics


def month_bounds(year, month):
    last_day = monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)
