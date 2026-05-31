"""
Screening briefing catalog: narrative + suggested rules for core vibe-check criteria.

DB ``ScreeningRuleSet`` rows are matched by ``brief_slug`` when set, else by primary
metric on a single-rule set. Unmatched briefing slots show suggested defaults.
Additional rule sets in the DB appear in an "extended" section automatically.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from vybcheq.forms import SCREENING_METRIC_FIELDS
from vybcheq.models import ScreenResult, ScreeningRuleSet, ScreenRun

_METRIC_LABELS = dict(SCREENING_METRIC_FIELDS)

# Core six — add entries here to grow the briefing without template changes.
BRIEFING_CATALOG: tuple[dict[str, Any], ...] = (
    {
        "slug": "gross_margin",
        "title": "Gross margin",
        "category": "Profitability",
        "metric_key": "gross_margin",
        "summary": "Revenue left after direct costs (COGS). Signals pricing power and unit economics.",
        "interpretation": "Higher gross margin usually means the business can absorb overhead and still profit. Compare within sector.",
        "suggested_rule": {"metric": "gross_margin", "op": ">=", "value": 0.40},
        "sort_order": 10,
    },
    {
        "slug": "pretax_margin",
        "title": "Pre-tax margin",
        "category": "Profitability",
        "metric_key": "pretax_margin",
        "summary": "Earnings before tax as a fraction of revenue — operating result before tax regime effects.",
        "interpretation": "Useful when tax rates differ by country or period. Sustained pre-tax margin shows core earning strength.",
        "suggested_rule": {"metric": "pretax_margin", "op": ">=", "value": 0.15},
        "sort_order": 20,
    },
    {
        "slug": "net_margin",
        "title": "Net margin",
        "category": "Profitability",
        "metric_key": "net_margin",
        "summary": "Bottom-line profit as a fraction of revenue after all expenses and tax.",
        "interpretation": "What actually lands for shareholders. Low net margin can still work in high-turnover models — context matters.",
        "suggested_rule": {"metric": "net_margin", "op": ">=", "value": 0.10},
        "sort_order": 30,
    },
    {
        "slug": "debt_to_equity",
        "title": "Debt / equity",
        "category": "Leverage",
        "metric_key": "debt_to_equity",
        "summary": "Total debt relative to shareholders’ equity — balance-sheet leverage.",
        "interpretation": "Lower is generally safer; capital-heavy industries run higher ratios by design.",
        "suggested_rule": {"metric": "debt_to_equity", "op": "<=", "value": 1.0},
        "sort_order": 40,
    },
    {
        "slug": "current_ratio",
        "title": "Current ratio",
        "category": "Liquidity",
        "metric_key": "current_ratio",
        "summary": "Current assets ÷ current liabilities — short-term bill-paying capacity.",
        "interpretation": "Below 1.0 can mean liquidity stress; very high may mean idle working capital.",
        "suggested_rule": {"metric": "current_ratio", "op": ">=", "value": 1.5},
        "sort_order": 50,
    },
    {
        "slug": "quick_ratio",
        "title": "Quick ratio",
        "category": "Liquidity",
        "metric_key": "quick_ratio",
        "summary": "Liquid assets (ex-inventory) ÷ current liabilities — stricter liquidity test.",
        "interpretation": "Inventory is excluded; better read when inventory is slow-moving or marked down.",
        "suggested_rule": {"metric": "quick_ratio", "op": ">=", "value": 1.0},
        "sort_order": 60,
    },
)

BRIEFING_SLUGS = frozenset(item["slug"] for item in BRIEFING_CATALOG)


@dataclass
class BriefingRow:
    slug: str
    title: str
    category: str
    metric_key: str
    metric_label: str
    summary: str
    interpretation: str
    suggested_rule: dict[str, Any]
    rule_set: ScreeningRuleSet | None
    effective_rules: list[dict[str, Any]]
    last_run: ScreenRun | None
    last_run_pass_count: int | None
    last_run_total: int | None
    sort_order: int


def _primary_metric(rules: list) -> str | None:
    if len(rules) != 1:
        return None
    metric = rules[0].get("metric")
    return str(metric) if metric else None


def _match_rule_set(item: dict[str, Any], rule_sets: list[ScreeningRuleSet]) -> ScreeningRuleSet | None:
    slug = item["slug"]
    metric = item["metric_key"]
    for rs in rule_sets:
        brief_slug = getattr(rs, "brief_slug", None)
        if brief_slug and brief_slug == slug:
            return rs
    for rs in rule_sets:
        if _primary_metric(rs.rules or []) == metric:
            return rs
    slug_norm = slug.replace("_", " ")
    for rs in rule_sets:
        if slug_norm in rs.name.lower():
            return rs
    return None


def _last_runs_by_rule_set_id() -> dict[int, ScreenRun]:
    runs = (
        ScreenRun.objects.filter(status=ScreenRun.Status.OK)
        .select_related("rule_set")
        .order_by("-started_at")
    )
    seen: dict[int, ScreenRun] = {}
    for run in runs:
        if run.rule_set_id not in seen:
            seen[run.rule_set_id] = run
    return seen


def _run_pass_counts(run: ScreenRun | None) -> tuple[int | None, int | None]:
    if run is None:
        return None, None
    results = list(run.screen_results.all())
    if not results:
        return None, None
    passed = sum(1 for r in results if r.passed)
    return passed, len(results)


def build_briefing_rows(
    rule_sets: list[ScreeningRuleSet] | None = None,
) -> list[BriefingRow]:
    if rule_sets is None:
        rule_sets = list(ScreeningRuleSet.objects.all())
    last_runs = _last_runs_by_rule_set_id()

    rows: list[BriefingRow] = []
    matched_ids: set[int] = set()

    for item in sorted(BRIEFING_CATALOG, key=lambda x: x["sort_order"]):
        rs = _match_rule_set(item, rule_sets)
        if rs is not None:
            matched_ids.add(rs.pk)
        rules = list(rs.rules or []) if rs else [item["suggested_rule"]]
        last_run = last_runs.get(rs.pk) if rs else None
        passed, total = _run_pass_counts(last_run)
        metric_key = item["metric_key"]
        rows.append(
            BriefingRow(
                slug=item["slug"],
                title=item["title"],
                category=item["category"],
                metric_key=metric_key,
                metric_label=_METRIC_LABELS.get(metric_key, metric_key.replace("_", " ")),
                summary=item["summary"],
                interpretation=item["interpretation"],
                suggested_rule=item["suggested_rule"],
                rule_set=rs,
                effective_rules=rules,
                last_run=last_run,
                last_run_pass_count=passed,
                last_run_total=total,
                sort_order=item["sort_order"],
            )
        )

    return rows


def extended_rule_sets(
    rule_sets: list[ScreeningRuleSet] | None = None,
    briefing_rows: list[BriefingRow] | None = None,
) -> list[ScreeningRuleSet]:
    """Rule sets not tied to a core briefing slot (multi-rule or extra criteria)."""
    if rule_sets is None:
        rule_sets = list(ScreeningRuleSet.objects.all())
    if briefing_rows is None:
        briefing_rows = build_briefing_rows(rule_sets)
    matched = {r.rule_set.pk for r in briefing_rows if r.rule_set is not None}
    return [rs for rs in rule_sets if rs.pk not in matched]


def briefing_categories(rows: list[BriefingRow]) -> list[str]:
    seen: list[str] = []
    for row in rows:
        if row.category not in seen:
            seen.append(row.category)
    return seen
