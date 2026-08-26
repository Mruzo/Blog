"""Quarterly fiscal series for the staff dashboard chart."""
from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.db.models import Exists, OuterRef
from django.utils import timezone

from vybcheq.forms import SCREENING_METRIC_FIELDS
from vybcheq.models import PositionMark, Security, SecurityFiscalQuarter, SimPosition

_METRIC_LABELS = dict(SCREENING_METRIC_FIELDS)
_CHART_METRIC_KEYS = ["eod_close", "implied_close", *[k for k, _ in SCREENING_METRIC_FIELDS]]


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
    eod = _num(quarter.close)
    implied = _num(quarter.implied_close)
    if eod is not None:
        point["eod_close"] = round(eod, 2)
    if implied is not None:
        point["implied_close"] = round(implied, 2)
    for key, raw in (quarter.metrics or {}).items():
        if key.startswith("_"):
            continue
        val = _num(raw)
        if val is not None:
            point[key] = val
    return point


def _metric_catalog(present: set[str]) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for mk in _CHART_METRIC_KEYS:
        if mk not in present:
            continue
        label = {
            "eod_close": "EOD close (quarter-end)",
            "implied_close": "Implied close (fundamentals)",
        }.get(mk, _METRIC_LABELS.get(mk, mk.replace("_", " ")))
        out.append({"key": mk, "label": label})
    return out


def build_fiscal_chart_meta(*, max_securities: int = 300) -> dict[str, Any]:
    """
    Lightweight selector payload for the dashboard chart (no series points).

    Series for one security are loaded on demand via ``build_fiscal_chart_series``.
    """
    has_quarter = SecurityFiscalQuarter.objects.filter(security_id=OuterRef("pk"))
    securities = list(
        Security.objects.filter(is_active=True)
        .annotate(has_data=Exists(has_quarter))
        .order_by("exchange", "symbol")[:max_securities]
    )
    sec_meta = [
        {
            "id": s.pk,
            "label": f"{s.symbol} · {s.exchange}",
            "has_data": bool(s.has_data),
        }
        for s in securities
    ]
    sec_meta.sort(key=lambda x: (not x["has_data"], x["label"]))
    # Full metric catalog so the client can label points without a second catalog call.
    metrics_out = _metric_catalog(set(_CHART_METRIC_KEYS))
    return {"securities": sec_meta, "metrics": metrics_out}


def build_fiscal_chart_series(security_id: int) -> dict[str, Any]:
    """Quarter points + present metrics for one security (oldest first)."""
    points = [
        _quarter_point(q)
        for q in SecurityFiscalQuarter.objects.filter(security_id=security_id).order_by(
            "period_end"
        )
    ]
    present: set[str] = set()
    for pt in points:
        present.update(k for k in pt if k != "period")
    return {
        "security_id": security_id,
        "points": points,
        "metrics": _metric_catalog(present),
    }


def build_fiscal_chart_data(*, max_securities: int = 300) -> dict[str, Any]:
    """
    Backward-compatible full payload (meta + all series). Prefer meta + lazy series
    on the dashboard; tests may still call this for a one-shot dump.
    """
    meta = build_fiscal_chart_meta(max_securities=max_securities)
    series: dict[str, list[dict[str, Any]]] = {}
    present: set[str] = set()
    for sec in meta["securities"]:
        if not sec["has_data"]:
            series[str(sec["id"])] = []
            continue
        payload = build_fiscal_chart_series(sec["id"])
        series[str(sec["id"])] = payload["points"]
        for pt in payload["points"]:
            present.update(k for k in pt if k != "period")
    meta["metrics"] = _metric_catalog(present)
    meta["series"] = series
    return meta


def build_sim_portfolio_chart_data(
    user,
    *,
    open_totals: dict[str, Decimal] | None = None,
) -> dict[str, Any]:
    """
    Time series of open-book cost basis (cheqs in) vs mark-to-market value.

    Pass ``open_totals`` from the portfolio view when already computed to avoid a
    second aggregation. Gap between series is unrealized P&L.
    """
    from vybcheq.sim_trading import aggregate_open_positions, portfolio_open_totals

    positions = list(
        SimPosition.objects.filter(user=user, parent_position__isnull=True).only(
            "id",
            "cheqs_opened",
            "opened_at",
            "closed_at",
        )
    )
    if not positions:
        return {"points": [], "has_data": False}

    pos_by_id = {p.pk: p for p in positions}
    marks = (
        PositionMark.objects.filter(position_id__in=pos_by_id)
        .order_by("marked_at", "id")
        .only("position_id", "marked_at", "value_cheqs")
    )

    open_values: dict[int, Decimal] = {}
    open_costs: dict[int, Decimal] = {}
    invested_total = Decimal("0")
    cost_total = Decimal("0")
    day_snapshots: dict[str, tuple[Decimal, Decimal]] = {}

    for mark in marks:
        pos = pos_by_id[mark.position_id]
        day = timezone.localtime(mark.marked_at).date().isoformat()
        closed_at = pos.closed_at
        if closed_at is not None and mark.marked_at >= closed_at:
            if pos.pk in open_values:
                invested_total -= open_values.pop(pos.pk)
                cost_total -= open_costs.pop(pos.pk)
        else:
            prev_v = open_values.get(pos.pk)
            prev_c = open_costs.get(pos.pk)
            if prev_v is not None:
                invested_total -= prev_v
            if prev_c is not None:
                cost_total -= prev_c
            open_values[pos.pk] = mark.value_cheqs
            open_costs[pos.pk] = pos.cheqs_opened
            invested_total += mark.value_cheqs
            cost_total += pos.cheqs_opened
        day_snapshots[day] = (invested_total, cost_total)

    points: list[dict[str, Any]] = []
    for day, (invested, cost) in sorted(day_snapshots.items()):
        inv = _num(invested)
        basis = _num(cost)
        if inv is None and basis is None:
            continue
        inv_f = round(inv or 0.0, 2)
        basis_f = round(basis or 0.0, 2)
        points.append(
            {
                "period": day,
                "cost_basis": basis_f,
                "investment_value": inv_f,
                "total_return": round(inv_f - basis_f, 2),
            }
        )

    live = open_totals if open_totals is not None else portfolio_open_totals(
        aggregate_open_positions(user)
    )
    today = timezone.localdate().isoformat()
    live_point = {
        "period": today,
        "cost_basis": float(live["cost_basis"]),
        "investment_value": float(live["investment_value"]),
        "total_return": float(live["total_return"]),
    }
    if live["investment_value"] > 0 or live["cost_basis"] > 0:
        if points and points[-1]["period"] == today:
            points[-1] = live_point
        else:
            points.append(live_point)

    return {"points": points, "has_data": bool(points)}
