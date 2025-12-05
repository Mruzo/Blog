from .base import *

DEBUG = True

ALLOWED_HOSTS = ['127.0.0.1', 'localhost', '48da01700e28.ngrok-free.app', '192.168.2.18', '0.0.0.0']

CSRF_COOKIE_SECURE = False

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
