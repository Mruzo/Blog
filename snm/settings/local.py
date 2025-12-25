from .base import *

DEBUG = True

ALLOWED_HOSTS = ['127.0.0.1', 'localhost', '48da01700e28.ngrok-free.app', '192.168.2.18', '0.0.0.0']

CSRF_COOKIE_SECURE = False
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]

# Override rate limiting for development - more lenient limits
# Merge with base REST_FRAMEWORK settings
from .base import REST_FRAMEWORK as BASE_REST_FRAMEWORK
REST_FRAMEWORK = BASE_REST_FRAMEWORK.copy()
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '1000/hour',  # Increased from 100/hour for development
    'user': '10000/hour',  # Increased from 1000/hour for development
}

SECURE_SSL_REDIRECT = False

EASYSHIP_API_KEY = "sand_LifKT4lcmPBAqRdj93yX+ZtuC9TNhGCJPeYWZDCFlHk="
EASYSHIP_API_BASE = "https://api.easyship.com"

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
    }
}

STATIC_URL = '/static/'
