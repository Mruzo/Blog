"""Built-in US major symbol seed (no FMP API call)."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

_SEED_PATH = Path(__file__).resolve().parent / "data" / "us_major_seed.json"


@lru_cache(maxsize=1)
def us_major_seed_rows() -> list[dict[str, Any]]:
    if not _SEED_PATH.is_file():
        return []
    payload = json.loads(_SEED_PATH.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        return []
    return [row for row in payload if isinstance(row, dict)]
