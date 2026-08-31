"""
Operating cash flow from FMP stable cash-flow-statement (manual / monthly refresh).

One API call per security when annual works on the first try (free tier).
Merges ``operating_cash_flow`` into ``SecurityFiscalQuarter.metrics`` and refreshes
``Security.screening_metrics``.
"""
from __future__ import annotations

from datetime import date
from typing import Any

import requests
from django.utils import timezone

from vybcheq.fiscal_periods import configured_quarterly_row_limit, prefer_annual_fundamentals
from vybcheq.fmp_client import FmpError, fmp_get, fmp_rows
from vybcheq.fmp_fundamentals import _is_recoverable_fmp_plan_error, _map_fields, _parse_fmp_period_end
from vybcheq.market_symbols import external_symbol_for_security
from vybcheq.models import Security, SecurityFiscalQuarter
from vybcheq.screening_metrics import sync_security_screening_metrics_cache

FMP_CASH_FLOW_URL = "https://financialmodelingprep.com/stable/cash-flow-statement"

OCF_FIELD_MAP: list[tuple[str, tuple[str, ...]]] = [
    (
        "operating_cash_flow",
        (
            "operatingCashFlow",
            "netCashProvidedByOperatingActivities",
            "operatingCashFlowTTM",
        ),
    ),
]


def _fetch_cash_flow_rows_with_fallback(
    security: Security,
    *,
    session: requests.Session | None,
) -> tuple[list[dict[str, Any]], str | None]:
    sym = external_symbol_for_security(security)
    limit = configured_quarterly_row_limit()
    if prefer_annual_fundamentals():
        modes = ("annual", "quarter")
    else:
        modes = ("quarter", "annual")
    for mode in modes:
        try:
            payload = fmp_get(
                FMP_CASH_FLOW_URL,
                params={"symbol": sym, "period": mode, "limit": limit},
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


def merge_cash_flow_from_fmp(
    security: Security,
    *,
    session: requests.Session | None = None,
) -> int:
    """
    Fetch cash-flow-statement rows and upsert ``operating_cash_flow`` on fiscal quarters.
    Returns the number of quarter rows written.
    """
    sym = external_symbol_for_security(security)
    rows, mode = _fetch_cash_flow_rows_with_fallback(security, session=session)
    if not rows:
        raise FmpError(f"No cash-flow data from FMP for {sym!r}.")

    by_period: dict[date, float] = {}
    fallback_period = None
    for row in rows:
        mapped = _map_fields(row, OCF_FIELD_MAP)
        ocf = mapped.get("operating_cash_flow")
        if ocf is None:
            continue
        period_end = _parse_fmp_period_end(row)
        if period_end is None:
            if fallback_period is None:
                fallback_period = (row, float(ocf))
            continue
        by_period[period_end] = float(ocf)

    if not by_period and fallback_period is not None:
        row, ocf = fallback_period
        period_end = _parse_fmp_period_end(row)
        if period_end is not None:
            by_period[period_end] = ocf

    if not by_period:
        raise FmpError(f"No operating cash flow values from FMP for {sym!r}.")

    existing = {
        q.period_end: q
        for q in SecurityFiscalQuarter.objects.filter(
            security=security,
            period_end__in=by_period.keys(),
        )
    }
    to_create: list[SecurityFiscalQuarter] = []
    to_update: list[SecurityFiscalQuarter] = []
    for period_end, ocf in by_period.items():
        quarter = existing.get(period_end)
        if quarter is None:
            metrics = {"operating_cash_flow": ocf, "_fmp_period_mode": mode or ""}
            to_create.append(
                SecurityFiscalQuarter(
                    security=security,
                    period_end=period_end,
                    trade_date=period_end,
                    metrics=metrics,
                    source="fmp",
                )
            )
            continue
        merged = dict(quarter.metrics or {})
        merged["operating_cash_flow"] = ocf
        if mode:
            merged["_fmp_cash_flow_mode"] = mode
        quarter.metrics = merged
        to_update.append(quarter)

    if to_create:
        SecurityFiscalQuarter.objects.bulk_create(to_create)
    if to_update:
        SecurityFiscalQuarter.objects.bulk_update(to_update, ["metrics"])

    updated = len(to_create) + len(to_update)
    if updated == 0:
        raise FmpError(f"No fiscal quarter rows updated from cash flow for {sym!r}.")

    security.refresh_from_db()
    sync_security_screening_metrics_cache(security)
    Security.objects.filter(pk=security.pk).update(quote_updated_at=timezone.now())
    return updated
