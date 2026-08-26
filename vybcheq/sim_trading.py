"""
Simulated cheq trading for staff (1 cheq ≈ 1 USD notional vs cached quote).

Open/close and record-marks use Security.quote_last_price only — no market API calls.
That mark prefers EOD market close when loaded, else fundamentals-implied price.
Refresh EOD or fundamentals via Django admin before trading or marking.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import CheqAccount, PositionMark, Security, SimPosition
from .money import MONEY_QUANT, quantize_money


@dataclass
class CloseSharesResult:
    closed_records: list[SimPosition]
    shares_sold: Decimal
    exit_price: Decimal
    total_proceeds: Decimal


@dataclass
class AggregatedOpenPosition:
    """One row per security: totals across all open lots."""

    security: Security
    shares: Decimal
    cheqs_opened: Decimal
    mark_value_cheqs: Decimal
    lot_count: int
    position_ids: list[int]

    @property
    def unrealized_pnl_cheqs(self) -> Decimal:
        return self.mark_value_cheqs - self.cheqs_opened


def aggregate_open_positions(user) -> list[AggregatedOpenPosition]:
    lots = list(
        SimPosition.objects.filter(
            user=user,
            closed_at__isnull=True,
            parent_position__isnull=True,
        )
        .select_related("security")
        .order_by("security__symbol", "security__exchange", "-opened_at")
    )
    by_security: dict[int, list[SimPosition]] = defaultdict(list)
    for lot in lots:
        by_security[lot.security_id].append(lot)

    aggregated: list[AggregatedOpenPosition] = []
    for sec_lots in by_security.values():
        security = sec_lots[0].security
        shares = sum((lot.shares for lot in sec_lots), Decimal("0"))
        cheqs_opened = sum((lot.cheqs_opened for lot in sec_lots), Decimal("0"))
        mark_value = sum((lot.mark_value_cheqs for lot in sec_lots), Decimal("0"))
        aggregated.append(
            AggregatedOpenPosition(
                security=security,
                shares=shares,
                cheqs_opened=cheqs_opened,
                mark_value_cheqs=mark_value,
                lot_count=len(sec_lots),
                position_ids=[lot.pk for lot in sec_lots],
            )
        )
    aggregated.sort(key=lambda row: (row.security.symbol, row.security.exchange))
    return aggregated


def portfolio_open_totals(open_positions: list[AggregatedOpenPosition] | None = None, *, user=None) -> dict[str, Decimal]:
    """Sum open investment value and unrealized return (cheqs)."""
    if open_positions is None:
        if user is None:
            raise ValueError("Pass open_positions or user.")
        open_positions = aggregate_open_positions(user)
    invested = sum((row.mark_value_cheqs for row in open_positions), Decimal("0"))
    cost = sum((row.cheqs_opened for row in open_positions), Decimal("0"))
    invested = quantize_money(invested) or Decimal("0")
    cost = quantize_money(cost) or Decimal("0")
    return {
        "investment_value": invested,
        "cost_basis": cost,
        "total_return": quantize_money(invested - cost) or Decimal("0"),
    }


def get_or_create_cheq_account(user) -> CheqAccount:
    start = quantize_money(getattr(settings, "VYBCHEQ_STARTING_CHEQS", "10000")) or Decimal("10000.00")
    acct, _ = CheqAccount.objects.get_or_create(user=user, defaults={"balance": start})
    return acct


def _require_quote(security: Security) -> Decimal:
    price = quantize_money(security.quote_last_price)
    if price is None or price <= 0:
        raise ValueError(
            "No cached quote for this security. Run FMP EOD or fundamentals refresh in admin, then try again."
        )
    return price


@transaction.atomic
def open_position(
    user,
    security: Security,
    *,
    cheqs: Decimal | None = None,
    price_multiple: Decimal | None = None,
) -> SimPosition:
    """
    Open a lot using either an explicit cheq amount or a multiple of the cached quote
    (cheqs allocated = price_multiple × quote). Uses Security.quote_last_price only.
    """
    if (cheqs is None) == (price_multiple is None):
        raise ValueError("Pass exactly one of cheqs or price_multiple.")
    security.refresh_from_db(fields=["quote_last_price", "quote_updated_at"])
    price = _require_quote(security)
    if price_multiple is not None:
        if price_multiple <= 0:
            raise ValueError("Price multiple must be positive.")
        cheqs = quantize_money(price_multiple * price)
        if cheqs is None or cheqs < MONEY_QUANT:
            raise ValueError("Allocated cheqs round to zero; increase the multiple.")
    assert cheqs is not None
    cheqs = quantize_money(cheqs)
    assert cheqs is not None
    if cheqs <= 0:
        raise ValueError("Cheq amount must be positive.")
    get_or_create_cheq_account(user)
    acct = CheqAccount.objects.select_for_update().get(user=user)
    if acct.balance < cheqs:
        raise ValueError("Insufficient cheqs in your wallet.")
    shares = (cheqs / price).quantize(Decimal("0.00000001"))
    acct.balance = quantize_money(acct.balance - cheqs) or Decimal("0")
    acct.save(update_fields=["balance"])
    pos = SimPosition.objects.create(
        user=user,
        security=security,
        cheqs_opened=cheqs,
        entry_price=price,
        shares=shares,
    )
    PositionMark.objects.create(position=pos, price=price, value_cheqs=cheqs)
    return pos


def _close_lot_at_price(user, pos: SimPosition, price: Decimal) -> SimPosition:
    """Close an already-locked open lot at ``price`` (no nested transaction/quote refresh)."""
    proceeds = quantize_money(pos.shares * price)
    assert proceeds is not None
    pos.closed_at = timezone.now()
    pos.exit_price = price
    pos.cheqs_proceeds = proceeds
    pos.save(update_fields=["closed_at", "exit_price", "cheqs_proceeds"])
    _credit_wallet(user, proceeds)
    PositionMark.objects.create(position=pos, price=price, value_cheqs=proceeds)
    return pos


@transaction.atomic
def close_position(user, position_id: int) -> SimPosition:
    pos = SimPosition.objects.select_for_update().select_related("security").get(
        pk=position_id,
        user=user,
        closed_at__isnull=True,
        parent_position__isnull=True,
    )
    pos.security.refresh_from_db(fields=["quote_last_price", "quote_updated_at"])
    price = _require_quote(pos.security)
    return _close_lot_at_price(user, pos, price)


def _credit_wallet(user, proceeds: Decimal) -> None:
    acct = CheqAccount.objects.select_for_update().get(user=user)
    acct.balance = quantize_money(acct.balance + proceeds) or Decimal("0")
    acct.save(update_fields=["balance"])


def _partial_close_lot(
    user,
    lot: SimPosition,
    shares_to_close: Decimal,
    price: Decimal,
) -> SimPosition:
    """Sell part of an open lot; reduce the lot and record a closed partial-sell row."""
    if shares_to_close <= 0 or shares_to_close >= lot.shares:
        raise ValueError("Partial close requires a positive share count below the lot size.")
    ratio = shares_to_close / lot.shares
    cheqs_basis = quantize_money(lot.cheqs_opened * ratio)
    proceeds = quantize_money(shares_to_close * price)
    assert cheqs_basis is not None and proceeds is not None

    lot.shares = (lot.shares - shares_to_close).quantize(Decimal("0.00000001"))
    lot.cheqs_opened = quantize_money(lot.cheqs_opened - cheqs_basis) or Decimal("0")
    lot.save(update_fields=["shares", "cheqs_opened"])

    closed = SimPosition.objects.create(
        user=user,
        security_id=lot.security_id,
        parent_position=lot,
        cheqs_opened=cheqs_basis,
        entry_price=lot.entry_price,
        shares=shares_to_close,
        opened_at=lot.opened_at,
        closed_at=timezone.now(),
        exit_price=price,
        cheqs_proceeds=proceeds,
    )
    PositionMark.objects.create(position=closed, price=price, value_cheqs=proceeds)
    _credit_wallet(user, proceeds)
    return closed


@transaction.atomic
def close_shares(user, security: Security, shares_to_sell: Decimal) -> CloseSharesResult:
    """Sell shares FIFO across open lots at the cached quote (full or partial lots)."""
    shares_to_sell = shares_to_sell.quantize(Decimal("0.00000001"))
    if shares_to_sell <= 0:
        raise ValueError("Shares to sell must be positive.")

    security.refresh_from_db(fields=["quote_last_price", "quote_updated_at"])
    price = _require_quote(security)

    lots = list(
        SimPosition.objects.select_for_update().filter(
            user=user,
            security=security,
            closed_at__isnull=True,
            parent_position__isnull=True,
        ).order_by("opened_at")
    )
    if not lots:
        raise ValueError(f"No open positions for {security}.")

    total_shares = sum((lot.shares for lot in lots), Decimal("0"))
    if shares_to_sell > total_shares:
        raise ValueError(f"Cannot sell more than {total_shares.normalize()} shares.")

    remaining = shares_to_sell
    closed_records: list[SimPosition] = []
    total_proceeds = Decimal("0")

    for lot in lots:
        if remaining <= 0:
            break
        take = min(remaining, lot.shares)
        if take == lot.shares:
            closed = _close_lot_at_price(user, lot, price)
        else:
            closed = _partial_close_lot(user, lot, take, price)
        closed_records.append(closed)
        total_proceeds += closed.cheqs_proceeds or Decimal("0")
        remaining -= take

    return CloseSharesResult(
        closed_records=closed_records,
        shares_sold=shares_to_sell,
        exit_price=price,
        total_proceeds=quantize_money(total_proceeds) or Decimal("0"),
    )


@transaction.atomic
def close_all_open_positions_for_security(user, security: Security) -> list[SimPosition]:
    """Close every open lot for one security at the current cached quote."""
    lots = SimPosition.objects.filter(
        user=user,
        security=security,
        closed_at__isnull=True,
        parent_position__isnull=True,
    )
    total_shares = sum((lot.shares for lot in lots), Decimal("0"))
    if total_shares <= 0:
        raise ValueError(f"No open positions for {security}.")
    result = close_shares(user, security, total_shares)
    return result.closed_records


def record_marks_for_user_open_positions(user) -> tuple[int, list[str]]:
    """
    Append a PositionMark for each open lot using the cached quote (no API calls).

    Returns (marks_created, error_messages).
    """
    positions = list(
        SimPosition.objects.filter(
            user=user,
            closed_at__isnull=True,
            parent_position__isnull=True,
        ).select_related("security")
    )
    if not positions:
        return 0, []

    marks: list[PositionMark] = []
    errors: list[str] = []
    for p in positions:
        qp = quantize_money(p.security.quote_last_price)
        if qp is None or qp <= 0:
            errors.append(
                f"{p.security}: no cached quote — run FMP EOD or fundamentals refresh in admin first."
            )
            continue
        v = quantize_money(p.shares * qp)
        assert v is not None
        marks.append(PositionMark(position=p, price=qp, value_cheqs=v))

    if marks:
        PositionMark.objects.bulk_create(marks)
    return len(marks), errors
