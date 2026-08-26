"""Cached market vs implied prices on Security (sim marks prefer EOD)."""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from django.utils import timezone

from vybcheq.models import Security
from vybcheq.money import quantize_money

MARK_SOURCE_EOD = "eod"
MARK_SOURCE_IMPLIED = "implied"

IMPLIED_METHOD_LABELS = {
    "pe_x_eps": "P/E × EPS",
    "pb_x_book": "P/B × book",
    "market_cap_shares": "market cap ÷ shares",
    "direct:price": "direct price field",
    "direct:stockPrice": "direct stock price",
    "direct:sharePrice": "direct share price",
    "direct:close": "direct close field",
}

PERIOD_MODE_LABELS = {
    "quarter": "quarterly",
    "annual": "annual",
    "ttm": "TTM",
}


def implied_method_label(method: str | None) -> str:
    if not method:
        return "implied"
    return IMPLIED_METHOD_LABELS.get(method, method.replace("_", " "))


def period_mode_label(mode: str | None) -> str:
    if not mode:
        return "fundamentals"
    if "+" in mode:
        parts = [PERIOD_MODE_LABELS.get(p.strip(), p.strip()) for p in mode.split("+")]
        return " / ".join(parts)
    return PERIOD_MODE_LABELS.get(mode, mode)


def refresh_mark_price(security: Security) -> None:
    """Set sim-mark fields from EOD when present, else implied."""
    if security.quote_eod_close is not None:
        security.quote_last_price = security.quote_eod_close
        security.quote_mark_source = MARK_SOURCE_EOD
    elif security.quote_implied_close is not None:
        security.quote_last_price = security.quote_implied_close
        security.quote_mark_source = MARK_SOURCE_IMPLIED
    else:
        security.quote_last_price = None
        security.quote_mark_source = ""
    security.quote_updated_at = timezone.now()


def _mark_update_fields() -> list[str]:
    return [
        "quote_eod_close",
        "quote_eod_trade_date",
        "quote_eod_refreshed_at",
        "quote_implied_close",
        "quote_implied_period_end",
        "quote_implied_method",
        "quote_implied_period_mode",
        "quote_implied_refreshed_at",
        "quote_last_price",
        "quote_mark_source",
        "quote_updated_at",
    ]


def apply_eod_quote(
    security: Security,
    *,
    close: Decimal,
    trade_date: date,
    refreshed_at: datetime | None = None,
    save: bool = True,
) -> None:
    """Store latest market EOD close; sim marks use this when set."""
    security.quote_eod_close = quantize_money(close)
    security.quote_eod_trade_date = trade_date
    security.quote_eod_refreshed_at = refreshed_at or timezone.now()
    refresh_mark_price(security)
    if save:
        security.save(update_fields=_mark_update_fields())


def apply_implied_quote(
    security: Security,
    *,
    close: Decimal,
    period_end: date,
    method: str | None = None,
    period_mode: str | None = None,
    refreshed_at: datetime | None = None,
    save: bool = True,
) -> None:
    """Store fundamentals-implied price; does not overwrite stored EOD."""
    security.quote_implied_close = quantize_money(close)
    security.quote_implied_period_end = period_end
    security.quote_implied_method = (method or "")[:32]
    security.quote_implied_period_mode = (period_mode or "")[:32]
    security.quote_implied_refreshed_at = refreshed_at or timezone.now()
    refresh_mark_price(security)
    if save:
        security.save(update_fields=_mark_update_fields())
