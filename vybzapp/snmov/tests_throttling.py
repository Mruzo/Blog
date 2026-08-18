"""Scoped throttle configuration / decorator smoke tests."""
from django.test import SimpleTestCase
from django.conf import settings

from snm.settings import base as base_settings
from snmov.throttling import (
    CheckoutRateThrottle,
    ContactFormRateThrottle,
    NewsletterSubscribeRateThrottle,
    PasswordResetRateThrottle,
    RegisterRateThrottle,
)


class ThrottleScopeTests(SimpleTestCase):
    def test_scopes_are_configured_in_base_settings(self):
        rates = base_settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']
        for scope in ('password_reset', 'register', 'checkout', 'newsletter', 'contact', 'anon', 'user'):
            self.assertIn(scope, rates)

    def test_active_settings_include_scoped_rates(self):
        rates = settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']
        for scope in ('password_reset', 'register', 'checkout', 'newsletter', 'contact'):
            self.assertIn(scope, rates)

    def test_throttle_classes_declare_expected_scopes(self):
        self.assertEqual(PasswordResetRateThrottle.scope, 'password_reset')
        self.assertEqual(RegisterRateThrottle.scope, 'register')
        self.assertEqual(CheckoutRateThrottle.scope, 'checkout')
        self.assertEqual(NewsletterSubscribeRateThrottle.scope, 'newsletter')
        self.assertEqual(ContactFormRateThrottle.scope, 'contact')


class ProductionStyleThrottleRatesTests(SimpleTestCase):
    def test_production_module_defines_tighter_rates(self):
        from snm.settings import pro as pro_settings
        rates = pro_settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']
        self.assertEqual(rates['anon'], '60/hour')
        self.assertEqual(rates['password_reset'], '5/hour')
        self.assertEqual(rates['checkout'], '15/hour')
        self.assertEqual(rates['register'], '8/hour')
