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

from django.utils import timezone

from vybcheq.models import ScreenResult, ScreenRun, ScreeningRuleSet, Security
from vybcheq.screening_metrics import latest_screening_metrics

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


def run_screen_against_watchlist(rule_set: ScreeningRuleSet) -> ScreenRun:
    """
    Create a ScreenRun, evaluate each watchlist Security, attach ScreenResults.
    Uses the most recent SecurityFiscalQuarter row when present, else screening_metrics.
    """
    securities = Security.objects.filter(
        watchlist_entry__isnull=False,
        is_active=True,
    ).distinct()

    run = ScreenRun.objects.create(
        rule_set=rule_set,
        status=ScreenRun.Status.PENDING,
        universe_note="watchlist",
    )

    try:
        rules = rule_set.rules or []
        for security in securities:
            metrics = latest_screening_metrics(security)
            passed, score, details = evaluate_rules(rules, metrics)
            ScreenResult.objects.create(
                run=run,
                security=security,
                passed=passed,
                score=score,
                metrics_snapshot=dict(metrics),
                details=details,
            )

        run.status = ScreenRun.Status.OK
        run.finished_at = timezone.now()
        run.save(update_fields=["status", "finished_at"])
    except Exception as exc:
        run.status = ScreenRun.Status.FAILED
        run.error_message = str(exc)
        run.finished_at = timezone.now()
        run.save(update_fields=["status", "error_message", "finished_at"])

    return run
