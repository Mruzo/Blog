"""
Evaluate ScreeningRuleSet.rules against Security.screening_metrics (JSON).

Each rule: {"metric": str, "op": str, "value": number}
Supported ops: <=, >=, <, >, ==, !=
Missing metric or bad rule shape: that rule fails (conservative).
Empty rules list: pass (nothing to violate).
"""
from __future__ import annotations

from decimal import Decimal
from typing import Any

from collections import defaultdict

from django.utils import timezone

from vybcheq.models import ScreenResult, ScreenRun, ScreeningRuleSet, Security, SecurityFiscalQuarter
from vybcheq.rule_set_briefing import PORTFOLIO_BRIEF_SLUG
from vybcheq.screening_metrics import (
    metrics_from_fiscal_quarter,
    pick_latest_quarter_for_screening,
    slim_metrics_snapshot,
)

OPS = {
    "<=": lambda a, b: a <= b,
    ">=": lambda a, b: a >= b,
    "<": lambda a, b: a < b,
    ">": lambda a, b: a > b,
    "==": lambda a, b: a == b,
    "!=": lambda a, b: a != b,
}


def _to_float(x: Any) -> float:
    if isinstance(x, Decimal):
        return float(x)
    return float(x)


def _fmt_val(x: Any) -> str:
    """Human-readable number for rule detail lines (not full float precision)."""
    try:
        v = float(x)
    except (TypeError, ValueError):
        return str(x)
    if v != v:  # NaN
        return "nan"
    av = abs(v)
    if av >= 1e12:
        return f"{v / 1e12:.3f}T"
    if av >= 1e9:
        return f"{v / 1e9:.3f}B"
    if av >= 1e6:
        return f"{v / 1e6:.3f}M"
    if av >= 1000:
        return f"{v:,.2f}"
    if av >= 1:
        return f"{v:.4g}"
    return f"{v:.4f}".rstrip("0").rstrip(".")


def evaluate_rules(rules: list, metrics: dict) -> tuple[bool, Decimal | None, str]:
    """
    Returns (passed_all, score, details_text).
    passed_all: True only if every rule was evaluated and passed.
    score: 0–100 = percent of rules that passed comparison; None if rules empty.
    """
    if not rules:
        return True, None, "No rules defined; marked pass."

    lines: list[str] = []
    rule_ok: list[bool] = []

    for i, rule in enumerate(rules, start=1):
        metric = rule.get("metric")
        op = rule.get("op")
        value = rule.get("value")

        if metric is None or op is None or value is None:
            lines.append(f"Rule {i}: invalid shape (need metric, op, value).")
            rule_ok.append(False)
            continue

        if op not in OPS:
            lines.append(f"Rule {i}: unknown op {op!r}.")
            rule_ok.append(False)
            continue

        if metric not in metrics:
            lines.append(f"Rule {i}: missing metric {metric!r}.")
            rule_ok.append(False)
            continue

        try:
            left = _to_float(metrics[metric])
            right = _to_float(value)
        except (TypeError, ValueError):
            lines.append(f"Rule {i}: non-numeric values for comparison.")
            rule_ok.append(False)
            continue

        ok = OPS[op](left, right)
        rule_ok.append(ok)
        lines.append(
            f"Rule {i}: {metric} — {_fmt_val(left)} {op} {_fmt_val(right)} → "
            f"{'PASS' if ok else 'FAIL'}"
        )

    passed_all = all(rule_ok)
    n = len(rule_ok)
    wins = sum(1 for x in rule_ok if x)
    score = (Decimal("100") * Decimal(wins) / Decimal(n)) if n else None

    return passed_all, score, "\n".join(lines)


def _metrics_for_screened_security(security: Security) -> dict[str, Any]:
    """Use prefetched recent quarters when present; else legacy flat cache."""
    recent = getattr(security, "_screen_quarters", None)
    if recent is None:
        recent = list(security.fiscal_quarters.order_by("-period_end")[:40])
    quarter = pick_latest_quarter_for_screening(recent)
    if quarter is not None and (
        quarter.metrics or quarter.implied_close is not None or quarter.close is not None
    ):
        return metrics_from_fiscal_quarter(quarter)
    return dict(security.screening_metrics or {})


def _prefetch_recent_quarters(securities: list[Security], *, limit: int = 40) -> None:
    """Attach up to ``limit`` newest quarters per security in one query."""
    if not securities:
        return
    by_id: dict[int, list[SecurityFiscalQuarter]] = defaultdict(list)
    for q in SecurityFiscalQuarter.objects.filter(
        security_id__in=[s.pk for s in securities]
    ).order_by("security_id", "-period_end"):
        bucket = by_id[q.security_id]
        if len(bucket) < limit:
            bucket.append(q)
    for sec in securities:
        sec._screen_quarters = by_id.get(sec.pk, [])


def run_screen_against_watchlist(rule_set: ScreeningRuleSet) -> ScreenRun:
    """
    Create a ScreenRun, evaluate each watchlist Security, attach ScreenResults.
    Prefetches recent fiscal quarters once; bulk-creates results; strips ``_`` keys
    from metrics snapshots.
    """
    securities = list(
        Security.objects.filter(
            watchlist_entry__isnull=False,
            is_active=True,
        ).distinct()
    )
    _prefetch_recent_quarters(securities)

    run = ScreenRun.objects.create(
        rule_set=rule_set,
        status=ScreenRun.Status.PENDING,
        universe_note="watchlist",
    )

    try:
        rules = rule_set.rules or []
        results: list[ScreenResult] = []
        for security in securities:
            metrics = _metrics_for_screened_security(security)
            passed, score, details = evaluate_rules(rules, metrics)
            results.append(
                ScreenResult(
                    run=run,
                    security=security,
                    passed=passed,
                    score=score,
                    metrics_snapshot=slim_metrics_snapshot(metrics),
                    details=details,
                )
            )
        if results:
            ScreenResult.objects.bulk_create(results)

        run.status = ScreenRun.Status.OK
        run.finished_at = timezone.now()
        run.save(update_fields=["status", "finished_at"])
    except Exception as exc:
        run.status = ScreenRun.Status.FAILED
        run.error_message = str(exc)
        run.finished_at = timezone.now()
        run.save(update_fields=["status", "error_message", "finished_at"])

    return run


def build_portfolio_rules(rule_sets: list[ScreeningRuleSet]) -> list[dict[str, Any]]:
    combined: list[dict[str, Any]] = []
    for rule_set in rule_sets:
        combined.extend(rule_set.rules or [])
    return combined


def ensure_portfolio_rule_set(rule_sets: list[ScreeningRuleSet]) -> ScreeningRuleSet:
    rules = build_portfolio_rules(rule_sets)
    label = f"Portfolio bar ({len(rule_sets)} checks)"
    portfolio, created = ScreeningRuleSet.objects.update_or_create(
        brief_slug=PORTFOLIO_BRIEF_SLUG,
        defaults={"name": label, "rules": rules, "is_active": True},
    )
    if not created:
        portfolio.name = label
        portfolio.rules = rules
        portfolio.is_active = True
        portfolio.save(update_fields=["name", "rules", "is_active"])
    return portfolio


def run_composite_screen_against_watchlist(rule_sets: list[ScreeningRuleSet]) -> ScreenRun:
    """AND together rules from multiple saved checks into one watchlist run."""
    if not rule_sets:
        raise ValueError("At least one rule set is required for a composite run.")
    portfolio = ensure_portfolio_rule_set(rule_sets)
    return run_screen_against_watchlist(portfolio)
