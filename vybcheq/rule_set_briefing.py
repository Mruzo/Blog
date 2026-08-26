"""
Screening briefing catalog: narrative + suggested rules for core vibe-check criteria.

DB ``ScreeningRuleSet`` rows are matched by ``brief_slug`` when set, else by primary
metric on a single-rule set. Unmatched briefing slots show suggested defaults.
Additional rule sets in the DB appear in an "extended" section automatically.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.db.models import Count, OuterRef, Q, Subquery

from vybcheq.forms import SCREENING_METRIC_FIELDS
from vybcheq.models import ScreeningRuleSet, ScreenRun

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
BRIEFING_BY_SLUG = {item["slug"]: item for item in BRIEFING_CATALOG}
PORTFOLIO_BRIEF_SLUG = "portfolio"
SYSTEM_BRIEF_SLUGS = frozenset({PORTFOLIO_BRIEF_SLUG})


def briefing_item(slug: str) -> dict[str, Any] | None:
    return BRIEFING_BY_SLUG.get(slug)


def save_briefing_check(slug: str, value) -> ScreeningRuleSet:
    """Create or update the saved rule set for a core briefing check."""
    item = briefing_item(slug)
    if item is None:
        raise ValueError(f"Unknown briefing slug: {slug!r}")

    rule = {**item["suggested_rule"], "value": float(value)}
    existing = ScreeningRuleSet.objects.filter(brief_slug=slug).first()
    if existing is None:
        # Legacy rows saved before brief_slug existed — match once, then tag.
        rule_sets = list(ScreeningRuleSet.objects.only("pk", "brief_slug", "name", "rules"))
        by_slug, by_metric, all_sets = _build_rule_set_lookup(rule_sets)
        existing = _match_rule_set(item, by_slug, by_metric, all_sets)

    if existing is not None:
        existing.brief_slug = slug
        existing.name = item["title"]
        existing.rules = [rule]
        existing.is_active = True
        existing.save()
        return existing

    return ScreeningRuleSet.objects.create(
        brief_slug=slug,
        name=item["title"],
        rules=[rule],
        is_active=True,
    )


def saved_briefing_rule_sets(
    briefing_rows: list[BriefingRow] | None = None,
) -> list[ScreeningRuleSet]:
    if briefing_rows is None:
        briefing_rows = build_briefing_rows()
    return [row.rule_set for row in briefing_rows if row.rule_set is not None]


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


def _build_rule_set_lookup(
    rule_sets: list[ScreeningRuleSet],
) -> tuple[dict[str, ScreeningRuleSet], dict[str, ScreeningRuleSet], list[ScreeningRuleSet]]:
    by_slug: dict[str, ScreeningRuleSet] = {}
    by_metric: dict[str, ScreeningRuleSet] = {}
    for rs in rule_sets:
        if rs.brief_slug:
            by_slug[rs.brief_slug] = rs
        metric = _primary_metric(rs.rules or [])
        if metric and metric not in by_metric:
            by_metric[metric] = rs
    return by_slug, by_metric, rule_sets


def _match_rule_set(
    item: dict[str, Any],
    by_slug: dict[str, ScreeningRuleSet],
    by_metric: dict[str, ScreeningRuleSet],
    rule_sets: list[ScreeningRuleSet],
) -> ScreeningRuleSet | None:
    slug = item["slug"]
    if slug in by_slug:
        return by_slug[slug]
    metric = item["metric_key"]
    if metric in by_metric:
        return by_metric[metric]
    slug_norm = slug.replace("_", " ")
    for rs in rule_sets:
        if slug_norm in rs.name.lower():
            return rs
    return None


def _last_runs_by_rule_set_id(
    rule_set_ids: list[int] | None = None,
) -> dict[int, ScreenRun]:
    """
    Latest OK ScreenRun per rule set, with pass/total annotated in SQL.

    Avoids loading every historical run + all ScreenResult rows into Python.
    """
    latest_pk = (
        ScreenRun.objects.filter(
            rule_set_id=OuterRef("rule_set_id"),
            status=ScreenRun.Status.OK,
        )
        .order_by("-started_at", "-pk")
        .values("pk")[:1]
    )
    qs = (
        ScreenRun.objects.filter(status=ScreenRun.Status.OK, pk=Subquery(latest_pk))
        .annotate(
            _pass_count=Count("screen_results", filter=Q(screen_results__passed=True)),
            _total_count=Count("screen_results"),
        )
        .select_related("rule_set")
    )
    if rule_set_ids is not None:
        if not rule_set_ids:
            return {}
        qs = qs.filter(rule_set_id__in=rule_set_ids)
    return {run.rule_set_id: run for run in qs}


def _run_pass_counts(run: ScreenRun | None) -> tuple[int | None, int | None]:
    if run is None:
        return None, None
    total = getattr(run, "_total_count", None)
    passed = getattr(run, "_pass_count", None)
    if total is None:
        return None, None
    if total == 0:
        return None, None
    return int(passed or 0), int(total)


def build_briefing_rows(
    rule_sets: list[ScreeningRuleSet] | None = None,
) -> list[BriefingRow]:
    if rule_sets is None:
        rule_sets = list(ScreeningRuleSet.objects.all())
    by_slug, by_metric, all_sets = _build_rule_set_lookup(rule_sets)
    rule_set_ids = [rs.pk for rs in rule_sets]
    last_runs = _last_runs_by_rule_set_id(rule_set_ids)

    rows: list[BriefingRow] = []

    for item in sorted(BRIEFING_CATALOG, key=lambda x: x["sort_order"]):
        rs = _match_rule_set(item, by_slug, by_metric, all_sets)
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
    return [
        rs
        for rs in rule_sets
        if rs.pk not in matched and rs.brief_slug not in SYSTEM_BRIEF_SLUGS
    ]


def rule_sets_for_brief_slugs(slugs: list[str]) -> list[ScreeningRuleSet]:
    """Saved core checks for the given briefing slugs, in slug order."""
    if not slugs:
        return []
    by_slug = {
        rs.brief_slug: rs
        for rs in ScreeningRuleSet.objects.filter(brief_slug__in=slugs)
    }
    return [by_slug[slug] for slug in slugs if slug in by_slug]


def briefing_categories(rows: list[BriefingRow]) -> list[str]:
    seen: list[str] = []
    for row in rows:
        if row.category not in seen:
            seen.append(row.category)
    return seen
