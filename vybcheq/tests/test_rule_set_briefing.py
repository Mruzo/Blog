from django.test import TestCase

from vybcheq.models import ScreeningRuleSet, Security, WatchlistEntry
from vybcheq.rule_set_briefing import (
    BRIEFING_CATALOG,
    briefing_item,
    build_briefing_rows,
    extended_rule_sets,
    rule_sets_for_brief_slugs,
    save_briefing_check,
)
from vybcheq.screening import run_composite_screen_against_watchlist


class RuleSetBriefingTests(TestCase):
    def test_catalog_has_six_core_items(self):
        self.assertEqual(len(BRIEFING_CATALOG), 6)

    def test_matches_rule_set_by_metric(self):
        rs = ScreeningRuleSet.objects.create(
            name="My gross margin",
            rules=[{"metric": "gross_margin", "op": ">=", "value": 0.45}],
        )
        rows = build_briefing_rows([rs])
        gross = next(r for r in rows if r.slug == "gross_margin")
        self.assertEqual(gross.rule_set, rs)
        self.assertEqual(gross.effective_rules[0]["value"], 0.45)

    def test_unmatched_slot_uses_suggested_rule(self):
        rows = build_briefing_rows([])
        gross = next(r for r in rows if r.slug == "gross_margin")
        self.assertIsNone(gross.rule_set)
        self.assertEqual(gross.suggested_rule["metric"], "gross_margin")

    def test_extended_rule_sets_excludes_matched(self):
        rs1 = ScreeningRuleSet.objects.create(
            name="Gross",
            rules=[{"metric": "gross_margin", "op": ">=", "value": 0.4}],
        )
        rs2 = ScreeningRuleSet.objects.create(
            name="Combo",
            rules=[
                {"metric": "pe_ratio", "op": "<=", "value": 25},
                {"metric": "roe", "op": ">=", "value": 0.15},
            ],
        )
        rows = build_briefing_rows([rs1, rs2])
        extended = extended_rule_sets([rs1, rs2], rows)
        self.assertEqual(len(extended), 1)
        self.assertEqual(extended[0], rs2)

    def test_matches_rule_set_by_brief_slug(self):
        rs = ScreeningRuleSet.objects.create(
            name="Gross margin",
            brief_slug="gross_margin",
            rules=[{"metric": "gross_margin", "op": ">=", "value": 0.5}],
        )
        rows = build_briefing_rows([rs])
        gross = next(r for r in rows if r.slug == "gross_margin")
        self.assertEqual(gross.rule_set, rs)

    def test_save_briefing_check_creates_with_slug(self):
        rs = save_briefing_check("quick_ratio", 1.2)
        self.assertEqual(rs.brief_slug, "quick_ratio")
        self.assertEqual(rs.rules, [{"metric": "quick_ratio", "op": ">=", "value": 1.2}])
        self.assertTrue(rs.is_active)

    def test_save_briefing_check_updates_existing_match(self):
        rs = ScreeningRuleSet.objects.create(
            name="Old gross",
            rules=[{"metric": "gross_margin", "op": ">=", "value": 0.3}],
        )
        updated = save_briefing_check("gross_margin", 0.55)
        self.assertEqual(updated.pk, rs.pk)
        self.assertEqual(updated.brief_slug, "gross_margin")
        self.assertEqual(updated.rules[0]["value"], 0.55)

    def test_composite_run_combines_rules(self):
        rs1 = save_briefing_check("gross_margin", 0.4)
        rs2 = save_briefing_check("net_margin", 0.1)
        sec = Security.objects.create(symbol="A", exchange="NASDAQ", currency="USD")
        WatchlistEntry.objects.create(security=sec)
        run = run_composite_screen_against_watchlist([rs1, rs2])
        self.assertEqual(run.status, "ok")
        self.assertEqual(len(run.rule_set.rules), 2)

    def test_rule_sets_for_brief_slugs_preserves_order(self):
        save_briefing_check("net_margin", 0.1)
        save_briefing_check("gross_margin", 0.4)
        selected = rule_sets_for_brief_slugs(["gross_margin", "net_margin", "quick_ratio"])
        self.assertEqual([rs.brief_slug for rs in selected], ["gross_margin", "net_margin"])

    def test_build_briefing_rows_prefetches_pass_counts(self):
        from vybcheq.models import ScreenResult, ScreenRun

        rs = save_briefing_check("gross_margin", 0.4)
        sec = Security.objects.create(symbol="A", exchange="NASDAQ", currency="USD")
        run = ScreenRun.objects.create(rule_set=rs, status=ScreenRun.Status.OK)
        ScreenResult.objects.create(run=run, security=sec, passed=True, score=100)
        with self.assertNumQueries(1):
            rows = build_briefing_rows([rs])
        gross = next(r for r in rows if r.slug == "gross_margin")
        self.assertEqual(gross.last_run_pass_count, 1)
        self.assertEqual(gross.last_run_total, 1)
