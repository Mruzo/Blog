# Loading Spinner Behavior Manual Test Guide

This guide tests the loading spinner behavior across all pages to ensure there are no flashing or glitch issues.

## Test Environment Setup

1. Start the Django backend server:
   ```bash
   cd /home/chris/applications/vybz/vybzapp
   source vybzenv/bin/activate
   python manage.py runserver
   ```

2. Start the React frontend server:
   ```bash
   cd /home/chris/applications/vybz/vybzapp/frontend
   npm start
   ```

## Test Cases

### 1. MyStudio Page Loading Behavior

**URL:** `http://localhost:3000/immersivecomics/my-studio/`

**Expected Behavior:**
- ✅ Page shows loading spinner initially
- ✅ Loading spinner disappears when data loads
- ✅ No flashing or glitch effects
- ✅ Stories list appears with all user stories (published and drafts)

**Test Steps:**
1. Navigate to MyStudio page
2. Observe loading spinner appears briefly
3. Verify spinner disappears when content loads
4. Check that all stories are displayed (including drafts)
5. Refresh the page multiple times to ensure consistent behavior

### 2. Stories Page Loading Behavior

**URL:** `http://localhost:3000/immersivecomics/stories/`

**Expected Behavior:**
- ✅ Page shows loading spinner initially
- ✅ Loading spinner disappears when data loads
- ✅ No flashing or glitch effects
- ✅ Only public stories are displayed

**Test Steps:**
1. Navigate to Stories page
2. Observe loading spinner appears briefly
3. Verify spinner disappears when content loads
4. Check that only public stories are displayed
5. Refresh the page multiple times to ensure consistent behavior

### 3. StoryManage Page Loading Behavior

**URL:** `http://localhost:3000/immersivecomics/story/{id}/manage/`

**Expected Behavior:**
- ✅ Page shows loading spinner initially
- ✅ Loading spinner disappears when data loads
- ✅ No flashing or glitch effects
- ✅ Story details are displayed correctly

**Test Steps:**
1. Navigate to a story manage page
2. Observe loading spinner appears briefly
3. Verify spinner disappears when content loads
4. Check that story details are displayed correctly
5. Refresh the page multiple times to ensure consistent behavior

### 4. StoryEdit Page Loading Behavior

**URL:** `http://localhost:3000/immersivecomics/story/{id}/edit/`

**Expected Behavior:**
- ✅ Page shows loading spinner initially
- ✅ Loading spinner disappears when data loads
- ✅ No flashing or glitch effects
- ✅ Edit form is populated with story data

**Test Steps:**
1. Navigate to a story edit page
2. Observe loading spinner appears briefly
3. Verify spinner disappears when content loads
4. Check that edit form is populated correctly
5. Refresh the page multiple times to ensure consistent behavior

### 5. StoryCreate Page Loading Behavior

**URL:** `http://localhost:3000/immersivecomics/story/create/`

**Expected Behavior:**
- ✅ No loading spinner on create page
- ✅ Form is immediately available for input
- ✅ No flashing or glitch effects

**Test Steps:**
1. Navigate to story create page
2. Verify no loading spinner appears
3. Check that form is immediately available
4. Refresh the page multiple times to ensure consistent behavior

### 6. Navigation Between Pages

**Expected Behavior:**
- ✅ No loading spinners when navigating between pages with cached data
- ✅ Loading spinners only appear when actually loading new data
- ✅ No flashing or glitch effects during navigation

**Test Steps:**
1. Navigate to MyStudio page (wait for data to load)
2. Navigate to Stories page
3. Navigate back to MyStudio page
4. Verify no unnecessary loading spinners appear
5. Repeat navigation between different pages

### 7. Loading Spinner Visual Consistency

**Expected Behavior:**
- ✅ All loading spinners use the same blue color (#0d6efd)
- ✅ All loading spinners use Bootstrap `spinner-border` class
- ✅ All loading spinners have proper accessibility attributes
- ✅ Loading text is visually hidden (using `sr-only` class)

**Test Steps:**
1. Navigate to each page that shows loading spinners
2. Verify spinner color is consistent blue
3. Check browser developer tools for proper CSS classes
4. Verify accessibility attributes are present
5. Check that loading text is visually hidden

## Common Issues to Watch For

### ❌ Flashing Loading Spinners
- **Symptom:** Loading spinner appears and disappears rapidly
- **Cause:** Usually caused by rapid state changes or unnecessary re-renders
- **Fix:** Ensure proper loading state management

### ❌ Loading Spinner Never Disappears
- **Symptom:** Loading spinner stays visible indefinitely
- **Cause:** Loading state not properly cleared after data loads
- **Fix:** Ensure `setIsLoading(false)` is called in all code paths

### ❌ Inconsistent Spinner Appearance
- **Symptom:** Different pages show different spinner styles
- **Cause:** Not using the centralized `LoadingSpinner` component
- **Fix:** Replace custom spinners with `LoadingSpinner` component

### ❌ Loading Text Visible
- **Symptom:** "Loading..." text is visible next to spinner
- **Cause:** Not using `sr-only` class or proper CSS hiding
- **Fix:** Ensure loading text uses `sr-only` class and proper CSS

## Browser Developer Tools Checks

1. **Console Logs:**
   - Check for any error messages
   - Verify API calls are being made correctly
   - Look for debugging logs from ApiContext

2. **Network Tab:**
   - Verify API calls are made only when necessary
   - Check for duplicate or unnecessary requests
   - Ensure responses are received correctly

3. **Elements Tab:**
   - Verify `LoadingSpinner` component structure
   - Check CSS classes are applied correctly
   - Ensure `sr-only` class is hiding text properly

## Performance Considerations

- Loading spinners should appear for a minimum of 200ms to avoid flashing
- API calls should be debounced to prevent rapid successive calls
- Cached data should be reused when possible to avoid unnecessary loading states
- Loading states should be cleared in all code paths (success, error, timeout)

## Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| MyStudio Loading | ⏳ | Test in progress |
| Stories Loading | ⏳ | Test in progress |
| StoryManage Loading | ⏳ | Test in progress |
| StoryEdit Loading | ⏳ | Test in progress |
| StoryCreate Loading | ⏳ | Test in progress |
| Navigation Behavior | ⏳ | Test in progress |
| Visual Consistency | ⏳ | Test in progress |

## Pass Criteria

- ✅ All pages show loading spinners only when actually loading data
- ✅ No flashing or glitch effects observed
- ✅ Loading spinners are visually consistent across all pages
- ✅ Navigation between pages is smooth without unnecessary loading states
- ✅ All loading spinners have proper accessibility attributes
- ✅ Loading text is visually hidden but accessible to screen readers


