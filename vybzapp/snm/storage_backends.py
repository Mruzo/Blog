from storages.backends.s3boto3 import S3Boto3Storage


class MediaStorage(S3Boto3Storage):
    location = 'media'
    file_overwrite = False
    default_acl = 'private'  # Media files should be private


class StaticStorage(S3Boto3Storage):
    location = 'static'
    default_acl = 'public-read'  # Static files should be publicly accessible