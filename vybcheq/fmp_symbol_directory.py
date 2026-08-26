"""
FMP symbol directory cache.

Bulk download (1 API call) tries several FMP endpoints; when all are blocked on
free tier, use ``load_builtin_us_symbol_directory()`` (0 calls) or
``search_fmp_symbols()`` (1 call per search).
"""
from __future__ import annotations

from typing import Any

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from vybcheq.fmp_client import FmpError, fmp_get
from vybcheq.models import FmpDirectoryMeta, FmpFinancialSymbol, Security, WatchlistEntry
from vybcheq.us_symbol_seed import us_major_seed_rows

FMP_STOCK_LIST_URL = "https://financialmodelingprep.com/stable/stock-list"
FMP_FINANCIAL_STATEMENT_SYMBOL_LIST_URL = (
    "https://financialmodelingprep.com/stable/financial-statement-symbol-list"
)
FMP_SEARCH_SYMBOL_URL = "https://financialmodelingprep.com/stable/search-symbol"
BUILTIN_US_SEED_LABEL = "builtin:us-major-seed"

_DEFAULT_DIRECTORY_ENDPOINTS: tuple[tuple[str, str], ...] = (
    ("stock-list", FMP_STOCK_LIST_URL),
    ("financial-statement-symbol-list", FMP_FINANCIAL_STATEMENT_SYMBOL_LIST_URL),
    ("v3-stock-list", "https://financialmodelingprep.com/api/v3/stock/list"),
    (
        "v3-financial-statement-symbol-lists",
        "https://financialmodelingprep.com/api/v3/financial-statement-symbol-lists",
    ),
)

_US_MAJOR_EXCHANGES = frozenset({"NASDAQ", "NYSE", "AMEX"})


def _text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def normalize_fmp_exchange(short_name: str, full_name: str) -> str:
    """Map FMP exchange labels to Vybcheq Security.exchange values."""
    short = _text(short_name).upper()
    full = _text(full_name).upper()
    blob = f"{short} {full}".strip()

    if "NASDAQ" in blob:
        return "NASDAQ"
    if blob in {"NYSE", "NEW YORK STOCK EXCHANGE"} or blob.startswith("NYSE"):
        return "NYSE"
    if "AMEX" in blob or "NYSE AMERICAN" in blob or "AMERICAN STOCK EXCHANGE" in blob:
        return "AMEX"
    if "TSXV" in blob or "TSX-V" in blob or "VENTURE" in blob:
        return "TSXV"
    if "TSX" in blob or "TORONTO" in blob:
        return "TSX"
    if "CSE" in blob or "CANADIAN SECURITIES" in blob:
        return "CSE"
    if short:
        return short
    if full:
        return full
    return "UNKNOWN"


def vybcheq_symbol_exchange(
    fmp_symbol: str,
    *,
    exchange_short_name: str = "",
    exchange_full_name: str = "",
) -> tuple[str, str]:
    """Derive Vybcheq catalog symbol + exchange from an FMP ticker string."""
    sym = _text(fmp_symbol).upper()
    if not sym:
        return "", "UNKNOWN"

    if sym.endswith(".TO"):
        return sym[:-3], "TSX"
    if sym.endswith(".V"):
        return sym[:-2], "TSXV"
    if sym.endswith(".CN"):
        return sym[:-3], "CSE"

    exchange = normalize_fmp_exchange(exchange_short_name, exchange_full_name)
    if exchange in _US_MAJOR_EXCHANGES:
        return sym.split(".")[0], exchange

    if "." in sym:
        base, suffix = sym.rsplit(".", 1)
        suffix_map = {
            "TO": "TSX",
            "V": "TSXV",
            "CN": "CSE",
        }
        if suffix in suffix_map:
            return base, suffix_map[suffix]

    if exchange != "UNKNOWN":
        return sym.split(".")[0], exchange

    return sym, "UNKNOWN"


def is_us_major_exchange(exchange: str) -> bool:
    return exchange in _US_MAJOR_EXCHANGES


def iter_fmp_directory_rows(payload: Any) -> list[dict[str, Any]]:
    """Normalize stable/legacy payloads into a flat list of row dicts."""
    if isinstance(payload, list):
        rows: list[dict[str, Any]] = []
        for item in payload:
            if isinstance(item, str):
                rows.append({"symbol": item})
            elif isinstance(item, dict):
                rows.append(item)
        return rows

    if isinstance(payload, dict):
        if payload.get("symbol") or payload.get("name"):
            return [payload]
        rows = []
        for key, value in payload.items():
            if not isinstance(value, list):
                continue
            exchange_hint = _text(key)
            for item in value:
                if isinstance(item, str):
                    rows.append({"symbol": item, "exchangeShortName": exchange_hint})
                elif isinstance(item, dict):
                    row = dict(item)
                    row.setdefault("exchangeShortName", exchange_hint)
                    rows.append(row)
        if rows:
            return rows
        if isinstance(payload.get("symbols"), list):
            return iter_fmp_directory_rows(payload["symbols"])

    return []


def parse_fmp_directory_row(row: dict[str, Any]) -> FmpFinancialSymbol | None:
    fmp_symbol = _text(row.get("symbol") or row.get("ticker"))
    if not fmp_symbol:
        return None

    exchange_short = _text(row.get("exchangeShortName") or row.get("exchange"))
    exchange_full = _text(row.get("stockExchange") or row.get("exchange"))
    symbol, exchange = vybcheq_symbol_exchange(
        fmp_symbol,
        exchange_short_name=exchange_short,
        exchange_full_name=exchange_full,
    )
    if not symbol:
        return None

    name = _text(row.get("name") or row.get("companyName"))
    currency = _text(row.get("currency") or row.get("currencyCode")).upper()
    country = _text(row.get("country") or row.get("countryCode"))
    symbol_type = _text(row.get("type") or row.get("symbolType"))

    # Plain tickers without exchange metadata are treated as US when they look US-like.
    is_us = is_us_major_exchange(exchange)
    if not is_us and exchange == "UNKNOWN" and "." not in fmp_symbol:
        exchange = "NASDAQ"
        is_us = True

    return FmpFinancialSymbol(
        fmp_symbol=fmp_symbol,
        symbol=symbol,
        exchange=exchange,
        name=name,
        currency=currency,
        exchange_short_name=exchange_short,
        exchange_full_name=exchange_full,
        country=country,
        symbol_type=symbol_type,
        is_us_major=is_us,
        raw=row,
    )


def configured_directory_endpoints() -> tuple[tuple[str, str], ...]:
    """Optional settings override: single URL or comma-separated fallback list."""
    raw = (getattr(settings, "VYBCHEQ_FMP_DIRECTORY_URLS", None) or "").strip()
    if not raw:
        return _DEFAULT_DIRECTORY_ENDPOINTS
    out: list[tuple[str, str]] = []
    for url in raw.split(","):
        url = url.strip()
        if not url:
            continue
        label = url.rstrip("/").rsplit("/", 1)[-1]
        out.append((label, url))
    return tuple(out) if out else _DEFAULT_DIRECTORY_ENDPOINTS


def _is_endpoint_access_error(exc: FmpError) -> bool:
    text = str(exc).lower()
    return "402" in text or "endpoint" in text or "subscription" in text or "restricted" in text


def fetch_symbol_directory_rows(
    *,
    session: requests.Session | None = None,
) -> tuple[list[dict[str, Any]], str, str]:
    """
    Fetch directory rows, trying endpoints until one succeeds.

    Returns (rows, endpoint_url, endpoint_label).
    """
    errors: list[str] = []
    for label, url in configured_directory_endpoints():
        try:
            payload = fmp_get(url, session=session)
            rows = iter_fmp_directory_rows(payload)
            if not rows:
                errors.append(f"{label}: empty response")
                continue
            return rows, url, label
        except FmpError as exc:
            if _is_endpoint_access_error(exc):
                errors.append(f"{label}: {exc}")
                continue
            raise

    detail = " ".join(errors) if errors else "No directory endpoints configured."
    raise FmpError(
        "FMP bulk symbol directories are not on your plan (all endpoints returned 402). "
        f"Tried: {detail} "
        "Use **Load built-in US catalog** (0 API calls) or **Search FMP** (1 call per query) instead."
    )


def _entry_field_defaults(entry: FmpFinancialSymbol) -> dict[str, Any]:
    return {
        "symbol": entry.symbol,
        "exchange": entry.exchange,
        "name": entry.name,
        "currency": entry.currency,
        "exchange_short_name": entry.exchange_short_name,
        "exchange_full_name": entry.exchange_full_name,
        "country": entry.country,
        "symbol_type": entry.symbol_type,
        "is_us_major": entry.is_us_major,
        "raw": entry.raw,
    }


@transaction.atomic
def _persist_directory(
    entries: list[FmpFinancialSymbol],
    *,
    endpoint: str,
    endpoint_label: str,
    replace: bool,
) -> dict[str, int | str]:
    us_count = sum(1 for e in entries if e.is_us_major)
    foreign_count = len(entries) - us_count

    if replace:
        FmpFinancialSymbol.objects.all().delete()
        FmpFinancialSymbol.objects.bulk_create(entries, batch_size=1000)
    else:
        for entry in entries:
            FmpFinancialSymbol.objects.update_or_create(
                fmp_symbol=entry.fmp_symbol,
                defaults=_entry_field_defaults(entry),
            )

    meta = FmpDirectoryMeta.get_solo()
    meta.synced_at = timezone.now()
    meta.total_count = FmpFinancialSymbol.objects.count()
    meta.us_count = FmpFinancialSymbol.objects.filter(is_us_major=True).count()
    meta.foreign_count = meta.total_count - meta.us_count
    meta.endpoint = endpoint
    meta.save()

    return {
        "total": meta.total_count,
        "us": meta.us_count,
        "foreign": meta.foreign_count,
        "stored": len(entries),
        "endpoint": endpoint_label,
    }


def rows_to_entries(raw_rows: list[dict[str, Any]]) -> list[FmpFinancialSymbol]:
    parsed: dict[str, FmpFinancialSymbol] = {}
    for row in raw_rows:
        entry = parse_fmp_directory_row(row)
        if entry is not None:
            parsed[entry.fmp_symbol] = entry
    return list(parsed.values())


@transaction.atomic
def load_builtin_us_symbol_directory() -> dict[str, int | str]:
    """Load bundled US major symbols — no FMP API call."""
    seed_rows = us_major_seed_rows()
    if not seed_rows:
        raise FmpError("Built-in US symbol seed file is missing or empty.")

    entries: list[FmpFinancialSymbol] = []
    for row in seed_rows:
        payload = dict(row)
        payload.setdefault("exchangeShortName", row.get("exchange", ""))
        payload.setdefault("currency", "USD")
        payload.setdefault("country", "US")
        entry = parse_fmp_directory_row(payload)
        if entry is not None:
            entry.is_us_major = True
            entries.append(entry)

    if not entries:
        raise FmpError("No usable rows in built-in US symbol seed.")

    return _persist_directory(
        entries,
        endpoint=BUILTIN_US_SEED_LABEL,
        endpoint_label=BUILTIN_US_SEED_LABEL,
        replace=True,
    )


def search_fmp_symbols(
    query: str,
    *,
    limit: int = 25,
    session: requests.Session | None = None,
) -> list[dict[str, Any]]:
    """One FMP call: search-symbol (usually available when bulk lists are not)."""
    q = (query or "").strip()
    if not q:
        raise FmpError("Enter a symbol or company name to search FMP.")
    payload = fmp_get(
        FMP_SEARCH_SYMBOL_URL,
        params={"query": q, "limit": max(limit, 1)},
        session=session,
    )
    rows = iter_fmp_directory_rows(payload)
    if not rows:
        raise FmpError(f"No FMP search results for {q!r}.")
    return rows


@transaction.atomic
def merge_fmp_search_into_directory(
    query: str,
    *,
    us_only: bool = True,
    session: requests.Session | None = None,
) -> dict[str, int | str]:
    """Search FMP and merge matches into the local directory (does not wipe existing rows)."""
    rows = search_fmp_symbols(query, session=session)
    entries = rows_to_entries(rows)
    if us_only:
        entries = [e for e in entries if e.is_us_major]
    if not entries:
        raise FmpError(f"No US major matches from FMP search for {query!r}.")

    return _persist_directory(
        entries,
        endpoint=FMP_SEARCH_SYMBOL_URL,
        endpoint_label="search-symbol",
        replace=False,
    )


def fetch_financial_statement_symbol_list(
    *,
    session: requests.Session | None = None,
) -> list[dict[str, Any]]:
    """Backward-compatible wrapper — uses the first working directory endpoint."""
    rows, _url, _label = fetch_symbol_directory_rows(session=session)
    return rows


@transaction.atomic
def sync_fmp_symbol_directory(
    *,
    session: requests.Session | None = None,
) -> dict[str, int]:
    """
    One FMP call: replace the local directory cache.

    Returns counts: total, us, foreign, stored, endpoint.
    """
    raw_rows, endpoint_url, endpoint_label = fetch_symbol_directory_rows(session=session)
    entries = rows_to_entries(raw_rows)
    if not entries:
        raise FmpError(f"No usable symbols parsed from FMP {endpoint_label}.")

    return _persist_directory(
        entries,
        endpoint=endpoint_url,
        endpoint_label=endpoint_label,
        replace=True,
    )


def add_directory_entry_to_catalog(
    entry: FmpFinancialSymbol,
    *,
    add_to_watchlist: bool = True,
) -> tuple[Security, bool, bool]:
    """Create Security (+ optional WatchlistEntry) from a cached directory row."""
    defaults = {
        "name": entry.name,
        "currency": entry.currency or ("USD" if entry.is_us_major else ""),
        "country": entry.country,
        "is_active": True,
    }
    security, created = Security.objects.get_or_create(
        symbol=entry.symbol,
        exchange=entry.exchange,
        defaults=defaults,
    )
    updated = False
    if not created:
        changed_fields: list[str] = []
        if entry.name and security.name != entry.name:
            security.name = entry.name
            changed_fields.append("name")
        if entry.currency and security.currency != entry.currency:
            security.currency = entry.currency
            changed_fields.append("currency")
        if entry.country and security.country != entry.country:
            security.country = entry.country
            changed_fields.append("country")
        if changed_fields:
            security.save(update_fields=changed_fields)
            updated = True

    watchlist_created = False
    if add_to_watchlist:
        _, watchlist_created = WatchlistEntry.objects.get_or_create(security=security)

    return security, created or updated, watchlist_created
