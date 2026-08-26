from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings

from vybcheq.fmp_eod import sync_security_eod_from_fmp
from vybcheq.fmp_fundamentals import fetch_screening_metrics_fmp
from vybcheq.models import Security, SecurityFiscalQuarter


@override_settings(VYBCHEQ_FMP_API_KEY="test-key", VYBCHEQ_FMP_ACTION_GAP_SECONDS=0)
class EodFundamentalsCoexistenceTests(TestCase):
    def setUp(self):
        self.sec = Security.objects.create(
            symbol="NVDA",
            exchange="NASDAQ",
            currency="USD",
        )

    @patch("vybcheq.fmp_fundamentals.fmp_get")
    @patch("vybcheq.fmp_eod.timezone.localdate", return_value=date(2026, 4, 10))
    @patch("vybcheq.fmp_eod.requests.Session")
    def test_eod_after_fundamentals_keeps_both_prices(self, mock_session_cls, _mock_localdate, mock_get):
        mock_get.side_effect = [
            [
                {
                    "date": "2024-09-28",
                    "grossProfitMargin": 0.46,
                    "peRatio": 25,
                },
            ],
            [
                {
                    "date": "2024-09-28",
                    "peRatio": 25,
                    "netIncomePerShare": 10,
                },
            ],
            [
                {
                    "date": "2024-09-28",
                    "revenueGrowth": 0.15,
                },
            ],
        ]

        fetch_screening_metrics_fmp(self.sec)

        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.status_code = 200
        mock_resp.json.return_value = [
            {
                "symbol": "NVDA",
                "date": "2026-04-10",
                "open": 210,
                "high": 215,
                "low": 208,
                "close": 214.0,
                "volume": 1000,
            },
            {
                "symbol": "NVDA",
                "date": "2026-03-31",
                "open": 180,
                "high": 182,
                "low": 178,
                "close": 181.0,
                "volume": 900,
            },
        ]
        mock_session_cls.return_value.get.return_value = mock_resp

        sync_security_eod_from_fmp(self.sec, years_back=1)

        quarter = SecurityFiscalQuarter.objects.get(security=self.sec, period_end=date(2024, 9, 30))
        self.assertEqual(quarter.implied_close, Decimal("250.00"))
        self.assertEqual(quarter.metrics["pe_ratio"], 25)
        self.assertEqual(quarter.metrics["revenue_growth_yoy"], 0.15)
        self.assertIsNone(quarter.close)

        eod_quarter = SecurityFiscalQuarter.objects.get(security=self.sec, period_end=date(2026, 3, 31))
        self.assertEqual(eod_quarter.close, Decimal("181.0"))
        self.assertEqual(eod_quarter.eod_trade_date, date(2026, 3, 31))
        self.assertIsNone(eod_quarter.implied_close)

        self.sec.refresh_from_db()
        self.assertEqual(self.sec.quote_eod_close, Decimal("214.0"))
        self.assertEqual(self.sec.quote_implied_close, Decimal("250.00"))
        self.assertEqual(self.sec.quote_mark_source, "eod")
        self.assertEqual(self.sec.screening_metrics["close"], 250.0)
        self.assertEqual(self.sec.screening_metrics["pe_ratio"], 25)

    @patch("vybcheq.fmp_fundamentals.fmp_get")
    @patch("vybcheq.fmp_eod.timezone.localdate", return_value=date(2026, 4, 10))
    @patch("vybcheq.fmp_eod.requests.Session")
    def test_fundamentals_after_eod_keeps_both_prices(self, mock_session_cls, _mock_localdate, mock_get):
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.status_code = 200
        mock_resp.json.return_value = [
            {
                "symbol": "NVDA",
                "date": "2026-03-31",
                "open": 180,
                "high": 182,
                "low": 178,
                "close": 181.0,
                "volume": 900,
            },
        ]
        mock_session_cls.return_value.get.return_value = mock_resp

        sync_security_eod_from_fmp(self.sec, years_back=1)

        mock_get.side_effect = [
            [
                {
                    "date": "2024-09-28",
                    "grossProfitMargin": 0.46,
                    "peRatio": 25,
                },
            ],
            [
                {
                    "date": "2024-09-28",
                    "peRatio": 25,
                    "netIncomePerShare": 10,
                },
            ],
            [
                {
                    "date": "2024-09-28",
                    "revenueGrowth": 0.15,
                },
            ],
        ]

        fetch_screening_metrics_fmp(self.sec)

        eod_quarter = SecurityFiscalQuarter.objects.get(security=self.sec, period_end=date(2026, 3, 31))
        self.assertEqual(eod_quarter.close, Decimal("181.0"))

        quarter = SecurityFiscalQuarter.objects.get(security=self.sec, period_end=date(2024, 9, 30))
        self.assertEqual(quarter.implied_close, Decimal("250.00"))
        self.assertEqual(quarter.metrics["pe_ratio"], 25)
        self.assertEqual(quarter.metrics["revenue_growth_yoy"], 0.15)
