from decimal import Decimal

from django.test import TestCase

from vybcheq.models import ScreenRun, ScreeningRuleSet, Security, WatchlistEntry
from vybcheq.screening import evaluate_rules, run_screen_against_watchlist


class EvaluateRulesTests(TestCase):
    def test_empty_rules_passes(self):
        ok, score, details = evaluate_rules([], {"pe_ratio": 10})
        self.assertTrue(ok)
        self.assertIsNone(score)
        self.assertIn("No rules", details)

    def test_single_rule_pass(self):
        rules = [{"metric": "pe_ratio", "op": "<=", "value": 25}]
        ok, score, details = evaluate_rules(rules, {"pe_ratio": 18})
        self.assertTrue(ok)
        self.assertEqual(score, Decimal("100"))
        self.assertIn("PASS", details)

    def test_single_rule_fail(self):
        rules = [{"metric": "pe_ratio", "op": "<=", "value": 25}]
        ok, score, details = evaluate_rules(rules, {"pe_ratio": 40})
        self.assertFalse(ok)
        self.assertEqual(score, Decimal("0"))
        self.assertIn("FAIL", details)

    def test_missing_metric_fails(self):
        rules = [{"metric": "pe_ratio", "op": "<=", "value": 25}]
        ok, score, details = evaluate_rules(rules, {})
        self.assertFalse(ok)
        self.assertIn("missing metric", details)


class RunScreenAgainstWatchlistTests(TestCase):
    def setUp(self):
        self.rs = ScreeningRuleSet.objects.create(
            name="Test rules",
            rules=[{"metric": "pe_ratio", "op": "<=", "value": 30}],
        )
        self.s1 = Security.objects.create(
            symbol="AAA",
            exchange="TSX",
            name="A",
            currency="CAD",
            screening_metrics={"pe_ratio": 12},
        )
        self.s2 = Security.objects.create(
            symbol="BBB",
            exchange="TSX",
            name="B",
            currency="CAD",
            screening_metrics={"pe_ratio": 50},
        )
        WatchlistEntry.objects.create(security=self.s1)
        WatchlistEntry.objects.create(security=self.s2)

    def test_creates_run_and_results(self):
        run = run_screen_against_watchlist(self.rs)
        self.assertEqual(run.status, ScreenRun.Status.OK)
        self.assertEqual(run.screen_results.count(), 2)
        r1 = run.screen_results.get(security=self.s1)
        r2 = run.screen_results.get(security=self.s2)
        self.assertTrue(r1.passed)
        self.assertFalse(r2.passed)

    def test_skips_non_watchlist(self):
        Security.objects.create(
            symbol="ZZZ",
            exchange="NYSE",
            screening_metrics={"pe_ratio": 10},
        )
        run = run_screen_against_watchlist(self.rs)
        self.assertEqual(run.screen_results.count(), 2)
