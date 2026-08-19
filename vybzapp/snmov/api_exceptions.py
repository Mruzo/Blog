"""DRF exception handling — user-safe API error payloads."""
from rest_framework.views import exception_handler


RATE_LIMIT_USER_MESSAGE = 'Too many requests. Please wait a moment and try again.'


def api_exception_handler(exc, context):
    """Return minimal, non-sensitive JSON for throttled requests."""
    response = exception_handler(exc, context)
    if response is not None and response.status_code == 429:
        payload = {'error': RATE_LIMIT_USER_MESSAGE}
        wait = getattr(exc, 'wait', None)
        if wait is not None:
            try:
                payload['reset_time'] = int(wait)
            except (TypeError, ValueError):
                pass
        response.data = payload
    return response
