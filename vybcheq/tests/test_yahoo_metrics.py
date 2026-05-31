from decimal import Decimal
from unittest.mock import ANY, patch

from django.test import TestCase

from vybcheq.models import Security
from vybcheq.yahoo_metrics import (
    YahooMetricsError,
    _last_price_from_yahoo_info,
    fetch_screening_metrics_yahoo,
    fetch_yahoo_security_data,
    yahoo_ticker_for_security,
)


class YahooTickerMappingTests(TestCase):
    def test_us_nasdaq_uses_plain_symbol(self):
        s = Security(symbol="NVDA", exchange="NASDAQ", currency="USD")
        self.assertEqual(yahoo_ticker_for_security(s), "NVDA")

    def test_tsx_adds_to_suffix(self):
        s = Security(symbol="SHOP", exchange="TSX", currency="CAD")
        self.assertEqual(yahoo_ticker_for_security(s), "SHOP.TO")

    def test_already_has_to_suffix(self):
        s = Security(symbol="SHOP.TO", exchange="TSX", currency="CAD")
        self.assertEqual(yahoo_ticker_for_security(s), "SHOP.TO")

    def test_tsxv_uses_v_suffix(self):
        s = Security(symbol="FOO", exchange="TSXV", currency="CAD")
        self.assertEqual(yahoo_ticker_for_security(s), "FOO.V")

    def test_empty_symbol_raises(self):
        s = Security(symbol="", exchange="NYSE", currency="USD")
        with self.assertRaises(YahooMetricsError):
            yahoo_ticker_for_security(s)


class FetchScreeningMetricsYahooTests(TestCase):
    @patch("yfinance.Ticker")
    def test_fetch_merges_mapped_fields(self, mock_ticker_cls):
        mock_ticker_cls.return_value.info = {
            "trailingPE": 55.0,
            "returnOnEquity": 0.44,
            "profitMargins": 0.51,
        }
        s = Security.objects.create(symbol="NVDA", exchange="NASDAQ", currency="USD")
        data = fetch_screening_metrics_yahoo(s)
        self.assertEqual(data["pe_ratio"], 55.0)
        self.assertEqual(data["roe"], 0.44)
        self.assertEqual(data["net_margin"], 0.51)
        self.assertEqual(data["_yahoo_symbol"], "NVDA")
        mock_ticker_cls.assert_called_once_with("NVDA", session=ANY)

    @patch("yfinance.Ticker")
    def test_fetch_empty_mapped_raises(self, mock_ticker_cls):
        mock_ticker_cls.return_value.info = {"shortName": "X"}
        s = Security.objects.create(symbol="ZZZZZZ", exchange="NYSE", currency="USD")
        with self.assertRaises(YahooMetricsError):
            fetch_screening_metrics_yahoo(s)


class FetchRetryTests(TestCase):
    @patch("vybcheq.yahoo_metrics.time.sleep")
    @patch("vybcheq.yahoo_metrics._fetch_screening_metrics_yahoo_once")
    def test_retries_on_rate_limit_message(self, mock_once, _mock_sleep):
        mock_once.side_effect = [
            YahooMetricsError("Too Many Requests. Rate limited."),
            {"pe_ratio": 12.0, "_yahoo_symbol": "X"},
        ]
        s = Security.objects.create(symbol="X", exchange="NYSE", currency="USD")
        data = fetch_screening_metrics_yahoo(s, max_retries=3)
        self.assertEqual(data["pe_ratio"], 12.0)
        self.assertEqual(mock_once.call_count, 2)


class FetchYahooSecurityDataTests(TestCase):
    @patch("yfinance.Ticker")
    def test_returns_metrics_and_last_price(self, mock_ticker_cls):
        mock_ticker_cls.return_value.info = {
            "trailingPE": 20.0,
            "regularMarketPrice": 142.5,
        }
        s = Security.objects.create(symbol="AAPL", exchange="NASDAQ", currency="USD")
        metrics, price = fetch_yahoo_security_data(s)
        self.assertEqual(metrics["pe_ratio"], 20.0)
        self.assertEqual(price, Decimal("142.5"))

    def test_last_price_from_info_fallback_fields(self):
        self.assertEqual(
            _last_price_from_yahoo_info({"currentPrice": 99.01}),
            Decimal("99.01"),
        )
        self.assertIsNone(_last_price_from_yahoo_info({}))
