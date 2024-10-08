from .base import *

DEBUG = True

ALLOWED_HOSTS = ['127.0.0.1', '0894-2607-9880-1d18-e2-aa5e-45ff-fee4-e701.ngrok-free.app']

CSRF_COOKIE_SECURE = False

SECURE_SSL_REDIRECT = False

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
    }
}

STATIC_URL = '/static/'
