"""
Security utilities for PCI DSS, OWASP, GDPR, and NIST compliance.
"""
import logging
import sys
from django.core.cache import cache
from django.utils import timezone
from django.dispatch import receiver
import hashlib
import hmac

logger = logging.getLogger(__name__)


def get_client_ip(request):
    """Get client IP address for rate limiting and logging"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '0.0.0.0')
    return ip


def rate_limit_check(request, key_prefix, max_requests, window_seconds=3600):
    """
    Rate limiting utility for API endpoints.
    
    Args:
        request: Django request object
        key_prefix: Unique prefix for the rate limit key
        max_requests: Maximum number of requests allowed
        window_seconds: Time window in seconds (default: 1 hour)
    
    Returns:
        tuple: (is_allowed: bool, remaining_requests: int, reset_time: int)
    """
    client_ip = get_client_ip(request)
    user_id = request.user.id if request.user.is_authenticated else None
    
    # Create rate limit key
    if user_id:
        rate_limit_key = f'{key_prefix}_user_{user_id}'
    else:
        rate_limit_key = f'{key_prefix}_ip_{client_ip}'
    
    # Get current count
    current_count = cache.get(rate_limit_key, 0)
    
    if current_count >= max_requests:
        # Log rate limit violation
        log_security_event(
            event_type='rate_limit_exceeded',
            request=request,
            details={
                'key_prefix': key_prefix,
                'current_count': current_count,
                'max_requests': max_requests,
            }
        )
        return False, 0, cache.ttl(rate_limit_key)
    
    # Increment counter
    cache.set(rate_limit_key, current_count + 1, window_seconds)
    remaining = max_requests - (current_count + 1)
    reset_time = cache.ttl(rate_limit_key)
    
    return True, remaining, reset_time


def log_security_event(event_type, request=None, details=None, user=None, severity='INFO'):
    """
    Log security events for monitoring and compliance (NIST, PCI DSS).
    
    Args:
        event_type: Type of security event (e.g., 'login_failed', 'rate_limit_exceeded')
        request: Django request object (optional)
        details: Additional event details (dict)
        user: User object (if applicable)
        severity: Log severity ('INFO', 'WARNING', 'ERROR', 'CRITICAL')
    """
    # Skip database logging in test environment to avoid transaction issues
    skip_db_logging = 'test' in sys.argv if 'sys' in globals() else False
    
    if request:
        client_ip = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
        path = getattr(request, 'path', '')
        method = getattr(request, 'method', '')
    else:
        client_ip = details.get('ip', '0.0.0.0') if details else '0.0.0.0'
        user_agent = details.get('user_agent', 'Unknown') if details else 'Unknown'
        path = details.get('path', '') if details else ''
        method = details.get('method', '') if details else ''
    
    log_data = {
        'event_type': event_type,
        'timestamp': timezone.now().isoformat(),
        'ip_address': client_ip,
        'user_agent': user_agent,
        'path': path,
        'method': method,
        'user_id': user.id if user else None,
        'username': user.username if user else None,
        'details': details or {},
    }
    
    # Log based on severity
    if severity == 'CRITICAL':
        logger.critical(f"Security Event: {event_type}", extra=log_data)
    elif severity == 'ERROR':
        logger.error(f"Security Event: {event_type}", extra=log_data)
    elif severity == 'WARNING':
        logger.warning(f"Security Event: {event_type}", extra=log_data)
    else:
        logger.info(f"Security Event: {event_type}", extra=log_data)
    
    # Store in database for compliance (if SecurityLog model exists and not in test mode)
    if not skip_db_logging:
        try:
            from snmov.models import SecurityLog
            SecurityLog.objects.create(
                event_type=event_type,
                ip_address=client_ip if client_ip != '0.0.0.0' else None,
                user_agent=user_agent or '',
                path=path or '',
                method=method or '',
                user=user,
                details=details or {},
                severity=severity,
            )
        except ImportError:
            # Model doesn't exist yet, just log
            pass
        except Exception as e:
            # Don't fail if logging fails
            logger.error(f"Failed to save security log: {e}")


def validate_file_upload(file, allowed_types=None, max_size_mb=50):
    """
    Validate file uploads for security (OWASP A08).
    
    Args:
        file: Uploaded file object
        allowed_types: List of allowed MIME types or extensions
        max_size_mb: Maximum file size in MB
    
    Returns:
        tuple: (is_valid: bool, error_message: str)
    """
    if not file:
        return False, "No file provided"
    
    # Check file size
    max_size_bytes = max_size_mb * 1024 * 1024
    if file.size > max_size_bytes:
        return False, f"File size exceeds {max_size_mb}MB limit"
    
    # Check file type
    if allowed_types:
        file_extension = file.name.split('.')[-1].lower() if '.' in file.name else ''
        content_type = getattr(file, 'content_type', '')
        
        # Check extension
        if file_extension not in [ext.lower().replace('.', '') for ext in allowed_types]:
            return False, f"File type not allowed. Allowed types: {', '.join(allowed_types)}"
        
        # Check MIME type if available
        if content_type and allowed_types:
            # Basic MIME type validation
            allowed_mime_types = {
                '.glb': ['model/gltf-binary', 'application/octet-stream'],
                '.usdz': ['model/usd', 'application/octet-stream'],
                '.gltf': ['model/gltf+json', 'application/json'],
                '.jpg': ['image/jpeg'],
                '.jpeg': ['image/jpeg'],
                '.png': ['image/png'],
                '.gif': ['image/gif'],
            }
            
            ext = f'.{file_extension}'
            if ext in allowed_mime_types and content_type not in allowed_mime_types[ext]:
                return False, f"File MIME type mismatch. Expected {allowed_mime_types[ext]}"
    
    return True, ""


def sanitize_filename(filename):
    """
    Sanitize filename to prevent directory traversal and other attacks.
    
    Args:
        filename: Original filename
    
    Returns:
        str: Sanitized filename
    """
    import os
    # Remove path components
    filename = os.path.basename(filename)
    # Remove dangerous characters
    dangerous_chars = ['..', '/', '\\', '\x00']
    for char in dangerous_chars:
        filename = filename.replace(char, '')
    return filename


# Signal handlers for authentication events
def register_security_signals():
    """Register security signal handlers"""
    from django.contrib.auth.signals import user_logged_in, user_login_failed
    
    @receiver(user_login_failed)
    def log_failed_login(sender, credentials, request, **kwargs):
        """Log failed login attempts (OWASP A07, NIST)"""
        if request:
            log_security_event(
                event_type='login_failed',
                request=request,
                details={'username': credentials.get('username', 'unknown')},
                severity='WARNING'
            )
            
            # Check for brute force attempts
            client_ip = get_client_ip(request)
            failed_login_key = f'failed_login_{client_ip}'
            failed_count = cache.get(failed_login_key, 0) + 1
            cache.set(failed_login_key, failed_count, 3600)  # 1 hour window
            
            # If too many failed attempts, log as critical
            if failed_count >= 5:
                log_security_event(
                    event_type='brute_force_attempt',
                    request=request,
                    details={'failed_attempts': failed_count},
                    severity='CRITICAL'
                )
    
    @receiver(user_logged_in)
    def log_successful_login(sender, request, user, **kwargs):
        """Log successful login (NIST, PCI DSS)"""
        if request:
            log_security_event(
                event_type='login_success',
                request=request,
                user=user,
                severity='INFO'
            )
            
            # Reset failed login counter
            client_ip = get_client_ip(request)
            failed_login_key = f'failed_login_{client_ip}'
            cache.delete(failed_login_key)

