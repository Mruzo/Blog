# Email Validation Tests

This document describes the comprehensive test suite for the email validation process in your Django application.

## Overview

The test suite covers the complete email validation flow from user registration to email verification, including edge cases and error handling.

## Test Coverage

### Core Functionality Tests (`EmailValidationTestCase`)

1. **User Creation**: Tests that registration creates inactive users
2. **Email Sending**: Verifies that verification emails are sent
3. **Email Content**: Checks that emails contain correct URLs and tokens
4. **Verification Process**: Tests successful email verification
5. **Token Validation**: Tests invalid token handling
6. **Error Handling**: Tests various error scenarios

### Integration Tests (`EmailValidationIntegrationTestCase`)

1. **Complete Flow**: Tests the entire registration → email → verification flow
2. **Duplicate Handling**: Tests multiple registrations with same email

## Running the Tests

### Option 1: Using the Test Runner Script
```bash
python run_email_tests.py
```

### Option 2: Using Django's Test Command
```bash
python manage.py test snm.tests
```

### Option 3: Run Specific Test Classes
```bash
# Run only core functionality tests
python manage.py test snm.tests.EmailValidationTestCase

# Run only integration tests
python manage.py test snm.tests.EmailValidationIntegrationTestCase
```

### Option 4: Run Individual Tests
```bash
# Run a specific test method
python manage.py test snm.tests.EmailValidationTestCase.test_successful_email_verification
```

## Test Categories

### ✅ Registration Tests
- Creates inactive users
- Sends verification emails
- Handles form validation
- Prevents duplicate usernames/emails
- Shows success messages

### ✅ Email Verification Tests
- Activates users with valid tokens
- Rejects invalid tokens
- Handles non-existent users
- Manages token expiration
- Logs users in after verification

### ✅ Error Handling Tests
- Email sending failures
- Invalid email formats
- Missing email addresses
- Duplicate registrations
- Invalid verification links

### ✅ Integration Tests
- Complete registration flow
- Multiple registration attempts
- End-to-end user experience

## Test Data

The tests use the following test data:
- Username: `testuser` / `integrationuser`
- Email: `test@example.com` / `integration@example.com`
- Password: `testpass123`
- Names: `Test User` / `Integration User`

## Mocking

The tests use `unittest.mock.patch` to mock email sending, preventing actual emails from being sent during testing while still verifying that the email functionality works correctly.

## Expected Test Results

When all tests pass, you should see output like:
```
🧪 Running Email Validation Tests...
==================================================
Creating test database for alias 'default'...
System check identified no issues (0 silenced).
.....................
----------------------------------------------------------------------
Ran 21 tests in 2.345s

OK
Destroying test database for alias 'default'...

✅ All email validation tests passed!
```

## Troubleshooting

### Common Issues

1. **Database Errors**: Make sure your test database can be created
2. **Import Errors**: Ensure all required modules are installed
3. **Email Configuration**: Tests mock email sending, so email settings don't affect tests
4. **URL Configuration**: Ensure all URL patterns are properly configured

### Debugging Failed Tests

To see detailed output for failed tests:
```bash
python manage.py test snm.tests --verbosity=2
```

## Adding New Tests

To add new tests:

1. Add test methods to the appropriate test class
2. Follow the naming convention: `test_descriptive_name`
3. Include docstrings explaining what the test does
4. Use appropriate assertions to verify expected behavior
5. Run the tests to ensure they pass

## Test Maintenance

- Update tests when changing email validation logic
- Add tests for new edge cases
- Ensure tests remain relevant as the application evolves
- Keep test data consistent across test methods 