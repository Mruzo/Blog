# Views Count and Social Media Share Features - Test Documentation

## Overview

This document describes the comprehensive test suite for the views count and social media share tracking features implemented in the Stories component.

## Test Files

### 1. Backend Tests (`icvybz/tests_views_shares.py`)

**Purpose**: Test Django backend functionality for views count serialization and share tracking.

#### Test Classes

##### `EpisodeViewCountTestCase`
- ✅ Tests that `EpisodeSerializer` includes `view_count` field
- ✅ Tests that episode API endpoints return `view_count`
- ✅ Tests that `view_count` defaults to 0 for new episodes
- ✅ Tests episode detail endpoint includes `view_count`

##### `ShareTrackingTestCase`
- ✅ Tests tracking share clicks with `story_id`
- ✅ Tests tracking share clicks with `episode_id` (backward compatibility)
- ✅ Tests error handling for missing platform
- ✅ Tests error handling for missing both story_id and episode_id
- ✅ Tests all supported platforms (facebook, x_twitter, reddit, copy_link)

##### `ShareLoggingTestCase`
- ✅ Tests logging share clicks for stories
- ✅ Tests logging share clicks for episodes
- ✅ Tests log data structure includes correct fields
- ✅ Tests environment detection in logs

##### `ViewsCountIntegrationTestCase`
- ✅ Tests total views calculation from multiple episodes
- ✅ Tests episodes API includes view_count for all episodes
- ✅ Integration test for complete views count workflow

### 2. Frontend Unit Tests (`frontend/src/pages/__tests__/Stories.views-shares.test.tsx`)

**Purpose**: Test React component functionality for views count display and share buttons.

#### Test Suites

##### Views Count Display
- ✅ Displays total views count from all episodes
- ✅ Displays 0 views when episodes have no views
- ✅ Handles missing view_count gracefully
- ✅ Displays views count with eye icon

##### Social Media Share Buttons
- ✅ Displays all share buttons (Facebook, X/Twitter, Reddit, Copy Link)
- ✅ Opens Facebook share dialog when clicked
- ✅ Opens Twitter share dialog when clicked
- ✅ Opens Reddit share dialog when clicked
- ✅ Copies link to clipboard when copy button clicked
- ✅ Shows success feedback when link is copied

##### Share Tracking API Calls
- ✅ Tracks Facebook share click
- ✅ Tracks Twitter share click
- ✅ Tracks Reddit share click
- ✅ Tracks copy link click
- ✅ Includes story_id in tracking request
- ✅ Handles tracking API errors gracefully

##### Integration with Existing Features
- ✅ Displays views count above collaborators section
- ✅ Displays share buttons after collaborators section
- ✅ Works with multiple stories

### 3. Integration Tests (`frontend/src/services/__tests__/api.integration.test.ts`)

**Purpose**: Test real API calls from React to Django backend.

#### New Test Suites Added

##### Episode View Count API
- ✅ Verifies `view_count` is included in episode API response
- ✅ Verifies `view_count` is a number
- ✅ Verifies `view_count` is >= 0

##### Share Tracking API
- ✅ Tracks share click for story via real API call
- ✅ Handles share tracking errors gracefully
- ✅ Verifies API response structure

## Running the Tests

### Backend Tests (Django)

```bash
cd vybzapp
python manage.py test icvybz.tests_views_shares
```

Run specific test class:
```bash
python manage.py test icvybz.tests_views_shares.EpisodeViewCountTestCase
python manage.py test icvybz.tests_views_shares.ShareTrackingTestCase
```

Run with verbose output:
```bash
python manage.py test icvybz.tests_views_shares --verbosity=2
```

### Frontend Unit Tests (React)

```bash
cd vybzapp/frontend
npm test -- Stories.views-shares.test.tsx
```

Run with coverage:
```bash
npm test -- Stories.views-shares.test.tsx --coverage
```

Run in watch mode:
```bash
npm test -- Stories.views-shares.test.tsx --watch
```

### Integration Tests (React + Django)

**Prerequisites:**
1. Django backend must be running:
   ```bash
   cd vybzapp
   python manage.py runserver
   ```

2. Set environment variable:
   ```bash
   export REACT_APP_RUN_INTEGRATION_TESTS=true
   ```

3. Run integration tests:
   ```bash
   cd vybzapp/frontend
   REACT_APP_RUN_INTEGRATION_TESTS=true npm test -- api.integration.test.ts
   ```

## Test Coverage

### Backend Coverage
- ✅ Episode serializer includes view_count
- ✅ Share tracking endpoint accepts story_id
- ✅ Share tracking endpoint accepts episode_id (backward compatibility)
- ✅ Share logging includes correct content_type
- ✅ Error handling for invalid requests
- ✅ All supported platforms tested

### Frontend Coverage
- ✅ Views count calculation and display
- ✅ Share button rendering
- ✅ Share dialog opening
- ✅ Clipboard copy functionality
- ✅ API tracking calls
- ✅ Error handling
- ✅ Integration with existing Stories component

### Integration Coverage
- ✅ Real API calls for view_count
- ✅ Real API calls for share tracking
- ✅ End-to-end workflow validation

## Test Data

### Backend Test Data
- Test user: `testuser` / `testpass123`
- Test story: "Test Story"
- Test episodes with various view_count values (0, 10, 25, 15)

### Frontend Test Data
- Mock stories with episodes
- Mock episodes with view_count values
- Mock API responses

## Assertions

### Backend Assertions
```python
# View count in serializer
self.assertIn('view_count', data)
self.assertEqual(data['view_count'], 42)

# Share tracking success
self.assertEqual(response.status_code, status.HTTP_200_OK)
self.assertEqual(response.data['success'], True)

# Log data structure
self.assertEqual(share_entry['platform'], 'facebook')
self.assertEqual(share_entry['content_type'], 'story')
```

### Frontend Assertions
```typescript
// Views count display
expect(screen.getByText(/50/)).toBeInTheDocument();

// Share buttons
expect(screen.getByTitle('Share on Facebook')).toBeInTheDocument();

// API calls
expect(global.fetch).toHaveBeenCalledWith(
  expect.stringContaining('/immersivecomics/api/track-share/'),
  expect.objectContaining({ method: 'POST' })
);
```

## Integration with Existing Tests

These tests integrate seamlessly with existing test suites:

1. **Backend**: Follows same patterns as `tests_api.py`
2. **Frontend**: Follows same patterns as `Stories.test.tsx`
3. **Integration**: Extends `api.integration.test.ts`

## Best Practices

1. **Isolation**: Each test is independent
2. **Mocking**: External dependencies are mocked appropriately
3. **Cleanup**: Tests clean up after themselves
4. **Error Handling**: Tests verify error handling paths
5. **Integration**: Real API calls only in integration tests

## Troubleshooting

### Backend Tests Fail
- Ensure test database is migrated: `python manage.py migrate`
- Check that test user exists
- Verify models are properly set up

### Frontend Tests Fail
- Ensure all dependencies are installed: `npm install`
- Check that mocks are properly configured
- Verify test environment setup

### Integration Tests Fail
- Ensure Django backend is running
- Check API URL configuration
- Verify test data exists in database
- Check network connectivity

## Future Enhancements

1. Add performance tests for views count calculation
2. Add load tests for share tracking endpoint
3. Add visual regression tests for share buttons
4. Add accessibility tests for share buttons
5. Add analytics validation tests

