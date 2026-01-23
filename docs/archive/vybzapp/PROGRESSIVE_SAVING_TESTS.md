# Progressive Saving Workflow Tests

This document describes the comprehensive test suite for the progressive saving workflow in the 3D Comic App.

## Overview

The progressive saving workflow ensures that data is saved to the database at each step of the story creation wizard, rather than waiting until the very end. This provides better user experience, data persistence, and error handling.

## Test Structure

### 1. React Frontend Tests

#### CharactersStep Tests (`frontend/src/components/story-creation/__tests__/CharactersStep.test.tsx`)

**Purpose**: Test that the CharactersStep component saves story, season, and characters to the database when "Next" is clicked.

**Key Test Cases**:
- ✅ Saves story, season, and characters to database on Next click
- ✅ Handles API errors gracefully
- ✅ Shows error if no characters are added
- ✅ Updates existing characters if they already have IDs
- ✅ Validates character data before saving

**Mock Setup**:
```typescript
const mockApiContext = {
  createStory: jest.fn(),
  createSeason: jest.fn(),
  createCharacter: jest.fn(),
  // ... other API methods
};
```

#### EpisodeSetupStep Tests (`frontend/src/components/story-creation/__tests__/EpisodeSetupStep.test.tsx`)

**Purpose**: Test that the EpisodeSetupStep component saves episode to the database when "Next" is clicked.

**Key Test Cases**:
- ✅ Saves episode to database on Next click
- ✅ Handles API errors gracefully
- ✅ Shows error if season ID is missing
- ✅ Validates required fields
- ✅ Updates form data when user types

#### DialoguesStep Tests (`frontend/src/components/story-creation/__tests__/DialoguesStep.test.tsx`)

**Purpose**: Test that the DialoguesStep component saves dialogues to the database when "Next" is clicked.

**Key Test Cases**:
- ✅ Saves dialogues to database on Next click
- ✅ Handles API errors gracefully
- ✅ Shows error if no dialogues are added
- ✅ Shows error if episode ID is missing
- ✅ Validates required fields when adding dialogue
- ✅ Updates character selection when character is selected
- ✅ Handles multiple dialogues correctly

### 2. Django Backend Tests

#### API Endpoint Tests (`icvybz/tests_api.py`)

**Purpose**: Test individual API endpoints for story creation.

**Key Test Cases**:
- ✅ Create story successfully
- ✅ Create story without authentication (401 error)
- ✅ Create season successfully
- ✅ Create character successfully
- ✅ Create episode successfully
- ✅ Create dialogue successfully
- ✅ Create complete story with all related objects
- ✅ Create complete story with 3D model upload
- ✅ Handle validation errors
- ✅ Handle missing relationships (story, season, episode)
- ✅ Test complete progressive saving workflow

#### Integration Tests (`icvybz/tests_integration.py`)

**Purpose**: Test the complete progressive saving workflow as it would happen in the React app.

**Key Test Cases**:
- ✅ Complete progressive saving workflow
- ✅ Progressive saving with error handling
- ✅ Data consistency after progressive saving
- ✅ Concurrent progressive saving (no conflicts)
- ✅ Progressive saving with large dataset

### 3. Test Runner

#### Main Test Runner (`run_progressive_saving_tests.py`)

**Purpose**: Run all progressive saving tests (Django + React).

**Features**:
- Runs Django tests with proper setup
- Runs React tests using npm
- Provides comprehensive test results summary
- Returns appropriate exit codes

## Running the Tests

### Prerequisites

1. **Django Backend**:
   ```bash
   cd vybzapp
   pip install -r requirements.txt
   python manage.py migrate
   ```

2. **React Frontend**:
   ```bash
   cd vybzapp/frontend
   npm install
   ```

### Running All Tests

```bash
cd vybzapp
python run_progressive_saving_tests.py
```

### Running Individual Test Suites

#### Django Tests Only
```bash
cd vybzapp
python manage.py test icvybz.tests_api icvybz.tests_integration
```

#### React Tests Only
```bash
cd vybzapp/frontend
npm test -- --testPathPattern=story-creation.*test --watchAll=false
```

#### Specific Test Files
```bash
# Django API tests
python manage.py test icvybz.tests_api

# Django integration tests
python manage.py test icvybz.tests_integration

# React CharactersStep tests
npm test -- --testPathPattern=CharactersStep.test

# React EpisodeSetupStep tests
npm test -- --testPathPattern=EpisodeSetupStep.test

# React DialoguesStep tests
npm test -- --testPathPattern=DialoguesStep.test
```

## Test Coverage

### Frontend Coverage
- ✅ Component rendering
- ✅ User interactions (form inputs, button clicks)
- ✅ API integration
- ✅ Error handling
- ✅ Data validation
- ✅ State management

### Backend Coverage
- ✅ API endpoint functionality
- ✅ Authentication and authorization
- ✅ Data validation
- ✅ Database operations
- ✅ Error handling
- ✅ Data relationships
- ✅ Concurrent operations

### Integration Coverage
- ✅ End-to-end workflow
- ✅ Data consistency
- ✅ Error propagation
- ✅ Performance with large datasets

## Expected Test Results

### Successful Test Run
```
🧪 Running Progressive Saving Workflow Tests
==================================================
test_create_story_success (icvybz.tests_api.StoryCreationAPITestCase) ... ok
test_create_season_success (icvybz.tests_api.StoryCreationAPITestCase) ... ok
test_create_character_success (icvybz.tests_api.StoryCreationAPITestCase) ... ok
test_create_episode_success (icvybz.tests_api.StoryCreationAPITestCase) ... ok
test_create_dialogue_success (icvybz.tests_api.StoryCreationAPITestCase) ... ok
test_create_complete_story_success (icvybz.tests_api.StoryCreationAPITestCase) ... ok
test_progressive_saving_workflow (icvybz.tests_api.StoryCreationAPITestCase) ... ok
test_complete_progressive_saving_workflow (icvybz.tests_integration.ProgressiveSavingIntegrationTestCase) ... ok
test_progressive_saving_with_errors (icvybz.tests_integration.ProgressiveSavingIntegrationTestCase) ... ok
test_data_consistency_after_progressive_saving (icvybz.tests_integration.ProgressiveSavingIntegrationTestCase) ... ok
test_concurrent_progressive_saving (icvybz.tests_integration.ProgressiveSavingIntegrationTestCase) ... ok
test_progressive_saving_with_large_dataset (icvybz.tests_integration.ProgressiveSavingIntegrationTestCase) ... ok

✅ All tests passed!

🧪 Running React Progressive Saving Tests
==================================================
PASS src/components/story-creation/__tests__/CharactersStep.test.tsx
PASS src/components/story-creation/__tests__/EpisodeSetupStep.test.tsx
PASS src/components/story-creation/__tests__/DialoguesStep.test.tsx

Test Suites: 3 passed, 3 total
Tests: 15 passed, 15 total

==================================================
📊 Test Results Summary
==================================================
Django Tests: ✅ PASSED
React Tests: ✅ PASSED

🎉 All tests passed! Progressive saving workflow is working correctly.
```

## Troubleshooting

### Common Issues

1. **Django Tests Failing**:
   - Check database migrations: `python manage.py migrate`
   - Check API endpoints are properly configured
   - Verify authentication setup

2. **React Tests Failing**:
   - Check npm dependencies: `npm install`
   - Verify test environment setup
   - Check mock configurations

3. **Integration Tests Failing**:
   - Ensure both Django and React are properly set up
   - Check API connectivity
   - Verify test data consistency

### Debug Mode

To run tests with more verbose output:

```bash
# Django tests with verbose output
python manage.py test icvybz.tests_api icvybz.tests_integration --verbosity=3

# React tests with debug output
npm test -- --testPathPattern=story-creation.*test --verbose
```

## Continuous Integration

These tests are designed to be run in CI/CD pipelines:

1. **Django tests** can be run in any Python environment
2. **React tests** require Node.js and npm
3. **Integration tests** require both Django and React to be set up

### CI Configuration Example

```yaml
# .github/workflows/test.yml
name: Progressive Saving Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.9
      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install Python dependencies
        run: pip install -r requirements.txt
      - name: Install Node.js dependencies
        run: cd frontend && npm install
      - name: Run tests
        run: python run_progressive_saving_tests.py
```

## Conclusion

This comprehensive test suite ensures that the progressive saving workflow works correctly at all levels:

- **Unit tests** verify individual component functionality
- **Integration tests** verify end-to-end workflow
- **API tests** verify backend functionality
- **Error handling tests** verify graceful failure modes

The tests provide confidence that the progressive saving feature works as intended and will continue to work as the codebase evolves.









