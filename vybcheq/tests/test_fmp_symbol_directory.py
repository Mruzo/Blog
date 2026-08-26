from unittest.mock import patch

from django.test import TestCase, override_settings

from vybcheq.fmp_symbol_directory import (
    add_directory_entry_to_catalog,
    is_us_major_exchange,
    load_builtin_us_symbol_directory,
    normalize_fmp_exchange,
    parse_fmp_directory_row,
    sync_fmp_symbol_directory,
    vybcheq_symbol_exchange,
)
from vybcheq.models import FmpDirectoryMeta, FmpFinancialSymbol, Security, WatchlistEntry


class FmpSymbolDirectoryParseTests(TestCase):
    def test_us_row_with_metadata(self):
        entry = parse_fmp_directory_row(
            {
                "symbol": "NVDA",
                "name": "NVIDIA Corporation",
                "currency": "USD",
                "exchangeShortName": "NASDAQ",
                "stockExchange": "NASDAQ Global Select",
                "country": "US",
                "type": "stock",
            }
        )
        self.assertIsNotNone(entry)
        assert entry is not None
        self.assertEqual(entry.fmp_symbol, "NVDA")
        self.assertEqual(entry.symbol, "NVDA")
        self.assertEqual(entry.exchange, "NASDAQ")
        self.assertTrue(entry.is_us_major)
        self.assertEqual(entry.currency, "USD")
        self.assertEqual(entry.symbol_type, "stock")

    def test_canadian_row_not_us_major(self):
        entry = parse_fmp_directory_row(
            {
                "symbol": "DFN.TO",
                "name": "Dividend 15 Split Corp",
                "currency": "CAD",
                "exchangeShortName": "TSX",
            }
        )
        self.assertIsNotNone(entry)
        assert entry is not None
        self.assertEqual(entry.symbol, "DFN")
        self.assertEqual(entry.exchange, "TSX")
        self.assertFalse(entry.is_us_major)

    def test_plain_symbol_without_exchange_defaults_us(self):
        entry = parse_fmp_directory_row({"symbol": "AAPL"})
        self.assertIsNotNone(entry)
        assert entry is not None
        self.assertEqual(entry.symbol, "AAPL")
        self.assertEqual(entry.exchange, "NASDAQ")
        self.assertTrue(entry.is_us_major)

    def test_exchange_normalization(self):
        self.assertEqual(normalize_fmp_exchange("NYSE", ""), "NYSE")
        self.assertEqual(normalize_fmp_exchange("", "Toronto Stock Exchange"), "TSX")
        self.assertTrue(is_us_major_exchange("NASDAQ"))

    def test_vybcheq_symbol_exchange_suffixes(self):
        self.assertEqual(vybcheq_symbol_exchange("SHOP.TO"), ("SHOP", "TSX"))


@override_settings(VYBCHEQ_FMP_API_KEY="test-key")
class FmpSymbolDirectorySyncTests(TestCase):
    def test_load_builtin_seed(self):
        counts = load_builtin_us_symbol_directory()
        self.assertGreater(counts["total"], 50)
        self.assertEqual(counts["endpoint"], "builtin:us-major-seed")
        self.assertEqual(FmpFinancialSymbol.objects.filter(symbol="NVDA").count(), 1)
        meta = FmpDirectoryMeta.get_solo()
        self.assertIsNotNone(meta.synced_at)

    @patch("vybcheq.fmp_symbol_directory.fmp_get")
    def test_sync_uses_stock_list(self, mock_get):
        mock_get.return_value = [
            {
                "symbol": "AAPL",
                "name": "Apple Inc.",
                "currency": "USD",
                "exchangeShortName": "NASDAQ",
                "type": "stock",
            },
            {
                "symbol": "DFN.TO",
                "name": "Dividend 15 Split Corp",
                "currency": "CAD",
                "exchangeShortName": "TSX",
            },
        ]
        counts = sync_fmp_symbol_directory()
        self.assertEqual(counts["total"], 2)
        self.assertEqual(counts["us"], 1)
        self.assertEqual(counts["foreign"], 1)
        self.assertEqual(counts["endpoint"], "stock-list")
        mock_get.assert_called_once()
        self.assertIn("stock-list", mock_get.call_args[0][0])

    @patch("vybcheq.fmp_symbol_directory.fmp_get")
    def test_sync_falls_back_when_stock_list_restricted(self, mock_get):
        from vybcheq.fmp_client import FmpError

        mock_get.side_effect = [
            FmpError("FMP plan limit reached (402). Restricted Endpoint"),
            [
                {
                    "symbol": "MSFT",
                    "name": "Microsoft Corporation",
                    "exchangeShortName": "NASDAQ",
                }
            ],
        ]
        counts = sync_fmp_symbol_directory()
        self.assertEqual(counts["total"], 1)
        self.assertEqual(counts["endpoint"], "financial-statement-symbol-list")
        self.assertEqual(mock_get.call_count, 2)

    @patch("vybcheq.fmp_symbol_directory.fmp_get")
    def test_add_directory_entry_to_watchlist(self, mock_get):
        mock_get.return_value = [
            {
                "symbol": "MSFT",
                "name": "Microsoft Corporation",
                "currency": "USD",
                "exchangeShortName": "NASDAQ",
            }
        ]
        sync_fmp_symbol_directory()
        entry = FmpFinancialSymbol.objects.get(fmp_symbol="MSFT")
        security, created, watchlist_created = add_directory_entry_to_catalog(entry)
        self.assertTrue(created)
        self.assertTrue(watchlist_created)
        self.assertEqual(security.symbol, "MSFT")
        self.assertTrue(WatchlistEntry.objects.filter(security=security).exists())

    @patch("vybcheq.fmp_symbol_directory.fmp_get")
    def test_sync_handles_string_rows(self, mock_get):
        mock_get.return_value = ["ZZZ", "AAA"]
        counts = sync_fmp_symbol_directory()
        self.assertEqual(counts["total"], 2)
        self.assertEqual(FmpFinancialSymbol.objects.filter(fmp_symbol="AAA").count(), 1)
