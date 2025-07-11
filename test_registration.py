#!/usr/bin/env python
"""
Registration test script
Run this to test the registration process and see what's happening
"""

import os
import sys
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'snm.settings.local')
django.setup()

from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.conf import settings
from snm.forms import RegisterForm

def test_registration_form():
    """Test the registration form directly"""
    print("=== Testing Registration Form ===\n")
    
    # Test data
    test_data = {
        'username': 'testuser123',
        'email': 'chrisuzoewulu@gmail.com',  # Use your email to test
        'first_name': 'Test',
        'last_name': 'User',
        'password1': 'testpass123',
        'password2': 'testpass123'
    }
    
    print(f"Testing registration with email: {test_data['email']}")
    
    # Check if user already exists
    if User.objects.filter(username=test_data['username']).exists():
        print(f"⚠️  User {test_data['username']} already exists, deleting...")
        User.objects.filter(username=test_data['username']).delete()
    
    if User.objects.filter(email=test_data['email']).exists():
        print(f"⚠️  Email {test_data['email']} already exists, deleting...")
        User.objects.filter(email=test_data['email']).delete()
    
    # Test form validation
    print("\n=== Testing Form Validation ===")
    form = RegisterForm(test_data)
    
    if form.is_valid():
        print("✅ Form is valid")
        
        # Test user creation
        print("\n=== Testing User Creation ===")
        try:
            user = form.save(commit=False)
            user.is_active = False
            user.save()
            
            print(f"✅ User created: {user.username}")
            print(f"   Email: {user.email}")
            print(f"   Active: {user.is_active}")
            print(f"   ID: {user.id}")
            
            # Test email sending
            print("\n=== Testing Email Sending ===")
            try:
                from django.contrib.auth.tokens import default_token_generator
                token = default_token_generator.make_token(user)
                
                # Create verification URL
                verification_link = f"http://localhost:8000/verify_email/{user.id}/{token}/"
                
                subject = "Verify Your Email"
                message = (
                    f"Hi {user.username},\n\n"
                    f"Thanks for signing up. Please verify your email address by clicking the link below:\n"
                    f"{verification_link}\n\n"
                    "Best regards,\nTeam Uzo"
                )
                
                result = send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                print(f"✅ Registration email sent successfully! Result: {result}")
                print(f"   To: {user.email}")
                print(f"   From: {settings.DEFAULT_FROM_EMAIL}")
                print(f"   Subject: {subject}")
                print(f"   Verification URL: {verification_link}")
                
            except Exception as e:
                print(f"❌ Email sending failed: {e}")
            
            # Clean up
            user.delete()
            print(f"\n🧹 Test user deleted")
            
        except Exception as e:
            print(f"❌ User creation failed: {e}")
    else:
        print("❌ Form validation failed:")
        for field, errors in form.errors.items():
            print(f"  {field}: {errors}")

def test_email_sending_to_specific_address():
    """Test sending email to the specific address you're testing with"""
    print("\n=== Testing Email to Your Address ===")
    
    test_email = 'chrisuzoewulu@gmail.com'  # Replace with the email you used for registration
    
    try:
        result = send_mail(
            subject='Registration Test Email',
            message='This is a test email to verify your email address receives emails from the system.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[test_email],
            fail_silently=False,
        )
        print(f"✅ Test email sent to {test_email}! Result: {result}")
        print("Check your inbox (and spam folder) for this email.")
    except Exception as e:
        print(f"❌ Test email failed: {e}")

if __name__ == "__main__":
    print("Starting registration test...\n")
    
    # Test registration form
    test_registration_form()
    
    # Test email to specific address
    test_email_sending_to_specific_address()
    
    print("\n=== Test Complete ===")
    print("If you received the test email but not the registration email,")
    print("the issue is likely in the registration form validation or user creation process.") 