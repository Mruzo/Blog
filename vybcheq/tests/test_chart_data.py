from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from vybcheq.chart_data import (
    build_fiscal_chart_data,
    build_fiscal_chart_meta,
    build_fiscal_chart_series,
    build_sim_portfolio_chart_data,
)
from vybcheq.models import PositionMark, Security, SecurityFiscalQuarter
from vybcheq.sim_trading import (
    get_or_create_cheq_account,
    open_position,
    portfolio_open_totals,
    record_marks_for_user_open_positions,
)


class FiscalChartDataTests(TestCase):
    def test_builds_series_for_active_securities(self):
        sec = Security.objects.create(symbol="AAPL", exchange="NASDAQ", currency="USD", is_active=True)
        Security.objects.create(symbol="OLD", exchange="NASDAQ", currency="USD", is_active=False)
        SecurityFiscalQuarter.objects.create(
            security=sec,
            period_end=date(2024, 3, 31),
            trade_date=date(2024, 3, 28),
            eod_trade_date=date(2024, 3, 28),
            close=Decimal("170.00"),
            implied_close=Decimal("165.00"),
            metrics={"pe_ratio": 28.5},
        )
        SecurityFiscalQuarter.objects.create(
            security=sec,
            period_end=date(2024, 6, 30),
            trade_date=date(2024, 6, 28),
            eod_trade_date=date(2024, 6, 28),
            close=Decimal("180.00"),
            implied_close=Decimal("175.00"),
            metrics={"pe_ratio": 27.0},
        )

        meta = build_fiscal_chart_meta()
        self.assertEqual(len(meta["securities"]), 1)
        self.assertEqual(meta["securities"][0]["label"], "AAPL · NASDAQ")
        self.assertTrue(meta["securities"][0]["has_data"])
        self.assertNotIn("series", meta)

        series = build_fiscal_chart_series(sec.pk)
        self.assertEqual(len(series["points"]), 2)
        self.assertEqual(series["points"][0]["period"], "2024-03-31")
        self.assertEqual(series["points"][0]["eod_close"], 170.0)
        self.assertEqual(series["points"][0]["implied_close"], 165.0)
        self.assertEqual(series["points"][0]["pe_ratio"], 28.5)

        # Full dump kept for callers/tests that still need one-shot payload.
        data = build_fiscal_chart_data()
        self.assertEqual(len(data["series"][str(sec.pk)]), 2)
        keys = {m["key"] for m in data["metrics"]}
        self.assertIn("eod_close", keys)
        self.assertIn("implied_close", keys)
        self.assertIn("pe_ratio", keys)


class SimPortfolioChartDataTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("chartu", "c@test.local", "pw", is_staff=True)
        self.sec = Security.objects.create(symbol="NVDA", exchange="NASDAQ", currency="USD")
        get_or_create_cheq_account(self.user)
        now = timezone.now()
        Security.objects.filter(pk=self.sec.pk).update(
            quote_last_price=Decimal("100"),
            quote_updated_at=now,
        )
        self.sec.refresh_from_db()

    def test_empty_without_positions(self):
        data = build_sim_portfolio_chart_data(self.user)
        self.assertFalse(data["has_data"])
        self.assertEqual(data["points"], [])

    def test_open_position_builds_invested_and_return(self):
        open_position(self.user, self.sec, cheqs=Decimal("500"))
        Security.objects.filter(pk=self.sec.pk).update(quote_last_price=Decimal("120"))
        self.sec.refresh_from_db()
        record_marks_for_user_open_positions(self.user)

        # Backdate first mark so we get two days on the chart.
        first = PositionMark.objects.order_by("id").first()
        PositionMark.objects.filter(pk=first.pk).update(
            marked_at=timezone.now() - timedelta(days=2)
        )

        data = build_sim_portfolio_chart_data(self.user)
        self.assertTrue(data["has_data"])
        self.assertGreaterEqual(len(data["points"]), 2)
        latest = data["points"][-1]
        self.assertEqual(latest["cost_basis"], 500.0)
        self.assertEqual(latest["investment_value"], 600.0)
        self.assertEqual(latest["total_return"], 100.0)

        totals = portfolio_open_totals(user=self.user)
        self.assertEqual(totals["cost_basis"], Decimal("500.00"))
        self.assertEqual(totals["investment_value"], Decimal("600.00"))
        self.assertEqual(totals["total_return"], Decimal("100.00"))
