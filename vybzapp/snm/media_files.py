"""Read/write uploaded media via DEFAULT_FILE_STORAGE (local disk or S3)."""
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.http import FileResponse
from django.shortcuts import redirect

PRIVATE_MEDIA_PRESIGNED_EXPIRY = 300  # 5 minutes


def media_exists(relative_path):
    return bool(relative_path) and default_storage.exists(relative_path.lstrip('/'))


def save_media_bytes(relative_path, data):
    """Save bytes at a path relative to media root; overwrite if present."""
    relative_path = relative_path.lstrip('/')
    if default_storage.exists(relative_path):
        default_storage.delete(relative_path)
    default_storage.save(relative_path, ContentFile(data))
    return relative_path


def media_url(relative_path):
    if not relative_path:
        return None
    return default_storage.url(relative_path.lstrip('/'))


def _media_s3_object_key(relative_path):
    relative_path = relative_path.lstrip('/')
    location = getattr(default_storage, 'location', None) or ''
    if location:
        return f'{location}/{relative_path}'
    return relative_path


def _uses_s3_media_storage():
    return bool(getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None))


def media_presigned_download_url(relative_path, expires_in=PRIVATE_MEDIA_PRESIGNED_EXPIRY):
    """Return a short-lived S3 presigned GET URL, or None when not on S3."""
    if not _uses_s3_media_storage() or not media_exists(relative_path):
        return None

    import boto3

    client = boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1'),
    )
    return client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
            'Key': _media_s3_object_key(relative_path),
        },
        ExpiresIn=expires_in,
    )


def media_pdf_response(relative_path, download_filename):
    if not media_exists(relative_path):
        return None
    return FileResponse(
        default_storage.open(relative_path.lstrip('/'), 'rb'),
        content_type='application/pdf',
        filename=download_filename,
    )


def private_media_pdf_download(relative_path, download_filename, expires_in=PRIVATE_MEDIA_PRESIGNED_EXPIRY):
    """Auth-gated downloads: presigned S3 redirect in prod, stream locally in dev."""
    signed_url = media_presigned_download_url(relative_path, expires_in=expires_in)
    if signed_url:
        return redirect(signed_url)
    return media_pdf_response(relative_path, download_filename)
