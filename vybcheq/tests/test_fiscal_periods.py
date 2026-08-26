from datetime import date

from django.test import SimpleTestCase, override_settings

from vybcheq.fiscal_periods import (
    calendar_quarter_end,
    calendar_quarter_ends_between,
    configured_quarterly_row_limit,
    pick_bar_on_or_before,
)


class FiscalPeriodTests(SimpleTestCase):
    def test_calendar_quarter_end(self):
        self.assertEqual(calendar_quarter_end(date(2024, 1, 15)), date(2024, 3, 31))
        self.assertEqual(calendar_quarter_end(date(2024, 8, 2)), date(2024, 9, 30))

    def test_quarter_ends_between(self):
        ends = calendar_quarter_ends_between(date(2024, 1, 1), date(2024, 12, 31))
        self.assertEqual(
            ends,
            [date(2024, 3, 31), date(2024, 6, 30), date(2024, 9, 30), date(2024, 12, 31)],
        )

    def test_pick_bar_on_or_before(self):
        rows = {
            date(2024, 3, 28): {"close": 100},
            date(2024, 3, 29): {"close": 101},
        }
        sorted_dates = sorted(rows)
        picked = pick_bar_on_or_before(sorted_dates, rows, date(2024, 3, 31))
        self.assertEqual(picked, (date(2024, 3, 29), {"close": 101}))

    @override_settings(VYBCHEQ_FMP_EOD_YEARS=5, VYBCHEQ_FMP_QUARTERLY_LIMIT=5)
    def test_quarterly_row_limit_capped_for_free_tier(self):
        self.assertEqual(configured_quarterly_row_limit(), 5)

    @override_settings(VYBCHEQ_FMP_EOD_YEARS=5, VYBCHEQ_FMP_QUARTERLY_LIMIT=40)
    def test_quarterly_row_limit_respects_paid_cap(self):
        self.assertEqual(configured_quarterly_row_limit(), 20)
