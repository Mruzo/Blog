"""
Scoped API rate throttles for abuse-prone endpoints.

Rates are configured in REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']
(overridden per environment in settings/pro.py).
"""
from rest_framework.throttling import SimpleRateThrottle


class IpScopedRateThrottle(SimpleRateThrottle):
    """Throttle by client IP for a named scope (works for anon and authenticated)."""

    scope = None  # subclasses must set

    def get_cache_key(self, request, view):
        if self.scope is None:
            return None
        ident = self.get_ident(request)
        if not ident:
            return None
        return self.cache_format % {'scope': self.scope, 'ident': ident}


class PasswordResetRateThrottle(IpScopedRateThrottle):
    scope = 'password_reset'


class RegisterRateThrottle(IpScopedRateThrottle):
    scope = 'register'


class CheckoutRateThrottle(IpScopedRateThrottle):
    scope = 'checkout'


class NewsletterSubscribeRateThrottle(IpScopedRateThrottle):
    scope = 'newsletter'


class ContactFormRateThrottle(IpScopedRateThrottle):
    """DRF layer on top of the existing cache-based contact limit."""
    scope = 'contact'
