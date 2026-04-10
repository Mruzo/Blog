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
