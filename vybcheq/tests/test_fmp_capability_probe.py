from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import Client, TestCase, override_settings
from django.urls import reverse

from vybcheq.fmp_capability_probe import run_fmp_capability_probe
from vybcheq.fmp_client import FmpError
from vybcheq.models import Security


def _probe_side_effect(
    ratios,
    metrics,
    growth,
    cash_flow=None,
    income=None,
    balance=None,
):
    """Build fmp_get side_effect for all six probe endpoints."""
    side_effect = [ratios, metrics, growth]
    if cash_flow is None:
        side_effect.extend([[], []])
    elif isinstance(cash_flow, list) and cash_flow and isinstance(cash_flow[0], list):
        side_effect.extend(cash_flow)
    else:
        side_effect.append(cash_flow)

    if income is None:
        side_effect.extend([[], []])
    elif isinstance(income, list) and income and isinstance(income[0], list):
        side_effect.extend(income)
    else:
        side_effect.append(income)

    if balance is None:
        side_effect.extend([[], []])
    elif isinstance(balance, list) and balance and isinstance(balance[0], list):
        side_effect.extend(balance)
    else:
        side_effect.append(balance)
    return side_effect


@override_settings(VYBCHEQ_FMP_API_KEY="test-key", VYBCHEQ_FMP_ACTION_GAP_SECONDS=0)
class FmpCapabilityProbeTests(TestCase):
    def setUp(self):
        self.sec = Security.objects.create(
            symbol="AAPL",
            exchange="NASDAQ",
            currency="USD",
        )

    @patch("vybcheq.fmp_capability_probe.fmp_get")
    def test_probe_reports_endpoints_and_metrics(self, mock_get):
        mock_get.side_effect = _probe_side_effect(
            [{"date": "2024-09-28", "grossProfitMargin": 0.46, "netProfitMargin": 0.25, "debtEquityRatio": 1.1, "currentRatio": 1.2}],
            [{"date": "2024-09-28", "returnOnEquity": 0.42, "returnOnAssets": 0.18, "netIncomePerShare": 6.5}],
            [{"date": "2024-09-28", "revenueGrowth": 0.12, "epsgrowth": 0.08}],
            cash_flow=[{"date": "2024-09-28", "operatingCashFlow": 99_000_000_000}],
        )
        result = run_fmp_capability_probe(self.sec)
        self.assertEqual(result.fmp_symbol, "AAPL")
        self.assertIn("ratios:quarter", result.combined_period_mode)
        self.assertTrue(result.endpoints[0].succeeded)
        self.assertTrue(result.endpoints[1].succeeded)
        by_key = {m.key: m for m in result.metrics}
        self.assertEqual(by_key["gross_margin"].status, "populated")
        self.assertEqual(by_key["gross_margin"].source, "direct")
        self.assertEqual(by_key["roe"].status, "populated")
        self.assertEqual(by_key["roa"].status, "populated")
        self.assertEqual(by_key["eps"].status, "populated")
        self.assertEqual(by_key["operating_cash_flow"].status, "populated")
        self.assertEqual(by_key["revenue_growth_5y_avg"].status, "partial")

    @patch("vybcheq.fmp_capability_probe.fmp_get")
    def test_probe_uses_newest_period_per_metric_with_mixed_modes(self, mock_get):
        period_402 = FmpError(
            "FMP plan limit reached (402) for 'AAPL'. "
            "Premium Query Parameter: period is not available"
        )
        mock_get.side_effect = [
            period_402,
            [{"date": "2024-12-31", "grossProfitMargin": 0.55, "currentRatio": 1.7, "debtToEquityRatio": 0.4}],
            period_402,
            [{"date": "2024-12-31", "returnOnEquity": 0.5, "returnOnAssets": 0.12}],
            [{"date": "2025-03-29", "revenueGrowth": 0.18, "epsgrowth": 0.05}],
            [],
            [],
            [],
            [],
            [],
            [],
        ]
        result = run_fmp_capability_probe(self.sec)
        by_key = {m.key: m for m in result.metrics}
        self.assertTrue(result.period_modes_mixed)
        self.assertEqual(by_key["revenue_growth_yoy"].latest_period, "2025-03-31")
        self.assertEqual(by_key["gross_margin"].latest_period, "2024-12-31")
        self.assertEqual(by_key["gross_margin"].status, "populated")
        self.assertEqual(by_key["debt_to_equity"].status, "populated")

    @patch("vybcheq.fmp_capability_probe.fmp_get")
    def test_probe_calculates_from_income_and_balance(self, mock_get):
        mock_get.side_effect = _probe_side_effect(
            [{"date": "2024-12-31"}],
            [{"date": "2024-12-31"}],
            [{"date": "2024-12-31", "revenueGrowth": 0.1}],
            cash_flow=[[], []],
            income=[{"date": "2024-12-31", "revenue": 1000, "grossProfit": 400, "netIncome": 100, "weightedAverageShsOut": 50}],
            balance=[{"date": "2024-12-31", "totalDebt": 300, "totalStockholdersEquity": 600, "totalAssets": 1200, "totalCurrentAssets": 500, "totalCurrentLiabilities": 250}],
        )
        result = run_fmp_capability_probe(self.sec)
        by_key = {m.key: m for m in result.metrics}
        self.assertEqual(by_key["gross_margin"].source, "calculated")
        self.assertAlmostEqual(by_key["gross_margin"].latest, 0.4)
        self.assertEqual(by_key["debt_to_equity"].source, "calculated")
        self.assertAlmostEqual(by_key["debt_to_equity"].latest, 0.5)
        self.assertEqual(by_key["current_ratio"].source, "calculated")
        self.assertAlmostEqual(by_key["current_ratio"].latest, 2.0)

    @patch("vybcheq.fmp_capability_probe.fmp_get")
    def test_probe_falls_back_to_annual(self, mock_get):
        period_402 = FmpError(
            "FMP plan limit reached (402) for 'AAPL'. "
            "Premium Query Parameter: period is not available"
        )
        annual_ratios = [{"date": "2024-12-31", "grossProfitMargin": 0.55, "netProfitMargin": 0.3}]
        annual_metrics = [{"date": "2024-12-31", "returnOnEquity": 0.5}]
        annual_growth = [{"date": "2024-12-31", "revenueGrowth": 0.2}]
        mock_get.side_effect = [
            period_402,
            annual_ratios,
            period_402,
            annual_metrics,
            period_402,
            annual_growth,
            period_402,
            [{"date": "2024-12-31", "operatingCashFlow": 1_000}],
            period_402,
            [],
            period_402,
            [],
        ]
        result = run_fmp_capability_probe(self.sec)
        self.assertIn("ratios:annual", result.combined_period_mode)
        self.assertEqual(result.endpoints[0].mode, "annual")
        blocked = [a for ep in result.endpoints for a in ep.attempts if a.status == "blocked"]
        self.assertTrue(blocked)


@override_settings(VYBCHEQ_FMP_API_KEY="test-key", VYBCHEQ_FMP_ACTION_GAP_SECONDS=0)
class FmpCapabilityProbeAdminTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_superuser("admin", "admin@test.com", "pass")
        self.client = Client()
        self.client.force_login(self.admin)
        self.sec = Security.objects.create(symbol="MSFT", exchange="NASDAQ", currency="USD")

    @patch("vybcheq.admin.run_fmp_capability_probe")
    def test_admin_probe_view(self, mock_probe):
        from vybcheq.fmp_capability_probe import (
            CalculableHint,
            EndpointProbe,
            FmpCapabilityProbeResult,
            MetricProbe,
        )

        mock_probe.return_value = FmpCapabilityProbeResult(
            security=self.sec,
            fmp_symbol="MSFT",
            row_limit=5,
            combined_period_mode="ratios:quarter+metrics:quarter",
            endpoints=[
                EndpointProbe(name="ratios", succeeded=True, mode="quarter", row_count=1),
            ],
            metrics=[
                MetricProbe(
                    key="gross_margin",
                    label="Gross margin",
                    latest=0.4,
                    average=0.4,
                    periods_with_data=1,
                    period_rows_available=1,
                    status="populated",
                    latest_period="2024-09-30",
                    source="direct",
                ),
            ],
            period_count=1,
            calculable_hints=[
                CalculableHint(
                    key="gross_margin",
                    label="Gross margin",
                    formula="grossProfit / revenue",
                    needs="ratios.grossProfitMargin",
                    outcome="available",
                ),
            ],
        )
        url = reverse("admin:vybcheq_security_fmp_probe", args=[self.sec.pk])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "ratios:quarter+metrics:quarter")
        self.assertContains(response, "gross_margin")
        self.assertContains(response, "Calculable metrics")
