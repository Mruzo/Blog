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
from vybcheq.screening_metrics import FIVE_YEAR_AVG_METRICS

_METRIC_LABELS = dict(SCREENING_METRIC_FIELDS)

# Core six — add entries here to grow the briefing without template changes.
BRIEFING_CATALOG: tuple[dict[str, Any], ...] = (
    {
        "slug": "gross_margin",
        "title": "Gross margin",
        "category": "Profitability",
        "metric_key": "gross_margin",
        "summary": "Of every dollar of sales, how much is left after the cost of making or buying the product. 0.40 means 40 cents.",
        "interpretation": "Higher is better. A grocery store can live on a small number; a software company usually needs a big one. Compare companies in the same line of work.",
        "suggested_rule": {"metric": "gross_margin", "op": ">=", "value": 0.40},
        "sort_order": 10,
    },
    {
        "slug": "pretax_margin",
        "title": "Pre-tax margin",
        "category": "Profitability",
        "metric_key": "pretax_margin",
        "summary": "Of every dollar of sales, how much is profit before the tax bill. 0.15 means 15 cents.",
        "interpretation": "Higher is better. This ignores that some countries tax more than others, so it is fairer than net margin when comparing across countries.",
        "suggested_rule": {"metric": "pretax_margin", "op": ">=", "value": 0.15},
        "sort_order": 20,
    },
    {
        "slug": "net_margin",
        "title": "Net margin",
        "category": "Profitability",
        "metric_key": "net_margin",
        "summary": "Of every dollar of sales, how much is leftover profit after every cost, including tax. 0.10 means 10 cents.",
        "interpretation": "This is the money that actually belongs to owners. A low number is not always bad if the company sells a huge volume.",
        "suggested_rule": {"metric": "net_margin", "op": ">=", "value": 0.10},
        "sort_order": 30,
    },
    {
        "slug": "debt_to_equity",
        "title": "Debt / equity",
        "category": "Leverage",
        "metric_key": "debt_to_equity",
        "summary": "How many dollars the company owes for each dollar the owners have in the business. 1.0 means $1 of debt per $1 of equity.",
        "interpretation": "Lower usually means less risk. Factories and utilities often carry more debt on purpose. A very high number means a small slump can hurt.",
        "suggested_rule": {"metric": "debt_to_equity", "op": "<=", "value": 1.0},
        "sort_order": 40,
    },
    {
        "slug": "current_ratio",
        "title": "Current ratio",
        "category": "Liquidity",
        "metric_key": "current_ratio",
        "summary": "Cash and things it can turn into cash soon, compared with bills due soon. 1.5 means $1.50 of near-term assets per $1 of near-term bills.",
        "interpretation": "Below 1.0 can mean it may struggle to pay bills this year. A very high number can mean cash sitting idle.",
        "suggested_rule": {"metric": "current_ratio", "op": ">=", "value": 1.5},
        "sort_order": 50,
    },
    {
        "slug": "quick_ratio",
        "title": "Quick ratio",
        "category": "Liquidity",
        "metric_key": "quick_ratio",
        "summary": "Same idea as current ratio, but it ignores inventory (stock sitting in a warehouse).",
        "interpretation": "Stricter than current ratio. Use this when the company might not sell its inventory quickly.",
        "suggested_rule": {"metric": "quick_ratio", "op": ">=", "value": 1.0},
        "sort_order": 60,
    },
)

BRIEFING_SLUGS = frozenset(item["slug"] for item in BRIEFING_CATALOG)
BRIEFING_BY_SLUG = {item["slug"]: item for item in BRIEFING_CATALOG}
BRIEFING_BY_METRIC = {item["metric_key"]: item for item in BRIEFING_CATALOG}

# Extra chart metrics (not in the six core briefing slots). Same shape as criteria copy.
_EXTRA_METRIC_COPY: dict[str, dict[str, str]] = {
    "eod_close": {
        "summary": "The last traded share price at the end of that fiscal period.",
        "interpretation": "This is the real market price. If a line is missing, EOD prices were not loaded for that ticker.",
    },
    "implied_close": {
        "summary": "A guessed share price from the financial statements (for example price-to-earnings × earnings per share).",
        "interpretation": "Use this when the market close is missing. It is a model, not the price someone paid that day.",
    },
    "pe_ratio": {
        "summary": "How many dollars you pay for $1 of last year’s profit. 25 means $25 of price per $1 of earnings.",
        "interpretation": "Lower can mean cheaper — or that investors do not trust the profit. Compare similar companies, not a grocer to a software firm.",
    },
    "forward_pe_ratio": {
        "summary": "Same as P/E, but using next year’s expected profit instead of last year’s.",
        "interpretation": "Only as good as those forecasts. A “cheap” forward P/E is not cheap if the forecast is too rosy.",
    },
    "price_to_book": {
        "summary": "Share price compared with what the books say the company is worth if you sold the assets and paid the debts.",
        "interpretation": "A factory-heavy business often looks cheaper on this than a software company, which has little “book” value.",
    },
    "roe": {
        "summary": "Profit compared with the owners’ book value. 0.25 means 25 cents of profit per $1 of equity. 1.64 means 164%.",
        "interpretation": "A huge number often means equity was shrunk (buybacks) or there is a lot of debt — not that the business magically earns 164 cents on every real dollar.",
    },
    "roa": {
        "summary": "Profit compared with everything the company owns (buildings, cash, inventory, etc.). 0.10 means 10 cents per $1 of assets.",
        "interpretation": "Harder to juice with buybacks than ROE. Banks and factories often look low here; that can be normal.",
    },
    "eps": {
        "summary": "Profit divided by the number of shares. One number per share, in dollars.",
        "interpretation": "Watch the trend, not one year. Extra shares or one-time gains can move this without the business getting better.",
    },
    "revenue_growth_yoy": {
        "summary": "How much sales grew versus the same period a year ago. 0.12 means sales were up 12%.",
        "interpretation": "Easy to look fast when you start small. Check whether profit grew too, or they only added sales.",
    },
    "earnings_growth_yoy": {
        "summary": "How much profit grew versus a year ago. 0.08 means profit was up 8%.",
        "interpretation": "Jumps around more than sales. One hot year is not a five-year story — use the 5-year average for that.",
    },
    "operating_cash_flow": {
        "summary": "Cash the day-to-day business brought in, in dollars (not a percent).",
        "interpretation": "Bigger companies show bigger numbers. Compare similar-sized names, or look at whether it is rising.",
    },
    "dividend_yield": {
        "summary": "The dividend compared with the share price. 0.03 means about 3% a year.",
        "interpretation": "A high number can mean a generous payout — or a falling stock price. It does not tell you if they can keep paying it.",
    },
    "market_cap": {
        "summary": "What the whole company would cost if you bought every share at the current price.",
        "interpretation": "Apple and Nvidia will look huge next to everyone else. For a fair overlay, pick a ratio (margin, ROE, P/E) instead.",
    },
}


def metric_explainer(key: str) -> dict[str, str]:
    """Summary + interpretation for dashboard/criteria (empty strings if unknown)."""
    item = BRIEFING_BY_METRIC.get(key)
    if item is not None:
        return {"summary": item["summary"], "interpretation": item["interpretation"]}
    extra = _EXTRA_METRIC_COPY.get(key)
    if extra is not None:
        return {"summary": extra["summary"], "interpretation": extra["interpretation"]}
    base = dict(FIVE_YEAR_AVG_METRICS).get(key)
    if base:
        inner = metric_explainer(base)
        return {
            "summary": "Average of the last five years of this metric (or fewer if that is all we have).",
            "interpretation": inner["interpretation"] or inner["summary"],
        }
    return {"summary": "", "interpretation": ""}


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
