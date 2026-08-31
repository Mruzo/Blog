"""Resolve screening inputs from fiscal quarter rows (latest + 5-year averages)."""
from __future__ import annotations

from decimal import Decimal
from typing import Any, Iterable

from vybcheq.models import Security, SecurityFiscalQuarter

FIVE_YEAR_AVG_METRICS: tuple[tuple[str, str], ...] = (
    ("revenue_growth_5y_avg", "revenue_growth_yoy"),
    ("earnings_growth_5y_avg", "earnings_growth_yoy"),
    ("roe_5y_avg", "roe"),
    ("gross_margin_5y_avg", "gross_margin"),
    ("roa_5y_avg", "roa"),
)

PER_PERIOD_SNAPSHOT_KEYS: tuple[str, ...] = (
    "gross_margin",
    "pretax_margin",
    "net_margin",
    "debt_to_equity",
    "current_ratio",
    "quick_ratio",
    "pe_ratio",
    "forward_pe_ratio",
    "price_to_book",
    "roe",
    "roa",
    "eps",
    "revenue_growth_yoy",
    "earnings_growth_yoy",
    "dividend_yield",
    "market_cap",
    "operating_cash_flow",
)

FIVE_YEAR_AVG_YEARS = 5


def _num(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        value = float(value)
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    if v != v:
        return None
    return v


def metrics_from_fiscal_quarter(quarter: SecurityFiscalQuarter) -> dict[str, Any]:
    """Flat dict for rule evaluation: stored metrics plus explicit close fields."""
    out: dict[str, Any] = dict(quarter.metrics or {})
    implied = _num(quarter.implied_close)
    eod = _num(quarter.close)
    if implied is not None:
        out["close"] = round(implied, 2)
        out["implied_close"] = round(implied, 2)
    elif eod is not None:
        out["close"] = round(eod, 2)
    if eod is not None:
        out["eod_close"] = round(eod, 2)
    out["period_end"] = quarter.period_end.isoformat()
    out["trade_date"] = quarter.trade_date.isoformat()
    if quarter.eod_trade_date is not None:
        out["eod_trade_date"] = quarter.eod_trade_date.isoformat()
    if quarter.report_date is not None:
        out["report_date"] = quarter.report_date.isoformat()
    return out


def slim_metrics_snapshot(metrics: dict[str, Any]) -> dict[str, Any]:
    """Drop internal ``_`` keys (e.g. FMP ``_raw``) before persisting screen results."""
    return {k: v for k, v in metrics.items() if not str(k).startswith("_")}


def _quarter_has_usable_metrics(quarter: SecurityFiscalQuarter) -> bool:
    metrics = quarter.metrics or {}
    return any(k for k in metrics if not str(k).startswith("_"))


def pick_latest_quarter_for_screening(
    quarters: Iterable[SecurityFiscalQuarter],
) -> SecurityFiscalQuarter | None:
    """
    Prefer newest quarter with implied_close, else newest with non-internal metrics,
    else newest overall. ``quarters`` should be newest-first.
    """
    ordered = list(quarters)
    if not ordered:
        return None
    for q in ordered:
        if q.implied_close is not None:
            return q
    for q in ordered:
        if _quarter_has_usable_metrics(q):
            return q
    return ordered[0]


def _latest_value_for_key(
    quarters: list[SecurityFiscalQuarter],
    key: str,
) -> Any | None:
    for quarter in quarters:
        metrics = quarter.metrics or {}
        if key in metrics and metrics[key] is not None:
            return metrics[key]
    return None


def _average_base_metric(
    quarters: list[SecurityFiscalQuarter],
    base_key: str,
    *,
    years: int = FIVE_YEAR_AVG_YEARS,
) -> float | None:
    values: list[float] = []
    for quarter in quarters:
        metrics = quarter.metrics or {}
        v = _num(metrics.get(base_key))
        if v is not None:
            values.append(v)
        if len(values) >= years:
            break
    if not values:
        return None
    return sum(values) / len(values)


def build_screening_metrics_from_fiscal_quarters(
    security: Security,
    *,
    recent: list[SecurityFiscalQuarter] | None = None,
) -> dict[str, Any]:
    """
    Build flat screening inputs: quote fields from the best quarter row, snapshot
    metrics from the newest period that has each key, plus 5-year averages.
    """
    if recent is None:
        recent = list(security.fiscal_quarters.order_by("-period_end")[:40])
    anchor = pick_latest_quarter_for_screening(recent)
    if anchor is None:
        return dict(security.screening_metrics or {})

    out = metrics_from_fiscal_quarter(anchor)
    for key in PER_PERIOD_SNAPSHOT_KEYS:
        if key in out and out[key] is not None:
            continue
        value = _latest_value_for_key(recent, key)
        if value is not None:
            out[key] = value

    for avg_key, base_key in FIVE_YEAR_AVG_METRICS:
        avg = _average_base_metric(recent, base_key)
        if avg is not None:
            out[avg_key] = avg

    return out


def five_year_avg_snapshots(
    security: Security,
    *,
    recent: list[SecurityFiscalQuarter] | None = None,
) -> dict[str, dict[str, Any]]:
    """
    Current trailing average per ``*_5y_avg`` key — same inputs screening rules use.

    Returns metadata so the dashboard can show confidence (periods used) and context
    (latest single-period value).
    """
    if recent is None:
        recent = list(security.fiscal_quarters.order_by("-period_end")[:40])
    out: dict[str, dict[str, Any]] = {}
    for avg_key, base_key in FIVE_YEAR_AVG_METRICS:
        periods: list[tuple[str, float]] = []
        for quarter in recent:
            v = _num((quarter.metrics or {}).get(base_key))
            if v is not None:
                periods.append((quarter.period_end.isoformat(), v))
            if len(periods) >= FIVE_YEAR_AVG_YEARS:
                break
        if not periods:
            continue
        nums = [v for _iso, v in periods]
        out[avg_key] = {
            "value": sum(nums) / len(nums),
            "periods_used": len(periods),
            "periods_max": FIVE_YEAR_AVG_YEARS,
            "as_of_period": periods[0][0],
            "latest_value": periods[0][1],
            "latest_period": periods[0][0],
            "base_key": base_key,
        }
    return out


def latest_fiscal_quarter(security: Security) -> SecurityFiscalQuarter | None:
    return security.fiscal_quarters.order_by("-period_end").first()


def latest_fiscal_quarter_for_screening(security: Security) -> SecurityFiscalQuarter | None:
    """Prefer the newest quarter row that has fundamentals, not just the newest calendar period."""
    recent = list(security.fiscal_quarters.order_by("-period_end")[:40])
    return pick_latest_quarter_for_screening(recent)


def latest_screening_metrics(security: Security) -> dict[str, Any]:
    """
    Metrics for vibe-check rules: built from fiscal quarter rows when present,
    else legacy flat ``security.screening_metrics``.
    """
    if security.fiscal_quarters.exists():
        return build_screening_metrics_from_fiscal_quarters(security)
    return dict(security.screening_metrics or {})


def sync_security_screening_metrics_cache(
    security: Security,
    *,
    metrics: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Refresh ``security.screening_metrics`` from fiscal quarters (or provided dict)."""
    if metrics is None:
        metrics = latest_screening_metrics(security)
    security.screening_metrics = metrics
    security.save(update_fields=["screening_metrics"])
    return metrics
