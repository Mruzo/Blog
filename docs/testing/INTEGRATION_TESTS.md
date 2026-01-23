# Integration Tests - Real API Calls

## Overview

This document describes the integration tests that make **real API calls** from the React app to the Django backend.

## Current Status

### ❌ **Missing: No Real API Integration Tests**

All current React tests mock the API service using `jest.mock()`. This means:
- Tests don't verify actual HTTP communication
- Tests don't verify API response structure matches expectations
- Tests don't catch API contract changes
- Tests don't verify authentication/authorization works correctly

## New Integration Test File

**File:** `frontend/src/services/__tests__/api.integration.test.ts`

### Features

1. **Real API Calls**: Makes actual HTTP requests to Django backend
2. **Configurable**: Only runs when `REACT_APP_RUN_INTEGRATION_TESTS=true`
3. **Comprehensive**: Tests public endpoints, authenticated endpoints, and error handling
4. **Safe**: Uses environment variables to prevent accidental execution

### Test Coverage

#### Public Endpoints (No Auth Required)
- ✅ `getPublicStories()` - Fetches public stories
- ✅ `getStudios()` - Fetches public studios
- ✅ Response structure validation

#### Authenticated Endpoints
- ✅ `login()` - User authentication
- ✅ `getCurrentUser()` - Fetch current user
- ✅ `getStories()` - Fetch user's stories

#### Error Handling
- ✅ 404 errors (non-existent resources)
- ✅ 401/403 errors (authentication/authorization)
- ✅ Network errors

## Running Integration Tests

### Prerequisites

1. **Django Backend Running:**
   ```bash
   cd vybzapp
   python manage.py runserver
   ```

2. **Test Database Setup:**
   ```bash
   python manage.py migrate
   # Optional: Load test fixtures
   python manage.py loaddata test_fixtures.json
   ```

3. **Test User Created:**
   ```bash
   python manage.py shell
   >>> from django.contrib.auth.models import User
   >>> User.objects.create_user('testuser', 'test@example.com', 'testpass123')
   ```

### Run Integration Tests

```bash
cd vybzapp/frontend
REACT_APP_RUN_INTEGRATION_TESTS=true REACT_APP_API_URL=http://localhost:8000/api/icvybz npm test -- api.integration.test.ts
```

### With Test Credentials

```bash
REACT_APP_RUN_INTEGRATION_TESTS=true \
REACT_APP_API_URL=http://localhost:8000/api/icvybz \
REACT_APP_TEST_USERNAME=testuser \
REACT_APP_TEST_PASSWORD=testpass123 \
npm test -- api.integration.test.ts
```

## Test Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_RUN_INTEGRATION_TESTS` | Enable integration tests | `false` |
| `REACT_APP_API_URL` | Django API base URL | `http://localhost:8000/api/icvybz` |
| `REACT_APP_TEST_USERNAME` | Test user username | `testuser` |
| `REACT_APP_TEST_PASSWORD` | Test user password | `testpass123` |

## What Gets Tested

### 1. Public Stories API
- ✅ Fetches stories without authentication
- ✅ Returns array of stories
- ✅ Each story has required fields (id, title, description, is_public)
- ✅ All stories are public (is_public === true)

### 2. Studios API
- ✅ Fetches studios without authentication
- ✅ Returns array of studios
- ✅ Each studio has required fields (id, name, owner, is_public)
- ✅ Owner data structure is correct
- ✅ Collaborators data structure is correct
- ✅ Stories count is included and is a number

### 3. Authentication API
- ✅ Login with valid credentials returns token and user
- ✅ Login with invalid credentials throws error
- ✅ Fetch current user when authenticated returns user data

### 4. Authenticated Stories API
- ✅ Fetches user stories when authenticated
- ✅ Returns array of stories
- ✅ Each story has required fields

### 5. Error Handling
- ✅ 404 errors are handled gracefully
- ✅ 401/403 errors are handled gracefully
- ✅ Network errors are handled gracefully

## Integration Test vs Unit Test

### Unit Tests (Current)
- **Mock API calls** using `jest.mock()`
- **Fast execution** (no network calls)
- **Isolated** (don't depend on backend)
- **Test logic only** (not actual API contracts)

### Integration Tests (New)
- **Real API calls** to Django backend
- **Slower execution** (network calls)
- **Require backend** to be running
- **Test full stack** (React → Django → Database)

## Benefits

1. **Catches API Contract Changes**: Verifies that API responses match expected structure
2. **Verifies Authentication**: Tests that auth tokens work correctly
3. **End-to-End Validation**: Tests the full request/response cycle
4. **Real Error Handling**: Tests actual error responses from Django
5. **Performance Testing**: Can measure actual API response times

## Limitations

1. **Requires Running Backend**: Django server must be running
2. **Requires Test Data**: Database must have test data
3. **Slower**: Real network calls take longer than mocks
4. **Environment Dependent**: May fail if backend isn't configured correctly

## Best Practices

1. **Run Integration Tests Separately**: Don't run with unit tests in CI
2. **Use Test Database**: Always use a separate test database
3. **Clean Up**: Reset test data after each test run
4. **Timeouts**: Set appropriate timeouts for network calls (10-15 seconds)
5. **Skip When Backend Unavailable**: Tests should skip gracefully if backend isn't running

## Future Enhancements

1. **Add More Endpoints**: Test seasons, episodes, dialogues, characters
2. **Add CRUD Operations**: Test create, update, delete operations
3. **Add Performance Tests**: Measure response times
4. **Add Load Tests**: Test with multiple concurrent requests
5. **Add Contract Tests**: Verify API schema matches OpenAPI/Swagger spec

## Running in CI/CD

To run integration tests in CI/CD:

```yaml
# Example GitHub Actions workflow
- name: Start Django Server
  run: |
    cd vybzapp
    python manage.py migrate
    python manage.py runserver &
    
- name: Run Integration Tests
  run: |
    cd vybzapp/frontend
    REACT_APP_RUN_INTEGRATION_TESTS=true \
    REACT_APP_API_URL=http://localhost:8000/api/icvybz \
    npm test -- api.integration.test.ts --watchAll=false
```

## Summary

**Before**: ❌ No tests make real API calls  
**After**: ✅ Integration tests make real API calls and verify:
- API endpoints work correctly
- Response structures match expectations
- Authentication works properly
- Error handling is correct





