#!/usr/bin/env python
"""
Test runner for progressive saving workflow tests
"""
import os
import sys
import django
from django.conf import settings
from django.test.utils import get_runner

def run_tests():
    """Run all progressive saving tests"""
    
    # Add the project directory to Python path
    project_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, project_dir)
    
    # Set up Django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'snm.settings.local')
    django.setup()
    
    # Get test runner
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    
    # Define test modules
    test_modules = [
        'icvybz.tests_api',
        'icvybz.tests_integration',
    ]
    
    print("🧪 Running Progressive Saving Workflow Tests")
    print("=" * 50)
    
    # Run tests
    failures = test_runner.run_tests(test_modules, verbosity=2)
    
    if failures:
        print(f"\n❌ {failures} test(s) failed!")
        return False
    else:
        print("\n✅ All tests passed!")
        return True

def run_react_tests():
    """Run React tests for progressive saving"""
    import subprocess
    
    print("\n🧪 Running React Progressive Saving Tests")
    print("=" * 50)
    
    # Change to frontend directory
    frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend')
    
    try:
        # Run React tests
        result = subprocess.run(
            ['npm', 'test', '--', '--testPathPattern=story-creation.*test', '--watchAll=false'],
            cwd=frontend_dir,
            capture_output=True,
            text=True
        )
        
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        
        return result.returncode == 0
    except FileNotFoundError:
        print("❌ npm not found. Please install Node.js and npm.")
        return False
    except Exception as e:
        print(f"❌ Error running React tests: {e}")
        return False

def main():
    """Main test runner"""
    print("🚀 Progressive Saving Workflow Test Suite")
    print("=" * 50)
    
    # Run Django tests
    django_success = run_tests()
    
    # Run React tests
    react_success = run_react_tests()
    
    print("\n" + "=" * 50)
    print("📊 Test Results Summary")
    print("=" * 50)
    print(f"Django Tests: {'✅ PASSED' if django_success else '❌ FAILED'}")
    print(f"React Tests: {'✅ PASSED' if react_success else '❌ FAILED'}")
    
    if django_success and react_success:
        print("\n🎉 All tests passed! Progressive saving workflow is working correctly.")
        return 0
    else:
        print("\n💥 Some tests failed. Please check the output above.")
        return 1

if __name__ == '__main__':
    sys.exit(main())










