"""
Quarterly fundamentals from FMP stable endpoints (manual admin refresh only).

Two API calls per security: ratios + key-metrics (both fundamentals, no EOD).
Stores ratios/margins, raw JSON, and the **price FMP implied** for valuation
(P/E × EPS, P/B × book, or market cap ÷ shares) on each fiscal quarter row.
"""
from __future__ import annotations

import time
from datetime import date
from decimal import Decimal
from typing import Any

import requests
from django.utils import timezone

from vybcheq.fiscal_periods import calendar_quarter_end, configured_history_years
from vybcheq.fmp_client import FmpError, fmp_action_gap_seconds, fmp_get, fmp_rows
from vybcheq.market_symbols import external_symbol_for_security
from vybcheq.models import Security, SecurityFiscalQuarter
from vybcheq.money import quantize_money
from vybcheq.screening_metrics import sync_security_screening_metrics_cache

FMP_KEY_METRICS_URL = "https://financialmodelingprep.com/stable/key-metrics"
FMP_RATIOS_URL = "https://financialmodelingprep.com/stable/ratios"

# key-metrics → screening_metrics keys
_KEY_METRICS_MAP: list[tuple[str, tuple[str, ...]]] = [
    ("pe_ratio", ("peRatio", "priceToEarningsRatio", "priceEarningsRatio", "peRatioTTM")),
    ("forward_pe_ratio", ("forwardPEratio", "forwardPeRatio", "forwardPeRatioTTM")),
    ("price_to_book", ("pbRatio", "priceToBookRatio", "priceBookValueRatio", "pbRatioTTM")),
    ("roe", ("returnOnEquity", "returnOnEquityTTM", "roe", "roeTTM")),
    ("market_cap", ("marketCap", "marketCapTTM")),
    ("revenue_growth_yoy", ("revenueGrowth", "revenueGrowthTTM")),
    ("earnings_growth_yoy", ("earningsGrowth", "earningsGrowthTTM", "epsgrowth", "epsgrowthTTM")),
    ("dividend_yield", ("dividendYield", "dividendYieldTTM", "dividendYielTTM")),
]

# ratios → screening_metrics keys (incl. common vibe-check rule sets)
_RATIOS_MAP: list[tuple[str, tuple[str, ...]]] = [
    ("gross_margin", ("grossProfitMargin", "grossProfitMarginTTM")),
    ("pretax_margin", ("pretaxProfitMargin", "preTaxProfitMargin", "pretaxProfitMarginTTM")),
    ("net_margin", ("netProfitMargin", "netProfitMarginTTM")),
    ("debt_to_equity", ("debtEquityRatio", "debtToEquity", "debtToEquityRatioTTM", "debtEquityRatioTTM")),
    ("current_ratio", ("currentRatio", "currentRatioTTM")),
    ("quick_ratio", ("quickRatio", "quickRatioTTM")),
    ("pe_ratio", ("priceToEarningsRatio", "priceToEarningsRatioTTM", "peRatio", "peRatioTTM")),
    ("price_to_book", ("priceToBookRatio", "priceToBookRatioTTM", "pbRatio", "pbRatioTTM")),
]

_DIRECT_PRICE_KEYS = ("price", "stockPrice", "sharePrice", "close")


def _num(value: Any) -> float | None:
    if value is None:
        return None
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    if v != v:
        return None
    return v


def _parse_fmp_row_date(row: dict[str, Any]) -> date | None:
    raw = row.get("date") or row.get("period")
    if raw is None:
        return None
    if isinstance(raw, int):
        return calendar_quarter_end(date(raw, 12, 31))
    text = str(raw)[:10]
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def _parse_fmp_period_end(row: dict[str, Any]) -> date | None:
    row_date = _parse_fmp_row_date(row)
    if row_date is None:
        return None
    return calendar_quarter_end(row_date)


def _map_fields(row: dict[str, Any], field_map: list[tuple[str, tuple[str, ...]]]) -> dict[str, Any]:
    mapped: dict[str, Any] = {}
    for our_key, fmp_keys in field_map:
        for fmp_key in fmp_keys:
            v = _num(row.get(fmp_key))
            if v is not None:
                mapped[our_key] = v
                break
    return mapped


def implied_price_from_fmp_row(row: dict[str, Any]) -> tuple[Decimal | None, str | None]:
    """
    Price aligned with FMP valuation ratios (same inputs they use for P/E, P/B, etc.).
    """
    for key in _DIRECT_PRICE_KEYS:
        v = quantize_money(row.get(key))
        if v is not None and v > 0:
            return v, f"direct:{key}"

    pe = _num(
        row.get("peRatio")
        or row.get("priceToEarningsRatio")
        or row.get("priceToEarningsRatioTTM")
    )
    eps = _num(
        row.get("netIncomePerShare")
        or row.get("eps")
        or row.get("earningsPerShare")
        or row.get("netIncomePerShareTTM")
    )
    if pe is not None and eps is not None and eps > 0:
        return quantize_money(pe * eps), "pe_x_eps"

    pb = _num(row.get("priceToBookRatio") or row.get("pbRatio") or row.get("priceToBookRatioTTM"))
    bv = _num(row.get("bookValuePerShare") or row.get("bookValuePerShareTTM"))
    if pb is not None and bv is not None and bv > 0:
        return quantize_money(pb * bv), "pb_x_book"

    mc = _num(row.get("marketCap") or row.get("marketCapTTM"))
    shares = _num(
        row.get("weightedAverageShsOut")
        or row.get("weightedAverageShsOutDil")
        or row.get("numberOfShares")
        or row.get("sharesOutstanding")
    )
    if mc is not None and shares is not None and shares > 0:
        return quantize_money(mc / shares), "market_cap_shares"

    return None, None


def _fetch_quarterly_rows(
    security: Security,
    url: str,
    *,
    limit: int,
    session: requests.Session | None,
) -> list[dict[str, Any]]:
    sym = external_symbol_for_security(security)
    payload = fmp_get(
        url,
        params={"symbol": sym, "period": "quarter", "limit": limit},
        session=session,
        symbol=sym,
    )
    return fmp_rows(payload)


def fetch_quarterly_fundamentals_fmp(
    security: Security,
    *,
    limit: int | None = None,
    session: requests.Session | None = None,
) -> dict[date, dict[str, Any]]:
    """Two stable FMP calls → merged rows keyed by calendar quarter-end."""
    row_limit = limit if limit is not None else configured_history_years() * 4
    sym = external_symbol_for_security(security)

    ratios_rows = _fetch_quarterly_rows(
        security, FMP_RATIOS_URL, limit=row_limit, session=session
    )
    time.sleep(fmp_action_gap_seconds())
    metrics_rows = _fetch_quarterly_rows(
        security, FMP_KEY_METRICS_URL, limit=row_limit, session=session
    )

    if not ratios_rows and not metrics_rows:
        raise FmpError(f"No quarterly fundamentals from FMP for {sym!r}.")

    by_period: dict[date, dict[str, Any]] = {}

    def _merge_rows(rows: list[dict[str, Any]], bucket: str) -> None:
        for row in rows:
            period_end = _parse_fmp_period_end(row)
            if period_end is None:
                continue
            slot = by_period.setdefault(period_end, {})
            slot[bucket] = row
            row_date = _parse_fmp_row_date(row)
            if row_date is not None:
                slot["row_date"] = row_date

    _merge_rows(ratios_rows, "ratios")
    _merge_rows(metrics_rows, "key_metrics")
    return by_period


def _build_period_payload(
    period_end: date,
    parts: dict[str, Any],
    *,
    sym: str,
) -> tuple[dict[str, Any], date, Decimal | None]:
    ratios_row = parts.get("ratios") or {}
    metrics_row = parts.get("key_metrics") or {}
    combined = {**metrics_row, **ratios_row}

    mapped = _map_fields(metrics_row, _KEY_METRICS_MAP)
    mapped.update(_map_fields(ratios_row, _RATIOS_MAP))

    price, price_method = implied_price_from_fmp_row(combined)
    if price_method:
        mapped["_price_method"] = price_method

    mapped["_raw"] = {"ratios": ratios_row, "key_metrics": metrics_row}
    mapped["_fmp_symbol"] = sym
    if parts.get("row_date"):
        mapped["_fmp_period_end"] = parts["row_date"].isoformat()

    trade_date = parts.get("row_date") or period_end
    return mapped, trade_date, price


def merge_quarterly_fundamentals_from_fmp(
    security: Security,
    *,
    session: requests.Session | None = None,
    update_cached_quote: bool = True,
) -> int:
    """
    Fetch quarterly ratios + key-metrics; upsert SecurityFiscalQuarter rows.
    Returns the number of fiscal quarter rows written.
    """
    sym = external_symbol_for_security(security)
    by_period = fetch_quarterly_fundamentals_fmp(security, session=session)
    updated = 0

    for period_end, parts in sorted(by_period.items()):
        mapped, trade_date, price = _build_period_payload(period_end, parts, sym=sym)

        quarter = SecurityFiscalQuarter.objects.filter(
            security=security,
            period_end=period_end,
        ).first()

        if quarter is None:
            SecurityFiscalQuarter.objects.create(
                security=security,
                period_end=period_end,
                trade_date=trade_date,
                close=price,
                metrics=mapped,
                source="fmp",
            )
        else:
            merged = dict(quarter.metrics or {})
            merged.update(mapped)
            quarter.metrics = merged
            quarter.trade_date = trade_date
            if price is not None:
                quarter.close = price
            quarter.save(update_fields=["metrics", "trade_date", "close"])
        updated += 1

    if updated == 0:
        raise FmpError(f"No usable quarterly fundamentals from FMP for {sym!r}.")

    sync_security_screening_metrics_cache(security)

    if update_cached_quote:
        latest = security.fiscal_quarters.order_by("-period_end").first()
        if latest and latest.close is not None:
            Security.objects.filter(pk=security.pk).update(
                quote_last_price=latest.close,
                quote_updated_at=timezone.now(),
            )

    return updated


def fetch_screening_metrics_fmp(
    security: Security,
    *,
    session: requests.Session | None = None,
) -> dict[str, Any]:
    merge_quarterly_fundamentals_from_fmp(security, session=session)
    security.refresh_from_db()
    return dict(security.screening_metrics or {})


def merge_screening_metrics_from_fmp(security: Security, *, session: requests.Session | None = None) -> dict[str, Any]:
    merge_quarterly_fundamentals_from_fmp(security, session=session)
    security.refresh_from_db()
    return dict(security.screening_metrics or {})
