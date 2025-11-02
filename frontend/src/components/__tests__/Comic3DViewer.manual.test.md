# Comic3DViewer Manual Test Guide

## Overview
This guide provides step-by-step instructions for manually testing the Comic3DViewer component to ensure it works correctly with 3D models, dialogue systems, and camera controls.

## Prerequisites
- React development server running
- Story with episodes and dialogues created
- 3D model files (GLTF/GLB) available for episodes
- Modern browser with WebGL support

## Test Scenarios

### 1. Basic Component Rendering
**Objective**: Verify the component renders correctly with basic data

**Steps**:
1. Navigate to a story management page with episodes
2. Locate the "3D Comic Viewer" section below the seasons
3. Verify the component header "3D Comic Viewer" is visible
4. Check that episode selection buttons are displayed

**Expected Results**:
- Component renders without errors
- Episode buttons are clickable
- No console errors

### 2. Episode Selection
**Objective**: Test episode selection functionality

**Steps**:
1. Click on an episode button (e.g., "Episode 1")
2. Verify the episode is selected (button changes to primary color)
3. Check that the 3D model container appears
4. Verify the "Start Episode" button is visible

**Expected Results**:
- Selected episode button is highlighted
- 3D model container is displayed
- Start button is visible and clickable

### 3. 3D Model Loading
**Objective**: Test 3D model loading and display

**Steps**:
1. Select an episode with a 3D model
2. Click "Start Episode" button
3. Wait for the model to load
4. Verify the model is displayed in the viewer
5. Check that the speech bubble appears with dialogue text

**Expected Results**:
- Model loads without errors
- 3D scene is visible and interactive
- Speech bubble shows first dialogue
- Navigation controls appear

### 4. Dialogue Navigation
**Objective**: Test dialogue progression and navigation

**Steps**:
1. Start an episode with multiple dialogues
2. Click the "Next" button to advance dialogue
3. Click the "Previous" button to go back
4. Verify dialogue text changes in the speech bubble
5. Check that camera position changes with each dialogue

**Expected Results**:
- Dialogue text updates correctly
- Camera smoothly transitions between positions
- Navigation buttons work in both directions
- Progress bar updates

### 5. Playback Controls
**Objective**: Test auto-playback functionality

**Steps**:
1. Start an episode
2. Click the play button to start auto-playback
3. Verify dialogues advance automatically
4. Click pause to stop playback
5. Test different playback speeds (1x, 1.5x)

**Expected Results**:
- Auto-playback works smoothly
- Play/pause toggle functions correctly
- Speed changes affect playback rate
- Playback stops at the end of episode

### 6. Edit Mode
**Objective**: Test camera editing functionality

**Steps**:
1. Select an episode and start it
2. Click "Edit Mode" button
3. Verify edit controls panel appears
4. Adjust camera orbit sliders (Azimuth, Polar, Radius)
5. Adjust camera target sliders (X, Y, Z)
6. Adjust field of view and zoom speed
7. Verify camera updates in real-time

**Expected Results**:
- Edit mode toggles correctly
- All sliders are functional
- Camera updates in real-time as sliders are moved
- Changes are applied to the 3D scene

### 7. Episode Summary
**Objective**: Test episode summary display

**Steps**:
1. Navigate to the last dialogue of an episode
2. Click "Next" button
3. Verify episode summary is displayed
4. Check that summary shows episode description
5. Verify navigation buttons are disabled appropriately

**Expected Results**:
- Summary appears at the end of episode
- Episode description is displayed
- Navigation is disabled when appropriate

### 8. Responsive Design
**Objective**: Test component responsiveness

**Steps**:
1. Test on desktop (1920x1080)
2. Test on tablet (768x1024)
3. Test on mobile (375x667)
4. Verify all controls are accessible
5. Check that 3D viewer scales appropriately

**Expected Results**:
- Component adapts to different screen sizes
- All controls remain accessible
- 3D viewer maintains aspect ratio
- Text remains readable

### 9. Error Handling
**Objective**: Test error scenarios

**Steps**:
1. Test with episode that has no 3D model
2. Test with episode that has no dialogues
3. Test with invalid model URL
4. Test with corrupted dialogue data

**Expected Results**:
- Graceful error handling
- Appropriate error messages
- Component doesn't crash
- Fallback content is displayed

### 10. Performance
**Objective**: Test component performance

**Steps**:
1. Load episode with many dialogues
2. Test rapid navigation between dialogues
3. Test edit mode with frequent slider changes
4. Monitor browser performance
5. Check for memory leaks

**Expected Results**:
- Smooth performance with many dialogues
- No significant lag during navigation
- Edit mode remains responsive
- No memory leaks detected

## Browser Compatibility
Test the component in the following browsers:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Mobile Testing
Test on the following devices:
- iPhone (Safari)
- Android (Chrome)
- iPad (Safari)

## Common Issues and Solutions

### Issue: 3D Model Not Loading
**Symptoms**: Model viewer shows loading state indefinitely
**Solutions**:
- Check model URL is valid and accessible
- Verify model file format (GLTF/GLB)
- Check browser console for CORS errors
- Ensure model-viewer script is loaded

### Issue: Camera Not Updating
**Symptoms**: Camera position doesn't change with dialogue
**Solutions**:
- Check dialogue data format
- Verify camera_orbit and camera_target values
- Check model-viewer element reference
- Ensure model is fully loaded

### Issue: Edit Mode Not Working
**Symptoms**: Sliders don't affect camera
**Solutions**:
- Verify edit mode is properly enabled
- Check dialogue data structure
- Ensure onDialogueUpdate callback is provided
- Check slider event handlers

### Issue: Performance Issues
**Symptoms**: Laggy navigation or slow rendering
**Solutions**:
- Reduce model complexity
- Optimize dialogue data
- Check for memory leaks
- Use smaller model files

## Test Data Requirements

### Episode Data
```json
{
  "id": 1,
  "title": "Episode 1",
  "episode_number": 1,
  "description": "Test episode description",
  "season": 1,
  "model_url": "https://example.com/model.gltf",
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

### Dialogue Data
```json
{
  "id": 1,
  "character": 1,
  "text": "Hello, this is a test dialogue",
  "camera_orbit": "0deg 75deg 3m",
  "camera_target": "0m 1.6m 0m",
  "field_of_view": 45,
  "zoom_speed": 1.0,
  "episode": 1,
  "order": 1,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

## Success Criteria
- All test scenarios pass
- No console errors
- Smooth user experience
- Responsive design works
- Edit mode functions correctly
- Performance is acceptable
- Cross-browser compatibility

## Notes
- Test with real 3D models when possible
- Verify dialogue data matches expected format
- Check that all callbacks are properly implemented
- Ensure proper cleanup of intervals and event listeners
- Test with various screen sizes and orientations


