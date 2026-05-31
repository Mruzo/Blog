from datetime import date
from decimal import Decimal

from django.test import TestCase

from vybcheq.models import Security, SecurityFiscalQuarter
from vybcheq.screening_metrics import latest_screening_metrics, sync_security_screening_metrics_cache


class ScreeningMetricsTests(TestCase):
    def setUp(self):
        self.sec = Security.objects.create(
            symbol="AAPL",
            exchange="NASDAQ",
            currency="USD",
            screening_metrics={"pe_ratio": 99},
        )

    def test_latest_uses_most_recent_fiscal_quarter(self):
        SecurityFiscalQuarter.objects.create(
            security=self.sec,
            period_end=date(2024, 6, 30),
            trade_date=date(2024, 6, 28),
            close=Decimal("190"),
            metrics={"pe_ratio": 20},
        )
        SecurityFiscalQuarter.objects.create(
            security=self.sec,
            period_end=date(2024, 9, 30),
            trade_date=date(2024, 9, 30),
            close=Decimal("225"),
            metrics={"pe_ratio": 18},
        )
        metrics = latest_screening_metrics(self.sec)
        self.assertEqual(metrics["pe_ratio"], 18)
        self.assertEqual(metrics["close"], 225.0)
        self.assertEqual(metrics["period_end"], "2024-09-30")

    def test_sync_cache_from_latest_quarter(self):
        SecurityFiscalQuarter.objects.create(
            security=self.sec,
            period_end=date(2024, 12, 31),
            trade_date=date(2024, 12, 31),
            close=Decimal("240"),
            metrics={"roe": 0.5},
        )
        sync_security_screening_metrics_cache(self.sec)
        self.sec.refresh_from_db()
        self.assertEqual(self.sec.screening_metrics["roe"], 0.5)
        self.assertEqual(self.sec.screening_metrics["close"], 240.0)
