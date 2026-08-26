from datetime import date
from decimal import Decimal

from django.test import TestCase

from vybcheq.models import Security
from vybcheq.quote_cache import (
    MARK_SOURCE_EOD,
    MARK_SOURCE_IMPLIED,
    apply_eod_quote,
    apply_implied_quote,
)


class QuoteCacheTests(TestCase):
    def setUp(self):
        self.sec = Security.objects.create(symbol="NVDA", exchange="NASDAQ", currency="USD")

    def test_eod_sets_mark_and_fields(self):
        apply_eod_quote(
            self.sec,
            close=Decimal("214.00"),
            trade_date=date(2026, 8, 22),
        )
        self.sec.refresh_from_db()
        self.assertEqual(self.sec.quote_eod_close, Decimal("214.00"))
        self.assertEqual(self.sec.quote_eod_trade_date, date(2026, 8, 22))
        self.assertEqual(self.sec.quote_last_price, Decimal("214.00"))
        self.assertEqual(self.sec.quote_mark_source, MARK_SOURCE_EOD)

    def test_implied_does_not_replace_eod_mark(self):
        apply_eod_quote(
            self.sec,
            close=Decimal("214.00"),
            trade_date=date(2026, 8, 22),
        )
        apply_implied_quote(
            self.sec,
            close=Decimal("186.00"),
            period_end=date(2025, 10, 26),
            method="pe_x_eps",
            period_mode="annual",
        )
        self.sec.refresh_from_db()
        self.assertEqual(self.sec.quote_implied_close, Decimal("186.00"))
        self.assertEqual(self.sec.quote_implied_period_end, date(2025, 10, 26))
        self.assertEqual(self.sec.quote_last_price, Decimal("214.00"))
        self.assertEqual(self.sec.quote_mark_source, MARK_SOURCE_EOD)

    def test_implied_used_when_no_eod(self):
        apply_implied_quote(
            self.sec,
            close=Decimal("186.00"),
            period_end=date(2025, 10, 26),
            method="pe_x_eps",
            period_mode="annual",
        )
        self.sec.refresh_from_db()
        self.assertEqual(self.sec.quote_last_price, Decimal("186.00"))
        self.assertEqual(self.sec.quote_mark_source, MARK_SOURCE_IMPLIED)
        self.assertIsNotNone(self.sec.quote_implied_refreshed_at)
