from django.contrib.auth.models import User
from django.test import Client, TestCase
from django.urls import reverse

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

    def test_run_screen_post(self):
        self.client.login(username="staff_ui", password="pw")
        rs = ScreeningRuleSet.objects.create(name="R", rules=[])
        sec = Security.objects.create(symbol="Z", exchange="NASDAQ", currency="USD")
        WatchlistEntry.objects.create(security=sec)
        url = reverse("vybcheq_staff:run_screen_confirm", kwargs={"rule_set_id": rs.pk})
        resp = self.client.post(url, {})
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(ScreenRun.objects.count(), 1)
