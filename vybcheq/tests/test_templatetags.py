from decimal import Decimal

from django.template import Context, Template
from django.test import SimpleTestCase


class FormatCheqsFilterTests(SimpleTestCase):
    def test_commas_and_two_decimals(self):
        t = Template("{% load vybcheq_tags %}{{ v|format_cheqs }}")
        self.assertEqual(t.render(Context({"v": Decimal("100000")})), "100,000.00")
        self.assertEqual(t.render(Context({"v": Decimal("1234.5")})), "1,234.50")
        self.assertEqual(t.render(Context({"v": Decimal("-99.999")})), "-100.00")


class FormatScreeningRuleFilterTests(SimpleTestCase):
    def test_rule_line(self):
        t = Template("{% load vybcheq_tags %}{{ r|format_screening_rule }}")
        out = t.render(
            Context({"r": {"metric": "pe_ratio", "op": "<=", "value": 25}})
        )
        self.assertEqual(out, "P/E (trailing) ≤ 25")


class MetricsSnapshotRowsFilterTests(SimpleTestCase):
    def test_skips_internal_keys(self):
        t = Template(
            "{% load vybcheq_tags %}"
            "{% for m in snap|metrics_snapshot_rows %}{{ m.label }}:{{ m.value }};{% endfor %}"
        )
        out = t.render(
            Context(
                {
                    "snap": {
                        "pe_ratio": 18.5,
                        "close": 225,
                        "_raw": {"ratios": {}},
                        "_price_method": "pe_x_eps",
                    }
                }
            )
        )
        self.assertIn("Close / implied price:225", out)
        self.assertIn("P/E (trailing):18.5", out)
        self.assertNotIn("_raw", out)
        self.assertNotIn("_price_method", out)
