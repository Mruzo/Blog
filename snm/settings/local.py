from .base import *

DEBUG = True

ALLOWED_HOSTS = ['127.0.0.1', '45ca-2607-fea8-60d8-ad20-aa5e-45ff-fee4-e701.ngrok-free.app']

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
