from datetime import date
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone

from vybcheq.fmp_report_dates import (
    merge_report_dates_from_fmp,
    period_end_from_fmp_period,
)
from vybcheq.models import Security, SecurityFiscalQuarter
from vybcheq.screening_metrics import metrics_from_fiscal_quarter


class PeriodEndMappingTests(TestCase):
    def test_quarter_periods(self):
        self.assertEqual(period_end_from_fmp_period(2024, "Q1"), date(2024, 3, 31))
        self.assertEqual(period_end_from_fmp_period(2024, "Q2"), date(2024, 6, 30))
        self.assertEqual(period_end_from_fmp_period(2024, "Q3"), date(2024, 9, 30))
        self.assertEqual(period_end_from_fmp_period(2024, "Q4"), date(2024, 12, 31))
        self.assertEqual(period_end_from_fmp_period(2024, "FY"), date(2024, 12, 31))


@override_settings(VYBCHEQ_FMP_API_KEY="test-key", VYBCHEQ_FMP_ACTION_GAP_SECONDS=0)
class FmpReportDatesTests(TestCase):
    def setUp(self):
        self.sec = Security.objects.create(
            symbol="AAPL",
            exchange="NASDAQ",
            currency="USD",
        )
        SecurityFiscalQuarter.objects.create(
            security=self.sec,
            period_end=date(2024, 9, 30),
            trade_date=date(2024, 9, 30),
            close=Decimal("225.00"),
        )

    @patch("vybcheq.fmp_report_dates.fmp_get")
    def test_merge_updates_quarter_and_security_cache(self, mock_get):
        mock_get.return_value = [
            {"date": "2024-11-01", "symbol": "AAPL", "year": 2024, "period": "Q4"},
            {"date": "2024-08-02", "symbol": "AAPL", "year": 2024, "period": "Q3"},
        ]
        written = merge_report_dates_from_fmp(self.sec)
        self.assertEqual(written, 2)
        mock_get.assert_called_once()

        q3 = SecurityFiscalQuarter.objects.get(security=self.sec, period_end=date(2024, 9, 30))
        self.assertEqual(q3.report_date, date(2024, 8, 2))

        q4 = SecurityFiscalQuarter.objects.get(security=self.sec, period_end=date(2024, 12, 31))
        self.assertEqual(q4.report_date, date(2024, 11, 1))

        self.sec.refresh_from_db()
        self.assertEqual(self.sec.last_report_date, date(2024, 11, 1))
        self.assertIsNotNone(self.sec.report_dates_updated_at)

    @patch("vybcheq.fmp_report_dates.fmp_get")
    def test_metrics_from_fiscal_quarter_includes_report_date(self, mock_get):
        mock_get.return_value = [
            {"date": "2024-08-02", "symbol": "AAPL", "year": 2024, "period": "Q3"},
        ]
        merge_report_dates_from_fmp(self.sec)
        quarter = SecurityFiscalQuarter.objects.get(security=self.sec, period_end=date(2024, 9, 30))
        metrics = metrics_from_fiscal_quarter(quarter)
        self.assertEqual(metrics["report_date"], "2024-08-02")

    @patch("vybcheq.fmp_report_dates.fmp_get")
    def test_creates_quarter_row_when_missing(self, mock_get):
        mock_get.return_value = [
            {"date": "2024-11-01", "symbol": "AAPL", "year": 2024, "period": "Q4"},
        ]
        merge_report_dates_from_fmp(self.sec)
        q4 = SecurityFiscalQuarter.objects.get(security=self.sec, period_end=date(2024, 12, 31))
        self.assertEqual(q4.report_date, date(2024, 11, 1))
        self.assertIsNone(q4.close)
