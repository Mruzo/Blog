from django.test import TestCase

from vybcheq.market_symbols import MarketSymbolError, external_symbol_for_security
from vybcheq.models import Security


class ExternalSymbolTests(TestCase):
    def test_us_nasdaq_uses_plain_symbol(self):
        s = Security(symbol="NVDA", exchange="NASDAQ", currency="USD")
        self.assertEqual(external_symbol_for_security(s), "NVDA")

    def test_tsx_adds_to_suffix(self):
        s = Security(symbol="SHOP", exchange="TSX", currency="CAD")
        self.assertEqual(external_symbol_for_security(s), "SHOP.TO")

    def test_empty_symbol_raises(self):
        s = Security(symbol="", exchange="NYSE", currency="USD")
        with self.assertRaises(MarketSymbolError):
            external_symbol_for_security(s)
