"""
Simulated cheq trading for staff (1 cheq ≈ 1 USD notional vs last cached quote).
Open/close use Security.quote_last_price only (no Yahoo on those actions); staff
refreshes quotes via admin / other Yahoo flows (cached on Security).
"""
from __future__ import annotations

import time
from collections import OrderedDict
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import CheqAccount, PositionMark, Security, SimPosition
from .yahoo_metrics import (
    YahooMetricsError,
    build_yahoo_finance_session,
    update_security_quote,
    yahoo_action_gap_seconds,
)


def get_or_create_cheq_account(user) -> CheqAccount:
    start = Decimal(str(getattr(settings, "VYBCHEQ_STARTING_CHEQS", "10000")))
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
    Open a lot using either an explicit cheq amount or a multiple of the last cached quote
    (cheqs allocated = price_multiple × quote). Uses Security.quote_last_price only — no
    Yahoo call here (avoids rate limits); refresh cached quotes first (e.g. admin Yahoo merge).
    """
    if (cheqs is None) == (price_multiple is None):
        raise ValueError("Pass exactly one of cheqs or price_multiple.")
    security.refresh_from_db(fields=["quote_last_price", "quote_updated_at"])
    price = security.quote_last_price
    if price is None or price <= 0:
        raise ValueError(
            "No cached quote for this security. Store a Yahoo last price on the security first, then try again."
        )
    if price_multiple is not None:
        if price_multiple <= 0:
            raise ValueError("Price multiple must be positive.")
        cheqs = (price_multiple * price).quantize(Decimal("0.0001"))
        if cheqs < Decimal("0.0001"):
            raise ValueError("Allocated cheqs round to zero; increase the multiple.")
    assert cheqs is not None
    if cheqs <= 0:
        raise ValueError("Cheq amount must be positive.")
    get_or_create_cheq_account(user)
    acct = CheqAccount.objects.select_for_update().get(user=user)
    if acct.balance < cheqs:
        raise ValueError("Insufficient cheqs in your wallet.")
    shares = (cheqs / price).quantize(Decimal("0.00000001"))
    acct.balance -= cheqs
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
    # Close at the last refreshed cached quote (no network call here).
    # Staff refresh quotes via admin / Yahoo merge; close uses DB cache only.
    pos.security.refresh_from_db(fields=["quote_last_price", "quote_updated_at"])
    price = pos.security.quote_last_price
    if price is None or price <= 0:
        raise ValueError(
            "No cached quote available for this security. "
            "Refresh the cached quote on the security, then try closing again."
        )
    proceeds = (pos.shares * price).quantize(Decimal("0.0001"))
    pos.closed_at = timezone.now()
    pos.exit_price = price
    pos.cheqs_proceeds = proceeds
    pos.save(update_fields=["closed_at", "exit_price", "cheqs_proceeds"])
    acct = CheqAccount.objects.select_for_update().get(user=user)
    acct.balance += proceeds
    acct.save(update_fields=["balance"])
    PositionMark.objects.create(position=pos, price=price, value_cheqs=proceeds)
    return pos


def record_marks_for_user_open_positions(user) -> tuple[int, list[str]]:
    """
    Update quotes for unique open-position symbols (respecting quote cache interval),
    sleep between network calls, then append a PositionMark for each open lot.

    Returns (marks_created, error_messages).
    """
    positions = list(
        SimPosition.objects.filter(user=user, closed_at__isnull=True).select_related(
            "security"
        )
    )
    if not positions:
        return 0, []

    by_sec = OrderedDict((p.security_id, p.security) for p in positions)
    session = build_yahoo_finance_session()
    gap = yahoo_action_gap_seconds()
    errors: list[str] = []

    for i, sec in enumerate(by_sec.values()):
        if i > 0:
            time.sleep(gap)
        try:
            update_security_quote(sec, session=session, force=False)
        except YahooMetricsError as exc:
            errors.append(f"{sec}: {exc}")

    created = 0
    for p in positions:
        p.security.refresh_from_db(fields=["quote_last_price", "quote_updated_at"])
        qp = p.security.quote_last_price
        if qp is not None and qp > 0:
            v = (p.shares * qp).quantize(Decimal("0.0001"))
            PositionMark.objects.create(position=p, price=qp, value_cheqs=v)
            created += 1

    return created, errors
