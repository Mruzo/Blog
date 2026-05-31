"""Quarterly fiscal series for the staff dashboard chart."""
from __future__ import annotations

from decimal import Decimal
from typing import Any

from vybcheq.forms import SCREENING_METRIC_FIELDS
from vybcheq.models import Security, SecurityFiscalQuarter

_METRIC_LABELS = dict(SCREENING_METRIC_FIELDS)
_CHART_METRIC_KEYS = ["close", *[k for k, _ in SCREENING_METRIC_FIELDS]]


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


def _quarter_point(quarter: SecurityFiscalQuarter) -> dict[str, Any]:
    point: dict[str, Any] = {"period": quarter.period_end.isoformat()}
    close = _num(quarter.close)
    if close is not None:
        point["close"] = round(close, 2)
    for key, raw in (quarter.metrics or {}).items():
        if key.startswith("_"):
            continue
        val = _num(raw)
        if val is not None:
            point[key] = val
    return point


def build_fiscal_chart_data(*, max_securities: int = 300) -> dict[str, Any]:
    """
    JSON-serializable payload for the dashboard history chart.

    ``series`` keys are security PK strings; each value is a list of quarter points
    (oldest first), with ``period`` plus metric keys (``close``, ``pe_ratio``, …).
    """
    securities = list(
        Security.objects.filter(is_active=True).order_by("exchange", "symbol")[:max_securities]
    )
    if not securities:
        return {"securities": [], "metrics": [], "series": {}}

    sec_ids = [s.pk for s in securities]
    quarters = (
        SecurityFiscalQuarter.objects.filter(security_id__in=sec_ids)
        .order_by("security_id", "period_end")
        .select_related("security")
    )

    series: dict[str, list[dict[str, Any]]] = {str(s.pk): [] for s in securities}
    for q in quarters:
        key = str(q.security_id)
        if key in series:
            series[key].append(_quarter_point(q))

    present_metrics: set[str] = set()
    for points in series.values():
        for pt in points:
            present_metrics.update(k for k in pt if k != "period")

    metrics_out: list[dict[str, str]] = []
    for mk in _CHART_METRIC_KEYS:
        if mk not in present_metrics:
            continue
        label = "Quarter-end close" if mk == "close" else _METRIC_LABELS.get(mk, mk.replace("_", " "))
        metrics_out.append({"key": mk, "label": label})

    sec_meta = [
        {
            "id": s.pk,
            "label": f"{s.symbol} · {s.exchange}",
            "has_data": bool(series[str(s.pk)]),
        }
        for s in securities
    ]
    sec_meta.sort(key=lambda x: (not x["has_data"], x["label"]))

    return {"securities": sec_meta, "metrics": metrics_out, "series": series}
