#!/usr/bin/env python
"""
Test runner for email validation tests
Run this script to test the email validation process
"""

import os
import sys
import django
from django.conf import settings

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'snm.settings.local')
django.setup()

# Import and run tests
from django.test.utils import get_runner
from django.conf import settings

def run_tests():
    """Run the email validation tests"""
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    
    # Run only the email validation tests
    failures = test_runner.run_tests(['snm.tests'])
    
    if failures:
        print(f"\n❌ {failures} test(s) failed!")
        sys.exit(1)
    else:
        print("\n✅ All email validation tests passed!")

if __name__ == '__main__':
    print("🧪 Running Email Validation Tests...")
    print("=" * 50)
    run_tests() 