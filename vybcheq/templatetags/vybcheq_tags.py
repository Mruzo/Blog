from decimal import Decimal

from django import template

from vybcheq.forms import SCREENING_METRIC_FIELDS
from vybcheq.money import format_money
from vybcheq.screening import _fmt_val

register = template.Library()

_SCREENING_METRIC_LABELS = dict(SCREENING_METRIC_FIELDS)

_OP_DISPLAY = {
    "<=": "≤",
    ">=": "≥",
    "<": "<",
    ">": ">",
    "==": "=",
    "!=": "≠",
}


@register.filter
def format_cheqs(value) -> str:
    """Format cheq / notional amounts (alias for format_money)."""
    return format_money(value)


@register.filter(name="format_money")
def format_money_filter(value) -> str:
    """Format prices, cheqs, and other currency amounts to two decimals."""
    return format_money(value)


@register.filter
def vybcheq_detail_lines(text):
    """Split stored rule details into non-empty lines for list rendering."""
    if not text:
        return []
    return [ln.strip() for ln in str(text).splitlines() if ln.strip()]


@register.filter
def vybcheq_detail_line_class(line):
    """Bootstrap border color class for a single detail line."""
    if "→ FAIL" in line or "-> FAIL" in line:
        return "border-danger"
    if "→ PASS" in line or "-> PASS" in line:
        return "border-success"
    return "border-secondary"


@register.filter
def vybcheq_detail_text_class(line):
    if "→ FAIL" in line or "-> FAIL" in line:
        return "text-danger"
    return "text-light"


@register.filter
def currency_prefix(code: str) -> str:
    """
    Short currency prefix for UI display.
    Prefer a symbol when it's unambiguous; otherwise fall back to ISO code + space.
    """
    c = (code or "").strip().upper()
    symbols = {
        "USD": "$",
        "EUR": "€",
        "GBP": "£",
        "JPY": "¥",
        "CNY": "¥",
        "CHF": "CHF ",
        "CAD": "C$",
        "AUD": "A$",
        "NZD": "NZ$",
        "HKD": "HK$",
        "SGD": "S$",
        "SEK": "SEK ",
        "NOK": "NOK ",
        "DKK": "DKK ",
        "INR": "₹",
        "KRW": "₩",
        "BRL": "R$",
        "MXN": "MX$",
        "ZAR": "R ",
    }
    if c in symbols:
        return symbols[c]
    return (c + " ") if c else ""


@register.filter
def screening_metric_label(metric_key: str) -> str:
    """Human label for a screening_metrics / rule metric key."""
    key = (metric_key or "").strip()
    if not key:
        return "—"
    extras = {
        "close": "Close / implied price",
        "period_end": "Period end",
        "trade_date": "Trade date",
    }
    if key in extras:
        return extras[key]
    return _SCREENING_METRIC_LABELS.get(key, key.replace("_", " "))


_METRICS_SNAPSHOT_PRIORITY = ("close", "period_end", "trade_date")


@register.filter
def metrics_snapshot_rows(snapshot):
    """
    Flat metrics for display on screen run detail (skips internal ``_`` keys).
    Returns list of {"key", "label", "value"} dicts.
    """
    if not isinstance(snapshot, dict):
        return []
    rows: list[dict] = []
    seen: set[str] = set()
    for key in _METRICS_SNAPSHOT_PRIORITY:
        if key not in snapshot or key.startswith("_"):
            continue
        seen.add(key)
        rows.append(
            {
                "key": key,
                "label": screening_metric_label(key),
                "value": _fmt_val(snapshot[key]),
            }
        )
    for key in sorted(snapshot):
        if key.startswith("_") or key in seen:
            continue
        val = snapshot[key]
        if isinstance(val, (dict, list)):
            continue
        rows.append(
            {
                "key": key,
                "label": screening_metric_label(key),
                "value": _fmt_val(val),
            }
        )
    return rows


@register.filter
def metrics_snapshot_internal_keys(snapshot):
    """Internal keys (``_raw``, ``_price_method``, …) saved on a metrics snapshot."""
    if not isinstance(snapshot, dict):
        return []
    return sorted(k for k in snapshot if k.startswith("_"))


@register.filter
def format_screening_rule(rule) -> str:
    """
    One rule dict -> readable line, e.g. 'P/E (trailing) ≤ 25'.
    """
    if not isinstance(rule, dict):
        return str(rule)
    metric = rule.get("metric")
    op = rule.get("op")
    value = rule.get("value")
    if metric is None or op is None or value is None:
        return "Invalid rule (need metric, op, value)"
    label = screening_metric_label(metric)
    op_txt = _OP_DISPLAY.get(str(op), str(op))
    try:
        val_txt = _fmt_val(value)
    except (TypeError, ValueError):
        val_txt = str(value)
    return f"{label} {op_txt} {val_txt}"
