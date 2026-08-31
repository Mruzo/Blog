from datetime import date
from unittest.mock import patch

from django.test import TestCase, override_settings

from vybcheq.fmp_cash_flow import merge_cash_flow_from_fmp
from vybcheq.models import Security, SecurityFiscalQuarter


@override_settings(VYBCHEQ_FMP_API_KEY="test-key", VYBCHEQ_FMP_ACTION_GAP_SECONDS=0)
class FmpCashFlowTests(TestCase):
    def setUp(self):
        self.sec = Security.objects.create(
            symbol="INTC",
            exchange="NASDAQ",
            currency="USD",
        )

    @patch("vybcheq.fmp_cash_flow.fmp_get")
    def test_merge_operating_cash_flow(self, mock_get):
        mock_get.return_value = [
            {"date": "2024-12-31", "operatingCashFlow": 7_006_000_000},
        ]
        updated = merge_cash_flow_from_fmp(self.sec)
        self.assertEqual(updated, 1)
        quarter = SecurityFiscalQuarter.objects.get(security=self.sec, period_end=date(2024, 12, 31))
        self.assertEqual(quarter.metrics["operating_cash_flow"], 7_006_000_000.0)
        self.sec.refresh_from_db()
        self.assertEqual(self.sec.screening_metrics["operating_cash_flow"], 7_006_000_000.0)
