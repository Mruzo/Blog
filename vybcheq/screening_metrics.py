"""Resolve screening inputs from the latest fiscal quarter row."""
from __future__ import annotations

from decimal import Decimal
from typing import Any, Iterable

from vybcheq.models import Security, SecurityFiscalQuarter


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


def latest_fiscal_quarter(security: Security) -> SecurityFiscalQuarter | None:
    return security.fiscal_quarters.order_by("-period_end").first()


def latest_fiscal_quarter_for_screening(security: Security) -> SecurityFiscalQuarter | None:
    """Prefer the newest quarter row that has fundamentals, not just the newest calendar period."""
    # Use a bounded fetch so we don't materialize decades of empty EOD-only rows.
    recent = list(security.fiscal_quarters.order_by("-period_end")[:40])
    return pick_latest_quarter_for_screening(recent)


def latest_screening_metrics(security: Security) -> dict[str, Any]:
    """
    Metrics for vibe-check rules: most recent fiscal quarter row when present,
    else legacy flat ``security.screening_metrics``.
    """
    quarter = latest_fiscal_quarter_for_screening(security)
    if quarter is not None and (
        quarter.metrics or quarter.implied_close is not None or quarter.close is not None
    ):
        return metrics_from_fiscal_quarter(quarter)
    return dict(security.screening_metrics or {})


def sync_security_screening_metrics_cache(
    security: Security,
    *,
    metrics: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Refresh ``security.screening_metrics`` from the latest fiscal quarter (or provided)."""
    if metrics is None:
        metrics = latest_screening_metrics(security)
    security.screening_metrics = metrics
    security.save(update_fields=["screening_metrics"])
    return metrics
