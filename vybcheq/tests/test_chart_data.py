from datetime import date
from decimal import Decimal

from django.test import TestCase

from vybcheq.chart_data import build_fiscal_chart_data
from vybcheq.models import Security, SecurityFiscalQuarter


class FiscalChartDataTests(TestCase):
    def test_builds_series_for_active_securities(self):
        sec = Security.objects.create(symbol="AAPL", exchange="NASDAQ", currency="USD", is_active=True)
        Security.objects.create(symbol="OLD", exchange="NASDAQ", currency="USD", is_active=False)
        SecurityFiscalQuarter.objects.create(
            security=sec,
            period_end=date(2024, 3, 31),
            trade_date=date(2024, 3, 28),
            close=Decimal("170.00"),
            metrics={"pe_ratio": 28.5},
        )
        SecurityFiscalQuarter.objects.create(
            security=sec,
            period_end=date(2024, 6, 30),
            trade_date=date(2024, 6, 28),
            close=Decimal("180.00"),
            metrics={"pe_ratio": 27.0},
        )

        data = build_fiscal_chart_data()
        self.assertEqual(len(data["securities"]), 1)
        self.assertEqual(data["securities"][0]["label"], "AAPL · NASDAQ")
        self.assertTrue(data["securities"][0]["has_data"])

        series = data["series"][str(sec.pk)]
        self.assertEqual(len(series), 2)
        self.assertEqual(series[0]["period"], "2024-03-31")
        self.assertEqual(series[0]["close"], 170.0)
        self.assertEqual(series[0]["pe_ratio"], 28.5)

        keys = {m["key"] for m in data["metrics"]}
        self.assertIn("close", keys)
        self.assertIn("pe_ratio", keys)
