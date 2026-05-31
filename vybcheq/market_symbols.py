"""Map Security symbol + exchange to vendor ticker strings (US, Canada, etc.)."""

from vybcheq.models import Security

_CA_EXCHANGES = frozenset(
    {
        "TSX",
        "TSXV",
        "TSX-V",
        "TORONTO",
        "CNQ",
        "NEO",
        "CSE",
        "VENTURE",
    }
)


class MarketSymbolError(Exception):
    """Raised when a security cannot be mapped to an external ticker."""


def external_symbol_for_security(security: Security) -> str:
    """Vendor symbol for FMP / market data APIs."""
    sym = (security.symbol or "").strip().upper()
    ex = (security.exchange or "").strip().upper()
    if not sym:
        raise MarketSymbolError("Security has no symbol.")

    if sym.endswith(".TO") or sym.endswith(".V") or sym.endswith(".CN"):
        return sym

    if ex in _CA_EXCHANGES or ex.startswith("TSX"):
        base = sym.split(".")[0]
        if ex in ("TSXV", "TSX-V", "VENTURE"):
            return f"{base}.V"
        return f"{base}.TO"

    return sym
