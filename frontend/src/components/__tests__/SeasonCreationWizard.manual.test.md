# Season Creation Wizard - Manual Testing Guide

## Overview
This guide provides step-by-step instructions for manually testing the Season Creation Wizard component with 3D model upload functionality.

## Test Environment Setup
1. Ensure the Django backend is running on `http://localhost:8000`
2. Ensure the React frontend is running on `http://localhost:3000`
3. Have valid 3D model files ready for testing:
   - GLB/GLTF files (max 50MB)
   - USDZ files (max 25MB)

## Test Cases

### 1. Basic Season Creation (No 3D Models)

**Steps:**
1. Navigate to a story management page: `http://localhost:3000/immersivecomics/story/{storyId}/manage/`
2. Click "Add Season" button
3. Fill in the form:
   - Season Title: "Test Season 1"
   - Season Number: 1
   - Release Date: Select today's date
   - Description: "This is a test season for manual testing"
4. Click "Create Season"

**Expected Results:**
- Form submits successfully
- Success message appears: "Season created successfully!"
- User is redirected back to story management page
- New season appears in the seasons list
- No 3D model files are uploaded

### 2. Season Creation with GLTF Model

**Steps:**
1. Navigate to season creation page
2. Fill in basic form fields:
   - Season Title: "Test Season with GLTF"
   - Season Number: 2
   - Release Date: Select a future date
   - Description: "Season with GLTF 3D model"
3. Upload a GLTF/GLB file:
   - Click "Choose File" for GLTF/GLB Model
   - Select a valid .glb or .gltf file (under 50MB)
4. Click "Create Season"

**Expected Results:**
- File selection shows file name and size
- Form submits successfully
- Success message appears
- Season is created with 3D model attached
- Model file is uploaded to the server

### 3. Season Creation with USDZ Model

**Steps:**
1. Navigate to season creation page
2. Fill in basic form fields:
   - Season Title: "Test Season with USDZ"
   - Season Number: 3
   - Release Date: Select a future date
   - Description: "Season with USDZ 3D model for AR/VR"
3. Upload a USDZ file:
   - Click "Choose File" for USDZ Model
   - Select a valid .usdz file (under 25MB)
4. Click "Create Season"

**Expected Results:**
- File selection shows file name and size
- Form submits successfully
- Success message appears
- Season is created with USDZ model attached
- Model file is uploaded to the server

### 4. Season Creation with Both Model Types

**Steps:**
1. Navigate to season creation page
2. Fill in basic form fields:
   - Season Title: "Test Season with Both Models"
   - Season Number: 4
   - Release Date: Select a future date
   - Description: "Season with both GLTF and USDZ models"
3. Upload both model files:
   - Select a GLTF/GLB file
   - Select a USDZ file
4. Click "Create Season"

**Expected Results:**
- Both file selections show file names and sizes
- Form submits successfully
- Success message appears
- Season is created with both model files attached
- Both files are uploaded to the server

### 5. Form Validation Tests

#### 5.1 Required Field Validation

**Steps:**
1. Navigate to season creation page
2. Leave all fields empty
3. Click "Create Season"

**Expected Results:**
- Warning message: "Please enter a season title"
- Form does not submit

#### 5.2 Season Number Validation

**Steps:**
1. Fill in title and description
2. Set Season Number to 0 or negative number
3. Click "Create Season"

**Expected Results:**
- Warning message: "Season number must be at least 1"
- Form does not submit

#### 5.3 File Type Validation - GLTF

**Steps:**
1. Fill in required fields
2. Upload a non-GLTF file (e.g., .txt, .jpg) for GLTF model
3. Click "Create Season"

**Expected Results:**
- Warning message: "GLTF model must be a .glb or .gltf file"
- Form does not submit

#### 5.4 File Type Validation - USDZ

**Steps:**
1. Fill in required fields
2. Upload a non-USDZ file (e.g., .txt, .jpg) for USDZ model
3. Click "Create Season"

**Expected Results:**
- Warning message: "USDZ model must be a .usdz file"
- Form does not submit

#### 5.5 File Size Validation - GLTF

**Steps:**
1. Fill in required fields
2. Upload a GLTF file larger than 50MB
3. Click "Create Season"

**Expected Results:**
- Warning message: "GLTF model file size cannot exceed 50MB"
- Form does not submit

#### 5.6 File Size Validation - USDZ

**Steps:**
1. Fill in required fields
2. Upload a USDZ file larger than 25MB
3. Click "Create Season"

**Expected Results:**
- Warning message: "USDZ model file size cannot exceed 25MB"
- Form does not submit

### 6. UI/UX Tests

#### 6.1 File Selection Display

**Steps:**
1. Upload a GLTF file
2. Upload a USDZ file
3. Observe the file information display

**Expected Results:**
- File names are displayed
- File sizes are shown in human-readable format (KB, MB)
- Success icons appear next to selected files
- File information is clearly visible

#### 6.2 Loading States

**Steps:**
1. Fill in form with valid data
2. Click "Create Season"
3. Observe the button state during submission

**Expected Results:**
- Button shows "Creating..." text
- Spinner appears in the button
- Button is disabled during submission
- Form cannot be submitted again while processing

#### 6.3 Error Handling

**Steps:**
1. Disconnect from the internet
2. Fill in form with valid data
3. Click "Create Season"

**Expected Results:**
- Error message appears
- Form remains accessible for retry
- User can modify data and try again

### 7. Navigation Tests

#### 7.1 Back Button

**Steps:**
1. Navigate to season creation page
2. Click the back button

**Expected Results:**
- User returns to story management page
- No data is lost (if form was partially filled)

#### 7.2 Cancel Button

**Steps:**
1. Fill in some form data
2. Click "Cancel" button

**Expected Results:**
- User returns to story management page
- Form data is not saved

### 8. Integration Tests

#### 8.1 Season List Update

**Steps:**
1. Create a new season
2. Return to story management page
3. Check the seasons list

**Expected Results:**
- New season appears in the list
- Season count is updated
- Season information is displayed correctly

#### 8.2 Database Persistence

**Steps:**
1. Create a season with 3D models
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
- **Season Titles**: Use descriptive names like "Test Season 1", "Action Packed Season", etc.
- **Descriptions**: Use meaningful descriptions that explain the season content
- **Season Numbers**: Use sequential numbers starting from 1
- **Release Dates**: Use future dates for realistic testing

## Common Issues to Watch For

1. **File Upload Failures**: Check network connectivity and file size limits
2. **Validation Errors**: Ensure all required fields are filled correctly
3. **Navigation Issues**: Verify back and cancel buttons work properly
4. **Loading States**: Ensure UI provides feedback during operations
5. **Error Messages**: Check that error messages are clear and helpful

## Success Criteria

- ✅ All form validations work correctly
- ✅ File uploads succeed for valid files
- ✅ File uploads fail gracefully for invalid files
- ✅ Success messages appear after successful creation
- ✅ Error messages appear for failed operations
- ✅ Navigation works as expected
- ✅ Created seasons appear in the story management page
- ✅ 3D model files are properly stored and accessible


