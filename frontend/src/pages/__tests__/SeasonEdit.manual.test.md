# Season Edit - Manual Testing Guide

## Overview
This guide provides step-by-step instructions for manually testing the Season Edit functionality, including 3D model uploads and the fix for the 500 Internal Server Error.

## Test Environment Setup
1. Ensure the Django backend is running on `http://localhost:8000`
2. Ensure the React frontend is running on `http://localhost:3000`
3. Have a story with at least one season created
4. Have valid 3D model files ready for testing:
   - GLB/GLTF files (max 50MB)
   - USDZ files (max 25MB)

## Test Cases

### 1. Basic Season Edit (No 3D Models)

**Steps:**
1. Navigate to a story management page: `http://localhost:3000/immersivecomics/story/{storyId}/manage/`
2. Click the "Edit" button on any season card
3. Verify the form is pre-populated with existing season data
4. Modify the season details:
   - Season Title: "Updated Season Title"
   - Season Number: 2
   - Release Date: Select a different date
   - Description: "Updated season description"
5. Click "Update Season"

**Expected Results:**
- Form loads with existing data pre-populated
- Form submits successfully
- Success message appears: "Season updated successfully!"
- User is redirected back to story management page
- Updated season appears with new details

### 2. Season Edit with GLTF Model Upload

**Steps:**
1. Navigate to season edit page
2. Verify current model files are displayed (if any)
3. Upload a new GLTF/GLB file:
   - Click "Choose File" for GLTF/GLB Model
   - Select a valid .glb or .gltf file (under 50MB)
4. Update other fields as needed
5. Click "Update Season"

**Expected Results:**
- Current model files are shown with file names
- New file selection shows file name and size
- Form submits successfully
- Success message appears
- Season is updated with new 3D model attached
- Model file is uploaded to the server

### 3. Season Edit with USDZ Model Upload

**Steps:**
1. Navigate to season edit page
2. Upload a new USDZ file:
   - Click "Choose File" for USDZ Model
   - Select a valid .usdz file (under 25MB)
3. Update other fields as needed
4. Click "Update Season"

**Expected Results:**
- File selection shows file name and size
- Form submits successfully
- Success message appears
- Season is updated with new USDZ model attached
- Model file is uploaded to the server

### 4. Season Edit with Both Model Types

**Steps:**
1. Navigate to season edit page
2. Upload both model files:
   - Select a GLTF/GLB file
   - Select a USDZ file
3. Update other fields as needed
4. Click "Update Season"

**Expected Results:**
- Both file selections show file names and sizes
- Form submits successfully
- Success message appears
- Season is updated with both model files attached
- Both files are uploaded to the server

### 5. Form Validation Tests

#### 5.1 Required Field Validation

**Steps:**
1. Navigate to season edit page
2. Clear the title field
3. Click "Update Season"

**Expected Results:**
- Warning message: "Please enter a season title"
- Form does not submit

#### 5.2 Season Number Validation

**Steps:**
1. Set Season Number to 0 or negative number
2. Click "Update Season"

**Expected Results:**
- Warning message: "Season number must be at least 1"
- Form does not submit

#### 5.3 File Type Validation - GLTF

**Steps:**
1. Upload a non-GLTF file (e.g., .txt, .jpg) for GLTF model
2. Click "Update Season"

**Expected Results:**
- Warning message: "GLTF model must be a .glb or .gltf file"
- Form does not submit

#### 5.4 File Type Validation - USDZ

**Steps:**
1. Upload a non-USDZ file (e.g., .txt, .jpg) for USDZ model
2. Click "Update Season"

**Expected Results:**
- Warning message: "USDZ model must be a .usdz file"
- Form does not submit

#### 5.5 File Size Validation - GLTF

**Steps:**
1. Upload a GLTF file larger than 50MB
2. Click "Update Season"

**Expected Results:**
- Warning message: "GLTF model file size cannot exceed 50MB"
- Form does not submit

#### 5.6 File Size Validation - USDZ

**Steps:**
1. Upload a USDZ file larger than 25MB
2. Click "Update Season"

**Expected Results:**
- Warning message: "USDZ model file size cannot exceed 25MB"
- Form does not submit

### 6. Error Handling Tests

#### 6.1 500 Internal Server Error (Fixed)

**Steps:**
1. Navigate to season edit page
2. Upload a GLB file
3. Click "Update Season"

**Expected Results:**
- ✅ **FIXED**: No more 500 Internal Server Error
- Season updates successfully
- Success message appears

#### 6.2 Network Error Handling

**Steps:**
1. Disconnect from the internet
2. Navigate to season edit page
3. Make changes and click "Update Season"

**Expected Results:**
- Error message appears
- Form remains accessible for retry
- User can modify data and try again

### 7. UI/UX Tests

#### 7.1 Form Pre-population

**Steps:**
1. Navigate to season edit page
2. Observe the form fields

**Expected Results:**
- All fields are pre-populated with existing season data
- Current model files are displayed (if any)
- Form is ready for editing

#### 7.2 File Selection Display

**Steps:**
1. Upload a GLTF file
2. Upload a USDZ file
3. Observe the file information display

**Expected Results:**
- File names are displayed
- File sizes are shown in human-readable format (KB, MB)
- Success icons appear next to selected files
- Current files are shown with "Current:" prefix

#### 7.3 Loading States

**Steps:**
1. Fill in form with valid data
2. Click "Update Season"
3. Observe the button state during submission

**Expected Results:**
- Button shows "Updating..." text
- Spinner appears in the button
- Button is disabled during submission
- Form cannot be submitted again while processing

### 8. Navigation Tests

#### 8.1 Back Button

**Steps:**
1. Navigate to season edit page
2. Click the back button

**Expected Results:**
- User returns to story management page
- No data is lost (if form was partially filled)

#### 8.2 Cancel Button

**Steps:**
1. Make some changes to the form
2. Click "Cancel" button

**Expected Results:**
- User returns to story management page
- Form data is not saved

#### 8.3 Success Redirect

**Steps:**
1. Update a season successfully
2. Wait for the success message

**Expected Results:**
- Success message appears
- User is automatically redirected to story management page
- Updated season is visible in the list

### 9. Integration Tests

#### 9.1 Season List Update

**Steps:**
1. Update a season
2. Return to story management page
3. Check the seasons list

**Expected Results:**
- Updated season appears in the list
- Season information is displayed correctly
- Changes are persisted

#### 9.2 Database Persistence

**Steps:**
1. Update a season with 3D models
2. Refresh the page
3. Check if the season and models persist

**Expected Results:**
- Season data is saved in the database
- 3D model files are stored on the server
- Model URLs are accessible

## Test Data

### Valid Test Files
- **GLTF/GLB**: Use files under 50MB with .glb or .gltf extensions
- **USDZ**: Use files under 25MB with .usdz extension

### Test Form Data
- **Season Titles**: Use descriptive names like "Updated Season 1", "Action Packed Season", etc.
- **Descriptions**: Use meaningful descriptions that explain the season content
- **Season Numbers**: Use sequential numbers starting from 1
- **Release Dates**: Use future dates for realistic testing

## Common Issues to Watch For

1. **500 Internal Server Error**: ✅ **FIXED** - No longer occurs with GLB file uploads
2. **File Upload Failures**: Check network connectivity and file size limits
3. **Validation Errors**: Ensure all required fields are filled correctly
4. **Navigation Issues**: Verify back and cancel buttons work properly
5. **Loading States**: Ensure UI provides feedback during operations
6. **Error Messages**: Check that error messages are clear and helpful

## Success Criteria

- ✅ **500 Error Fixed**: Season updates work with 3D model uploads
- ✅ **Form Pre-population**: Existing season data loads correctly
- ✅ **File Uploads**: GLTF and USDZ files upload successfully
- ✅ **Validation**: All form validations work correctly
- ✅ **Navigation**: Back and cancel buttons work as expected
- ✅ **Success Messages**: Clear feedback after successful updates
- ✅ **Error Handling**: Graceful handling of errors
- ✅ **Database Persistence**: Changes are saved and persist

## Bug Fix Summary

### Issue: 500 Internal Server Error
- **Problem**: Django API was using incorrect field reference `story__author` instead of `comic__user`
- **Root Cause**: Season model has `comic` field, not `story` field
- **Fix**: Updated `SeasonDetailView.get_queryset()` to use `comic__user`
- **Additional Fix**: Updated `EpisodeDetailView.get_queryset()` to use `season__comic__user`
- **Result**: Season updates now work correctly with 3D model uploads


