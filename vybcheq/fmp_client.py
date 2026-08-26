"""Shared FMP stable API helpers (manual admin use; no automatic polling)."""

from __future__ import annotations

from typing import Any

import requests
from django.conf import settings

_DEFAULT_ACTION_GAP_SECONDS = 5


class FmpError(Exception):
    """FMP request failed or returned unusable data."""


def fmp_api_key() -> str:
    key = (getattr(settings, "VYBCHEQ_FMP_API_KEY", None) or "").strip()
    if not key:
        raise FmpError(
            "FMP API key not configured. Set FMP_API_KEY in settings.ini [section] "
            "or VYBCHEQ_FMP_API_KEY in the environment."
        )
    return key


def fmp_action_gap_seconds() -> float:
    return float(
        getattr(settings, "VYBCHEQ_FMP_ACTION_GAP_SECONDS", _DEFAULT_ACTION_GAP_SECONDS)
    )


def fmp_402_hint(detail: str) -> str:
    """Contextual guidance for FMP HTTP 402 (plan / quota / parameter limits)."""
    low = detail.lower()
    if "limit" in low:
        return (
            "FMP free plan allows limit ≤ 5 quarterly rows on fundamentals endpoints. "
            "This app caps limit automatically; on a paid plan set VYBCHEQ_FMP_QUARTERLY_LIMIT "
            "(and optionally VYBCHEQ_FMP_EOD_YEARS) higher."
        )
    if "period" in low:
        return (
            "FMP free plan may block period=quarter on ratios/key-metrics. "
            "Vybcheq retries with annual data, then TTM, automatically."
        )
    if "symbol" in low and "period" not in low:
        return (
            "This symbol may not be on your FMP plan. "
            "Check your FMP dashboard or upgrade the subscription."
        )
    if "endpoint" in low or "restricted" in low:
        return (
            "This API endpoint is not on your FMP plan. "
            "For the symbol catalog, free tier usually supports /stable/stock-list; "
            "financial-statement-symbol-list is often premium."
        )
    return (
        "Possible causes: daily call quota (250/day on free), endpoint not on plan, "
        "or bandwidth limit. Try fewer securities, wait for daily reset, "
        "or lower VYBCHEQ_FMP_EOD_YEARS for EOD history."
    )


def fmp_get(
    url: str,
    *,
    params: dict[str, Any] | None = None,
    session: requests.Session | None = None,
    symbol: str = "",
) -> Any:
    """GET a stable FMP endpoint; return parsed JSON or raise FmpError."""
    sess = session or requests.Session()
    q = dict(params or {})
    q["apikey"] = fmp_api_key()
    resp = sess.get(url, params=q, timeout=30)
    sym_hint = f" for {symbol!r}" if symbol else ""

    if resp.status_code == 401:
        raise FmpError("FMP rejected the API key (401). Check FMP_API_KEY in settings.ini.")
    if resp.status_code == 402:
        detail = ""
        try:
            body = resp.json()
            if isinstance(body, dict):
                detail = str(body.get("Error Message") or body.get("message") or "").strip()
        except ValueError:
            detail = resp.text[:120].strip()
        hint = fmp_402_hint(detail)
        msg = f"FMP plan limit reached (402){sym_hint}."
        if detail:
            msg = f"{msg} {detail}"
        raise FmpError(f"{msg} {hint}")
    if resp.status_code == 429:
        raise FmpError("FMP rate limit (429). Wait and retry, or select fewer securities.")
    if not resp.ok:
        raise FmpError(f"FMP HTTP {resp.status_code}{sym_hint}: {resp.text[:200]}")

    payload = resp.json()
    if isinstance(payload, dict) and payload.get("Error Message"):
        raise FmpError(str(payload["Error Message"]))
    return payload


def fmp_first_row(payload: Any) -> dict[str, Any]:
    """Stable TTM endpoints usually return one object or a one-element list."""
    if isinstance(payload, dict):
        return payload
    if isinstance(payload, list) and payload and isinstance(payload[0], dict):
        return payload[0]
    return {}


def fmp_rows(payload: Any) -> list[dict[str, Any]]:
    """Historical endpoints return a list of row dicts."""
    if isinstance(payload, list):
        return [r for r in payload if isinstance(r, dict)]
    if isinstance(payload, dict):
        return [payload]
    return []
