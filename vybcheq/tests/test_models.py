from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from vybcheq.models import (
    DecisionLog,
    ResearchPacket,
    ScreenResult,
    ScreenRun,
    ScreeningRuleSet,
    Security,
    WatchlistEntry,
)


class SecurityModelTests(TestCase):
    def test_create_security(self):
        s = Security.objects.create(
            symbol="AAPL",
            exchange="NASDAQ",
            name="Apple Inc.",
            currency="USD",
        )
        self.assertEqual(s.symbol, "AAPL")
        self.assertTrue(s.is_active)

    def test_symbol_exchange_unique_together(self):
        Security.objects.create(symbol="SHOP", exchange="TSX", name="Shopify", currency="CAD")
        with self.assertRaises(IntegrityError):
            Security.objects.create(symbol="SHOP", exchange="TSX", name="Dup", currency="CAD")

    def test_same_symbol_different_exchange_allowed(self):
        Security.objects.create(symbol="RY", exchange="TSX", name="RBC", currency="CAD")
        Security.objects.create(symbol="RY", exchange="NYSE", name="RBC NY", currency="USD")
        self.assertEqual(Security.objects.filter(symbol="RY").count(), 2)


class WatchlistEntryModelTests(TestCase):
    def setUp(self):
        self.security = Security.objects.create(
            symbol="MSFT", exchange="NASDAQ", name="Microsoft", currency="USD"
        )

    def test_watchlist_links_to_security(self):
        w = WatchlistEntry.objects.create(security=self.security, priority=1, note="Watch")
        self.assertEqual(w.security.symbol, "MSFT")

    def test_one_watchlist_entry_per_security(self):
        WatchlistEntry.objects.create(security=self.security)
        with self.assertRaises(IntegrityError):
            WatchlistEntry.objects.create(security=self.security)


class ScreeningRuleSetModelTests(TestCase):
    def test_rules_default_empty_list(self):
        rs = ScreeningRuleSet.objects.create(name="V1", rules=[])
        self.assertEqual(rs.rules, [])
        self.assertFalse(rs.is_active)

    def test_rules_store_json_criteria(self):
        rules = [{"metric": "pe_ratio", "op": "<=", "value": 25}]
        rs = ScreeningRuleSet.objects.create(name="Value", rules=rules, is_active=True)
        rs.refresh_from_db()
        self.assertEqual(rs.rules[0]["metric"], "pe_ratio")


class ScreenRunModelTests(TestCase):
    def setUp(self):
        self.rule_set = ScreeningRuleSet.objects.create(name="Test", rules=[])

    def test_screen_run_status_flow(self):
        run = ScreenRun.objects.create(
            rule_set=self.rule_set,
            status=ScreenRun.Status.PENDING,
        )
        self.assertIsNone(run.finished_at)
        run.status = ScreenRun.Status.OK
        run.save()
        self.assertEqual(run.status, ScreenRun.Status.OK)


class ScreenResultModelTests(TestCase):
    def setUp(self):
        self.rule_set = ScreeningRuleSet.objects.create(name="R", rules=[])
        self.run = ScreenRun.objects.create(rule_set=self.rule_set, status=ScreenRun.Status.OK)
        self.security = Security.objects.create(symbol="GOOGL", exchange="NASDAQ", name="Alphabet", currency="USD")

    def test_result_links_run_and_security(self):
        r = ScreenResult.objects.create(
            run=self.run,
            security=self.security,
            passed=True,
            score=Decimal("82.5"),
            metrics_snapshot={"pe_ratio": 18.2},
        )
        self.assertIn("pe_ratio", r.metrics_snapshot)
        self.assertEqual(r.run.screen_results.count(), 1)

    def test_unique_result_per_run_and_security(self):
        ScreenResult.objects.create(run=self.run, security=self.security, passed=True)
        with self.assertRaises(IntegrityError):
            ScreenResult.objects.create(run=self.run, security=self.security, passed=False)


class ResearchPacketModelTests(TestCase):
    def setUp(self):
        self.security = Security.objects.create(symbol="XOM", exchange="NYSE", name="Exxon", currency="USD")

    def test_one_packet_per_security(self):
        ResearchPacket.objects.create(security=self.security, sections={"ch2": "notes"})
        with self.assertRaises(IntegrityError):
            ResearchPacket.objects.create(security=self.security, sections={})

    def test_sections_default_dict(self):
        p = ResearchPacket.objects.create(security=self.security)
        self.assertEqual(p.sections, {})


class DecisionLogModelTests(TestCase):
    def setUp(self):
        self.security = Security.objects.create(symbol="TD", exchange="TSX", name="TD Bank", currency="CAD")

    def test_decision_requires_action(self):
        d = DecisionLog(security=self.security, thesis="ok", risk="rates")
        with self.assertRaises(ValidationError):
            d.full_clean()

    def test_create_buy_decision(self):
        d = DecisionLog.objects.create(
            security=self.security,
            action=DecisionLog.Action.BUY,
            thesis="Cheap vs peers",
            risk="Credit cycle",
            invalidation="NIM compression",
        )
        self.assertEqual(d.action, DecisionLog.Action.BUY)
