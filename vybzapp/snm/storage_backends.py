from storages.backends.s3boto3 import S3Boto3Storage


class MediaStorage(S3Boto3Storage):
    location = 'media'
    file_overwrite = False
    # Bucket uses "Bucket owner enforced" - ACLs are completely disabled
    # Access controlled via bucket policy only


class StaticStorage(S3Boto3Storage):
    location = 'static'
    default_acl = None  # Must be None (not missing) - bucket uses "Bucket owner enforced" which disables ACLs
    # Access controlled via bucket policy (which allows public read for static/*)
    
    def _get_write_parameters(self, name, content):
        """
        Override to ensure ACL parameter is never included in upload params.
        Bucket uses "Bucket owner enforced" which doesn't allow ACLs.
        """
        params = super()._get_write_parameters(name, content)
        # Remove ACL from params if it exists (bucket doesn't support ACLs)
        params.pop('ACL', None)
        return params