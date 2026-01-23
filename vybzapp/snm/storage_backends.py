from storages.backends.s3boto3 import S3Boto3Storage


class MediaStorage(S3Boto3Storage):
    location = 'media'
    file_overwrite = False
    # Bucket uses "Bucket owner enforced" - ACLs are completely disabled
    # Access controlled via bucket policy only


class StaticStorage(S3Boto3Storage):
    location = 'static'
    # Bucket uses "Bucket owner enforced" - ACLs are completely disabled
    # Access controlled via bucket policy (which allows public read for static/*)
    
    def _save(self, name, content):
        """
        Override _save to ensure ACL parameter is never passed to boto3.
        Bucket uses "Bucket owner enforced" which doesn't allow ACLs.
        """
        # Temporarily remove default_acl if it exists to prevent ACL errors
        original_default_acl = getattr(self, 'default_acl', None)
        if hasattr(self, 'default_acl'):
            delattr(self, 'default_acl')
        
        try:
            result = super()._save(name, content)
        finally:
            # Restore original value if it existed
            if original_default_acl is not None:
                self.default_acl = original_default_acl
        
        return result