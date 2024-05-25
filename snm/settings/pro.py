from configparser import RawConfigParser
from .base import *

DEBUG = False

# ADMINS = (
#     ('Chris U', 'chrisuzoewulu@gmail.com'),
# )

ALLOWED_HOSTS = ['68.183.196.123', 'www.misteruzo.com', 'misteruzo.com', 'localhost']

CSRF_COOKIE_SECURE = True

SECURE_SSL_REDIRECT = True

config = RawConfigParser()
config.read('/etc/snmov/settings.ini')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': config.get('section', 'SM_DB_NAME'),
        'USER': config.get('section', 'SM_DB_USER'),
        'PASSWORD': config.get('section', 'SM_DB_PASS'),
        'HOST': 'localhost',
        'PORT': '',
    }
}

AWS_ACCESS_KEY_ID = config.get('section','S3_KEY_ID')
AWS_SECRET_ACCESS_KEY = config.get('section', 'S3_SCRT_KEY')
AWS_STORAGE_BUCKET_NAME = config.get('section', 'S3_BUCKET_NAME')

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
