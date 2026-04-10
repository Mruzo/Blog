import json

from django import forms
from django.core.exceptions import ValidationError

from .models import Security

# Keys we surface in the staff UI (same vocabulary as Yahoo merge + screening rules).
SCREENING_METRIC_FIELDS = [
    ("pe_ratio", "P/E (trailing)"),
    ("forward_pe_ratio", "P/E (forward)"),
    ("price_to_book", "Price / book"),
    ("roe", "Return on equity (fraction, e.g. 0.25)"),
    ("net_margin", "Net margin (fraction)"),
    ("debt_to_equity", "Debt / equity"),
    ("current_ratio", "Current ratio"),
    ("quick_ratio", "Quick ratio"),
    ("revenue_growth_yoy", "Revenue growth (Yahoo field)"),
    ("earnings_growth_yoy", "Earnings growth (Yahoo field)"),
    ("dividend_yield", "Dividend yield (fraction)"),
    ("market_cap", "Market cap"),
]


class ScreeningMetricsForm(forms.Form):
    """Edit selected keys on Security.screening_metrics; preserves other JSON keys."""

    advanced_json = forms.CharField(
        label="Advanced: full JSON (optional)",
        required=False,
        widget=forms.Textarea(attrs={"rows": 6, "class": "form-control font-monospace"}),
        help_text="If set, must be valid JSON and replaces the entire screening_metrics object.",
    )

    def __init__(self, *args, security: Security | None = None, **kwargs):
        super().__init__(*args, **kwargs)
        for name, label in SCREENING_METRIC_FIELDS:
            self.fields[name] = forms.DecimalField(
                label=label,
                required=False,
                max_digits=24,
                decimal_places=8,
                widget=forms.NumberInput(attrs={"class": "form-control", "step": "any"}),
            )

        if security and security.screening_metrics:
            m = security.screening_metrics
            for name, _label in SCREENING_METRIC_FIELDS:
                if name in m and m[name] is not None:
                    self.initial[name] = m[name]

    def clean_advanced_json(self):
        raw = (self.cleaned_data.get("advanced_json") or "").strip()
        if not raw:
            return None
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValidationError(f"Invalid JSON: {exc}") from exc
        if not isinstance(data, dict):
            raise ValidationError("JSON must be an object (mapping).")
        return data

    def apply_to_security(self, security: Security) -> None:
        adv = self.cleaned_data.get("advanced_json")
        if isinstance(adv, dict) and adv:
            security.screening_metrics = adv
            security.save(update_fields=["screening_metrics"])
            return

        m = dict(security.screening_metrics or {})
        for name, _label in SCREENING_METRIC_FIELDS:
            val = self.cleaned_data.get(name)
            if val is not None:
                m[name] = float(val)
        security.screening_metrics = m
        security.save(update_fields=["screening_metrics"])
