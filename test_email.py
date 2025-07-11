#!/usr/bin/env python
"""
Email configuration test script
Run this to test your email settings
"""

import os
import sys
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'snm.settings.local')
django.setup()

from django.conf import settings
from django.core.mail import send_mail
from django.core.mail import EmailMessage
import smtplib
from email.mime.text import MIMEText

def test_email_config():
    """Test email configuration"""
    print("=== Email Configuration Test ===\n")
    
    # Check settings
    print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
    print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
    print(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
    print(f"EMAIL_USE_SSL: {getattr(settings, 'EMAIL_USE_SSL', False)}")
    
    # Test SMTP connection
    print("\n=== Testing SMTP Connection ===")
    try:
        server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
        server.starttls()
        server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
        print("✅ SMTP connection successful!")
        server.quit()
    except Exception as e:
        print(f"❌ SMTP connection failed: {e}")
        return False
    
    return True

def test_django_email():
    """Test Django email sending"""
    print("\n=== Testing Django Email Sending ===")
    
    try:
        # Test with Django's send_mail
        result = send_mail(
            subject='Test Email from Django',
            message='This is a test email from your Django application.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=['chrisuzoewulu@gmail.com'],  # Replace with your email
            fail_silently=False,
        )
        print(f"✅ Django email sent successfully! Result: {result}")
        return True
    except Exception as e:
        print(f"❌ Django email failed: {e}")
        return False

def test_manual_smtp():
    """Test manual SMTP email sending"""
    print("\n=== Testing Manual SMTP Email ===")
    
    try:
        # Create message
        msg = MIMEText('This is a test email sent manually via SMTP.')
        msg['Subject'] = 'Manual SMTP Test'
        msg['From'] = settings.EMAIL_HOST_USER
        msg['To'] = 'chrisuzoewulu@gmail.com'  # Replace with your email
        
        # Send email
        server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
        server.starttls()
        server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        print("✅ Manual SMTP email sent successfully!")
        return True
    except Exception as e:
        print(f"❌ Manual SMTP email failed: {e}")
        return False

if __name__ == "__main__":
    print("Starting email configuration test...\n")
    
    # Test configuration
    config_ok = test_email_config()
    
    if config_ok:
        # Test Django email
        django_ok = test_django_email()
        
        # Test manual SMTP
        smtp_ok = test_manual_smtp()
        
        print(f"\n=== Summary ===")
        print(f"Configuration: {'✅ OK' if config_ok else '❌ FAILED'}")
        print(f"Django Email: {'✅ OK' if django_ok else '❌ FAILED'}")
        print(f"Manual SMTP: {'✅ OK' if smtp_ok else '❌ FAILED'}")
        
        if not (django_ok and smtp_ok):
            print("\n=== Troubleshooting Tips ===")
            print("1. Check your HostPapa email credentials")
            print("2. Verify SMTP settings in HostPapa control panel")
            print("3. Check if your email account is active")
            print("4. Try using port 465 with SSL instead of 587 with TLS")
            print("5. Check if HostPapa requires specific authentication")
    else:
        print("\n❌ Email configuration is incorrect. Please check your settings.") 