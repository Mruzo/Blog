from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, TestCase, override_settings

from vybcheq.fmp_eod import FmpEodError, fetch_eod_bars, sync_security_eod_from_fmp
from vybcheq.models import Security, SecurityFiscalQuarter


class FmpApiKeyTests(SimpleTestCase):
    @override_settings(VYBCHEQ_FMP_API_KEY="")
    def test_missing_key_raises(self):
        with self.assertRaises(FmpEodError):
            fetch_eod_bars(
                Security(symbol="AAPL", exchange="NASDAQ", currency="USD"),
                from_date=date(2026, 4, 1),
                to_date=date(2026, 4, 10),
            )


@override_settings(VYBCHEQ_FMP_API_KEY="test-key")
class FmpEodFetchTests(TestCase):
    def setUp(self):
        self.sec = Security.objects.create(
            symbol="AAPL",
            exchange="NASDAQ",
            currency="USD",
        )

    @patch("vybcheq.fmp_eod.timezone.localdate", return_value=date(2026, 4, 10))
    @patch("vybcheq.fmp_eod.requests.Session")
    def test_sync_stores_quarter_ends_and_updates_quote(self, mock_session_cls, _mock_localdate):
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.status_code = 200
        mock_resp.json.return_value = [
            {
                "symbol": "AAPL",
                "date": "2026-04-10",
                "open": 170,
                "high": 172,
                "low": 169,
                "close": 171.5,
                "volume": 1000,
            },
            {
                "symbol": "AAPL",
                "date": "2026-03-31",
                "open": 168,
                "high": 170,
                "low": 167,
                "close": 169.0,
                "volume": 900,
            },
            {
                "symbol": "AAPL",
                "date": "2025-12-31",
                "open": 160,
                "high": 162,
                "low": 159,
                "close": 161.0,
                "volume": 800,
            },
        ]
        mock_session_cls.return_value.get.return_value = mock_resp

        result = sync_security_eod_from_fmp(self.sec, years_back=1)
        self.assertIsNotNone(result)
        assert result is not None
        self.assertEqual(result.latest_trade_date, date(2026, 4, 10))
        self.assertEqual(result.latest_close, Decimal("171.5"))
        self.assertGreaterEqual(result.quarters_stored, 1)

        q1 = SecurityFiscalQuarter.objects.get(security=self.sec, period_end=date(2026, 3, 31))
        self.assertEqual(q1.eod_trade_date, date(2026, 3, 31))
        self.assertEqual(q1.close, Decimal("169.0"))

        self.sec.refresh_from_db()
        self.assertEqual(self.sec.quote_last_price, Decimal("171.5"))
        self.assertEqual(self.sec.quote_eod_close, Decimal("171.5"))
        self.assertEqual(self.sec.quote_eod_trade_date, date(2026, 4, 10))
        self.assertEqual(self.sec.quote_mark_source, "eod")
        self.assertIsNotNone(self.sec.quote_updated_at)
        self.assertIsNotNone(self.sec.quote_eod_refreshed_at)
        self.assertEqual(self.sec.screening_metrics.get("close"), 169.0)

        call_kwargs = mock_session_cls.return_value.get.call_args
        self.assertIn("stable/historical-price-eod/full", call_kwargs[0][0])
        self.assertEqual(call_kwargs[1]["params"]["symbol"], "AAPL")
