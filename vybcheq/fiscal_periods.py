"""Calendar fiscal quarter helpers (EOD + screening alignment)."""
from __future__ import annotations

import bisect
import calendar
from datetime import date, timedelta
from typing import Any

# FMP free tier allows ~5 years of EOD history per request; paid plans allow more.
QUARTERLY_HISTORY_YEARS = 5


def configured_history_years() -> int:
    """Years of quarter-end history to request (settings override)."""
    from django.conf import settings

    return max(int(getattr(settings, "VYBCHEQ_FMP_EOD_YEARS", QUARTERLY_HISTORY_YEARS)), 1)


def calendar_quarter_end(d: date) -> date:
    """Last calendar day of the quarter containing ``d``."""
    month = ((d.month - 1) // 3 + 1) * 3
    last_day = calendar.monthrange(d.year, month)[1]
    return date(d.year, month, last_day)


def calendar_quarter_ends_between(start: date, end: date) -> list[date]:
    """Inclusive range of calendar quarter-end dates from ``start`` through ``end``."""
    if start > end:
        return []
    first = calendar_quarter_end(start)
    if first < start:
        if first.month == 12:
            first = date(first.year + 1, 3, 31)
        elif first.month == 3:
            first = date(first.year, 6, 30)
        elif first.month == 6:
            first = date(first.year, 9, 30)
        else:
            first = date(first.year, 12, 31)
    out: list[date] = []
    cur = first
    while cur <= end:
        out.append(cur)
        if cur.month == 12:
            cur = date(cur.year + 1, 3, 31)
        elif cur.month == 3:
            cur = date(cur.year, 6, 30)
        elif cur.month == 6:
            cur = date(cur.year, 9, 30)
        else:
            cur = date(cur.year, 12, 31)
    return out


def index_eod_rows_by_date(rows: list[dict[str, Any]]) -> dict[date, dict[str, Any]]:
    indexed: dict[date, dict[str, Any]] = {}
    for row in rows:
        raw = row.get("date")
        if not raw:
            continue
        trade_date = date.fromisoformat(str(raw)[:10])
        indexed[trade_date] = row
    return indexed


def pick_bar_on_or_before(
    sorted_dates: list[date],
    rows_by_date: dict[date, dict[str, Any]],
    target: date,
) -> tuple[date, dict[str, Any]] | None:
    """Last trading day on or before ``target``."""
    if not sorted_dates:
        return None
    idx = bisect.bisect_right(sorted_dates, target) - 1
    if idx < 0:
        return None
    trade_date = sorted_dates[idx]
    return trade_date, rows_by_date[trade_date]


def history_start_date(as_of: date, *, years: int = QUARTERLY_HISTORY_YEARS) -> date:
    """Rough start date for ``years`` of quarterly history."""
    return as_of - timedelta(days=int(years * 365.25))
