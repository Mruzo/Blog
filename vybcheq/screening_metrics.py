"""Resolve screening inputs from the latest fiscal quarter row."""
from __future__ import annotations

from decimal import Decimal
from typing import Any

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
    """Flat dict for rule evaluation: stored metrics plus quarter-end close."""
    out: dict[str, Any] = dict(quarter.metrics or {})
    close = _num(quarter.close)
    if close is not None:
        out["close"] = round(close, 2)
    out["period_end"] = quarter.period_end.isoformat()
    out["trade_date"] = quarter.trade_date.isoformat()
    return out


def latest_fiscal_quarter(security: Security) -> SecurityFiscalQuarter | None:
    return security.fiscal_quarters.order_by("-period_end").first()


def latest_screening_metrics(security: Security) -> dict[str, Any]:
    """
    Metrics for vibe-check rules: most recent fiscal quarter row when present,
    else legacy flat ``security.screening_metrics``.
    """
    quarter = latest_fiscal_quarter(security)
    if quarter is not None and (quarter.metrics or quarter.close is not None):
        return metrics_from_fiscal_quarter(quarter)
    return dict(security.screening_metrics or {})


def sync_security_screening_metrics_cache(security: Security) -> dict[str, Any]:
    """Refresh ``security.screening_metrics`` from the latest fiscal quarter."""
    metrics = latest_screening_metrics(security)
    security.screening_metrics = metrics
    security.save(update_fields=["screening_metrics"])
    return metrics
