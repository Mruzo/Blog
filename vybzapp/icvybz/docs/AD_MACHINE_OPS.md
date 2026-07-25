# Ad Machine — Staff Operations

## Approvals

1. **AdvertiserProfile** — set status to Approved before campaigns go live.
2. **AdCreative** — approve image, destination URL, and alt text.
3. **AdCampaign** — confirm dates and `is_active`.
4. **AdPlacement** — season must use platform standard GLB (`cof_animation_clean`); episode blank = season-wide.

## Inventory rules

- Ads only serve on seasons whose GLB matches `AD_ENABLED_MODEL_BASENAMES` in settings.
- Slot name default: `ed_bb` (billboard mesh in platform GLB).
- Custom creator GLBs do not receive ads.

## Metrics

- **Billboard load** — recorded when the viewer applies the creative to the billboard (client POST `/api/icvybz/ad-events/` with signed token).
- **Click** — recorded when the reader clicks the in-scene billboard.
- Episode view increments do **not** create billboard load events.

## Fraud review

Check **AdEvent** admin for `is_suspicious` and `fraud_reason` (bot, rate limit, invalid token, duplicate device).

## Cache

Placement lists are cached ~2 minutes per season/episode. Saving a placement clears the season cache automatically.
