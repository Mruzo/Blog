# Stories Component Test Documentation

## Overview
This document describes the comprehensive test suite for the Stories component, specifically focusing on character display functionality.

## Test Files

### 1. `Stories.test.tsx` - Unit Tests
**Location**: `src/pages/__tests__/Stories.test.tsx`

**Purpose**: Tests individual functionality of the Stories component in isolation.

**Key Test Cases**:
- ✅ Character loading and display
- ✅ Character count display
- ✅ Character badge rendering
- ✅ Tooltip functionality
- ✅ Overflow handling (3+ characters)
- ✅ Empty state handling
- ✅ Error handling
- ✅ API call verification
- ✅ Loading states
- ✅ Error states

### 2. `Stories.integration.test.tsx` - Integration Tests
**Location**: `src/pages/__tests__/Stories.integration.test.tsx`

**Purpose**: Tests the Stories component with real API interactions and complex scenarios.

**Key Test Cases**:
- ✅ Multiple stories with different character sets
- ✅ Mixed character loading results
- ✅ API error handling for individual stories
- ✅ Character tooltip verification
- ✅ Overflow indicator functionality
- ✅ Component re-rendering behavior
- ✅ API call parameter verification

## Test Data

### Mock Stories
```typescript
const mockStories = [
  {
    id: 1,
    title: 'Test Story 1',
    description: 'A test story description',
    is_public: true,
    user: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  // ... more stories
];
```

### Mock Characters
```typescript
const mockCharacters = [
  {
    id: 1,
    name: 'Alice',
    bio: 'A brave protagonist',
    personality: 'Hero',
    love_interest: 'Adventure',
    user: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  // ... more characters
];
```

## Test Scenarios Covered

### 1. Character Display
- **Normal Case**: Characters are loaded and displayed as badges
- **Empty Case**: "No characters yet" message is shown
- **Overflow Case**: Only first 3 characters shown, with "+X more" indicator

### 2. API Integration
- **Success Case**: Characters loaded successfully from API
- **Error Case**: API errors handled gracefully
- **Mixed Case**: Some stories succeed, others fail

### 3. UI States
- **Loading State**: Loading spinner displayed
- **Error State**: Error message displayed
- **Empty State**: No stories message displayed
- **Success State**: Stories and characters displayed

### 4. User Interactions
- **Tooltips**: Character badges show personality on hover
- **Navigation**: Links to story management work correctly

## Running Tests

### Prerequisites
```bash
cd /home/chris/applications/vybz/vybzapp/frontend
npm install
```

### Run All Tests
```bash
npm test
```

### Run Stories Tests Only
```bash
npm test -- --testPathPattern=Stories
```

### Run with Coverage
```bash
npm test -- --coverage
```

### Run Specific Test File
```bash
npm test -- Stories.test.tsx
```

### Run Integration Tests
```bash
npm test -- Stories.integration.test.tsx
```

## Test Configuration

### Jest Configuration
- **Environment**: jsdom (for DOM testing)
- **Setup**: Custom setup file for mocks
- **Coverage**: HTML and LCOV reports generated
- **Transform**: Babel for TypeScript/JSX

### Mocking Strategy
- **API Service**: Fully mocked with jest.mock()
- **React Router**: BrowserRouter wrapper
- **API Context**: Mocked context provider
- **Console**: Error logging mocked in tests

## Assertions Used

### Character Display Assertions
```typescript
// Character names displayed
expect(screen.getByText('Alice')).toBeInTheDocument();

// Character count displayed
expect(screen.getByText('Characters (3)')).toBeInTheDocument();

// Character badges have correct classes
expect(screen.getByText('Alice')).toHaveClass('badge', 'bg-primary');

// Tooltips have correct content
expect(screen.getByText('Alice')).toHaveAttribute('title', 'Alice - Hero');
```

### API Call Assertions
```typescript
// API called with correct parameters
expect(mockedApiService.getCharacters).toHaveBeenCalledWith(1);

// API called correct number of times
expect(mockedApiService.getCharacters).toHaveBeenCalledTimes(2);
```

### State Assertions
```typescript
// Loading state
expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

// Error state
expect(screen.getByText('Failed to load stories')).toBeInTheDocument();

// Empty state
expect(screen.getByText('No characters yet')).toBeInTheDocument();
```

## Coverage Goals

- **Statements**: 100%
- **Branches**: 100%
- **Functions**: 100%
- **Lines**: 100%

## Test Maintenance

### Adding New Tests
1. Add test cases to existing test files
2. Update mock data if needed
3. Run tests to ensure they pass
4. Update documentation

### Updating Tests
1. Modify test data to match API changes
2. Update assertions for UI changes
3. Add new test cases for new features
4. Remove obsolete tests

## Troubleshooting

### Common Issues
1. **Tests not running**: Check Jest configuration
2. **Mock errors**: Verify mock setup
3. **DOM errors**: Check jsdom environment
4. **Async errors**: Use waitFor for async operations

### Debug Tips
1. Use `screen.debug()` to see current DOM
2. Use `console.log()` in tests for debugging
3. Check test output for specific error messages
4. Verify mock data matches real API responses

## Future Enhancements

### Potential Test Additions
- Visual regression tests
- Performance tests
- Accessibility tests
- Cross-browser tests
- Mobile responsiveness tests

### Test Improvements
- More edge cases
- Better error scenarios
- Performance benchmarks
- User interaction flows








