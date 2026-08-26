"""
Quarterly fundamentals from FMP stable endpoints (manual admin refresh only).

Three API calls per security when growth is available: ratios + key-metrics +
financial-growth. Growth is best-effort (skipped if the plan blocks it).
Stores ratios/margins, growth rates, raw JSON, and the **price FMP implied** for
valuation (P/E × EPS, P/B × book, or market cap ÷ shares) on each fiscal quarter row.
"""
from __future__ import annotations

import time
from datetime import date
from decimal import Decimal
from typing import Any

import requests
from django.utils import timezone

from vybcheq.fiscal_periods import calendar_quarter_end, configured_quarterly_row_limit
from vybcheq.fmp_client import (
    FmpError,
    fmp_action_gap_seconds,
    fmp_first_row,
    fmp_get,
    fmp_rows,
)
from vybcheq.market_symbols import external_symbol_for_security
from vybcheq.models import Security, SecurityFiscalQuarter
from vybcheq.quote_cache import apply_implied_quote
from vybcheq.money import quantize_money
from vybcheq.screening_metrics import sync_security_screening_metrics_cache

FMP_KEY_METRICS_URL = "https://financialmodelingprep.com/stable/key-metrics"
FMP_RATIOS_URL = "https://financialmodelingprep.com/stable/ratios"
FMP_KEY_METRICS_TTM_URL = "https://financialmodelingprep.com/stable/key-metrics-ttm"
FMP_RATIOS_TTM_URL = "https://financialmodelingprep.com/stable/ratios-ttm"
FMP_FINANCIAL_GROWTH_URL = "https://financialmodelingprep.com/stable/financial-growth"

# key-metrics → screening_metrics keys
_KEY_METRICS_MAP: list[tuple[str, tuple[str, ...]]] = [
    ("pe_ratio", ("peRatio", "priceToEarningsRatio", "priceEarningsRatio", "peRatioTTM")),
    ("forward_pe_ratio", ("forwardPEratio", "forwardPeRatio", "forwardPeRatioTTM")),
    ("price_to_book", ("pbRatio", "priceToBookRatio", "priceBookValueRatio", "pbRatioTTM")),
    ("roe", ("returnOnEquity", "returnOnEquityTTM", "roe", "roeTTM")),
    ("market_cap", ("marketCap", "marketCapTTM")),
    # Growth usually lives on financial-growth; keep these as soft fallbacks.
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

# financial-growth → screening_metrics keys
_GROWTH_MAP: list[tuple[str, tuple[str, ...]]] = [
    ("revenue_growth_yoy", ("revenueGrowth", "growthRevenue", "revenueGrowthTTM")),
    (
        "earnings_growth_yoy",
        (
            "epsgrowth",
            "epsGrowth",
            "netIncomeGrowth",
            "growthNetIncome",
            "earningsGrowth",
            "earningsGrowthTTM",
        ),
    ),
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


def _is_recoverable_fmp_plan_error(exc: FmpError) -> bool:
    """402s that may succeed with different query params (period, limit, endpoint)."""
    text = str(exc).lower()
    return "402" in text or "plan limit" in text


def _fetch_endpoint_rows_with_fallback(
    security: Security,
    url: str,
    ttm_url: str,
    *,
    limit: int,
    session: requests.Session | None,
) -> tuple[list[dict[str, Any]], str]:
    """
    Fetch ratios or key-metrics, falling back when FMP blocks query params.

    Order: period=quarter → period=annual → TTM snapshot (free tier friendly).
    """
    sym = external_symbol_for_security(security)
    attempts: list[tuple[str, str, dict[str, Any]]] = [
        ("quarter", url, {"symbol": sym, "period": "quarter", "limit": limit}),
        ("annual", url, {"symbol": sym, "period": "annual", "limit": limit}),
        ("ttm", ttm_url, {"symbol": sym}),
    ]
    errors: list[str] = []

    for mode, fetch_url, params in attempts:
        try:
            payload = fmp_get(fetch_url, params=params, session=session, symbol=sym)
            if mode == "ttm":
                row = fmp_first_row(payload)
                rows = [row] if row else fmp_rows(payload)[:1]
            else:
                rows = fmp_rows(payload)
            if rows:
                return rows, mode
            errors.append(f"{mode}: empty response")
        except FmpError as exc:
            if _is_recoverable_fmp_plan_error(exc):
                errors.append(f"{mode}: {exc}")
                continue
            raise

    raise FmpError(
        f"Fundamentals unavailable for {sym!r} on your FMP plan. "
        f"Tried quarter, annual, and TTM. {' | '.join(errors)}"
    )


def _fetch_growth_rows_with_fallback(
    security: Security,
    *,
    limit: int,
    session: requests.Session | None,
) -> tuple[list[dict[str, Any]], str | None]:
    """
    Fetch financial-growth rows (quarter → annual). Best-effort: return empty on plan blocks.
    Growth lives on this endpoint, not on ratios/key-metrics.
    """
    sym = external_symbol_for_security(security)
    attempts: list[tuple[str, dict[str, Any]]] = [
        ("quarter", {"symbol": sym, "period": "quarter", "limit": limit}),
        ("annual", {"symbol": sym, "period": "annual", "limit": limit}),
    ]
    for mode, params in attempts:
        try:
            payload = fmp_get(
                FMP_FINANCIAL_GROWTH_URL,
                params=params,
                session=session,
                symbol=sym,
            )
            rows = fmp_rows(payload)
            if rows:
                return rows, mode
        except FmpError as exc:
            if _is_recoverable_fmp_plan_error(exc):
                continue
            raise
    return [], None


def fetch_quarterly_fundamentals_fmp(
    security: Security,
    *,
    limit: int | None = None,
    session: requests.Session | None = None,
) -> dict[date, dict[str, Any]]:
    """Stable FMP calls → merged rows keyed by calendar quarter-end."""
    row_limit = limit if limit is not None else configured_quarterly_row_limit()
    sym = external_symbol_for_security(security)

    ratios_rows, ratios_mode = _fetch_endpoint_rows_with_fallback(
        security,
        FMP_RATIOS_URL,
        FMP_RATIOS_TTM_URL,
        limit=row_limit,
        session=session,
    )
    time.sleep(fmp_action_gap_seconds())
    metrics_rows, metrics_mode = _fetch_endpoint_rows_with_fallback(
        security,
        FMP_KEY_METRICS_URL,
        FMP_KEY_METRICS_TTM_URL,
        limit=row_limit,
        session=session,
    )
    time.sleep(fmp_action_gap_seconds())
    growth_rows, growth_mode = _fetch_growth_rows_with_fallback(
        security,
        limit=row_limit,
        session=session,
    )

    if not ratios_rows and not metrics_rows:
        raise FmpError(f"No quarterly fundamentals from FMP for {sym!r}.")

    period_mode = metrics_mode if metrics_mode == ratios_mode else f"{ratios_mode}+{metrics_mode}"
    if growth_mode and growth_mode not in period_mode:
        period_mode = f"{period_mode}+growth:{growth_mode}"
    by_period: dict[date, dict[str, Any]] = {}
    fallback_period_end = calendar_quarter_end(timezone.localdate())

    def _merge_rows(rows: list[dict[str, Any]], bucket: str) -> None:
        for row in rows:
            period_end = _parse_fmp_period_end(row)
            if period_end is None:
                period_end = fallback_period_end
            slot = by_period.setdefault(period_end, {})
            slot[bucket] = row
            row_date = _parse_fmp_row_date(row)
            if row_date is not None:
                slot["row_date"] = row_date
            slot["period_mode"] = period_mode

    _merge_rows(ratios_rows, "ratios")
    _merge_rows(metrics_rows, "key_metrics")
    if growth_rows:
        _merge_rows(growth_rows, "growth")
    return by_period


def _build_period_payload(
    period_end: date,
    parts: dict[str, Any],
    *,
    sym: str,
) -> tuple[dict[str, Any], date, Decimal | None]:
    ratios_row = parts.get("ratios") or {}
    metrics_row = parts.get("key_metrics") or {}
    growth_row = parts.get("growth") or {}
    combined = {**metrics_row, **ratios_row, **growth_row}

    mapped = _map_fields(metrics_row, _KEY_METRICS_MAP)
    mapped.update(_map_fields(ratios_row, _RATIOS_MAP))
    # Growth endpoint wins over soft key-metrics fallbacks.
    mapped.update(_map_fields(growth_row, _GROWTH_MAP))

    price, price_method = implied_price_from_fmp_row(combined)
    if price_method:
        mapped["_price_method"] = price_method

    mapped["_raw"] = {
        "ratios": ratios_row,
        "key_metrics": metrics_row,
        "growth": growth_row,
    }
    mapped["_fmp_symbol"] = sym
    if parts.get("period_mode"):
        mapped["_fmp_period_mode"] = parts["period_mode"]
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
    Fetch ratios + key-metrics (+ financial-growth when available); upsert fiscal rows.
    Returns the number of fiscal quarter rows written.
    """
    sym = external_symbol_for_security(security)
    by_period = fetch_quarterly_fundamentals_fmp(security, session=session)
    if not by_period:
        raise FmpError(f"No usable quarterly fundamentals from FMP for {sym!r}.")

    period_ends = list(by_period)
    existing = {
        q.period_end: q
        for q in SecurityFiscalQuarter.objects.filter(
            security=security,
            period_end__in=period_ends,
        )
    }
    to_create: list[SecurityFiscalQuarter] = []
    to_update: list[SecurityFiscalQuarter] = []
    latest_period: date | None = None
    latest_price: Decimal | None = None
    latest_metrics: dict[str, Any] | None = None

    for period_end, parts in sorted(by_period.items()):
        mapped, trade_date, price = _build_period_payload(period_end, parts, sym=sym)
        if price is not None and (latest_period is None or period_end >= latest_period):
            latest_period = period_end
            latest_price = price
            latest_metrics = mapped

        quarter = existing.get(period_end)
        if quarter is None:
            to_create.append(
                SecurityFiscalQuarter(
                    security=security,
                    period_end=period_end,
                    trade_date=trade_date,
                    implied_close=price,
                    metrics=mapped,
                    source="fmp",
                )
            )
            continue

        merged = dict(quarter.metrics or {})
        merged.update(mapped)
        quarter.metrics = merged
        quarter.trade_date = trade_date
        if price is not None:
            quarter.implied_close = price
        to_update.append(quarter)

    if to_create:
        SecurityFiscalQuarter.objects.bulk_create(to_create)
    if to_update:
        SecurityFiscalQuarter.objects.bulk_update(
            to_update, ["metrics", "trade_date", "implied_close"]
        )

    updated = len(to_create) + len(to_update)
    if updated == 0:
        raise FmpError(f"No usable quarterly fundamentals from FMP for {sym!r}.")

    sync_security_screening_metrics_cache(security)

    if update_cached_quote and latest_price is not None and latest_period is not None:
        metrics = latest_metrics or {}
        apply_implied_quote(
            security,
            close=latest_price,
            period_end=latest_period,
            method=metrics.get("_price_method"),
            period_mode=metrics.get("_fmp_period_mode"),
            save=True,
        )

    return updated


def fetch_screening_metrics_fmp(
    security: Security,
    *,
    session: requests.Session | None = None,
) -> dict[str, Any]:
    merge_quarterly_fundamentals_from_fmp(security, session=session)
    return dict(security.screening_metrics or {})


def merge_screening_metrics_from_fmp(security: Security, *, session: requests.Session | None = None) -> dict[str, Any]:
    merge_quarterly_fundamentals_from_fmp(security, session=session)
    return dict(security.screening_metrics or {})
