from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


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
        decimal_places=8,
        null=True,
        blank=True,
        help_text="Cached last price (Yahoo); used for simulated marks. 1 cheq ≈ 1 USD notional.",
    )
    quote_updated_at = models.DateTimeField(null=True, blank=True)

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
    notional = models.DecimalField(max_digits=20, decimal_places=4, null=True, blank=True)
    price = models.DecimalField(max_digits=20, decimal_places=4, null=True, blank=True)

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
        decimal_places=4,
        default=Decimal("10000"),
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
        decimal_places=4,
        validators=[MinValueValidator(Decimal("0.0001"))],
    )
    entry_price = models.DecimalField(max_digits=24, decimal_places=8)
    shares = models.DecimalField(max_digits=24, decimal_places=12)
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    exit_price = models.DecimalField(
        max_digits=24,
        decimal_places=8,
        null=True,
        blank=True,
    )
    cheqs_proceeds = models.DecimalField(
        max_digits=20,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Cheqs returned to wallet on close.",
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
        p = self.security.quote_last_price
        if p is None or p <= 0:
            return self.cheqs_opened
        return (self.shares * p).quantize(Decimal("0.0001"))

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
    price = models.DecimalField(max_digits=24, decimal_places=8)
    value_cheqs = models.DecimalField(max_digits=20, decimal_places=4)

    class Meta:
        ordering = ["marked_at"]

    def __str__(self):
        return f"{self.position_id} @ {self.marked_at}"

    @property
    def delta_vs_opened_cheqs(self) -> Decimal:
        return self.value_cheqs - self.position.cheqs_opened
