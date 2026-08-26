from django.test import SimpleTestCase
from unittest.mock import MagicMock, patch

from vybcheq.fmp_client import FmpError, fmp_402_hint, fmp_get


class Fmp402HintTests(SimpleTestCase):
    def test_limit_parameter_hint(self):
        detail = "The values for 'limit' must be between 0 and 5"
        self.assertIn("limit", fmp_402_hint(detail).lower())
        self.assertIn("VYBCHEQ_FMP_QUARTERLY_LIMIT", fmp_402_hint(detail))

    def test_period_parameter_hint(self):
        detail = "This value set for 'period' is not available under your current subscription"
        self.assertIn("period=quarter", fmp_402_hint(detail))

    def test_generic_quota_hint(self):
        hint = fmp_402_hint("")
        self.assertIn("250", hint)


class FmpGet402Tests(SimpleTestCase):
    @patch("vybcheq.fmp_client.fmp_api_key", return_value="key")
    def test_402_limit_includes_targeted_hint(self, _mock_key):
        resp = MagicMock()
        resp.status_code = 402
        resp.json.return_value = {
            "Error Message": "Premium Query Parameter: limit must be between 0 and 5",
        }
        session = MagicMock()
        session.get.return_value = resp
        with self.assertRaises(FmpError) as ctx:
            fmp_get("https://example.com/stable/ratios", session=session, symbol="SHOP")
        self.assertIn("limit", str(ctx.exception).lower())
        self.assertIn("VYBCHEQ_FMP_QUARTERLY_LIMIT", str(ctx.exception))
