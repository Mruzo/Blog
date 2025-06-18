from configparser import RawConfigParser
from .base import *

DEBUG = False

# ADMINS = (
#     ('Chris U', 'chrisuzoewulu@gmail.com'),
# )

ALLOWED_HOSTS = ['www.misteruzo.com', '68.183.196.123', 'misteruzo.com']

CSRF_COOKIE_SECURE = True

SECURE_SSL_REDIRECT = True

config = RawConfigParser()
config.read('/etc/snmov/settings.ini')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config.get('section', 'SM_DB_NAME'),
        'USER': config.get('section', 'SM_DB_USER'),
        'PASSWORD': config.get('section', 'SM_DB_PASS'),
        'HOST': 'localhost',
        'PORT': '5434',
    }
}

# AWS S3 Configuration
AWS_ACCESS_KEY_ID = config.get('section','S3_KEY_ID')
AWS_SECRET_ACCESS_KEY = config.get('section', 'S3_SCRT_KEY')
AWS_STORAGE_BUCKET_NAME = config.get('section', 'S3_BUCKET_NAME')
AWS_S3_REGION_NAME = 'us-east-1'
AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = None
AWS_S3_VERIFY = True
AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'

# Static files configuration
STATICFILES_STORAGE = 'storages.backends.s3boto3.S3StaticStorage'
STATIC_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/static/'

# Media files configuration
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'

# Cache control
AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400',
}

STATICFILES_FINDERS = [
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
]
