"""
Read-only FMP capability probe: which endpoints work on the current plan and
which screening metrics are populated (no DB writes).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any

import requests

from vybcheq.fiscal_periods import configured_quarterly_row_limit
from vybcheq.fmp_client import FmpError, fmp_first_row, fmp_get, fmp_rows
from vybcheq.fmp_cash_flow import FMP_CASH_FLOW_URL, OCF_FIELD_MAP
from vybcheq.fmp_fundamentals import (
    FMP_FINANCIAL_GROWTH_URL,
    FMP_KEY_METRICS_URL,
    FMP_KEY_METRICS_TTM_URL,
    FMP_RATIOS_URL,
    FMP_RATIOS_TTM_URL,
    _build_period_payload,
    _is_recoverable_fmp_plan_error,
    _map_fields,
    _parse_fmp_period_end,
)
from vybcheq.market_symbols import external_symbol_for_security
from vybcheq.models import Security
FMP_INCOME_STATEMENT_URL = "https://financialmodelingprep.com/stable/income-statement"
FMP_BALANCE_SHEET_URL = "https://financialmodelingprep.com/stable/balance-sheet-statement"

PROBE_METRIC_CATALOG: tuple[dict[str, str], ...] = (
    {"key": "revenue_growth_yoy", "label": "Revenue growth (last year)"},
    {"key": "revenue_growth_5y_avg", "label": "Revenue growth (5-year average)", "avg_of": "revenue_growth_yoy"},
    {"key": "debt_to_equity", "label": "Debt / equity"},
    {"key": "current_ratio", "label": "Current ratio"},
    {"key": "earnings_growth_yoy", "label": "Net income growth (last year)"},
    {"key": "earnings_growth_5y_avg", "label": "Net income growth (5-year average)", "avg_of": "earnings_growth_yoy"},
    {"key": "roe", "label": "Return on equity"},
    {"key": "roe_5y_avg", "label": "Return on equity (5-year average)", "avg_of": "roe"},
    {"key": "gross_margin", "label": "Gross margin"},
    {"key": "roa", "label": "Return on assets"},
    {"key": "gross_margin_5y_avg", "label": "Average gross margin (5-year)", "avg_of": "gross_margin"},
    {"key": "roa_5y_avg", "label": "Return on assets (5-year average)", "avg_of": "roa"},
    {"key": "net_margin", "label": "Net profit margin"},
    {"key": "operating_cash_flow", "label": "Operating cash flows"},
    {"key": "eps", "label": "Earnings per share"},
)

# roa/eps may appear on key-metrics or income rows; OCF map shared with production ingest.
_EXTRA_FIELD_MAP: list[tuple[str, tuple[str, ...]]] = [
    ("roa", ("returnOnAssets", "returnOnAssetsTTM", "roa", "roaTTM")),
    ("eps", ("netIncomePerShare", "eps", "netIncomePerShareTTM", "earningsPerShare")),
    *OCF_FIELD_MAP,
]

# Metrics still missing after direct FMP fields may be derivable from statement lines.
CALCULABLE_METRIC_HINTS: tuple[dict[str, str], ...] = (
    {
        "key": "debt_to_equity",
        "formula": "totalDebt / totalStockholdersEquity",
        "needs": "ratios.debtToEquityRatio, or balance-sheet totalDebt + equity",
    },
    {
        "key": "current_ratio",
        "formula": "totalCurrentAssets / totalCurrentLiabilities",
        "needs": "ratios.currentRatio, or balance-sheet current assets & liabilities",
    },
    {
        "key": "gross_margin",
        "formula": "grossProfit / revenue",
        "needs": "ratios.grossProfitMargin, or income-statement grossProfit + revenue",
    },
    {
        "key": "net_margin",
        "formula": "netIncome / revenue",
        "needs": "ratios.netProfitMargin, or income-statement netIncome + revenue",
    },
    {
        "key": "roe",
        "formula": "netIncome / totalStockholdersEquity",
        "needs": "key-metrics.returnOnEquity, or income + balance sheet",
    },
    {
        "key": "roa",
        "formula": "netIncome / totalAssets",
        "needs": "key-metrics.returnOnAssets, or income + balance sheet",
    },
    {
        "key": "eps",
        "formula": "netIncome / weightedAverageShsOut",
        "needs": "ratios.netIncomePerShare, or income-statement netIncome + shares",
    },
    {
        "key": "operating_cash_flow",
        "formula": "operatingCashFlow (direct)",
        "needs": "cash-flow-statement operatingCashFlow",
    },
)


@dataclass
class EndpointAttempt:
    mode: str
    status: str  # ok | empty | blocked | error
    row_count: int = 0
    detail: str = ""


@dataclass
class EndpointProbe:
    name: str
    succeeded: bool
    mode: str | None
    row_count: int
    rows: list[dict[str, Any]] = field(default_factory=list)
    attempts: list[EndpointAttempt] = field(default_factory=list)
    error: str = ""


@dataclass
class MetricProbe:
    key: str
    label: str
    latest: float | None
    average: float | None
    periods_with_data: int
    period_rows_available: int
    status: str  # populated | partial | missing
    latest_period: str = ""
    source: str = ""  # direct | calculated | cash-flow
    note: str = ""


@dataclass
class CalculableHint:
    key: str
    label: str
    formula: str
    needs: str
    outcome: str  # available | calculated | unavailable


@dataclass
class FmpCapabilityProbeResult:
    security: Security
    fmp_symbol: str
    row_limit: int
    combined_period_mode: str
    endpoints: list[EndpointProbe]
    metrics: list[MetricProbe]
    period_count: int
    period_modes_mixed: bool = False
    mixed_mode_warning: str = ""
    calculable_hints: list[CalculableHint] = field(default_factory=list)


@dataclass
class _PeriodMetricRow:
    period_end: date
    direct: dict[str, Any]
    calculated: dict[str, float]
    calculated_notes: dict[str, str]


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


def _num_from_row(row: dict[str, Any], *keys: str) -> float | None:
    for key in keys:
        v = _num(row.get(key))
        if v is not None:
            return v
    return None


def _probe_endpoint_trials(
    security: Security,
    url: str,
    ttm_url: str,
    *,
    name: str,
    session: requests.Session | None,
) -> EndpointProbe:
    sym = external_symbol_for_security(security)
    limit = configured_quarterly_row_limit()
    attempts: list[EndpointAttempt] = []
    trials: list[tuple[str, str, dict[str, Any]]] = [
        ("quarter", url, {"symbol": sym, "period": "quarter", "limit": limit}),
        ("annual", url, {"symbol": sym, "period": "annual", "limit": limit}),
        ("ttm", ttm_url, {"symbol": sym}),
    ]

    for mode, fetch_url, params in trials:
        try:
            payload = fmp_get(fetch_url, params=params, session=session, symbol=sym)
            if mode == "ttm":
                row = fmp_first_row(payload)
                rows = [row] if row else fmp_rows(payload)[:1]
            else:
                rows = fmp_rows(payload)
            if rows:
                attempts.append(EndpointAttempt(mode=mode, status="ok", row_count=len(rows)))
                return EndpointProbe(
                    name=name,
                    succeeded=True,
                    mode=mode,
                    row_count=len(rows),
                    rows=rows,
                    attempts=attempts,
                )
            attempts.append(EndpointAttempt(mode=mode, status="empty", row_count=0))
        except FmpError as exc:
            if _is_recoverable_fmp_plan_error(exc):
                attempts.append(
                    EndpointAttempt(mode=mode, status="blocked", detail=str(exc))
                )
                continue
            attempts.append(EndpointAttempt(mode=mode, status="error", detail=str(exc)))
            return EndpointProbe(
                name=name,
                succeeded=False,
                mode=None,
                row_count=0,
                attempts=attempts,
                error=str(exc),
            )

    return EndpointProbe(name=name, succeeded=False, mode=None, row_count=0, attempts=attempts)


def _probe_period_endpoint(
    security: Security,
    url: str,
    *,
    name: str,
    session: requests.Session | None,
) -> EndpointProbe:
    sym = external_symbol_for_security(security)
    limit = configured_quarterly_row_limit()
    attempts: list[EndpointAttempt] = []
    for mode, params in (
        ("quarter", {"symbol": sym, "period": "quarter", "limit": limit}),
        ("annual", {"symbol": sym, "period": "annual", "limit": limit}),
    ):
        try:
            payload = fmp_get(url, params=params, session=session, symbol=sym)
            rows = fmp_rows(payload)
            if rows:
                attempts.append(EndpointAttempt(mode=mode, status="ok", row_count=len(rows)))
                return EndpointProbe(
                    name=name,
                    succeeded=True,
                    mode=mode,
                    row_count=len(rows),
                    rows=rows,
                    attempts=attempts,
                )
            attempts.append(EndpointAttempt(mode=mode, status="empty", row_count=0))
        except FmpError as exc:
            if _is_recoverable_fmp_plan_error(exc):
                attempts.append(
                    EndpointAttempt(mode=mode, status="blocked", detail=str(exc))
                )
                continue
            attempts.append(EndpointAttempt(mode=mode, status="error", detail=str(exc)))
            return EndpointProbe(
                name=name,
                succeeded=False,
                mode=None,
                row_count=0,
                attempts=attempts,
                error=str(exc),
            )
    return EndpointProbe(name=name, succeeded=False, mode=None, row_count=0, attempts=attempts)


def _merge_probe_periods(
    *endpoint_probes: tuple[str, EndpointProbe],
) -> tuple[dict[Any, dict[str, Any]], str, bool]:
    modes: list[str] = []
    endpoint_modes: set[str] = set()
    by_period: dict[Any, dict[str, Any]] = {}

    def _merge(rows: list[dict[str, Any]], bucket: str) -> None:
        for row in rows:
            period_end = _parse_fmp_period_end(row)
            if period_end is None:
                continue
            slot = by_period.setdefault(period_end, {})
            slot[bucket] = row

    for label, probe in endpoint_probes:
        if probe.mode:
            modes.append(f"{label}:{probe.mode}")
            endpoint_modes.add(probe.mode)
        if probe.succeeded:
            bucket = {
                "ratios": "ratios",
                "key-metrics": "key_metrics",
                "growth": "growth",
                "income-statement": "income_statement",
                "balance-sheet": "balance_sheet",
            }.get(label, label.replace("-", "_"))
            _merge(probe.rows, bucket)

    combined_mode = "+".join(modes) if modes else "none"
    period_modes_mixed = len(endpoint_modes) > 1
    return by_period, combined_mode, period_modes_mixed


def _raw_combined(parts: dict[str, Any]) -> dict[str, Any]:
    return {
        **(parts.get("balance_sheet") or {}),
        **(parts.get("income_statement") or {}),
        **(parts.get("key_metrics") or {}),
        **(parts.get("ratios") or {}),
        **(parts.get("growth") or {}),
    }


def _derive_metrics_for_period(parts: dict[str, Any]) -> dict[str, tuple[float, str]]:
    row = _raw_combined(parts)
    out: dict[str, tuple[float, str]] = {}

    def put(key: str, value: float | None, formula: str) -> None:
        if value is not None and key not in out:
            out[key] = (value, formula)

    debt = _num_from_row(row, "totalDebt", "interestBearingDebt", "totalLiabilities")
    equity = _num_from_row(
        row,
        "totalStockholdersEquity",
        "totalEquity",
        "stockholdersEquity",
        "shareholdersEquity",
    )
    if debt is not None and equity not in (None, 0):
        put("debt_to_equity", debt / equity, "totalDebt / totalStockholdersEquity")

    revenue = _num_from_row(row, "revenue", "totalRevenue", "sales")
    gross_profit = _num_from_row(row, "grossProfit")
    net_income = _num_from_row(row, "netIncome", "netIncomeApplicableToCommonShares")
    if gross_profit is not None and revenue not in (None, 0):
        put("gross_margin", gross_profit / revenue, "grossProfit / revenue")
    if net_income is not None and revenue not in (None, 0):
        put("net_margin", net_income / revenue, "netIncome / revenue")

    if net_income is not None and equity not in (None, 0):
        put("roe", net_income / equity, "netIncome / totalStockholdersEquity")

    assets = _num_from_row(row, "totalAssets")
    if net_income is not None and assets not in (None, 0):
        put("roa", net_income / assets, "netIncome / totalAssets")

    shares = _num_from_row(
        row,
        "weightedAverageShsOut",
        "weightedAverageShsOutDil",
        "weightedAverageSharesOutstanding",
        "commonStockSharesOutstanding",
        "numberOfShares",
    )
    if net_income is not None and shares not in (None, 0):
        put("eps", net_income / shares, "netIncome / weightedAverageShsOut")

    current_assets = _num_from_row(row, "totalCurrentAssets")
    current_liabilities = _num_from_row(row, "totalCurrentLiabilities")
    if current_assets is not None and current_liabilities not in (None, 0):
        put(
            "current_ratio",
            current_assets / current_liabilities,
            "totalCurrentAssets / totalCurrentLiabilities",
        )

    ocf = _num_from_row(
        row,
        "operatingCashFlow",
        "netCashProvidedByOperatingActivities",
    )
    if ocf is not None:
        put("operating_cash_flow", ocf, "operatingCashFlow")

    return out


def _extra_metrics_for_period(parts: dict[str, Any]) -> dict[str, Any]:
    return _map_fields(_raw_combined(parts), _EXTRA_FIELD_MAP)


def _value_for_key(row: _PeriodMetricRow, key: str) -> tuple[float | None, str, str]:
    if key in row.direct and row.direct[key] is not None:
        return float(row.direct[key]), "direct", ""
    if key in row.calculated:
        return row.calculated[key], "calculated", row.calculated_notes.get(key, "")
    return None, "", ""


def _latest_for_key(
    period_rows: list[_PeriodMetricRow],
    key: str,
) -> tuple[float | None, str, str, str]:
    for row in period_rows:
        value, source, note = _value_for_key(row, key)
        if value is not None:
            return value, row.period_end.isoformat(), source, note
    return None, "", "", ""


def _values_for_key(period_rows: list[_PeriodMetricRow], key: str) -> list[float]:
    values: list[float] = []
    for row in period_rows:
        value, _, _ = _value_for_key(row, key)
        if value is not None:
            values.append(value)
    return values


def _avg(values: list[float]) -> float | None:
    if not values:
        return None
    return sum(values) / len(values)


def _metric_status(
    *,
    latest: float | None,
    average: float | None,
    periods_with_data: int,
    period_rows_available: int,
    is_average_metric: bool,
) -> str:
    if is_average_metric:
        if (
            average is not None
            and period_rows_available >= 5
            and periods_with_data >= 5
        ):
            return "populated"
        if average is not None and periods_with_data >= 1:
            return "partial"
        return "missing"
    return "populated" if latest is not None else "missing"


def _mixed_mode_warning(
    period_modes_mixed: bool,
    ratios_mode: str | None,
    metrics_mode: str | None,
    growth_mode: str | None,
) -> str:
    if not period_modes_mixed:
        return ""
    return (
        "Endpoints returned different period modes "
        f"(ratios={ratios_mode or '—'}, key-metrics={metrics_mode or '—'}, "
        f"growth={growth_mode or '—'}). Latest values use the newest period "
        "that actually contains each metric, not the newest calendar slot overall."
    )


def _build_calculable_hints(metrics: list[MetricProbe]) -> list[CalculableHint]:
    by_key = {m.key: m for m in metrics}
    labels = {item["key"]: item["label"] for item in PROBE_METRIC_CATALOG}
    hints: list[CalculableHint] = []
    for item in CALCULABLE_METRIC_HINTS:
        metric = by_key.get(item["key"])
        if metric is None:
            continue
        if metric.status == "populated":
            outcome = "available"
            if metric.source == "calculated":
                outcome = "calculated"
        elif metric.periods_with_data > 0 or metric.average is not None:
            outcome = "calculated"
        else:
            outcome = "unavailable"
        hints.append(
            CalculableHint(
                key=item["key"],
                label=labels.get(item["key"], item["key"]),
                formula=item["formula"],
                needs=item["needs"],
                outcome=outcome,
            )
        )
    return hints


def run_fmp_capability_probe(
    security: Security,
    *,
    session: requests.Session | None = None,
) -> FmpCapabilityProbeResult:
    """
    Probe FMP endpoints for one security (read-only, no DB writes).
    Uses up to 11 API calls with quarter/annual/TTM fallbacks.
    """
    sym = external_symbol_for_security(security)
    limit = configured_quarterly_row_limit()

    ratios_probe = _probe_endpoint_trials(
        security,
        FMP_RATIOS_URL,
        FMP_RATIOS_TTM_URL,
        name="ratios",
        session=session,
    )
    metrics_probe = _probe_endpoint_trials(
        security,
        FMP_KEY_METRICS_URL,
        FMP_KEY_METRICS_TTM_URL,
        name="key-metrics",
        session=session,
    )
    growth_probe = _probe_period_endpoint(
        security,
        FMP_FINANCIAL_GROWTH_URL,
        name="financial-growth",
        session=session,
    )
    cash_flow_probe = _probe_period_endpoint(
        security,
        FMP_CASH_FLOW_URL,
        name="cash-flow-statement",
        session=session,
    )
    income_probe = _probe_period_endpoint(
        security,
        FMP_INCOME_STATEMENT_URL,
        name="income-statement",
        session=session,
    )
    balance_probe = _probe_period_endpoint(
        security,
        FMP_BALANCE_SHEET_URL,
        name="balance-sheet-statement",
        session=session,
    )

    by_period, combined_mode, period_modes_mixed = _merge_probe_periods(
        ("ratios", ratios_probe),
        ("key-metrics", metrics_probe),
        ("growth", growth_probe),
        ("income-statement", income_probe),
        ("balance-sheet", balance_probe),
    )

    period_rows: list[_PeriodMetricRow] = []
    for period_end in sorted(by_period.keys(), reverse=True):
        parts = by_period[period_end]
        mapped, _, _ = _build_period_payload(period_end, parts, sym=sym)
        mapped.update(_extra_metrics_for_period(parts))
        derived = _derive_metrics_for_period(parts)
        period_rows.append(
            _PeriodMetricRow(
                period_end=period_end,
                direct=mapped,
                calculated={k: v[0] for k, v in derived.items()},
                calculated_notes={k: v[1] for k, v in derived.items()},
            )
        )

    period_count = len(period_rows)
    metric_probes: list[MetricProbe] = []
    for item in PROBE_METRIC_CATALOG:
        key = item["key"]
        avg_of = item.get("avg_of")
        if avg_of:
            base_values = _values_for_key(period_rows, avg_of)
            avg_val = _avg(base_values)
            metric_probes.append(
                MetricProbe(
                    key=key,
                    label=item["label"],
                    latest=None,
                    average=avg_val,
                    periods_with_data=len(base_values),
                    period_rows_available=period_count,
                    status=_metric_status(
                        latest=None,
                        average=avg_val,
                        periods_with_data=len(base_values),
                        period_rows_available=period_count,
                        is_average_metric=True,
                    ),
                )
            )
            continue

        latest_val, latest_period, source, note = _latest_for_key(period_rows, key)
        base_values = _values_for_key(period_rows, key)
        metric_probes.append(
            MetricProbe(
                key=key,
                label=item["label"],
                latest=latest_val,
                average=_avg(base_values),
                periods_with_data=len(base_values),
                period_rows_available=period_count,
                status=_metric_status(
                    latest=latest_val,
                    average=_avg(base_values),
                    periods_with_data=len(base_values),
                    period_rows_available=period_count,
                    is_average_metric=False,
                ),
                latest_period=latest_period,
                source=source,
                note=note,
            )
        )

    ocf_probe = next(m for m in metric_probes if m.key == "operating_cash_flow")
    if ocf_probe.latest is None and cash_flow_probe.rows:
        mapped_cf = _map_fields(cash_flow_probe.rows[0], _EXTRA_FIELD_MAP)
        if "operating_cash_flow" in mapped_cf:
            row_date = _parse_fmp_period_end(cash_flow_probe.rows[0])
            ocf_probe.latest = float(mapped_cf["operating_cash_flow"])
            ocf_probe.latest_period = row_date.isoformat() if row_date else ""
            ocf_probe.source = "cash-flow"
            ocf_probe.note = "cash-flow-statement (newest row)"
            ocf_probe.status = "populated"

    calculable_hints = _build_calculable_hints(metric_probes)

    return FmpCapabilityProbeResult(
        security=security,
        fmp_symbol=sym,
        row_limit=limit,
        combined_period_mode=combined_mode,
        endpoints=[
            ratios_probe,
            metrics_probe,
            growth_probe,
            cash_flow_probe,
            income_probe,
            balance_probe,
        ],
        metrics=metric_probes,
        period_count=period_count,
        period_modes_mixed=period_modes_mixed,
        mixed_mode_warning=_mixed_mode_warning(
            period_modes_mixed,
            ratios_probe.mode,
            metrics_probe.mode,
            growth_probe.mode,
        ),
        calculable_hints=calculable_hints,
    )
