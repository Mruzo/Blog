# MyStudio Delete Functionality - Manual Test Guide

## Overview
This guide tests the delete functionality for stories in the MyStudio page, ensuring only the story creator can delete their own stories.

## Prerequisites
- User is logged in
- User has at least one story in their studio
- Backend server is running on port 8000
- Frontend server is running on port 3000

## Test Steps

### 1. Access MyStudio Page
1. Navigate to `http://localhost:3000/immersivecomics/my-studio/`
2. Verify the page loads with your stories displayed
3. Verify you can see the debug counter showing total stories

### 2. Test Delete Button Visibility
1. Look for the red delete button (trash icon) in the top-right corner of each story card
2. Verify the delete button is visible and has a red outline style
3. Verify the button has a tooltip "Delete story" when you hover over it

### 3. Test Delete Confirmation Dialog
1. Click the red delete button (trash icon) in the top-right corner
2. Verify a confirmation dialog appears with:
   - Message: "Are you sure you want to delete '[Story Title]'? This action cannot be undone."
   - "OK" and "Cancel" buttons
3. Click "Cancel"
4. Verify the dialog closes and the story is not deleted
5. Click the delete button again
6. Click "OK" in the confirmation dialog

### 4. Test Successful Deletion
1. After clicking "OK" in the confirmation dialog
2. Verify a success message appears: "Story '[Story Title]' has been deleted successfully."
3. Verify the story disappears from the list immediately
4. Verify the debug counter shows one fewer story
5. Verify the success message disappears after 5 seconds

### 5. Test Error Handling
1. If you have a story that might cause an error (optional test)
2. Try to delete it and verify error handling works
3. Verify an error message appears: "Failed to delete story. Please try again."

### 6. Test Security (Backend Verification)
1. Create a story with one user account
2. Log in with a different user account
3. Navigate to MyStudio
4. Verify you cannot see the other user's stories
5. If you somehow access another user's story, verify the delete button would fail (this tests backend security)

## Expected Results

### ✅ Success Criteria
- Delete button appears in top-right corner of all user's story cards
- Delete button has red outline style and trash icon
- Confirmation dialog appears before deletion
- Story is removed from list immediately after confirmation
- Success message is displayed
- Debug counter updates correctly
- Only the story creator can see and delete their stories
- Manage and Edit buttons remain at the bottom of each card

### ❌ Failure Indicators
- Delete button not visible in top-right corner
- No confirmation dialog
- Story not removed from list
- No success/error message
- Other users can see/delete stories they didn't create
- Page crashes or shows errors
- Manage/Edit buttons missing from bottom of cards

## Security Notes
- The backend API endpoint `/stories/<id>/` filters by `user=self.request.user`
- This ensures users can only delete their own stories
- The frontend delete button is only shown on the user's own stories
- Double security: both frontend and backend enforce user ownership

## Browser Console Verification
1. Open browser developer tools (F12)
2. Go to Console tab
3. When deleting a story, verify you see:
   - API request to DELETE `/stories/<id>/`
   - API response with 204 status (No Content)
   - No error messages

## Test Data Cleanup
- After testing, you may want to recreate any deleted test stories
- Use the "Create New Story" button to add stories back if needed
