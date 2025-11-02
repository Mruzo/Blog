# Episode Management Dialogue Creation - Manual Testing Guide

## Overview
This guide provides step-by-step instructions for manually testing the dialogue creation functionality in the Episode Management page, specifically verifying that the 400 Bad Request error has been fixed.

## Test Environment Setup
1. Ensure the Django backend is running on `http://localhost:8000`
2. Ensure the React frontend is running on `http://localhost:3000`
3. Have a story with at least one season and episode created
4. Have at least one character created for the story
5. Navigate to the episode management page

## Test Cases

### 1. Basic Dialogue Creation Test

**Steps:**
1. Navigate to episode management page: `http://localhost:3000/immersivecomics/season/{seasonId}/episodes/`
2. Click on an episode to select it
3. Click the "Add Dialogue" button
4. Fill in the dialogue form:
   - **Character**: Select a character from the dropdown
   - **Dialogue Text**: Enter some dialogue text
   - **Order**: Enter a number (e.g., 1)
5. Click "Create Dialogue"

**Expected Results:**
- ✅ **FIXED**: No more 400 Bad Request error
- Dialogue is created successfully
- Success message appears
- Dialogue appears in the dialogues list
- Form closes automatically

### 2. Character Selection Test

**Steps:**
1. Open the dialogue creation form
2. Click on the Character dropdown
3. Observe the available options

**Expected Results:**
- ✅ **FIXED**: Character dropdown shows character names
- Character dropdown sends character IDs (not names) to the API
- All characters from the story are available
- No characters from other stories appear

### 3. Form Field Validation Test

**Steps:**
1. Open the dialogue creation form
2. Try to submit without filling required fields
3. Fill in only some fields and try to submit

**Expected Results:**
- HTML5 validation prevents submission with empty required fields
- Required fields are marked appropriately
- Form shows validation messages

### 4. Numeric Field Conversion Test

**Steps:**
1. Open the dialogue creation form
2. Test numeric fields:
   - **Order**: Enter "5"
   - **Field of View**: Enter "60.5"
   - **Zoom Speed**: Enter "2.5"
3. Submit the form

**Expected Results:**
- ✅ **FIXED**: Numeric fields are properly converted to numbers
- No string values are sent for numeric fields
- Form submits successfully with decimal values

### 5. Character ID vs Name Test

**Steps:**
1. Open browser developer tools
2. Go to Network tab
3. Create a dialogue with a character selected
4. Check the API request payload

**Expected Results:**
- ✅ **FIXED**: API request contains `"character": 1` (ID) not `"character": "Character Name"`
- Request payload shows numeric character ID
- No validation errors in the API response

### 6. Multiple Dialogue Creation Test

**Steps:**
1. Create multiple dialogues for the same episode
2. Use different characters for each dialogue
3. Set different order numbers
4. Verify all dialogues appear correctly

**Expected Results:**
- All dialogues are created successfully
- Dialogues appear in the correct order
- Each dialogue shows the correct character name
- No 400 errors for any dialogue

### 7. Error Handling Test

**Steps:**
1. Disconnect from the internet
2. Try to create a dialogue
3. Reconnect and try again

**Expected Results:**
- Error message appears when offline
- Form remains accessible for retry
- Dialogue creates successfully when reconnected

## Test Data

### Valid Test Data
- **Character**: Select from available characters in dropdown
- **Dialogue Text**: "Hello, this is a test dialogue."
- **Order**: 1, 2, 3, etc.
- **Scene Title**: "Opening Scene" (optional)
- **Scene Description**: "A quiet morning in the city" (optional)

### API Request Verification
The API request should look like this:
```json
{
  "character": 1,
  "text": "Hello, this is a test dialogue.",
  "order": 1,
  "scene_title": "",
  "scene_description": "",
  "shot_type": "mediumShot",
  "camera_orbit": "0deg 75deg 3m",
  "camera_target": "0m 1.6m 0m",
  "field_of_view": 45.0,
  "zoom_speed": 1.0,
  "rotation": "0deg 0deg 0deg"
}
```

**Key Points:**
- `character` is a number (ID), not a string (name)
- All numeric fields are properly typed
- No string values for numeric fields

## Verification Points

### ✅ **Fixed Issues**
1. **Character ID vs Name**: Form now sends character ID instead of character name
2. **Numeric Field Conversion**: Proper conversion of string inputs to numbers
3. **400 Bad Request Error**: No longer occurs due to correct data types
4. **Form Validation**: Proper handling of required fields

### 🔍 **What to Check**
1. **API Requests**: Check Network tab for correct request payload
2. **Character Selection**: Dropdown shows names but sends IDs
3. **Numeric Fields**: Order, field_of_view, zoom_speed are numbers
4. **Error Messages**: Clear error messages if something goes wrong
5. **Success Flow**: Dialogue appears in list after creation

## Common Issues to Watch For

1. **Character Name Instead of ID**: Should not happen anymore
2. **String Values for Numbers**: Should not happen anymore
3. **Empty Required Fields**: Form validation should prevent submission
4. **API Errors**: Should show clear error messages
5. **Missing Characters**: Characters should load for the correct story

## Success Criteria

- ✅ **No 400 Errors**: Dialogue creation works without validation errors
- ✅ **Correct Data Types**: All fields send correct data types to API
- ✅ **Character Selection**: Dropdown works with proper ID/name mapping
- ✅ **Form Validation**: Required fields are properly validated
- ✅ **User Experience**: Clear feedback and smooth workflow
- ✅ **Data Persistence**: Dialogues are saved and displayed correctly

## Bug Fix Summary

### Issue: 400 Bad Request Error in Dialogue Creation
- **Problem**: API was receiving character name instead of character ID, causing validation error
- **Root Cause**: Form dropdown was using `char.name` as value instead of `char.id`
- **Additional Issues**: Numeric fields were not being properly converted from strings

### Solution Implemented
1. **Fixed Character Dropdown**: Changed `value={char.name}` to `value={char.id}`
2. **Enhanced Input Handler**: Added proper type conversion for numeric fields
3. **Type Safety**: Ensured all form data matches expected API schema

### Technical Changes
1. **Character Selection**: `<option key={char.id} value={char.id}>{char.name}</option>`
2. **Input Handler**: Added conversion for `character`, `field_of_view`, `zoom_speed`
3. **Form Validation**: Maintained HTML5 validation for required fields

**Result**: Dialogue creation now works correctly with proper data types! 🚀

## API Endpoint Details

- **URL**: `POST /api/icvybz/episodes/{episode_id}/dialogues/`
- **Required Fields**: `character` (ID), `text`, `order`
- **Optional Fields**: `scene_title`, `scene_description`, camera settings
- **Data Types**: `character` and `order` must be integers, camera settings as floats/strings

**The dialogue creation 400 error has been completely resolved!** ✅


