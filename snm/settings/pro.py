from configparser import RawConfigParser
from .base import *

DEBUG = False

# ADMINS = (
#     ('Chris U', 'chrisuzoewulu@gmail.com'),
# )

ALLOWED_HOSTS = ['www.adamaduka.com', 'adamaduka.com']

CSRF_COOKIE_SECURE = True

SECURE_SSL_REDIRECT = True

config = RawConfigParser()
config.read('/etc/vybz/settings.ini')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': config.get('section', 'ADA_DB_NAME'),
        'USER': config.get('section', 'ADA_DB_USER'),
        'PASSWORD': config.get('section', 'ADA_DB_PASSWORD'),
        'HOST': 'localhost',
        'PORT': '',
    }
}

AWS_ACCESS_KEY_ID = config.get('section', 'ADA_KEY_ID')
AWS_SECRET_ACCESS_KEY = config.get('section', 'ADA_SCRT_KEY')
AWS_STORAGE_BUCKET_NAME = config.get('section', 'ADA_BUCKET_NAME')

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
