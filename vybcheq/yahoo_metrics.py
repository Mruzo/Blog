"""
Pull a small set of fundamentals from Yahoo Finance via yfinance (unofficial).

This is convenient for personal use but:
- Yahoo may rate-limit or change behavior; not a contractual data feed.
- Respect Yahoo's terms; do not hammer the service (use admin action sparingly).

Metric names match common screening_rules keys (snake_case).
"""
from __future__ import annotations

import time
from typing import Any

from django.conf import settings

from vybcheq.models import Security

# Canadian exchanges → yfinance suffix
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

# Seconds to wait before retry 2, 3, 4… after a rate-limit response.
_DEFAULT_RATE_LIMIT_BACKOFFS = (8, 25, 60)

# Pause between tickers when using the admin bulk action (one shared session).
_DEFAULT_ACTION_GAP_SECONDS = 5


class YahooMetricsError(Exception):
    """Raised when the ticker cannot be resolved or Yahoo returns no usable data."""


def yahoo_ticker_for_security(security: Security) -> str:
    """Map Security.symbol + Security.exchange to a yfinance symbol."""
    sym = (security.symbol or "").strip().upper()
    ex = (security.exchange or "").strip().upper()
    if not sym:
        raise YahooMetricsError("Security has no symbol.")

    if sym.endswith(".TO") or sym.endswith(".V") or sym.endswith(".CN"):
        return sym

    if ex in _CA_EXCHANGES or ex.startswith("TSX"):
        base = sym.split(".")[0]
        if ex in ("TSXV", "TSX-V", "VENTURE"):
            return f"{base}.V"
        return f"{base}.TO"

    return sym


def _num(x: Any) -> float | None:
    if x is None:
        return None
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if v != v:  # NaN
        return None
    return v


def _map_yahoo_info(info: dict) -> dict[str, Any]:
    """Turn yfinance Ticker.info into screening_metrics-style flat numbers."""
    out: dict[str, Any] = {}

    mapping = [
        ("pe_ratio", "trailingPE"),
        ("forward_pe_ratio", "forwardPE"),
        ("price_to_book", "priceToBook"),
        ("roe", "returnOnEquity"),
        ("net_margin", "profitMargins"),
        ("debt_to_equity", "debtToEquity"),
        ("current_ratio", "currentRatio"),
        ("quick_ratio", "quickRatio"),
        ("revenue_growth_yoy", "revenueGrowth"),
        ("earnings_growth_yoy", "earningsGrowth"),
        ("dividend_yield", "dividendYield"),
    ]

    for our_key, yahoo_key in mapping:
        v = _num(info.get(yahoo_key))
        if v is not None:
            out[our_key] = v

    mc = info.get("marketCap")
    if mc is not None:
        v = _num(mc)
        if v is not None:
            out["market_cap"] = v

    return out


def _looks_like_rate_limit(exc: BaseException) -> bool:
    s = str(exc).lower()
    return any(
        frag in s
        for frag in (
            "rate",
            "429",
            "too many",
            "limited",
            "throttl",
            "blocked",
            "capacity",
        )
    )


def build_yahoo_finance_session():
    """Browser-like User-Agent; Yahoo often throttles generic clients harder."""
    import requests

    s = requests.Session()
    s.headers["User-Agent"] = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    )
    s.headers["Accept-Language"] = "en-US,en;q=0.9"
    return s


def _fetch_screening_metrics_yahoo_once(
    security: Security,
    *,
    session: Any = None,
) -> dict[str, Any]:
    try:
        import yfinance as yf
    except ImportError as exc:
        raise YahooMetricsError(
            "The yfinance package is not installed. Run: pip install yfinance"
        ) from exc

    ysym = yahoo_ticker_for_security(security)
    sess = session or build_yahoo_finance_session()
    ticker = yf.Ticker(ysym, session=sess)
    info = ticker.info or {}
    mapped = _map_yahoo_info(info)
    if not mapped:
        raise YahooMetricsError(
            f"No usable fundamentals for Yahoo symbol {ysym!r}. "
            "Check symbol/exchange or try again later."
        )
    mapped["_yahoo_symbol"] = ysym
    return mapped


def fetch_screening_metrics_yahoo(
    security: Security,
    *,
    session: Any = None,
    max_retries: int = 4,
) -> dict[str, Any]:
    """
    Download Yahoo fields for this security, with retries on rate limiting.

    ``max_retries`` attempts; waits 8s / 25s / 60s between retries (defaults).
    Override waits with settings.VYBCHEQ_YAHOO_RATE_LIMIT_BACKOFFS (list/tuple of seconds).
    """
    backoffs = getattr(
        settings,
        "VYBCHEQ_YAHOO_RATE_LIMIT_BACKOFFS",
        _DEFAULT_RATE_LIMIT_BACKOFFS,
    )
    if not isinstance(backoffs, (list, tuple)) or not backoffs:
        backoffs = _DEFAULT_RATE_LIMIT_BACKOFFS

    last_exc: BaseException | None = None
    for attempt in range(max_retries):
        if attempt > 0:
            delay = backoffs[min(attempt - 1, len(backoffs) - 1)]
            time.sleep(delay)
        try:
            return _fetch_screening_metrics_yahoo_once(security, session=session)
        except YahooMetricsError as exc:
            if _looks_like_rate_limit(exc):
                last_exc = exc
                continue
            raise
        except Exception as exc:
            if _looks_like_rate_limit(exc):
                last_exc = exc
                continue
            raise YahooMetricsError(str(exc)) from exc

    msg = (
        "Yahoo Finance rate-limited this request after several tries. "
        "Wait a few minutes, fetch one ticker at a time, or try again later."
    )
    raise YahooMetricsError(msg) from last_exc


def yahoo_action_gap_seconds() -> float:
    return float(
        getattr(settings, "VYBCHEQ_YAHOO_ACTION_GAP_SECONDS", _DEFAULT_ACTION_GAP_SECONDS)
    )
