from unittest.mock import patch

from django.test import TestCase, override_settings

from vybcheq.models import Security, SecurityFiscalQuarter, WatchlistEntry
from vybcheq.monthly_refresh import (
    PHASE_EOD_CASHFLOW,
    PHASE_FUNDAMENTALS,
    estimate_phase_calls,
    run_monthly_refresh_phase,
    watchlist_securities,
)


@override_settings(VYBCHEQ_FMP_API_KEY="test-key", VYBCHEQ_FMP_ACTION_GAP_SECONDS=0)
class MonthlyRefreshTests(TestCase):
    def setUp(self):
        self.sec = Security.objects.create(symbol="AAPL", exchange="NASDAQ", currency="USD")
        WatchlistEntry.objects.create(security=self.sec)

    def test_watchlist_securities(self):
        secs = watchlist_securities()
        self.assertEqual(len(secs), 1)
        self.assertEqual(secs[0].symbol, "AAPL")

    def test_estimate_phase_calls(self):
        self.assertEqual(estimate_phase_calls(44, PHASE_FUNDAMENTALS), 132)
        self.assertEqual(estimate_phase_calls(44, PHASE_EOD_CASHFLOW), 88)

    @patch("vybcheq.monthly_refresh.merge_screening_metrics_from_fmp")
    def test_run_fundamentals_phase(self, mock_merge):
        result = run_monthly_refresh_phase(PHASE_FUNDAMENTALS, watchlist_securities())
        self.assertEqual(result.securities_ok, 1)
        mock_merge.assert_called_once()

    @patch("vybcheq.monthly_refresh.merge_cash_flow_from_fmp")
    @patch("vybcheq.monthly_refresh.sync_security_eod_from_fmp")
    def test_run_eod_cashflow_phase(self, mock_eod, mock_cf):
        mock_eod.return_value = object()
        result = run_monthly_refresh_phase(PHASE_EOD_CASHFLOW, watchlist_securities())
        self.assertEqual(result.securities_ok, 1)
        mock_eod.assert_called_once()
        mock_cf.assert_called_once()
