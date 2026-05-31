"""
End-of-day stock prices via Financial Modeling Prep (FMP).

Requires settings.VYBCHEQ_FMP_API_KEY (from [section] FMP_API_KEY in settings.ini).
Refreshed manually from Django admin (no automatic polling).

Stores calendar quarter-end closes (default ~5 years on FMP free tier; 1 API call per security).
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Any

import requests
from django.utils import timezone

from vybcheq.fiscal_periods import (
    calendar_quarter_ends_between,
    configured_history_years,
    history_start_date,
    index_eod_rows_by_date,
    pick_bar_on_or_before,
)
from vybcheq.fmp_client import FmpError, fmp_get
from vybcheq.market_symbols import external_symbol_for_security
from vybcheq.models import Security, SecurityFiscalQuarter
from vybcheq.money import quantize_money
from vybcheq.screening_metrics import sync_security_screening_metrics_cache

FMP_STABLE_EOD_URL = "https://financialmodelingprep.com/stable/historical-price-eod/full"

# Backward-compatible alias for imports/tests.
FmpEodError = FmpError


@dataclass(frozen=True)
class EodSyncResult:
    quarters_stored: int
    latest_trade_date: date
    latest_close: Decimal
    latest_period_end: date | None


def _decimal_or_none(value: Any) -> Decimal | None:
    return quantize_money(value)


def _parse_eod_payload(payload: Any, sym: str, from_date: date, to_date: date) -> list[dict[str, Any]]:
    """Normalize stable (flat array) and legacy (nested historical) FMP responses."""
    if isinstance(payload, dict) and payload.get("Error Message"):
        raise FmpError(str(payload["Error Message"]))

    rows: list[dict[str, Any]] | None = None
    if isinstance(payload, list):
        if payload and isinstance(payload[0], dict) and "historical" in payload[0]:
            rows = payload[0]["historical"]
        elif payload and isinstance(payload[0], dict) and "date" in payload[0]:
            rows = payload
    elif isinstance(payload, dict):
        historical = payload.get("historical")
        if isinstance(historical, list):
            rows = historical

    if not rows:
        raise FmpError(f"No EOD bars from FMP for {sym!r} ({from_date} to {to_date}).")
    return rows


def fetch_eod_bars(
    security: Security,
    *,
    from_date: date,
    to_date: date,
    session: requests.Session | None = None,
) -> list[dict[str, Any]]:
    """Return FMP historical rows for the mapped symbol (stable API; flat JSON array)."""
    sym = external_symbol_for_security(security)
    payload = fmp_get(
        FMP_STABLE_EOD_URL,
        params={
            "symbol": sym,
            "from": from_date.isoformat(),
            "to": to_date.isoformat(),
        },
        session=session,
        symbol=sym,
    )
    return _parse_eod_payload(payload, sym, from_date, to_date)


def upsert_quarter_end_eod(
    security: Security,
    rows: list[dict[str, Any]],
    *,
    period_ends: list[date],
) -> int:
    """Insert or update SecurityFiscalQuarter rows for calendar quarter ends."""
    rows_by_date = index_eod_rows_by_date(rows)
    sorted_dates = sorted(rows_by_date)
    n = 0
    for period_end in period_ends:
        picked = pick_bar_on_or_before(sorted_dates, rows_by_date, period_end)
        if picked is None:
            continue
        trade_date, row = picked
        close = _decimal_or_none(row.get("close"))
        if close is None:
            continue
        SecurityFiscalQuarter.objects.update_or_create(
            security=security,
            period_end=period_end,
            defaults={
                "trade_date": trade_date,
                "close": close,
                "open": _decimal_or_none(row.get("open")),
                "high": _decimal_or_none(row.get("high")),
                "low": _decimal_or_none(row.get("low")),
                "volume": row.get("volume"),
                "source": "fmp",
            },
        )
        n += 1
    return n


def sync_security_eod_from_fmp(
    security: Security,
    *,
    years_back: int | None = None,
    session: requests.Session | None = None,
    update_cached_quote: bool = True,
) -> EodSyncResult | None:
    """
    One FMP call: pull daily EOD for configured years, store calendar quarter-end closes only,
    optionally refresh ``quote_last_price`` from the newest daily bar.
    """
    years = configured_history_years() if years_back is None else max(years_back, 1)
    to_date = timezone.localdate()
    from_date = history_start_date(to_date, years=years)
    rows = fetch_eod_bars(security, from_date=from_date, to_date=to_date, session=session)
    if not rows:
        return None

    period_ends = calendar_quarter_ends_between(from_date, to_date)
    quarters_stored = upsert_quarter_end_eod(security, rows, period_ends=period_ends)
    if quarters_stored == 0:
        return None

    latest_row = max(rows, key=lambda r: str(r.get("date", "")))
    latest_trade_date = date.fromisoformat(str(latest_row["date"])[:10])
    latest_close = _decimal_or_none(latest_row.get("close"))
    if latest_close is None:
        return None

    latest_period = (
        security.fiscal_quarters.order_by("-period_end").values_list("period_end", flat=True).first()
    )

    if update_cached_quote:
        Security.objects.filter(pk=security.pk).update(
            quote_last_price=latest_close,
            quote_updated_at=timezone.now(),
        )
        security.quote_last_price = latest_close
        security.quote_updated_at = timezone.now()

    sync_security_screening_metrics_cache(security)

    return EodSyncResult(
        quarters_stored=quarters_stored,
        latest_trade_date=latest_trade_date,
        latest_close=latest_close,
        latest_period_end=latest_period,
    )
