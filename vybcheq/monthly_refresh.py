"""
Two-phase monthly FMP refresh for the watchlist (free-tier friendly).

Phase ``fundamentals`` — day before month-end (~3 API calls/security with annual-first):
  ratios + key-metrics + financial-growth, 5 annual rows for 5y averages.

Phase ``eod-cashflow`` — month-end (~2 API calls/security):
  EOD history + cash-flow-statement for operating_cash_flow.
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Callable, Iterable

import requests

from vybcheq.fiscal_periods import (
    configured_fmp_daily_call_budget,
    configured_history_years,
    prefer_annual_fundamentals,
)
from vybcheq.fmp_cash_flow import merge_cash_flow_from_fmp
from vybcheq.fmp_client import FmpError, fmp_action_gap_seconds
from vybcheq.fmp_eod import FmpEodError, sync_security_eod_from_fmp
from vybcheq.fmp_fundamentals import merge_screening_metrics_from_fmp
from vybcheq.market_symbols import MarketSymbolError
from vybcheq.models import Security, WatchlistEntry

PHASE_FUNDAMENTALS = "fundamentals"
PHASE_EOD_CASHFLOW = "eod-cashflow"
PHASES = (PHASE_FUNDAMENTALS, PHASE_EOD_CASHFLOW)


@dataclass
class MonthlyRefreshResult:
    phase: str
    securities_total: int
    securities_ok: int
    estimated_calls: int
    errors: list[str]


def watchlist_securities(
    *,
    symbol: str | None = None,
    all_active: bool = False,
) -> list[Security]:
    qs = Security.objects.filter(is_active=True)
    if symbol:
        qs = qs.filter(symbol__iexact=symbol.strip())
    elif not all_active:
        qs = qs.filter(watchlist_entry__isnull=False).distinct()
    return list(qs.select_related("watchlist_entry").order_by("exchange", "symbol"))


def estimated_calls_per_security(phase: str) -> int:
    annual_first = prefer_annual_fundamentals()
    if phase == PHASE_FUNDAMENTALS:
        return 3 if annual_first else 5
    if phase == PHASE_EOD_CASHFLOW:
        return 2 if annual_first else 3
    raise ValueError(f"Unknown phase: {phase!r}")


def estimate_phase_calls(securities_count: int, phase: str) -> int:
    return securities_count * estimated_calls_per_security(phase)


def run_monthly_refresh_phase(
    phase: str,
    securities: Iterable[Security],
    *,
    session: requests.Session | None = None,
    log: Callable[[str], None] | None = None,
) -> MonthlyRefreshResult:
    if phase not in PHASES:
        raise ValueError(f"Unknown phase: {phase!r}. Choose: {', '.join(PHASES)}")

    sec_list = list(securities)
    if not sec_list:
        return MonthlyRefreshResult(
            phase=phase,
            securities_total=0,
            securities_ok=0,
            estimated_calls=0,
            errors=[],
        )

    if session is None:
        session = requests.Session()
    gap = fmp_action_gap_seconds()
    errors: list[str] = []
    ok = 0
    years = configured_history_years()

    for i, sec in enumerate(sec_list):
        if i > 0:
            time.sleep(gap)
        try:
            if phase == PHASE_FUNDAMENTALS:
                merge_screening_metrics_from_fmp(sec, session=session)
                if log:
                    log(f"{sec.symbol}: fundamentals refreshed")
            else:
                sync_security_eod_from_fmp(
                    sec,
                    years_back=years,
                    session=session,
                    update_cached_quote=True,
                )
                merge_cash_flow_from_fmp(sec, session=session)
                if log:
                    log(f"{sec.symbol}: EOD + cash flow refreshed")
            ok += 1
        except (FmpError, FmpEodError, MarketSymbolError) as exc:
            errors.append(f"{sec}: {exc}")
            if log:
                log(f"{sec.symbol}: ERROR {exc}")
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{sec}: {exc}")
            if log:
                log(f"{sec.symbol}: ERROR {exc}")

    return MonthlyRefreshResult(
        phase=phase,
        securities_total=len(sec_list),
        securities_ok=ok,
        estimated_calls=estimate_phase_calls(len(sec_list), phase),
        errors=errors,
    )


def watchlist_count() -> int:
    return WatchlistEntry.objects.count()


def phase_schedule_hint(phase: str) -> str:
    if phase == PHASE_FUNDAMENTALS:
        return "Run day before month-end (ratios, key-metrics, growth; 5 annual rows)."
    return "Run on month-end (EOD prices + operating cash flow)."


def budget_warning(securities_count: int, phase: str) -> str | None:
    est = estimate_phase_calls(securities_count, phase)
    budget = configured_fmp_daily_call_budget()
    if est > budget:
        return (
            f"Estimated {est} API calls exceeds daily budget ({budget}). "
            "Split across days or reduce watchlist size."
        )
    remaining = budget - est
    return None if remaining >= 0 else f"Over budget by {-remaining} calls."
