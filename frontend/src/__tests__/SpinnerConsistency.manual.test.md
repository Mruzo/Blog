# Spinner Consistency Manual Test Plan

**Objective:** Verify that all pages use the same blue spinning circle (not text) for loading states.

---

## Test Cases

### Test Case 1: MyStudio Page Loading Spinner

**Steps:**
1. Ensure the Django backend is running (`python manage.py runserver 8000`).
2. Ensure the React frontend is running (`npm start`).
3. Navigate to `http://localhost:3000/immersivecomics/my-studio/`.

**Expected Results:**
- Should show a blue spinning circle (Bootstrap spinner-border)
- Should NOT show any text like "Loading studio..." or "Loading..."
- The spinner should be centered on the page
- The spinner should be blue color (#0d6efd)

---

### Test Case 2: Stories Page Loading Spinner

**Steps:**
1. Navigate to `http://localhost:3000/immersivecomics/stories/`.

**Expected Results:**
- Should show a blue spinning circle (Bootstrap spinner-border)
- Should NOT show any text like "Loading stories..." or "Loading..."
- The spinner should be centered on the page
- The spinner should be blue color (#0d6efd)

---

### Test Case 3: StoryManage Page Loading Spinner

**Steps:**
1. Navigate to `http://localhost:3000/immersivecomics/story/28/manage/`.

**Expected Results:**
- Should show a blue spinning circle (Bootstrap spinner-border)
- Should show "Loading story..." as accessible text (visually hidden)
- The spinner should be centered on the page
- The spinner should be blue color (#0d6efd)

---

### Test Case 4: StoryEdit Page Loading Spinner

**Steps:**
1. Navigate to `http://localhost:3000/immersivecomics/story/28/edit/`.

**Expected Results:**
- Should show a blue spinning circle (Bootstrap spinner-border)
- Should show "Loading story..." as accessible text (visually hidden)
- The spinner should be centered on the page
- The spinner should be blue color (#0d6efd)

---

### Test Case 5: Button Spinners (StoryCreate, PublishStep)

**Steps:**
1. Navigate to `http://localhost:3000/immersivecomics/create-story/`.
2. Fill in the story details and click "Create Story".
3. During the creation process, observe the button spinner.

**Expected Results:**
- Button should show a small blue spinning circle (spinner-border-sm)
- Should show text like "Creating..." or "Saving..."
- The spinner should be blue color (#0d6efd)
- Should NOT use FontAwesome spinners (fa-spinner)

---

### Test Case 6: PublishStep Button Spinners

**Steps:**
1. Complete the story creation wizard to reach the Publish step.
2. Click "Publish Story" or "Save as Draft" buttons.
3. Observe the button spinners during the process.

**Expected Results:**
- Buttons should show small blue spinning circles (spinner-border-sm)
- Should show text like "Publishing..." or "Saving..."
- The spinner should be blue color (#0d6efd)
- Should NOT use FontAwesome spinners (fa-spinner)

---

## Visual Verification Checklist

- ✅ All spinners are blue color (#0d6efd)
- ✅ All spinners use Bootstrap `spinner-border` class
- ✅ No FontAwesome `fa-spinner` icons are used
- ✅ Full-page spinners are centered
- ✅ Button spinners are small (`spinner-border-sm`)
- ✅ No visible text on full-page spinners (except accessible text)
- ✅ Button spinners have appropriate text labels
- ✅ All spinners have proper accessibility attributes (`role="status"`)

---

## Browser Developer Tools Verification

**To verify the CSS is applied correctly:**

1. Open browser developer tools (F12)
2. Inspect any spinner element
3. Check the computed styles:
   - `color` should be `rgb(13, 110, 253)` (blue)
   - `border-color` should be `rgb(13, 110, 253)` (blue)
   - `animation` should be `spinner-border 0.75s linear infinite`

**To verify no FontAwesome spinners:**

1. Search for `fa-spinner` in the DOM
2. Should find no elements with this class
3. All spinners should use `spinner-border` class instead

---

## Expected CSS Classes

**Full-page spinners:**
```html
<div class="spinner-border text-primary" role="status">
  <span class="sr-only">Loading message...</span>
</div>
```

**Button spinners:**
```html
<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
```

**NOT expected (should not exist):**
```html
<i class="fas fa-spinner fa-spin"></i>
```
