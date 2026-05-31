from django.test import TestCase

from vybcheq.models import ScreeningRuleSet
from vybcheq.rule_set_briefing import BRIEFING_CATALOG, build_briefing_rows, extended_rule_sets


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
