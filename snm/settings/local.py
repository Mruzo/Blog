from .base import *

DEBUG = True

ALLOWED_HOSTS = ['127.0.0.1']

CSRF_COOKIE_SECURE = False

SECURE_SSL_REDIRECT = False

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
    }
}

STATIC_URL = '/static/'
