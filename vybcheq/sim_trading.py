"""
Simulated cheq trading for staff (1 cheq ≈ 1 USD notional vs cached EOD quote).

Open/close and record-marks use Security.quote_last_price only — no market API calls.
Refresh fundamentals via Django admin (FMP ratios + key-metrics) before trading or marking.
"""
from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import CheqAccount, PositionMark, Security, SimPosition
from .money import MONEY_QUANT, quantize_money


def get_or_create_cheq_account(user) -> CheqAccount:
    start = quantize_money(getattr(settings, "VYBCHEQ_STARTING_CHEQS", "10000")) or Decimal("10000.00")
    acct, _ = CheqAccount.objects.get_or_create(user=user, defaults={"balance": start})
    return acct


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
    price = quantize_money(security.quote_last_price)
    if price is None or price <= 0:
        raise ValueError(
            "No cached quote for this security. Run FMP EOD refresh in admin first, then try again."
        )
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


@transaction.atomic
def close_position(user, position_id: int) -> SimPosition:
    pos = SimPosition.objects.select_for_update().get(
        pk=position_id, user=user, closed_at__isnull=True
    )
    pos.security.refresh_from_db(fields=["quote_last_price", "quote_updated_at"])
    price = quantize_money(pos.security.quote_last_price)
    if price is None or price <= 0:
        raise ValueError(
            "No cached quote available for this security. "
            "Run FMP EOD refresh in admin, then try closing again."
        )
    proceeds = quantize_money(pos.shares * price)
    assert proceeds is not None
    pos.closed_at = timezone.now()
    pos.exit_price = price
    pos.cheqs_proceeds = proceeds
    pos.save(update_fields=["closed_at", "exit_price", "cheqs_proceeds"])
    acct = CheqAccount.objects.select_for_update().get(user=user)
    acct.balance = quantize_money(acct.balance + proceeds) or Decimal("0")
    acct.save(update_fields=["balance"])
    PositionMark.objects.create(position=pos, price=price, value_cheqs=proceeds)
    return pos


def record_marks_for_user_open_positions(user) -> tuple[int, list[str]]:
    """
    Append a PositionMark for each open lot using the cached quote (no API calls).

    Returns (marks_created, error_messages).
    """
    positions = list(
        SimPosition.objects.filter(user=user, closed_at__isnull=True).select_related(
            "security"
        )
    )
    if not positions:
        return 0, []

    created = 0
    errors: list[str] = []
    for p in positions:
        p.security.refresh_from_db(fields=["quote_last_price", "quote_updated_at"])
        qp = quantize_money(p.security.quote_last_price)
        if qp is None or qp <= 0:
            errors.append(
                f"{p.security}: no cached quote — run FMP EOD refresh in admin first."
            )
            continue
        v = quantize_money(p.shares * qp)
        assert v is not None
        PositionMark.objects.create(position=p, price=qp, value_cheqs=v)
        created += 1

    return created, errors
