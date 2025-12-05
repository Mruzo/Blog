from configparser import RawConfigParser
from .base import *

DEBUG = False

# ADMINS = (
#     ('Chris U', 'chrisuzoewulu@gmail.com'),
# )

ALLOWED_HOSTS = ['www.justvybz.com', 'justvybz.com']

CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Strict'

SECURE_SSL_REDIRECT = True

# Security Headers (OWASP, NIST Compliance)
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# Content Security Policy (CSP) - Adjust based on your needs
# Note: This is a basic CSP - you may need to adjust for your specific requirements
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "'unsafe-inline'", "https://js.stripe.com", "https://checkout.stripe.com")
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'", "https://fonts.googleapis.com")
CSP_FONT_SRC = ("'self'", "https://fonts.gstatic.com")
CSP_IMG_SRC = ("'self'", "data:", "https:", "*.s3.amazonaws.com")
CSP_CONNECT_SRC = ("'self'", "https://api.stripe.com", "https://checkout.stripe.com")
CSP_FRAME_SRC = ("'self'", "https://js.stripe.com", "https://checkout.stripe.com")

# Session Security
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Strict'
SESSION_COOKIE_AGE = 86400  # 24 hours
SESSION_EXPIRE_AT_BROWSER_CLOSE = True

config = RawConfigParser()
config.read('/etc/vybz/settings.ini')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': config.get('section', 'VYBZ_DB_NAME'),
        'USER': config.get('section', 'VYBZ_DB_USER'),
        'PASSWORD': config.get('section', 'VYBZ_DB_PASSWORD'),
        'HOST': 'localhost',
        'PORT': '',
    }
}

AWS_ACCESS_KEY_ID = config.get('section', 'VYBZ_KEY_ID')
AWS_SECRET_ACCESS_KEY = config.get('section', 'VYBZ_SCRT_KEY')
AWS_STORAGE_BUCKET_NAME = config.get('section', 'VYBZ_BUCKET_NAME')

AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = None

AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400',
}

DEFAULT_FILE_STORAGE = 'snm.storage_backends.MediaStorage'

AWS_S3_CUSTOM_DOMAIN = '%s.s3.amazonaws.com' % AWS_STORAGE_BUCKET_NAME
AWS_LOCATION = 'static'
STATIC_URL = 'https://%s/%s/' % (AWS_S3_CUSTOM_DOMAIN, AWS_LOCATION)

STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

# Canada Post Developer Portal API Configuration - Production
# Override base settings to use PRODUCTION credentials
CANADAPOST_USE_PRODUCTION = True
CANADAPOST_KEY_NUMBER = CANADAPOST_PRODUCTION_KEY_NUMBER
CANADAPOST_CUSTOMER_NUMBER = CANADAPOST_PRODUCTION_CUSTOMER_NUMBER
