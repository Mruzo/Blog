from decimal import Decimal

from django.test import SimpleTestCase

from vybcheq.money import format_money, quantize_money


class MoneyTests(SimpleTestCase):
    def test_quantize_money(self):
        self.assertEqual(quantize_money("171.567"), Decimal("171.57"))
        self.assertEqual(quantize_money(Decimal("99.994")), Decimal("99.99"))

    def test_format_money(self):
        self.assertEqual(format_money(Decimal("100000")), "100,000.00")
        self.assertEqual(format_money(Decimal("1234.5")), "1,234.50")
        self.assertEqual(format_money(None), "—")
