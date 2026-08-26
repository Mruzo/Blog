"""
Financial report filing dates from FMP stable endpoint (manual admin refresh only).

One API call per security: ``/stable/financial-reports-dates``.
Upserts ``report_date`` on ``SecurityFiscalQuarter`` rows (matched by year + period)
and caches ``Security.last_report_date``.
"""
from __future__ import annotations

from datetime import date
from typing import Any

import requests
from django.utils import timezone

from vybcheq.fmp_client import FmpError, fmp_get, fmp_rows
from vybcheq.market_symbols import external_symbol_for_security
from vybcheq.models import Security, SecurityFiscalQuarter

FMP_REPORT_DATES_URL = "https://financialmodelingprep.com/stable/financial-reports-dates"

_PERIOD_MONTH = {
    "Q1": 3,
    "Q2": 6,
    "Q3": 9,
    "Q4": 12,
    "FY": 12,
}


def _parse_iso_date(raw: Any) -> date | None:
    if raw is None:
        return None
    text = str(raw).strip()[:10]
    if not text:
        return None
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def period_end_from_fmp_period(year: int, period: str) -> date | None:
    """Map FMP year + period (Q1–Q4, FY) to calendar quarter-end."""
    key = (period or "").strip().upper()
    month = _PERIOD_MONTH.get(key)
    if month is None:
        return None
    if month == 3:
        return date(year, 3, 31)
    if month == 6:
        return date(year, 6, 30)
    if month == 9:
        return date(year, 9, 30)
    return date(year, 12, 31)


def _parse_report_row(row: dict[str, Any]) -> tuple[date, date | None] | None:
    """
    Return (report_date, period_end) for one FMP row, or None if unusable.

    FMP typically returns publication ``date`` plus ``year`` and ``period`` (Q1–Q4 / FY).
    """
    report_date = _parse_iso_date(
        row.get("date")
        or row.get("filingDate")
        or row.get("fillingDate")
        or row.get("acceptedDate")
    )
    if report_date is None:
        return None

    year_raw = row.get("year") or row.get("fiscalYear")
    period_raw = row.get("period")
    period_end: date | None = None
    if year_raw is not None and period_raw:
        try:
            year = int(year_raw)
        except (TypeError, ValueError):
            year = None
        if year is not None:
            period_end = period_end_from_fmp_period(year, str(period_raw))

    return report_date, period_end


def fetch_report_dates_fmp(
    security: Security,
    *,
    session: requests.Session | None = None,
) -> list[tuple[date, date | None]]:
    """One stable FMP call → list of (report_date, period_end or None)."""
    sym = external_symbol_for_security(security)
    payload = fmp_get(
        FMP_REPORT_DATES_URL,
        params={"symbol": sym},
        session=session,
        symbol=sym,
    )
    rows = fmp_rows(payload)
    if not rows:
        raise FmpError(f"No financial report dates from FMP for {sym!r}.")

    parsed: list[tuple[date, date | None]] = []
    for row in rows:
        item = _parse_report_row(row)
        if item is not None:
            parsed.append(item)
    if not parsed:
        raise FmpError(f"No usable report dates from FMP for {sym!r}.")
    return parsed


def merge_report_dates_from_fmp(
    security: Security,
    *,
    session: requests.Session | None = None,
) -> int:
    """
    Fetch filing dates and upsert ``SecurityFiscalQuarter.report_date`` rows.
    Returns the number of quarter rows written.
    """
    sym = external_symbol_for_security(security)
    parsed = fetch_report_dates_fmp(security, session=session)
    latest_report: date | None = None
    by_period: dict[date, date] = {}
    for report_date, period_end in parsed:
        if latest_report is None or report_date > latest_report:
            latest_report = report_date
        if period_end is None:
            continue
        # Last row wins for a period (API order is typically newest-first).
        by_period[period_end] = report_date

    if not by_period and latest_report is None:
        raise FmpError(f"No quarter rows updated from FMP report dates for {sym!r}.")

    updated = 0
    if by_period:
        existing = {
            q.period_end: q
            for q in SecurityFiscalQuarter.objects.filter(
                security=security,
                period_end__in=by_period.keys(),
            )
        }
        to_create: list[SecurityFiscalQuarter] = []
        to_update: list[SecurityFiscalQuarter] = []
        for period_end, report_date in by_period.items():
            quarter = existing.get(period_end)
            if quarter is None:
                to_create.append(
                    SecurityFiscalQuarter(
                        security=security,
                        period_end=period_end,
                        trade_date=period_end,
                        report_date=report_date,
                        source="fmp",
                    )
                )
                continue
            if quarter.report_date != report_date:
                quarter.report_date = report_date
                to_update.append(quarter)
        if to_create:
            SecurityFiscalQuarter.objects.bulk_create(to_create)
            updated += len(to_create)
        if to_update:
            SecurityFiscalQuarter.objects.bulk_update(to_update, ["report_date"])
            updated += len(to_update)

    if latest_report is not None:
        Security.objects.filter(pk=security.pk).update(
            last_report_date=latest_report,
            report_dates_updated_at=timezone.now(),
        )

    if updated == 0 and latest_report is None:
        raise FmpError(f"No quarter rows updated from FMP report dates for {sym!r}.")

    return updated
