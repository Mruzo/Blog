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
                    "marketCap": 2_000_000_000_000,
                    "netIncomePerShare": 10,
                },
            ],
        ]
        data = fetch_screening_metrics_fmp(self.sec)
        self.assertEqual(mock_get.call_count, 2)
        self.assertEqual(data["gross_margin"], 0.46)
        self.assertEqual(data["pretax_margin"], 0.31)
        self.assertEqual(data["net_margin"], 0.25)
        self.assertEqual(data["debt_to_equity"], 1.1)
        self.assertEqual(data["current_ratio"], 1.2)
        self.assertEqual(data["quick_ratio"], 1.0)
        self.assertEqual(data["pe_ratio"], 25)
        self.assertEqual(data["close"], 250.0)

        quarter = SecurityFiscalQuarter.objects.get(security=self.sec, period_end=date(2024, 9, 30))
        self.assertEqual(quarter.close, Decimal("250.00"))
        self.assertEqual(quarter.metrics["_price_method"], "pe_x_eps")
        self.assertIn("ratios", quarter.metrics["_raw"])

        self.sec.refresh_from_db()
        self.assertEqual(self.sec.quote_last_price, Decimal("250.00"))
