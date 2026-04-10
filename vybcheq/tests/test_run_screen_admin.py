from django.contrib.auth.models import User
from django.test import Client, TestCase
from django.urls import reverse

from vybcheq.models import ScreenRun, ScreeningRuleSet, Security, WatchlistEntry


class RunScreenAdminTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.superuser = User.objects.create_superuser("vyb_admin", "vyb@test.local", "secret")

    def setUp(self):
        self.client = Client()
        self.rule_set = ScreeningRuleSet.objects.create(
            name="Live test",
            rules=[{"metric": "x", "op": "==", "value": 1}],
        )
        self.sec = Security.objects.create(
            symbol="TST",
            exchange="NASDAQ",
            screening_metrics={"x": 1},
        )
        WatchlistEntry.objects.create(security=self.sec)

    def test_run_screen_confirmation_get(self):
        self.client.login(username="vyb_admin", password="secret")
        url = reverse(
            "admin:vybcheq_screeningruleset_run_screen",
            args=[self.rule_set.pk],
        )
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "watchlist")

    def test_run_screen_post_redirects_to_screen_run(self):
        self.client.login(username="vyb_admin", password="secret")
        url = reverse(
            "admin:vybcheq_screeningruleset_run_screen",
            args=[self.rule_set.pk],
        )
        resp = self.client.post(url, {})
        self.assertEqual(resp.status_code, 302)
        self.assertIn("/vybcheq/screenrun/", resp.url)

    def test_run_screen_forbidden_for_non_staff(self):
        User.objects.create_user("plain", "p@test.local", "pw")
        self.client.login(username="plain", password="pw")
        url = reverse(
            "admin:vybcheq_screeningruleset_run_screen",
            args=[self.rule_set.pk],
        )
        resp = self.client.get(url)
        self.assertIn(resp.status_code, (302, 403))


class ScreenRunChangeFormRunAgainTests(TestCase):
    def test_screen_run_change_page_shows_run_again(self):
        User.objects.create_superuser("run_view", "rv@test.local", "secret")
        rs = ScreeningRuleSet.objects.create(name="R", rules=[])
        run = ScreenRun.objects.create(rule_set=rs, status=ScreenRun.Status.OK)
        client = Client()
        client.login(username="run_view", password="secret")
        url = reverse("admin:vybcheq_screenrun_change", args=[run.pk])
        resp = client.get(url)
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "Run screen again")


class RunScreenEmptyWatchlistTests(TestCase):
    """Security without WatchlistEntry is not in the universe."""

    def test_run_screen_with_no_watchlist_shows_warning(self):
        User.objects.create_superuser("solo_admin", "solo@test.local", "secret")
        rs = ScreeningRuleSet.objects.create(name="Universe", rules=[])
        Security.objects.create(symbol="NVDA", exchange="NASDAQ", name="NVIDIA")
        client = Client()
        client.login(username="solo_admin", password="secret")
        url = reverse("admin:vybcheq_screeningruleset_run_screen", args=[rs.pk])
        resp = client.post(url, {}, follow=True)
        self.assertEqual(resp.status_code, 200)
        msgs = [str(m) for m in resp.context["messages"]]
        self.assertTrue(
            any("no securities were evaluated" in m for m in msgs),
            msg=msgs,
        )
