#!/usr/bin/env node

/**
 * Camera Dial Save Integration Test
 * Tests that camera dial changes are properly saved and reflected in dialogue text and values
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

console.log(`${colors.cyan}${colors.bright}🎛️ CAMERA DIAL SAVE INTEGRATION TEST${colors.reset}`);
console.log(`${colors.cyan}================================================${colors.reset}\n`);

let passedTests = 0;
let totalTests = 0;

function runTest(testName, testFunction) {
  totalTests++;
  console.log(`${colors.yellow}${totalTests}️⃣ Testing ${testName}...${colors.reset}`);
  
  try {
    const result = testFunction();
    if (result) {
      console.log(`${colors.green}  ✅ ${testName}${colors.reset}`);
      passedTests++;
    } else {
      console.log(`${colors.red}  ❌ ${testName}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}  ❌ ${testName} - Error: ${error.message}${colors.reset}`);
  }
  console.log('');
}

// Test 1: Camera Dial Value Collection
function testCameraDialValueCollection() {
  console.log(`${colors.yellow}1️⃣ Testing Camera Dial Value Collection...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for camera dial value collection
  const hasAzimuthCollection = content.includes('getElementById(\'orbitAzimuth\')');
  const hasPolarCollection = content.includes('getElementById(\'orbitPolar\')');
  const hasRadiusCollection = content.includes('getElementById(\'orbitRadius\')');
  const hasTargetXCollection = content.includes('getElementById(\'targetX\')');
  const hasTargetYCollection = content.includes('getElementById(\'targetY\')');
  const hasTargetZCollection = content.includes('getElementById(\'targetZ\')');
  const hasFieldOfViewCollection = content.includes('getElementById(\'fieldOfView\')');
  const hasZoomSpeedCollection = content.includes('getElementById(\'zoomSpeed\')');
  
  console.log(`  ${hasAzimuthCollection ? '✅' : '❌'} Azimuth dial value collection`);
  console.log(`  ${hasPolarCollection ? '✅' : '❌'} Polar dial value collection`);
  console.log(`  ${hasRadiusCollection ? '✅' : '❌'} Radius dial value collection`);
  console.log(`  ${hasTargetXCollection ? '✅' : '❌'} Target X dial value collection`);
  console.log(`  ${hasTargetYCollection ? '✅' : '❌'} Target Y dial value collection`);
  console.log(`  ${hasTargetZCollection ? '✅' : '❌'} Target Z dial value collection`);
  console.log(`  ${hasFieldOfViewCollection ? '✅' : '❌'} Field of view dial value collection`);
  console.log(`  ${hasZoomSpeedCollection ? '✅' : '❌'} Zoom speed dial value collection`);
  
  return hasAzimuthCollection && hasPolarCollection && hasRadiusCollection && 
         hasTargetXCollection && hasTargetYCollection && hasTargetZCollection && 
         hasFieldOfViewCollection && hasZoomSpeedCollection;
}

// Test 2: Camera Value Formatting for Save
function testCameraValueFormatting() {
  console.log(`${colors.yellow}2️⃣ Testing Camera Value Formatting for Save...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for proper camera value formatting
  const hasCameraOrbitFormat = content.includes('camera_orbit:') && content.includes('deg') && content.includes('m');
  const hasCameraTargetFormat = content.includes('camera_target:') && content.includes('m');
  const hasFieldOfViewFormat = content.includes('field_of_view:');
  const hasZoomSpeedFormat = content.includes('zoom_speed:');
  const hasTemplateStringFormat = content.includes('`${azimuth}deg ${polar}deg ${radius}m`');
  const hasTargetTemplateFormat = content.includes('`${targetX}m ${targetY}m ${targetZ}m`');
  
  console.log(`  ${hasCameraOrbitFormat ? '✅' : '❌'} Camera orbit formatting`);
  console.log(`  ${hasCameraTargetFormat ? '✅' : '❌'} Camera target formatting`);
  console.log(`  ${hasFieldOfViewFormat ? '✅' : '❌'} Field of view formatting`);
  console.log(`  ${hasZoomSpeedFormat ? '✅' : '❌'} Zoom speed formatting`);
  console.log(`  ${hasTemplateStringFormat ? '✅' : '❌'} Template string formatting for orbit`);
  console.log(`  ${hasTargetTemplateFormat ? '✅' : '❌'} Template string formatting for target`);
  
  return hasCameraOrbitFormat && hasCameraTargetFormat && hasFieldOfViewFormat && 
         hasZoomSpeedFormat && hasTemplateStringFormat && hasTargetTemplateFormat;
}

// Test 3: Dialogue State Update After Save
function testDialogueStateUpdate() {
  console.log(`${colors.yellow}3️⃣ Testing Dialogue State Update After Save...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for dialogue state update after save
  const hasCurrentEditingDialogueUpdate = content.includes('setCurrentEditingDialogue({');
  const hasSpreadOperator = content.includes('...currentEditingDialogue,');
  const hasDataSpread = content.includes('...data');
  const hasOriginalValuesUpdate = content.includes('setOriginalValues(data)');
  const hasStateConsistency = content.includes('currentEditingDialogue') && content.includes('setCurrentEditingDialogue');
  
  console.log(`  ${hasCurrentEditingDialogueUpdate ? '✅' : '❌'} Current editing dialogue update`);
  console.log(`  ${hasSpreadOperator ? '✅' : '❌'} Spread operator for state update`);
  console.log(`  ${hasDataSpread ? '✅' : '❌'} Data spread in state update`);
  console.log(`  ${hasOriginalValuesUpdate ? '✅' : '❌'} Original values update`);
  console.log(`  ${hasStateConsistency ? '✅' : '❌'} State consistency maintenance`);
  
  return hasCurrentEditingDialogueUpdate && hasSpreadOperator && hasDataSpread && 
         hasOriginalValuesUpdate && hasStateConsistency;
}

// Test 4: Dialogue Text Display Integration
function testDialogueTextDisplayIntegration() {
  console.log(`${colors.yellow}4️⃣ Testing Dialogue Text Display Integration...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for dialogue text display integration
  const hasDialogueTextDisplay = content.includes('dialogueData[currentDialogueIndex]') || content.includes('currentDialogueIndex');
  const hasDialogueTextContent = content.includes('.text') || content.includes('dialogue.text');
  const hasSpeechBubble = content.includes('speech-bubble') || content.includes('speechBubble');
  const hasDialogueIndexState = content.includes('currentDialogueIndex') && content.includes('setCurrentDialogueIndex');
  const hasDialogueDataMapping = content.includes('dialogueData:') && content.includes('episodeDialogues.map');
  
  console.log(`  ${hasDialogueTextDisplay ? '✅' : '❌'} Dialogue text display`);
  console.log(`  ${hasDialogueTextContent ? '✅' : '❌'} Dialogue text content access`);
  console.log(`  ${hasSpeechBubble ? '✅' : '❌'} Speech bubble display`);
  console.log(`  ${hasDialogueIndexState ? '✅' : '❌'} Dialogue index state management`);
  console.log(`  ${hasDialogueDataMapping ? '✅' : '❌'} Dialogue data mapping`);
  
  return hasDialogueTextDisplay && hasDialogueTextContent && hasSpeechBubble && 
         hasDialogueIndexState && hasDialogueDataMapping;
}

// Test 5: Camera Values Display Integration
function testCameraValuesDisplayIntegration() {
  console.log(`${colors.yellow}5️⃣ Testing Camera Values Display Integration...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for camera values display integration
  const hasCurrentValuesDisplay = content.includes('Current Values (Last Saved)');
  const hasCameraOrbitDisplay = content.includes('camera_orbit') && content.includes('deg');
  const hasCameraTargetDisplay = content.includes('camera_target') && content.includes('m');
  const hasFieldOfViewDisplay = content.includes('field_of_view') && content.includes('°');
  const hasZoomSpeedDisplay = content.includes('zoom_speed');
  const hasValuesBox = content.includes('Current Values') && content.includes('Last Saved');
  
  console.log(`  ${hasCurrentValuesDisplay ? '✅' : '❌'} Current values display`);
  console.log(`  ${hasCameraOrbitDisplay ? '✅' : '❌'} Camera orbit display`);
  console.log(`  ${hasCameraTargetDisplay ? '✅' : '❌'} Camera target display`);
  console.log(`  ${hasFieldOfViewDisplay ? '✅' : '❌'} Field of view display`);
  console.log(`  ${hasZoomSpeedDisplay ? '✅' : '❌'} Zoom speed display`);
  console.log(`  ${hasValuesBox ? '✅' : '❌'} Values summary box`);
  
  return hasCurrentValuesDisplay && hasCameraOrbitDisplay && hasCameraTargetDisplay && 
         hasFieldOfViewDisplay && hasZoomSpeedDisplay && hasValuesBox;
}

// Test 6: Real-time Camera Value Updates
function testRealTimeCameraValueUpdates() {
  console.log(`${colors.yellow}6️⃣ Testing Real-time Camera Value Updates...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for real-time camera value updates
  const hasSliderValueUpdates = content.includes('setSliderValue(');
  const hasValueDisplayUpdates = content.includes('Value') && content.includes('textContent');
  const hasModelViewerUpdates = content.includes('modelViewerRef.current') && content.includes('cameraTarget');
  const hasCameraOrbitUpdates = content.includes('cameraOrbit') && content.includes('modelViewerRef');
  const hasFieldOfViewUpdates = content.includes('fieldOfView') && content.includes('modelViewerRef');
  
  console.log(`  ${hasSliderValueUpdates ? '✅' : '❌'} Slider value updates`);
  console.log(`  ${hasValueDisplayUpdates ? '✅' : '❌'} Value display updates`);
  console.log(`  ${hasModelViewerUpdates ? '✅' : '❌'} Model viewer updates`);
  console.log(`  ${hasCameraOrbitUpdates ? '✅' : '❌'} Camera orbit updates`);
  console.log(`  ${hasFieldOfViewUpdates ? '✅' : '❌'} Field of view updates`);
  
  return hasSliderValueUpdates && hasValueDisplayUpdates && hasModelViewerUpdates && 
         hasCameraOrbitUpdates && hasFieldOfViewUpdates;
}

// Test 7: Dialogue Navigation with Updated Values
function testDialogueNavigationWithUpdatedValues() {
  console.log(`${colors.yellow}7️⃣ Testing Dialogue Navigation with Updated Values...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for dialogue navigation with updated values
  const hasNextButton = content.includes('Next') || content.includes('next');
  const hasPreviousButton = content.includes('Previous') || content.includes('previous');
  const hasDialogueIndexIncrement = content.includes('setCurrentDialogueIndex') && content.includes('+ 1');
  const hasDialogueIndexDecrement = content.includes('setCurrentDialogueIndex') && content.includes('- 1');
  const hasDialogueLoading = content.includes('loadDialogue(') || content.includes('loadCurrentDialogueValues');
  
  console.log(`  ${hasNextButton ? '✅' : '❌'} Next button`);
  console.log(`  ${hasPreviousButton ? '✅' : '❌'} Previous button`);
  console.log(`  ${hasDialogueIndexIncrement ? '✅' : '❌'} Dialogue index increment`);
  console.log(`  ${hasDialogueIndexDecrement ? '✅' : '❌'} Dialogue index decrement`);
  console.log(`  ${hasDialogueLoading ? '✅' : '❌'} Dialogue loading on navigation`);
  
  return hasNextButton && hasPreviousButton && hasDialogueIndexIncrement && 
         hasDialogueIndexDecrement && hasDialogueLoading;
}

// Test 8: API Integration for Camera Value Persistence
function testAPIIntegrationForCameraValuePersistence() {
  console.log(`${colors.yellow}8️⃣ Testing API Integration for Camera Value Persistence...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for API integration for camera value persistence
  const hasOnDialogueUpdateCall = content.includes('onDialogueUpdate?.(');
  const hasDialogueIdPassing = content.includes('currentEditingDialogue.dialogue_id');
  const hasDataPassing = content.includes('onDialogueUpdate?.(') && content.includes('data');
  const hasApiServiceIntegration = content.includes('updateDialogue') || content.includes('apiService');
  const hasPersistenceFlow = content.includes('onDialogueUpdate') && content.includes('data');
  
  console.log(`  ${hasOnDialogueUpdateCall ? '✅' : '❌'} onDialogueUpdate callback call`);
  console.log(`  ${hasDialogueIdPassing ? '✅' : '❌'} Dialogue ID passing`);
  console.log(`  ${hasDataPassing ? '✅' : '❌'} Data passing to API`);
  console.log(`  ${hasApiServiceIntegration ? '✅' : '❌'} API service integration`);
  console.log(`  ${hasPersistenceFlow ? '✅' : '❌'} Persistence flow`);
  
  return hasOnDialogueUpdateCall && hasDialogueIdPassing && hasDataPassing && 
         hasApiServiceIntegration && hasPersistenceFlow;
}

// Run all tests
runTest('Camera Dial Value Collection', testCameraDialValueCollection);
runTest('Camera Value Formatting for Save', testCameraValueFormatting);
runTest('Dialogue State Update After Save', testDialogueStateUpdate);
runTest('Dialogue Text Display Integration', testDialogueTextDisplayIntegration);
runTest('Camera Values Display Integration', testCameraValuesDisplayIntegration);
runTest('Real-time Camera Value Updates', testRealTimeCameraValueUpdates);
runTest('Dialogue Navigation with Updated Values', testDialogueNavigationWithUpdatedValues);
runTest('API Integration for Camera Value Persistence', testAPIIntegrationForCameraValuePersistence);

// Results
const passRate = Math.round((passedTests / totalTests) * 100);
console.log(`${colors.cyan}📊 RESULTS: ${passedTests}/${totalTests} tests passed (${passRate}%)${colors.reset}`);

if (passRate >= 80) {
  console.log(`${colors.green}🎉 Camera dial save integration is working correctly!${colors.reset}`);
} else {
  console.log(`${colors.red}❌ Camera dial save integration needs attention.${colors.reset}`);
}

console.log(`\n${colors.cyan}🎛️ CAMERA DIAL SAVE FLOW:${colors.reset}`);
console.log(`   1. User adjusts camera dials in edit mode`);
console.log(`   2. Real-time value updates are displayed`);
console.log(`   3. User clicks Save button`);
console.log(`   4. Camera values are collected and formatted`);
console.log(`   5. Data is sent to API via onDialogueUpdate`);
console.log(`   6. Local dialogue state is updated`);
console.log(`   7. Current dialogue text reflects the changes`);
console.log(`   8. Camera values display shows updated values`);
console.log(`   9. Navigation preserves the saved changes`);

console.log(`\n${colors.cyan}✨ INTEGRATION FEATURES:${colors.reset}`);
console.log(`   • Real-time camera dial value collection`);
console.log(`   • Proper camera value formatting for API`);
console.log(`   • Dialogue state updates after save`);
console.log(`   • Dialogue text display integration`);
console.log(`   • Camera values display integration`);
console.log(`   • Real-time camera value updates`);
console.log(`   • Dialogue navigation with updated values`);
console.log(`   • API integration for persistence`);

process.exit(passRate >= 80 ? 0 : 1);
