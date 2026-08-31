from datetime import date
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase, override_settings

from vybcheq.fmp_fundamentals import (
    fetch_screening_metrics_fmp,
    implied_price_from_fmp_row,
)
from vybcheq.models import Security, SecurityFiscalQuarter


@override_settings(VYBCHEQ_FMP_API_KEY="test-key", VYBCHEQ_FMP_ACTION_GAP_SECONDS=0)
class ImpliedPriceTests(TestCase):
    def test_pe_times_eps(self):
        price, method = implied_price_from_fmp_row(
            {"peRatio": 25, "netIncomePerShare": 10}
        )
        self.assertEqual(method, "pe_x_eps")
        self.assertEqual(price, Decimal("250.00"))

    def test_direct_price_field(self):
        price, method = implied_price_from_fmp_row({"price": 171.25})
        self.assertEqual(method, "direct:price")
        self.assertEqual(price, Decimal("171.25"))


@override_settings(VYBCHEQ_FMP_API_KEY="test-key", VYBCHEQ_FMP_ACTION_GAP_SECONDS=0)
class FmpFundamentalsTests(TestCase):
    def setUp(self):
        self.sec = Security.objects.create(
            symbol="AAPL",
            exchange="NASDAQ",
            currency="USD",
        )

    @patch("vybcheq.fmp_fundamentals.fmp_get")
    def test_merges_ratios_and_key_metrics_with_implied_price(self, mock_get):
        mock_get.side_effect = [
            [
                {
                    "date": "2024-09-28",
                    "grossProfitMargin": 0.46,
                    "pretaxProfitMargin": 0.31,
                    "netProfitMargin": 0.25,
                    "debtEquityRatio": 1.1,
                    "currentRatio": 1.2,
                    "quickRatio": 1.0,
                },
            ],
            [
                {
                    "date": "2024-09-28",
                    "peRatio": 25,
                    "returnOnEquity": 0.42,
                    "returnOnAssets": 0.18,
                    "marketCap": 2_000_000_000_000,
                    "netIncomePerShare": 10,
                },
            ],
            [
                {
                    "date": "2024-09-28",
                    "revenueGrowth": 0.12,
                    "epsgrowth": 0.08,
                },
            ],
        ]
        data = fetch_screening_metrics_fmp(self.sec)
        self.assertEqual(mock_get.call_count, 3)
        for call in mock_get.call_args_list[:3]:
            self.assertEqual(call.kwargs["params"]["limit"], 5)
            self.assertEqual(call.kwargs["params"]["period"], "annual")
        self.assertEqual(data["gross_margin"], 0.46)
        self.assertEqual(data["pretax_margin"], 0.31)
        self.assertEqual(data["net_margin"], 0.25)
        self.assertEqual(data["debt_to_equity"], 1.1)
        self.assertEqual(data["current_ratio"], 1.2)
        self.assertEqual(data["quick_ratio"], 1.0)
        self.assertEqual(data["pe_ratio"], 25)
        self.assertEqual(data["roe"], 0.42)
        self.assertEqual(data["roa"], 0.18)
        self.assertEqual(data["eps"], 10.0)
        self.assertEqual(data["revenue_growth_yoy"], 0.12)
        self.assertEqual(data["earnings_growth_yoy"], 0.08)
        self.assertEqual(data["close"], 250.0)

        quarter = SecurityFiscalQuarter.objects.get(security=self.sec, period_end=date(2024, 9, 30))
        self.assertEqual(quarter.implied_close, Decimal("250.00"))
        self.assertIsNone(quarter.close)
        self.assertEqual(quarter.metrics["_price_method"], "pe_x_eps")
        self.assertEqual(quarter.metrics["roa"], 0.18)
        self.assertEqual(quarter.metrics["eps"], 10.0)
        self.assertIn("ratios", quarter.metrics["_raw"])
        self.assertIn("growth", quarter.metrics["_raw"])

        self.sec.refresh_from_db()
        self.assertEqual(self.sec.quote_last_price, Decimal("250.00"))
        self.assertEqual(self.sec.quote_implied_close, Decimal("250.00"))
        self.assertEqual(self.sec.quote_implied_period_end, date(2024, 9, 30))
        self.assertEqual(self.sec.quote_implied_method, "pe_x_eps")
        self.assertEqual(self.sec.quote_mark_source, "implied")

    @override_settings(VYBCHEQ_FMP_PREFER_ANNUAL=False)
    @patch("vybcheq.fmp_fundamentals.fmp_get")
    def test_falls_back_from_quarter_to_annual(self, mock_get):
        from vybcheq.fmp_client import FmpError

        period_402 = FmpError(
            "FMP plan limit reached (402) for 'NVDA'. "
            "Premium Query Parameter: period is not available"
        )
        annual_row = {"date": "2024-12-31", "grossProfitMargin": 0.55, "peRatio": 30}
        annual_growth = {"date": "2024-12-31", "revenueGrowth": 0.2}
        mock_get.side_effect = [
            period_402,
            [annual_row],
            period_402,
            [annual_row],
            period_402,
            [annual_growth],
        ]
        data = fetch_screening_metrics_fmp(self.sec)
        self.assertEqual(data["gross_margin"], 0.55)
        self.assertEqual(data["pe_ratio"], 30)
        self.assertEqual(data["revenue_growth_yoy"], 0.2)
        calls = mock_get.call_args_list
        self.assertEqual(calls[0].kwargs["params"]["period"], "quarter")
        self.assertEqual(calls[1].kwargs["params"]["period"], "annual")
        quarter = SecurityFiscalQuarter.objects.get(security=self.sec, period_end=date(2024, 12, 31))
        self.assertIn("annual", quarter.metrics.get("_fmp_period_mode"))

    @patch("vybcheq.fmp_fundamentals.fmp_get")
    def test_continues_when_growth_endpoint_blocked(self, mock_get):
        from vybcheq.fmp_client import FmpError

        growth_402 = FmpError(
            "FMP plan limit reached (402) for 'AAPL'. "
            "Restricted Endpoint: financial-growth"
        )
        mock_get.side_effect = [
            [{"date": "2024-09-28", "netProfitMargin": 0.25}],
            [{"date": "2024-09-28", "peRatio": 20, "netIncomePerShare": 5}],
            growth_402,
            growth_402,
        ]
        data = fetch_screening_metrics_fmp(self.sec)
        self.assertEqual(data["net_margin"], 0.25)
        self.assertNotIn("revenue_growth_yoy", data)
