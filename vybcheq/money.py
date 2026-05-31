"""Cheq / price amounts: store and display to the cent."""
from __future__ import annotations

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

MONEY_QUANT = Decimal("0.01")


def quantize_money(value) -> Decimal | None:
    """Round to two decimal places (half up). Returns None if value is invalid."""
    if value is None or value == "":
        return None
    try:
        d = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None
    return d.quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)


def _comma_group_unsigned_int(int_digits: str) -> str:
    digits = int_digits.lstrip("0") or "0"
    parts: list[str] = []
    while digits:
        parts.insert(0, digits[-3:])
        digits = digits[:-3]
    return ",".join(parts)


def format_money(value) -> str:
    """
    Format money for UI: two decimal places and comma thousands.

    Example: Decimal('100000') -> '100,000.00'
    """
    if value is None or value == "":
        return "—"
    d = quantize_money(value)
    if d is None:
        return str(value)
    sign = "-" if d < 0 else ""
    d_abs = abs(d)
    s = format(d_abs, "f")
    if "." not in s:
        int_raw, frac = s, "00"
    else:
        int_raw, frac = s.split(".", 1)
        frac = (frac + "00")[:2]
    return f"{sign}{_comma_group_unsigned_int(int_raw)}.{frac}"
