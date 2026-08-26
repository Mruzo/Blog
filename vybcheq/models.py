from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from vybcheq.money import MONEY_QUANT, quantize_money


def _default_sections():
    return {}


def _default_metrics_snapshot():
    return {}


def _default_rules():
    return []


class Security(models.Model):
    """A tradable security (US, Canada, etc.)."""

    symbol = models.CharField(max_length=32, db_index=True)
    exchange = models.CharField(max_length=64, db_index=True)
    currency = models.CharField(max_length=8, default="USD")
    name = models.CharField(max_length=255, blank=True)
    sector = models.CharField(max_length=128, blank=True)
    industry = models.CharField(max_length=128, blank=True)
    country = models.CharField(max_length=64, blank=True)
    cik = models.CharField("CIK", max_length=32, blank=True, help_text="US SEC CIK, if applicable.")
    is_active = models.BooleanField(default=True)
    screening_metrics = models.JSONField(
        default=_default_metrics_snapshot,
        blank=True,
        help_text='Numbers used by vibe-check rules, e.g. {"pe_ratio": 18.2, "roe": 0.14}',
    )
    quote_last_price = models.DecimalField(
        max_digits=24,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Sim mark price: EOD close when loaded, else fundamentals-implied. 1 cheq ≈ 1 USD.",
    )
    quote_updated_at = models.DateTimeField(null=True, blank=True)
    quote_mark_source = models.CharField(
        max_length=16,
        blank=True,
        help_text="Which cached price feeds quote_last_price: eod or implied.",
    )
    quote_eod_close = models.DecimalField(
        max_digits=24,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Last market EOD close from FMP historical-price-eod.",
    )
    quote_eod_trade_date = models.DateField(
        null=True,
        blank=True,
        help_text="Trade date the EOD close is for (not when it was fetched).",
    )
    quote_eod_refreshed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When EOD data was last pulled from FMP.",
    )
    quote_implied_close = models.DecimalField(
        max_digits=24,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Price implied from FMP ratios/key-metrics for a fiscal period.",
    )
    quote_implied_period_end = models.DateField(
        null=True,
        blank=True,
        help_text="Fiscal period end the implied price is aligned with.",
    )
    quote_implied_method = models.CharField(
        max_length=32,
        blank=True,
        help_text="How implied price was derived (e.g. pe_x_eps).",
    )
    quote_implied_period_mode = models.CharField(
        max_length=32,
        blank=True,
        help_text="FMP period mode: quarter, annual, ttm, etc.",
    )
    quote_implied_refreshed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When fundamentals-implied price was last refreshed.",
    )
    last_report_date = models.DateField(
        null=True,
        blank=True,
        help_text="Most recent filing date from FMP financial-reports-dates.",
    )
    report_dates_updated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When report filing dates were last refreshed from FMP.",
    )

    class Meta:
        ordering = ["exchange", "symbol"]
        verbose_name_plural = "securities"
        constraints = [
            models.UniqueConstraint(
                fields=["symbol", "exchange"],
                name="vybcheq_security_symbol_exchange_uniq",
            ),
        ]

    def __str__(self):
        return f"{self.symbol}.{self.exchange}"


class SecurityDailyQuote(models.Model):
    """End-of-day OHLCV from a licensed feed (FMP); one row per security per trade date."""

    security = models.ForeignKey(
        Security,
        on_delete=models.CASCADE,
        related_name="daily_quotes",
    )
    trade_date = models.DateField(db_index=True)
    close = models.DecimalField(max_digits=24, decimal_places=2)
    open = models.DecimalField(max_digits=24, decimal_places=2, null=True, blank=True)
    high = models.DecimalField(max_digits=24, decimal_places=2, null=True, blank=True)
    low = models.DecimalField(max_digits=24, decimal_places=2, null=True, blank=True)
    volume = models.BigIntegerField(null=True, blank=True)
    source = models.CharField(max_length=16, default="fmp")

    class Meta:
        ordering = ["-trade_date"]
        constraints = [
            models.UniqueConstraint(
                fields=["security", "trade_date"],
                name="vybcheq_securitydailyquote_security_date_uniq",
            ),
        ]

    def __str__(self):
        return f"{self.security} EOD {self.trade_date} @ {self.close}"


class SecurityFiscalQuarter(models.Model):
    """
    Calendar quarter-end snapshot: EOD close on last trading day on/before period_end,
    plus optional fundamentals JSON for that period (FMP when plan allows).
    """

    security = models.ForeignKey(
        Security,
        on_delete=models.CASCADE,
        related_name="fiscal_quarters",
    )
    period_end = models.DateField(
        db_index=True,
        help_text="Calendar quarter end (Mar 31, Jun 30, Sep 30, Dec 31).",
    )
    trade_date = models.DateField(
        help_text="Fiscal period date from FMP fundamentals (not the EOD bar date).",
    )
    eod_trade_date = models.DateField(
        null=True,
        blank=True,
        help_text="Last trading day on or before period_end used for the EOD market close.",
    )
    close = models.DecimalField(
        max_digits=24,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="EOD market close on eod_trade_date (quarter-end bar from FMP).",
    )
    implied_close = models.DecimalField(
        max_digits=24,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Price implied from FMP ratios/key-metrics for this fiscal period.",
    )
    open = models.DecimalField(max_digits=24, decimal_places=2, null=True, blank=True)
    high = models.DecimalField(max_digits=24, decimal_places=2, null=True, blank=True)
    low = models.DecimalField(max_digits=24, decimal_places=2, null=True, blank=True)
    volume = models.BigIntegerField(null=True, blank=True)
    report_date = models.DateField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Date the financial report was filed/published (FMP financial-reports-dates).",
    )
    metrics = models.JSONField(
        default=_default_metrics_snapshot,
        blank=True,
        help_text="Fundamentals for this quarter (_raw FMP row + mapped rule keys).",
    )
    source = models.CharField(max_length=16, default="fmp")

    class Meta:
        ordering = ["-period_end"]
        constraints = [
            models.UniqueConstraint(
                fields=["security", "period_end"],
                name="vybcheq_securityfiscalquarter_security_period_uniq",
            ),
        ]

    def __str__(self):
        price = self.implied_close if self.implied_close is not None else self.close
        return f"{self.security} Q {self.period_end} @ {price}"


class WatchlistEntry(models.Model):
    """Ticker on your personal watchlist (one row per security)."""

    security = models.OneToOneField(
        Security,
        on_delete=models.CASCADE,
        related_name="watchlist_entry",
    )
    priority = models.PositiveSmallIntegerField(
        default=5,
        validators=[MinValueValidator(1)],
        help_text="1 = highest",
    )
    added_at = models.DateTimeField(auto_now_add=True)
    last_reviewed_at = models.DateTimeField(null=True, blank=True)
    note = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ["priority", "security__symbol"]

    def __str__(self):
        return f"Watch: {self.security}"


class ScreeningRuleSet(models.Model):
    """Versioned set of screening rules (JSON), e.g. vibe-check criteria."""

    name = models.CharField(max_length=128)
    brief_slug = models.CharField(
        max_length=64,
        blank=True,
        db_index=True,
        help_text="Links core checks to the briefing catalog (e.g. gross_margin).",
    )
    is_active = models.BooleanField(default=False)
    rules = models.JSONField(
        default=_default_rules,
        help_text='List of rules, e.g. [{"metric": "pe_ratio", "op": "<=", "value": 25}]',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class ScreenRun(models.Model):
    """One execution of a rule set against a universe."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        OK = "ok", "OK"
        FAILED = "failed", "Failed"

    rule_set = models.ForeignKey(
        ScreeningRuleSet,
        on_delete=models.PROTECT,
        related_name="screen_runs",
    )
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
    )
    error_message = models.TextField(blank=True)
    universe_note = models.CharField(
        max_length=255,
        blank=True,
        help_text="e.g. watchlist only, TSX + NASDAQ, …",
    )

    class Meta:
        ordering = ["-started_at"]

    def __str__(self):
        return f"Run {self.pk} ({self.status}) — {self.rule_set}"


class ScreenResult(models.Model):
    """Outcome for one security in a given ScreenRun."""

    run = models.ForeignKey(
        ScreenRun,
        on_delete=models.CASCADE,
        related_name="screen_results",
    )
    security = models.ForeignKey(
        Security,
        on_delete=models.CASCADE,
        related_name="screen_results",
    )
    passed = models.BooleanField()
    score = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True,
    )
    metrics_snapshot = models.JSONField(
        default=_default_metrics_snapshot,
        help_text="Numeric inputs used for this pass/fail.",
    )
    details = models.TextField(blank=True)

    class Meta:
        ordering = ["-passed", "score"]
        constraints = [
            models.UniqueConstraint(
                fields=["run", "security"],
                name="vybcheq_screenresult_run_security_uniq",
            ),
        ]

    def __str__(self):
        return f"{self.security} @ run {self.run_id}: {'PASS' if self.passed else 'FAIL'}"


class ResearchPacket(models.Model):
    """Workbook-style notes per security (chapter keys in JSON)."""

    security = models.OneToOneField(
        Security,
        on_delete=models.CASCADE,
        related_name="research_packet",
    )
    sections = models.JSONField(default=_default_sections)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["security__symbol"]

    def __str__(self):
        return f"Research: {self.security}"


class DecisionLog(models.Model):
    """Recorded buy/sell/hold decision and thesis."""

    class Action(models.TextChoices):
        BUY = "buy", "Buy"
        SELL = "sell", "Sell"
        HOLD = "hold", "Hold"
        PASS = "pass", "Pass"

    security = models.ForeignKey(
        Security,
        on_delete=models.CASCADE,
        related_name="decisions",
    )
    decided_at = models.DateTimeField(auto_now_add=True)
    action = models.CharField(max_length=16, choices=Action.choices)
    thesis = models.TextField()
    risk = models.TextField()
    invalidation = models.TextField(
        blank=True,
        help_text="What would prove this thesis wrong?",
    )
    quantity = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    notional = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)
    price = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ["-decided_at"]

    def __str__(self):
        return f"{self.action} {self.security} @ {self.decided_at.date()}"


class CheqAccount(models.Model):
    """Staff-only simulated wallet (cheqs)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cheq_account",
    )
    balance = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        default=Decimal("10000.00"),
        validators=[MinValueValidator(Decimal("0"))],
    )

    class Meta:
        verbose_name = "cheq account"
        verbose_name_plural = "cheq accounts"

    def __str__(self):
        return f"{self.user} — {self.balance} cheqs"


class SimPosition(models.Model):
    """Simulated long position: cheqs opened at entry price (synthetic fractional shares)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sim_positions",
    )
    security = models.ForeignKey(
        Security,
        on_delete=models.PROTECT,
        related_name="sim_positions",
    )
    cheqs_opened = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        validators=[MinValueValidator(MONEY_QUANT)],
    )
    entry_price = models.DecimalField(max_digits=24, decimal_places=2)
    shares = models.DecimalField(max_digits=24, decimal_places=12)
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    exit_price = models.DecimalField(
        max_digits=24,
        decimal_places=2,
        null=True,
        blank=True,
    )
    cheqs_proceeds = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Cheqs returned to wallet on close.",
    )
    parent_position = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="partial_closes",
        help_text="Set when this row records a partial sell from a still-open lot.",
    )

    class Meta:
        ordering = ["-opened_at"]

    def __str__(self):
        return f"{self.user} {self.security} ({self.cheqs_opened} cheqs)"

    @property
    def is_open(self) -> bool:
        return self.closed_at is None

    @property
    def mark_value_cheqs(self) -> Decimal:
        """Current notional in cheqs using cached quote, else entry."""
        if self.closed_at and self.cheqs_proceeds is not None:
            return self.cheqs_proceeds
        p = quantize_money(self.security.quote_last_price)
        if p is None or p <= 0:
            return self.cheqs_opened
        return quantize_money(self.shares * p) or self.cheqs_opened

    @property
    def unrealized_pnl_cheqs(self) -> Decimal:
        if not self.is_open:
            return Decimal("0")
        return self.mark_value_cheqs - self.cheqs_opened

    @property
    def realized_pnl_cheqs(self) -> Decimal:
        if self.cheqs_proceeds is None:
            return Decimal("0")
        return self.cheqs_proceeds - self.cheqs_opened


class PositionMark(models.Model):
    """Time series point for simulated position (respect rate limits when recording)."""

    position = models.ForeignKey(
        SimPosition,
        on_delete=models.CASCADE,
        related_name="marks",
    )
    marked_at = models.DateTimeField(default=timezone.now, db_index=True)
    price = models.DecimalField(max_digits=24, decimal_places=2)
    value_cheqs = models.DecimalField(max_digits=20, decimal_places=2)

    class Meta:
        ordering = ["marked_at"]

    def __str__(self):
        return f"{self.position_id} @ {self.marked_at}"

    @property
    def delta_vs_opened_cheqs(self) -> Decimal:
        return self.value_cheqs - self.position.cheqs_opened


class FmpDirectoryMeta(models.Model):
    """Singleton metadata for the cached FMP financial-statement symbol list."""

    synced_at = models.DateTimeField(null=True, blank=True)
    total_count = models.PositiveIntegerField(default=0)
    us_count = models.PositiveIntegerField(default=0)
    foreign_count = models.PositiveIntegerField(default=0)
    endpoint = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = "FMP symbol directory"
        verbose_name_plural = "FMP symbol directory"

    def __str__(self):
        if self.synced_at:
            return f"FMP directory · {self.total_count} symbols · {self.synced_at:%Y-%m-%d %H:%M}"
        return "FMP directory (not synced)"

    @classmethod
    def get_solo(cls) -> "FmpDirectoryMeta":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class FmpFinancialSymbol(models.Model):
    """
    Cached row from FMP symbol directory (1 API call refresh via stock-list or statement list).

    ``fmp_symbol`` is the ticker string FMP expects on ratios/key-metrics calls.
    ``symbol`` + ``exchange`` align with Vybcheq ``Security`` for catalog/watchlist joins.
    """

    fmp_symbol = models.CharField(max_length=32, unique=True, db_index=True)
    symbol = models.CharField(max_length=32, db_index=True)
    exchange = models.CharField(max_length=64, db_index=True)
    name = models.CharField(max_length=255, blank=True)
    currency = models.CharField(max_length=8, blank=True)
    exchange_short_name = models.CharField(max_length=64, blank=True)
    exchange_full_name = models.CharField(max_length=128, blank=True)
    country = models.CharField(max_length=64, blank=True)
    symbol_type = models.CharField(max_length=32, blank=True)
    is_us_major = models.BooleanField(
        default=False,
        db_index=True,
        help_text="NASDAQ, NYSE, or AMEX — typical FMP free-tier fundamentals coverage.",
    )
    raw = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["exchange", "symbol"]
        indexes = [
            models.Index(fields=["is_us_major", "exchange", "symbol"]),
        ]

    def __str__(self):
        return f"{self.symbol}.{self.exchange} ({self.fmp_symbol})"
