from django import template

register = template.Library()


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
