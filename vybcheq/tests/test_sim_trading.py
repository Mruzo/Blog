from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from vybcheq.models import CheqAccount, PositionMark, Security, SimPosition
from vybcheq.sim_trading import (
    close_position,
    get_or_create_cheq_account,
    open_position,
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
