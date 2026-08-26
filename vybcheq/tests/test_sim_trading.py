from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from vybcheq.models import CheqAccount, PositionMark, Security, SimPosition
from vybcheq.sim_trading import (
    aggregate_open_positions,
    close_all_open_positions_for_security,
    close_position,
    close_shares,
    get_or_create_cheq_account,
    open_position,
    portfolio_open_totals,
    record_marks_for_user_open_positions,
)


class SimTradingLogicTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("simu", "sim@test.local", "pw", is_staff=True)
        self.sec = Security.objects.create(symbol="NVDA", exchange="NASDAQ", currency="USD")

    def _set_cached_quote(self, price: Decimal):
        now = timezone.now()
        Security.objects.filter(pk=self.sec.pk).update(
            quote_last_price=price,
            quote_updated_at=now,
        )

    def test_open_position_requires_cached_quote(self):
        get_or_create_cheq_account(self.user)
        with self.assertRaises(ValueError) as ctx:
            open_position(self.user, self.sec, cheqs=Decimal("1"))
        self.assertIn("cached quote", str(ctx.exception).lower())

    def test_open_position_deducts_and_creates_shares(self):
        self._set_cached_quote(Decimal("100"))
        get_or_create_cheq_account(self.user)
        pos = open_position(self.user, self.sec, cheqs=Decimal("500"))
        self.assertEqual(pos.cheqs_opened, Decimal("500"))
        self.assertEqual(pos.entry_price, Decimal("100"))
        self.assertEqual(pos.shares, Decimal("5"))
        acct = CheqAccount.objects.get(user=self.user)
        self.assertEqual(acct.balance, Decimal("9500"))
        self.assertEqual(PositionMark.objects.filter(position=pos).count(), 1)

    def test_open_position_price_multiple(self):
        self._set_cached_quote(Decimal("100"))
        get_or_create_cheq_account(self.user)
        pos = open_position(self.user, self.sec, price_multiple=Decimal("5"))
        self.assertEqual(pos.cheqs_opened, Decimal("500"))
        self.assertEqual(pos.entry_price, Decimal("100"))
        self.assertEqual(pos.shares, Decimal("5"))

    def test_open_position_requires_exactly_one_of_cheqs_or_multiple(self):
        get_or_create_cheq_account(self.user)
        with self.assertRaises(ValueError):
            open_position(self.user, self.sec)
        with self.assertRaises(ValueError):
            open_position(
                self.user,
                self.sec,
                cheqs=Decimal("1"),
                price_multiple=Decimal("1"),
            )

    def test_open_insufficient_cheqs(self):
        self._set_cached_quote(Decimal("100"))
        get_or_create_cheq_account(self.user)
        CheqAccount.objects.filter(user=self.user).update(balance=Decimal("10"))
        with self.assertRaises(ValueError):
            open_position(self.user, self.sec, cheqs=Decimal("500"))

    def test_close_credits_proceeds(self):
        self._set_cached_quote(Decimal("100"))
        get_or_create_cheq_account(self.user)
        pos = open_position(self.user, self.sec, cheqs=Decimal("500"))
        Security.objects.filter(pk=self.sec.pk).update(quote_last_price=Decimal("120"))
        closed = close_position(self.user, pos.pk)
        self.assertIsNotNone(closed.closed_at)
        self.assertEqual(closed.cheqs_proceeds, Decimal("600"))
        acct = CheqAccount.objects.get(user=self.user)
        self.assertEqual(acct.balance, Decimal("10100"))

    def test_record_marks_appends_rows(self):
        self._set_cached_quote(Decimal("100"))
        get_or_create_cheq_account(self.user)
        pos = open_position(self.user, self.sec, cheqs=Decimal("100"))
        n, errs = record_marks_for_user_open_positions(self.user)
        self.assertEqual(errs, [])
        self.assertGreaterEqual(n, 1)
        self.assertGreaterEqual(PositionMark.objects.filter(position=pos).count(), 2)

    def test_aggregate_open_positions_by_security(self):
        self._set_cached_quote(Decimal("100"))
        get_or_create_cheq_account(self.user)
        open_position(self.user, self.sec, cheqs=Decimal("500"))
        open_position(self.user, self.sec, cheqs=Decimal("200"))
        rows = aggregate_open_positions(self.user)
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual(row.security, self.sec)
        self.assertEqual(row.shares, Decimal("7"))
        self.assertEqual(row.cheqs_opened, Decimal("700"))
        self.assertEqual(row.lot_count, 2)
        self.assertEqual(row.mark_value_cheqs, Decimal("700"))

    def test_portfolio_open_totals(self):
        self._set_cached_quote(Decimal("100"))
        get_or_create_cheq_account(self.user)
        open_position(self.user, self.sec, cheqs=Decimal("500"))
        Security.objects.filter(pk=self.sec.pk).update(quote_last_price=Decimal("110"))
        totals = portfolio_open_totals(user=self.user)
        self.assertEqual(totals["investment_value"], Decimal("550.00"))
        self.assertEqual(totals["cost_basis"], Decimal("500.00"))
        self.assertEqual(totals["total_return"], Decimal("50.00"))

    def test_close_all_open_positions_for_security(self):
        self._set_cached_quote(Decimal("100"))
        get_or_create_cheq_account(self.user)
        open_position(self.user, self.sec, cheqs=Decimal("500"))
        open_position(self.user, self.sec, cheqs=Decimal("200"))
        Security.objects.filter(pk=self.sec.pk).update(quote_last_price=Decimal("120"))
        closed = close_all_open_positions_for_security(self.user, self.sec)
        self.assertEqual(len(closed), 2)
        self.assertEqual(sum(p.cheqs_proceeds for p in closed), Decimal("840"))
        self.assertEqual(aggregate_open_positions(self.user), [])

    def test_close_partial_shares(self):
        self._set_cached_quote(Decimal("100"))
        get_or_create_cheq_account(self.user)
        open_position(self.user, self.sec, cheqs=Decimal("1000"))
        Security.objects.filter(pk=self.sec.pk).update(quote_last_price=Decimal("120"))
        result = close_shares(self.user, self.sec, Decimal("3"))
        self.assertEqual(result.shares_sold, Decimal("3"))
        self.assertEqual(result.total_proceeds, Decimal("360.00"))
        rows = aggregate_open_positions(self.user)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].shares, Decimal("7"))
        self.assertEqual(SimPosition.objects.filter(parent_position__isnull=False).count(), 1)
