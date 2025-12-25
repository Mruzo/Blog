"""
Security middleware for logging and monitoring (NIST, PCI DSS compliance).
"""
import logging
from django.utils.deprecation import MiddlewareMixin
from snmov.utils.security import log_security_event, get_client_ip

logger = logging.getLogger(__name__)


class SecurityLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log security events and suspicious activities.
    Implements NIST Detect and Respond functions.
    """
    
    # Paths to exclude from logging (static files, etc.)
    EXCLUDED_PATHS = [
        '/static/',
        '/media/',
        '/favicon.ico',
        '/robots.txt',
    ]
    
    # Suspicious patterns to detect
    SUSPICIOUS_PATTERNS = [
        '../',  # Directory traversal
        '..\\',  # Directory traversal (Windows)
        '<script',  # XSS attempt
        'javascript:',  # XSS attempt
        'union select',  # SQL injection attempt
        'or 1=1',  # SQL injection attempt
    ]
    
    def process_request(self, request):
        """Log suspicious requests"""
        # Skip in test environment to avoid interfering with tests
        from django.conf import settings
        if settings.DEBUG and getattr(settings, 'TESTING', False):
            return None
        
        path = request.path
        method = request.method
        client_ip = get_client_ip(request)
        
        # Skip excluded paths
        if any(path.startswith(excluded) for excluded in self.EXCLUDED_PATHS):
            return None
        
        # Check for suspicious patterns in path and query string
        query_string = request.META.get('QUERY_STRING', '')
        full_path = f"{path}?{query_string}" if query_string else path
        
        for pattern in self.SUSPICIOUS_PATTERNS:
            if pattern.lower() in full_path.lower():
                try:
                    log_security_event(
                        event_type='suspicious_activity',
                        request=request,
                        details={
                            'pattern': pattern,
                            'path': path,
                            'query_string': query_string,
                        },
                        severity='WARNING'
                    )
                except Exception:
                    # Don't fail if logging fails
                    pass
                break
        
        return None
    
    def process_response(self, request, response):
        """Log security-relevant responses"""
        # Skip in test environment
        from django.conf import settings
        if settings.DEBUG and getattr(settings, 'TESTING', False):
            return response
        
        # Log 4xx and 5xx errors as potential security events
        if response.status_code >= 400:
            severity = 'ERROR' if response.status_code >= 500 else 'WARNING'
            try:
                log_security_event(
                    event_type='api_access',
                    request=request,
                    details={
                        'status_code': response.status_code,
                        'path': request.path,
                    },
                    severity=severity
                )
            except Exception:
                # Don't fail if logging fails
                pass
        
        return response

