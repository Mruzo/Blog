from decimal import Decimal

from django.contrib.auth.models import User
from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone

from vybcheq.models import ScreenRun, ScreeningRuleSet, Security, WatchlistEntry


class StaffVybcheqUITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.staff = User.objects.create_user("staff_ui", "s@test.local", "pw", is_staff=True)
        cls.plain = User.objects.create_user("plain_ui", "p@test.local", "pw", is_staff=False)

    def setUp(self):
        self.client = Client()

    def test_dashboard_redirects_anonymous(self):
        url = reverse("vybcheq_staff:dashboard")
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 302)

    def test_dashboard_redirects_non_staff_to_login(self):
        self.client.login(username="plain_ui", password="pw")
        resp = self.client.get(reverse("vybcheq_staff:dashboard"))
        self.assertEqual(resp.status_code, 302)
        self.assertIn("login", resp.url)

    def test_dashboard_200_staff(self):
        self.client.login(username="staff_ui", password="pw")
        resp = self.client.get(reverse("vybcheq_staff:dashboard"))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "Vybcheq")
        self.assertContains(resp, "Quarterly history")

    def test_dashboard_watchlist_top5_sorted_price_low_to_high(self):
        self.client.login(username="staff_ui", password="pw")
        now = timezone.now()
        hi = Security.objects.create(
            symbol="WLHI",
            exchange="NASDAQ",
            currency="USD",
            quote_last_price=Decimal("200"),
            quote_updated_at=now,
        )
        mid = Security.objects.create(
            symbol="WLMD",
            exchange="NASDAQ",
            currency="USD",
            quote_last_price=Decimal("100"),
            quote_updated_at=now,
        )
        lo = Security.objects.create(
            symbol="WLLO",
            exchange="NASDAQ",
            currency="USD",
            quote_last_price=Decimal("50"),
            quote_updated_at=now,
        )
        WatchlistEntry.objects.create(security=hi)
        WatchlistEntry.objects.create(security=mid)
        WatchlistEntry.objects.create(security=lo)
        resp = self.client.get(reverse("vybcheq_staff:dashboard"))
        self.assertEqual(resp.status_code, 200)
        body = resp.content.decode()
        wl_start = body.find("Watchlist · low → high price")
        wl_end = body.find("Open sim positions")
        self.assertGreater(wl_start, -1)
        self.assertGreater(wl_end, wl_start)
        section = body[wl_start:wl_end]
        self.assertLess(section.find("WLLO"), section.find("WLMD"))
        self.assertLess(section.find("WLMD"), section.find("WLHI"))

    def test_watchlist_and_metrics_flow(self):
        self.client.login(username="staff_ui", password="pw")
        sec = Security.objects.create(symbol="ABC", exchange="NYSE", currency="USD")
        WatchlistEntry.objects.create(security=sec)
        r1 = self.client.get(reverse("vybcheq_staff:watchlist"))
        self.assertEqual(r1.status_code, 200)
        self.assertContains(r1, "ABC")
        r2 = self.client.get(reverse("vybcheq_staff:security_metrics", kwargs={"pk": sec.pk}))
        self.assertEqual(r2.status_code, 200)
        r3 = self.client.post(
            reverse("vybcheq_staff:security_metrics", kwargs={"pk": sec.pk}),
            {"pe_ratio": "12.5", "advanced_json": ""},
        )
        self.assertEqual(r3.status_code, 302)
        sec.refresh_from_db()
        self.assertEqual(sec.screening_metrics.get("pe_ratio"), 12.5)

    def test_sim_portfolio_200_staff(self):
        self.client.login(username="staff_ui", password="pw")
        resp = self.client.get(reverse("vybcheq_staff:sim_portfolio"))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "cheqs")

    def test_sim_open_trade_watchlist_only(self):
        self.client.login(username="staff_ui", password="pw")
        on_wl = Security.objects.create(symbol="ONWL", exchange="NASDAQ", currency="USD")
        off_wl = Security.objects.create(symbol="OFFWL", exchange="NASDAQ", currency="USD")
        WatchlistEntry.objects.create(security=on_wl)
        resp = self.client.get(reverse("vybcheq_staff:sim_open_trade"))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "ONWL")
        self.assertNotContains(resp, "OFFWL")

    def test_run_screen_post(self):
        self.client.login(username="staff_ui", password="pw")
        rs = ScreeningRuleSet.objects.create(name="R", rules=[])
        sec = Security.objects.create(symbol="Z", exchange="NASDAQ", currency="USD")
        WatchlistEntry.objects.create(security=sec)
        url = reverse("vybcheq_staff:run_screen_confirm", kwargs={"rule_set_id": rs.pk})
        resp = self.client.post(url, {})
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(ScreenRun.objects.count(), 1)

    def test_rule_set_list_staff(self):
        self.client.login(username="staff_ui", password="pw")
        ScreeningRuleSet.objects.create(
            name="Margins",
            rules=[{"metric": "gross_margin", "op": ">=", "value": 0.4}],
        )
        resp = self.client.get(reverse("vybcheq_staff:rule_set_list"))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "Screening criteria")
        self.assertContains(resp, "Gross margin")
        self.assertContains(resp, "Threshold")

    def test_dashboard_shows_briefing_summary(self):
        self.client.login(username="staff_ui", password="pw")
        resp = self.client.get(reverse("vybcheq_staff:dashboard"))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "Six screening checks")
        self.assertContains(resp, "Criteria")

    def test_rule_set_create_prefill_from_brief(self):
        self.client.login(username="staff_ui", password="pw")
        url = reverse("vybcheq_staff:rule_set_create") + "?brief=quick_ratio"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "Quick ratio")
        self.assertContains(resp, "Setting up")

    def test_rule_set_create_and_edit(self):
        self.client.login(username="staff_ui", password="pw")
        create_url = reverse("vybcheq_staff:rule_set_create")
        resp = self.client.get(create_url)
        self.assertEqual(resp.status_code, 200)

        post_data = {
            "name": "Dividend check",
            "is_active": "on",
            "form-TOTAL_FORMS": "6",
            "form-INITIAL_FORMS": "0",
            "form-MIN_NUM_FORMS": "0",
            "form-MAX_NUM_FORMS": "15",
            "form-0-metric": "dividend_yield",
            "form-0-op": ">=",
            "form-0-value": "0.02",
        }
        for i in range(1, 6):
            post_data[f"form-{i}-metric"] = ""
            post_data[f"form-{i}-op"] = ""
            post_data[f"form-{i}-value"] = ""

        resp = self.client.post(create_url, post_data)
        self.assertEqual(resp.status_code, 302)
        rs = ScreeningRuleSet.objects.get(name="Dividend check")
        self.assertTrue(rs.is_active)
        self.assertEqual(rs.rules, [{"metric": "dividend_yield", "op": ">=", "value": 0.02}])

        edit_url = reverse("vybcheq_staff:rule_set_edit", kwargs={"pk": rs.pk})
        resp = self.client.get(edit_url)
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "dividend_yield")

    def test_screen_run_detail_shows_metrics_snapshot(self):
        from vybcheq.models import ScreenResult

        self.client.login(username="staff_ui", password="pw")
        rs = ScreeningRuleSet.objects.create(
            name="PE",
            rules=[{"metric": "pe_ratio", "op": "<=", "value": 30}],
        )
        sec = Security.objects.create(
            symbol="SNAP",
            exchange="NASDAQ",
            currency="USD",
            screening_metrics={"pe_ratio": 18.5, "roe": 0.22},
        )
        run = ScreenRun.objects.create(rule_set=rs, status=ScreenRun.Status.OK)
        ScreenResult.objects.create(
            run=run,
            security=sec,
            passed=True,
            score=Decimal("100"),
            metrics_snapshot={"pe_ratio": 18.5, "roe": 0.22, "close": 225.0},
            details="Rule 1: pe_ratio — 18.5 <= 30 → PASS",
        )
        resp = self.client.get(reverse("vybcheq_staff:screen_run_detail", kwargs={"pk": run.pk}))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "Metrics at run")
        self.assertContains(resp, "P/E (trailing)")
        self.assertContains(resp, "Return on equity")
        self.assertContains(resp, "225")
