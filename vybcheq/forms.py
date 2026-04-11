import json
from decimal import Decimal, ROUND_FLOOR

from django import forms
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator

from .models import Security, WatchlistEntry


class SecuritySelectWithQuote(forms.Select):
    """Select options include data-quote (cached last price) for client-side estimates."""

    def __init__(self, attrs=None, choices=(), quote_by_pk=None, currency_by_pk=None):
        self._quote_by_pk = quote_by_pk if quote_by_pk is not None else {}
        self._currency_by_pk = currency_by_pk if currency_by_pk is not None else {}
        super().__init__(attrs=attrs, choices=choices)

    def create_option(self, name, value, label, selected, index, subindex=None, attrs=None):
        option = super().create_option(
            name, value, label, selected, index, subindex=subindex, attrs=attrs
        )
        if value in (None, ""):
            return option
        try:
            # ModelChoiceField values can be wrappers; normalize via str().
            pk = int(str(value))
        except (TypeError, ValueError):
            return option
        q = self._quote_by_pk.get(pk)
        cur = (self._currency_by_pk.get(pk) or "").strip().upper()
        option.setdefault("attrs", {})
        if q is not None and q > 0:
            option["attrs"]["data-quote"] = format(q, "f")
        else:
            option["attrs"]["data-quote"] = ""
        option["attrs"]["data-currency"] = cur
        return option


def currency_prefix(code: str) -> str:
    """
    Return a short currency prefix for UI display.
    Prefer a symbol when it's unambiguous; otherwise fall back to the ISO code.
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


class SimTradeOpenForm(forms.Form):
    """Open a simulated position using the cached last quote on Security (no Yahoo on submit)."""

    security = forms.ModelChoiceField(
        queryset=Security.objects.filter(
            is_active=True,
            watchlist_entry__isnull=False,
        )
        .select_related("watchlist_entry")
        .order_by("watchlist_entry__priority", "exchange", "symbol"),
        label="Security",
        help_text="Watchlist only — add tickers on the Watchlist page first.",
        widget=forms.Select(attrs={"class": "form-select"}),
    )
    price_multiple = forms.IntegerField(
        label="Shares to buy (simulated)",
        min_value=1,
        validators=[MinValueValidator(1)],
        widget=forms.NumberInput(
            attrs={
                "class": "form-control",
                # Whole multiples of the quote: 1 ≈ one share’s notional, 2 ≈ two, etc.
                "step": "1",
                "min": "1",
                "inputmode": "numeric",
            }
        ),
        help_text=(
            "Cheqs deducted ≈ shares × cached last price on file "
            "(1 cheq ≈ 1 USD notional). The +/− control steps by 1 share. "
            "Ensure an up-to-date cached quote exists (e.g. Yahoo merge in admin) before trading."
        ),
    )

    def __init__(self, *args, wallet_balance: Decimal | None = None, **kwargs):
        self.wallet_balance = wallet_balance
        super().__init__(*args, **kwargs)
        field = self.fields["security"]
        securities = list(field.queryset)
        quote_by_pk = {s.pk: s.quote_last_price for s in securities}
        currency_by_pk = {s.pk: s.currency for s in securities}

        def label_from_instance(obj):
            base = f"{obj.symbol}.{obj.exchange}"
            pq = quote_by_pk.get(obj.pk)
            if pq is not None and pq > 0:
                return f"{base} — {currency_prefix(obj.currency)}{pq:.2f}"
            return f"{base} — (no cached quote)"

        field.label_from_instance = label_from_instance
        attrs = dict(field.widget.attrs or {})
        attrs.setdefault("class", "form-select")
        field.widget = SecuritySelectWithQuote(
            attrs=attrs, quote_by_pk=quote_by_pk, currency_by_pk=currency_by_pk
        )
        # Replacing the widget drops ModelChoiceField’s choice iterator unless re-bound.
        field.widget.choices = field.choices

    def clean_security(self):
        sec = self.cleaned_data.get("security")
        if sec is None:
            return sec
        if not WatchlistEntry.objects.filter(security_id=sec.pk).exists():
            raise ValidationError("That security is not on your watchlist.")
        return sec

    def clean(self):
        cleaned = super().clean()
        sec: Security | None = cleaned.get("security")
        shares = cleaned.get("price_multiple")
        if sec is None or shares in (None, ""):
            return cleaned
        wallet = self.wallet_balance
        if wallet is None:
            return cleaned
        qp = sec.quote_last_price
        if qp is None or qp <= 0:
            return cleaned  # can't validate without a cached quote
        max_shares = int((wallet / qp).to_integral_value(rounding=ROUND_FLOOR))
        if max_shares < 1:
            raise ValidationError(
                "Your wallet is smaller than 1 share at the cached quote. "
                "Lower the share count or refresh quotes."
            )
        if int(shares) > max_shares:
            raise ValidationError(
                f"Your max is {max_shares}. "
                f"You would need more cheqs. " 
            )
        return cleaned
