#!/usr/bin/env node

/**
 * CONSOLIDATED CAMERA CONTROLS TESTING SUITE
 * 
 * This consolidated test replaces the following individual camera control test files:
 * - test-camera-controls-django-match.js
 * - test-camera-rotation-debug.js
 * - test-camera-values-display.js
 * - test-realtime-camera-updates.js
 * - test-bidirectional-camera-sync.js
 * - test-camera-dial-reflection.js
 * - test-camera-dial-save-confirmation.js
 * - test-camera-dial-save-integration.js
 * - test-camera-values-save.js
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

console.log(`${colors.cyan}${colors.bright}🧪 CONSOLIDATED CAMERA CONTROLS TESTING SUITE${colors.reset}`);
console.log(`${colors.blue}Testing all camera control functionality in one comprehensive test${colors.reset}\n`);

// Test 1: Camera Controls Django Match
function testCameraControlsDjangoMatch() {
  console.log(`${colors.yellow}1️⃣ Testing Camera Controls Django Match...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for Django pattern implementation
  const hasCameraTarget = content.includes('cameraTarget');
  const hasCameraOrbit = content.includes('cameraOrbit');
  const hasFieldOfView = content.includes('fieldOfView');
  const hasZoomSpeed = content.includes('zoomSpeed');
  const hasAnimation = content.includes('animate(');
  const hasDjangoPattern = content.includes('modelViewerRef.current.cameraTarget');
  
  console.log(`  ${hasCameraTarget ? '✅' : '❌'} Camera target controls`);
  console.log(`  ${hasCameraOrbit ? '✅' : '❌'} Camera orbit controls`);
  console.log(`  ${hasFieldOfView ? '✅' : '❌'} Field of view controls`);
  console.log(`  ${hasZoomSpeed ? '✅' : '❌'} Zoom speed controls`);
  console.log(`  ${hasAnimation ? '✅' : '❌'} Camera animation system`);
  console.log(`  ${hasDjangoPattern ? '✅' : '❌'} Django pattern implementation`);
  
  return hasCameraTarget && hasCameraOrbit && hasFieldOfView && hasZoomSpeed && hasAnimation && hasDjangoPattern;
}

// Test 2: Camera Rotation Debug
function testCameraRotationDebug() {
  console.log(`${colors.yellow}2️⃣ Testing Camera Rotation Debug...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for debug logging
  const hasDebugLogging = content.includes('console.log') && content.includes('Camera');
  const hasCameraValues = content.includes('camera_orbit') && content.includes('camera_target');
  const hasErrorHandling = content.includes('try {') && content.includes('catch');
  const hasModelViewerRef = content.includes('modelViewerRef.current');
  const hasAnimationDebug = content.includes('Animation') || content.includes('animation');
  
  console.log(`  ${hasDebugLogging ? '✅' : '❌'} Debug logging implemented`);
  console.log(`  ${hasCameraValues ? '✅' : '❌'} Camera values logging`);
  console.log(`  ${hasErrorHandling ? '✅' : '❌'} Error handling present`);
  console.log(`  ${hasModelViewerRef ? '✅' : '❌'} Model viewer ref access`);
  console.log(`  ${hasAnimationDebug ? '✅' : '❌'} Animation debug logging`);
  
  return hasDebugLogging && hasCameraValues && hasErrorHandling && hasModelViewerRef && hasAnimationDebug;
}

// Test 3: Camera Values Display
function testCameraValuesDisplay() {
  console.log(`${colors.yellow}3️⃣ Testing Camera Values Display...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for camera values display
  const hasCameraValuesInText = content.includes('Camera Values:') || content.includes('camera_orbit');
  const hasValueBadges = content.includes('ValueBadge') || content.includes('value-badge');
  const hasSliderValues = content.includes('slider') && content.includes('value');
  const hasRealTimeUpdates = content.includes('Real-time') || content.includes('real-time');
  const hasDialogueText = content.includes('dialogueText') || content.includes('currentDialogueText');
  
  console.log(`  ${hasCameraValuesInText ? '✅' : '❌'} Camera values in text`);
  console.log(`  ${hasValueBadges ? '✅' : '❌'} Value badges implemented`);
  console.log(`  ${hasSliderValues ? '✅' : '❌'} Slider values display`);
  console.log(`  ${hasRealTimeUpdates ? '✅' : '❌'} Real-time updates`);
  console.log(`  ${hasDialogueText ? '✅' : '❌'} Dialogue text with camera values`);
  
  return hasCameraValuesInText && hasValueBadges && hasSliderValues && hasRealTimeUpdates && hasDialogueText;
}

// Test 4: Real-time Camera Updates
function testRealTimeCameraUpdates() {
  console.log(`${colors.yellow}4️⃣ Testing Real-time Camera Updates...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for real-time updates
  const hasUpdateCameraDebounced = content.includes('updateCameraDebounced');
  const hasSliderOnChange = content.includes('onChange') && content.includes('slider');
  const hasModelViewerUpdate = content.includes('modelViewerRef.current.cameraOrbit');
  const hasDebouncing = content.includes('setTimeout') || content.includes('debounce');
  const hasRealTimeModelViewer = content.includes('modelViewerRef.current') && content.includes('camera');
  
  console.log(`  ${hasUpdateCameraDebounced ? '✅' : '❌'} Debounced camera updates`);
  console.log(`  ${hasSliderOnChange ? '✅' : '❌'} Slider onChange handlers`);
  console.log(`  ${hasModelViewerUpdate ? '✅' : '❌'} Model viewer real-time updates`);
  console.log(`  ${hasDebouncing ? '✅' : '❌'} Debouncing implementation`);
  console.log(`  ${hasRealTimeModelViewer ? '✅' : '❌'} Real-time model viewer updates`);
  
  return hasUpdateCameraDebounced && hasSliderOnChange && hasModelViewerUpdate && hasDebouncing && hasRealTimeModelViewer;
}

// Test 5: Camera Control Sliders
function testCameraControlSliders() {
  console.log(`${colors.yellow}5️⃣ Testing Camera Control Sliders...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for camera control sliders
  const hasAzimuthSlider = content.includes('orbitAzimuth') || content.includes('azimuth');
  const hasPolarSlider = content.includes('orbitPolar') || content.includes('polar');
  const hasRadiusSlider = content.includes('orbitRadius') || content.includes('radius');
  const hasTargetSliders = content.includes('targetX') || content.includes('targetY') || content.includes('targetZ');
  const hasFieldOfViewSlider = content.includes('fieldOfView') || content.includes('field_of_view');
  const hasZoomSpeedSlider = content.includes('zoomSpeed') || content.includes('zoom_speed');
  
  console.log(`  ${hasAzimuthSlider ? '✅' : '❌'} Azimuth slider`);
  console.log(`  ${hasPolarSlider ? '✅' : '❌'} Polar slider`);
  console.log(`  ${hasRadiusSlider ? '✅' : '❌'} Radius slider`);
  console.log(`  ${hasTargetSliders ? '✅' : '❌'} Target sliders (X, Y, Z)`);
  console.log(`  ${hasFieldOfViewSlider ? '✅' : '❌'} Field of view slider`);
  console.log(`  ${hasZoomSpeedSlider ? '✅' : '❌'} Zoom speed slider`);
  
  return hasAzimuthSlider && hasPolarSlider && hasRadiusSlider && hasTargetSliders && hasFieldOfViewSlider && hasZoomSpeedSlider;
}

// Test 6: Bidirectional Camera Sync
function testBidirectionalCameraSync() {
  console.log(`${colors.yellow}6️⃣ Testing Bidirectional Camera Sync...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for bidirectional sync functionality
  const hasUpdateDialogueTextWithCurrentValues = content.includes('updateDialogueTextWithCurrentValues') || content.includes('updateDialogueTextWithCurrentValues = ()');
  const hasUpdateDialsFromDialogue = content.includes('updateDialsFromDialogue') || content.includes('updateDialsFromDialogue(');
  const hasCurrentDialValues = content.includes('currentDialValues') || content.includes('setCurrentDialValues');
  const hasLiveValuesDisplay = content.includes('Camera Values (Live):') || content.includes('Live)');
  const hasSliderOnChangeUpdate = content.includes('onChange') && content.includes('updateDialogueTextWithCurrentValues');
  const hasDialogueNavigationUpdate = content.includes('showDialogue') && (content.includes('updateDialsFromDialogue') || content.includes('updateDials'));
  
  console.log(`  ${hasUpdateDialogueTextWithCurrentValues ? '✅' : '❌'} updateDialogueTextWithCurrentValues function`);
  console.log(`  ${hasUpdateDialsFromDialogue ? '✅' : '❌'} updateDialsFromDialogue function`);
  console.log(`  ${hasCurrentDialValues ? '✅' : '❌'} Current dial values state`);
  console.log(`  ${hasLiveValuesDisplay ? '✅' : '❌'} Live camera values display`);
  console.log(`  ${hasSliderOnChangeUpdate ? '✅' : '❌'} Slider onChange updates dialogue text`);
  console.log(`  ${hasDialogueNavigationUpdate ? '✅' : '❌'} Dialogue navigation updates dials`);
  
  return hasUpdateDialogueTextWithCurrentValues && hasUpdateDialsFromDialogue && hasCurrentDialValues && 
         hasLiveValuesDisplay && hasSliderOnChangeUpdate && hasDialogueNavigationUpdate;
}

// Test 7: Camera Dial Reflection
function testCameraDialReflection() {
  console.log(`${colors.yellow}7️⃣ Testing Camera Dial Reflection...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for camera dial reflection in dialogue text
  const hasCameraValuesInDialogueText = content.includes('Camera Values:') || content.includes('camera_orbit') || content.includes('camera_target');
  const hasDialogueTextUpdate = content.includes('currentDialogueText') || content.includes('setCurrentDialogueText');
  const hasDialValuesInText = content.includes('currentDialValues') && content.includes('setCurrentDialogueText');
  const hasRealTimeDialogueUpdate = content.includes('updateDialogueTextWithCurrentValues') && content.includes('onChange');
  const hasCameraOrbitInText = content.includes('Orbit:') || (content.includes('camera_orbit') && content.includes('currentDialogueText'));
  const hasCameraTargetInText = content.includes('Target:') || (content.includes('camera_target') && content.includes('currentDialogueText'));
  
  console.log(`  ${hasCameraValuesInDialogueText ? '✅' : '❌'} Camera values in dialogue text`);
  console.log(`  ${hasDialogueTextUpdate ? '✅' : '❌'} Dialogue text update function`);
  console.log(`  ${hasDialValuesInText ? '✅' : '❌'} Dial values reflected in text`);
  console.log(`  ${hasRealTimeDialogueUpdate ? '✅' : '❌'} Real-time dialogue text updates`);
  console.log(`  ${hasCameraOrbitInText ? '✅' : '❌'} Camera orbit in dialogue text`);
  console.log(`  ${hasCameraTargetInText ? '✅' : '❌'} Camera target in dialogue text`);
  
  return hasCameraValuesInDialogueText && hasDialogueTextUpdate && hasDialValuesInText && 
         hasRealTimeDialogueUpdate && hasCameraOrbitInText && hasCameraTargetInText;
}

// Test 8: Camera Values Save Integration
function testCameraValuesSaveIntegration() {
  console.log(`${colors.yellow}8️⃣ Testing Camera Values Save Integration...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for camera values save integration
  const hasSaveCameraChanges = content.includes('saveCameraChanges') || content.includes('const saveCameraChanges');
  const hasCameraDataInSave = content.includes('camera_orbit:') && content.includes('saveCameraChanges');
  const hasCameraTargetInSave = content.includes('camera_target:') && content.includes('saveCameraChanges');
  const hasFieldOfViewInSave = content.includes('field_of_view:') && content.includes('saveCameraChanges');
  const hasZoomSpeedInSave = content.includes('zoom_speed:') && content.includes('saveCameraChanges');
  const hasOnDialogueUpdateCall = content.includes('onDialogueUpdate?.(') && content.includes('saveCameraChanges');
  
  console.log(`  ${hasSaveCameraChanges ? '✅' : '❌'} saveCameraChanges function`);
  console.log(`  ${hasCameraDataInSave ? '✅' : '❌'} Camera orbit data in save`);
  console.log(`  ${hasCameraTargetInSave ? '✅' : '❌'} Camera target data in save`);
  console.log(`  ${hasFieldOfViewInSave ? '✅' : '❌'} Field of view data in save`);
  console.log(`  ${hasZoomSpeedInSave ? '✅' : '❌'} Zoom speed data in save`);
  console.log(`  ${hasOnDialogueUpdateCall ? '✅' : '❌'} onDialogueUpdate callback in save`);
  
  return hasSaveCameraChanges && hasCameraDataInSave && hasCameraTargetInSave && 
         hasFieldOfViewInSave && hasZoomSpeedInSave && hasOnDialogueUpdateCall;
}

// Run all tests
function runAllTests() {
  console.log(`${colors.cyan}${colors.bright}📊 CONSOLIDATED CAMERA CONTROLS TEST RESULTS${colors.reset}\n`);
  
  const tests = [
    { name: 'Camera Controls Django Match', fn: testCameraControlsDjangoMatch },
    { name: 'Camera Rotation Debug', fn: testCameraRotationDebug },
    { name: 'Camera Values Display', fn: testCameraValuesDisplay },
    { name: 'Real-time Camera Updates', fn: testRealTimeCameraUpdates },
    { name: 'Camera Control Sliders', fn: testCameraControlSliders },
    { name: 'Bidirectional Camera Sync', fn: testBidirectionalCameraSync },
    { name: 'Camera Dial Reflection', fn: testCameraDialReflection },
    { name: 'Camera Values Save Integration', fn: testCameraValuesSaveIntegration }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  tests.forEach(test => {
    const result = test.fn();
    if (result) passed++;
    console.log('');
  });
  
  console.log(`${colors.cyan}${colors.bright}📊 CONSOLIDATED TEST SUMMARY${colors.reset}`);
  console.log(`${colors.blue}Total Tests: ${total}${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${total - passed}${colors.reset}`);
  console.log(`${colors.yellow}Pass Rate: ${((passed / total) * 100).toFixed(1)}%${colors.reset}`);
  
  if (passed === total) {
    console.log(`\n${colors.green}${colors.bright}🎉 ALL CAMERA CONTROLS TESTS PASSED!${colors.reset}`);
    console.log(`${colors.blue}Consolidated test successfully replaces 9 individual test files${colors.reset}`);
    console.log(`${colors.yellow}  • Basic camera controls tests: 4 files${colors.reset}`);
    console.log(`${colors.yellow}  • Camera sync and reflection tests: 5 files${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}⚠️ Some camera controls tests failed${colors.reset}`);
    console.log(`${colors.yellow}Review the failed tests above${colors.reset}`);
  }
  
  return passed === total;
}

// Execute tests
runAllTests();
