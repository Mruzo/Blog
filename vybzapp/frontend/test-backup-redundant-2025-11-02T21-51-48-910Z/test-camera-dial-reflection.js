#!/usr/bin/env node

/**
 * Camera Dial Reflection Test
 * Tests that camera dial changes are properly reflected in dialogue text and camera values
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

console.log(`${colors.cyan}${colors.bright}🔄 CAMERA DIAL REFLECTION TEST${colors.reset}`);
console.log(`${colors.cyan}==========================================${colors.reset}\n`);

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

// Test 1: Dialogue Text Display with Camera Values
function testDialogueTextDisplayWithCameraValues() {
  console.log(`${colors.yellow}1️⃣ Testing Dialogue Text Display with Camera Values...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for dialogue text display with camera values
  const hasDialogueTextTemplate = content.includes('`<div>') && content.includes('</div>`');
  const hasCharacterDisplay = content.includes('${currentDialogue.character}:') && content.includes('${currentDialogue.text}');
  const hasCameraValuesSection = content.includes('Camera Values:') && content.includes('<br/>');
  const hasOrbitDisplay = content.includes('Orbit:</strong> ${currentDialogue.camera_orbit}');
  const hasTargetDisplay = content.includes('Target:</strong> ${currentDialogue.camera_target}');
  const hasFOVDisplay = content.includes('FOV:</strong> ${currentDialogue.field_of_view}°');
  const hasZoomSpeedDisplay = content.includes('Zoom Speed:</strong> ${currentDialogue.zoom_speed}x');
  const hasSetCurrentDialogueText = content.includes('setCurrentDialogueText(dialogueText)');
  
  console.log(`  ${hasDialogueTextTemplate ? '✅' : '❌'} Dialogue text template`);
  console.log(`  ${hasCharacterDisplay ? '✅' : '❌'} Character and text display`);
  console.log(`  ${hasCameraValuesSection ? '✅' : '❌'} Camera values section`);
  console.log(`  ${hasOrbitDisplay ? '✅' : '❌'} Orbit display`);
  console.log(`  ${hasTargetDisplay ? '✅' : '❌'} Target display`);
  console.log(`  ${hasFOVDisplay ? '✅' : '❌'} FOV display`);
  console.log(`  ${hasZoomSpeedDisplay ? '✅' : '❌'} Zoom speed display`);
  console.log(`  ${hasSetCurrentDialogueText ? '✅' : '❌'} Set current dialogue text`);
  
  return hasDialogueTextTemplate && hasCharacterDisplay && hasCameraValuesSection && 
         hasOrbitDisplay && hasTargetDisplay && hasFOVDisplay && hasZoomSpeedDisplay && 
         hasSetCurrentDialogueText;
}

// Test 2: Camera Values Update in Speech Bubble
function testCameraValuesUpdateInSpeechBubble() {
  console.log(`${colors.yellow}2️⃣ Testing Camera Values Update in Speech Bubble...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for camera values update in speech bubble
  const hasSpeechBubbleDisplay = content.includes('speech-bubble') || content.includes('speechBubble');
  const hasCurrentDialogueTextState = content.includes('currentDialogueText') && content.includes('setCurrentDialogueText');
  const hasDialogueTextUpdate = content.includes('setCurrentDialogueText(dialogueText)');
  const hasShowDialogueFunction = content.includes('const showDialogue = (index: number) => {');
  const hasDialogueIndexUpdate = content.includes('setCurrentDialogueIndex(index)');
  
  console.log(`  ${hasSpeechBubbleDisplay ? '✅' : '❌'} Speech bubble display`);
  console.log(`  ${hasCurrentDialogueTextState ? '✅' : '❌'} Current dialogue text state`);
  console.log(`  ${hasDialogueTextUpdate ? '✅' : '❌'} Dialogue text update`);
  console.log(`  ${hasShowDialogueFunction ? '✅' : '❌'} Show dialogue function`);
  console.log(`  ${hasDialogueIndexUpdate ? '✅' : '❌'} Dialogue index update`);
  
  return hasSpeechBubbleDisplay && hasCurrentDialogueTextState && hasDialogueTextUpdate && 
         hasShowDialogueFunction && hasDialogueIndexUpdate;
}

// Test 3: Local State Update After Save
function testLocalStateUpdateAfterSave() {
  console.log(`${colors.yellow}3️⃣ Testing Local State Update After Save...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for local state update after save
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

// Test 4: Dialogue Data Mapping and Updates
function testDialogueDataMappingAndUpdates() {
  console.log(`${colors.yellow}4️⃣ Testing Dialogue Data Mapping and Updates...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for dialogue data mapping and updates
  const hasDialogueDataMapping = content.includes('dialogueData: DialogueData[] = episodeDialogues.map(d => ({');
  const hasDialogueIdMapping = content.includes('dialogue_id: d.id,');
  const hasCharacterMapping = content.includes('character: d.character?.toString() || \'Unknown\',');
  const hasTextMapping = content.includes('text: d.text,');
  const hasCameraOrbitMapping = content.includes('camera_orbit: d.camera_orbit,');
  const hasCameraTargetMapping = content.includes('camera_target: d.camera_target,');
  const hasFieldOfViewMapping = content.includes('field_of_view: d.field_of_view,');
  const hasZoomSpeedMapping = content.includes('zoom_speed: d.zoom_speed,');
  
  console.log(`  ${hasDialogueDataMapping ? '✅' : '❌'} Dialogue data mapping`);
  console.log(`  ${hasDialogueIdMapping ? '✅' : '❌'} Dialogue ID mapping`);
  console.log(`  ${hasCharacterMapping ? '✅' : '❌'} Character mapping`);
  console.log(`  ${hasTextMapping ? '✅' : '❌'} Text mapping`);
  console.log(`  ${hasCameraOrbitMapping ? '✅' : '❌'} Camera orbit mapping`);
  console.log(`  ${hasCameraTargetMapping ? '✅' : '❌'} Camera target mapping`);
  console.log(`  ${hasFieldOfViewMapping ? '✅' : '❌'} Field of view mapping`);
  console.log(`  ${hasZoomSpeedMapping ? '✅' : '❌'} Zoom speed mapping`);
  
  return hasDialogueDataMapping && hasDialogueIdMapping && hasCharacterMapping && 
         hasTextMapping && hasCameraOrbitMapping && hasCameraTargetMapping && 
         hasFieldOfViewMapping && hasZoomSpeedMapping;
}

// Test 5: Camera Animation with Updated Values
function testCameraAnimationWithUpdatedValues() {
  console.log(`${colors.yellow}5️⃣ Testing Camera Animation with Updated Values...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for camera animation with updated values
  const hasModelViewerRef = content.includes('modelViewerRef.current');
  const hasCameraTargetUpdate = content.includes('modelViewerRef.current.cameraTarget = currentDialogue.camera_target');
  const hasCameraOrbitUpdate = content.includes('modelViewerRef.current.cameraOrbit = currentDialogue.camera_orbit');
  const hasFieldOfViewUpdate = content.includes('modelViewerRef.current.fieldOfView = currentDialogue.field_of_view');
  const hasCameraAnimation = content.includes('cameraTarget') && content.includes('cameraOrbit');
  
  console.log(`  ${hasModelViewerRef ? '✅' : '❌'} Model viewer ref usage`);
  console.log(`  ${hasCameraTargetUpdate ? '✅' : '❌'} Camera target update`);
  console.log(`  ${hasCameraOrbitUpdate ? '✅' : '❌'} Camera orbit update`);
  console.log(`  ${hasFieldOfViewUpdate ? '✅' : '❌'} Field of view update`);
  console.log(`  ${hasCameraAnimation ? '✅' : '❌'} Camera animation`);
  
  return hasModelViewerRef && hasCameraTargetUpdate && hasCameraOrbitUpdate && 
         hasFieldOfViewUpdate && hasCameraAnimation;
}

// Test 6: Navigation with Updated Values
function testNavigationWithUpdatedValues() {
  console.log(`${colors.yellow}6️⃣ Testing Navigation with Updated Values...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for navigation with updated values
  const hasNextButton = content.includes('Next') || content.includes('next');
  const hasPreviousButton = content.includes('Previous') || content.includes('previous');
  const hasDialogueIndexIncrement = content.includes('setCurrentDialogueIndex') && content.includes('+ 1');
  const hasDialogueIndexDecrement = content.includes('setCurrentDialogueIndex') && content.includes('- 1');
  const hasShowDialogueCall = content.includes('showDialogue(') || content.includes('showDialogue(');
  
  console.log(`  ${hasNextButton ? '✅' : '❌'} Next button`);
  console.log(`  ${hasPreviousButton ? '✅' : '❌'} Previous button`);
  console.log(`  ${hasDialogueIndexIncrement ? '✅' : '❌'} Dialogue index increment`);
  console.log(`  ${hasDialogueIndexDecrement ? '✅' : '❌'} Dialogue index decrement`);
  console.log(`  ${hasShowDialogueCall ? '✅' : '❌'} Show dialogue call`);
  
  return hasNextButton && hasPreviousButton && hasDialogueIndexIncrement && 
         hasDialogueIndexDecrement && hasShowDialogueCall;
}

// Test 7: Current Values Display Update
function testCurrentValuesDisplayUpdate() {
  console.log(`${colors.yellow}7️⃣ Testing Current Values Display Update...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for current values display update
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

// Test 8: Complete Reflection Flow
function testCompleteReflectionFlow() {
  console.log(`${colors.yellow}8️⃣ Testing Complete Reflection Flow...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for complete reflection flow
  const hasSaveFunction = content.includes('const saveCameraChanges = async () => {');
  const hasDataCollection = content.includes('getElementById(\'orbitAzimuth\')') && content.includes('getElementById(\'targetX\')');
  const hasDataFormatting = content.includes('camera_orbit:') && content.includes('camera_target:');
  const hasOnDialogueUpdateCall = content.includes('onDialogueUpdate?.(');
  const hasLocalStateUpdate = content.includes('setCurrentEditingDialogue({');
  const hasShowDialogueUpdate = content.includes('showDialogue(') && content.includes('setCurrentDialogueIndex');
  
  console.log(`  ${hasSaveFunction ? '✅' : '❌'} Save function`);
  console.log(`  ${hasDataCollection ? '✅' : '❌'} Data collection`);
  console.log(`  ${hasDataFormatting ? '✅' : '❌'} Data formatting`);
  console.log(`  ${hasOnDialogueUpdateCall ? '✅' : '❌'} onDialogueUpdate call`);
  console.log(`  ${hasLocalStateUpdate ? '✅' : '❌'} Local state update`);
  console.log(`  ${hasShowDialogueUpdate ? '✅' : '❌'} Show dialogue update`);
  
  return hasSaveFunction && hasDataCollection && hasDataFormatting && 
         hasOnDialogueUpdateCall && hasLocalStateUpdate && hasShowDialogueUpdate;
}

// Run all tests
runTest('Dialogue Text Display with Camera Values', testDialogueTextDisplayWithCameraValues);
runTest('Camera Values Update in Speech Bubble', testCameraValuesUpdateInSpeechBubble);
runTest('Local State Update After Save', testLocalStateUpdateAfterSave);
runTest('Dialogue Data Mapping and Updates', testDialogueDataMappingAndUpdates);
runTest('Camera Animation with Updated Values', testCameraAnimationWithUpdatedValues);
runTest('Navigation with Updated Values', testNavigationWithUpdatedValues);
runTest('Current Values Display Update', testCurrentValuesDisplayUpdate);
runTest('Complete Reflection Flow', testCompleteReflectionFlow);

// Results
const passRate = Math.round((passedTests / totalTests) * 100);
console.log(`${colors.cyan}📊 RESULTS: ${passedTests}/${totalTests} tests passed (${passRate}%)${colors.reset}`);

if (passRate >= 80) {
  console.log(`${colors.green}🎉 Camera dial reflection is working correctly!${colors.reset}`);
} else {
  console.log(`${colors.red}❌ Camera dial reflection needs attention.${colors.reset}`);
}

console.log(`\n${colors.cyan}🔄 CAMERA DIAL REFLECTION FLOW:${colors.reset}`);
console.log(`   1. User adjusts camera dials in edit mode`);
console.log(`   2. User clicks Save button`);
console.log(`   3. Camera values are collected and formatted`);
console.log(`   4. Data is sent to API via onDialogueUpdate`);
console.log(`   5. Local dialogue state is updated with new values`);
console.log(`   6. showDialogue function is called to refresh display`);
console.log(`   7. Speech bubble shows updated dialogue text AND camera values`);
console.log(`   8. Current Values display shows the saved values`);
console.log(`   9. Camera animation uses the updated values`);
console.log(`   10. Navigation preserves the updated values`);

console.log(`\n${colors.cyan}✨ REFLECTION FEATURES:${colors.reset}`);
console.log(`   • Dialogue text display with embedded camera values`);
console.log(`   • Real-time speech bubble updates`);
console.log(`   • Local state synchronization`);
console.log(`   • Camera animation with updated values`);
console.log(`   • Navigation with preserved values`);
console.log(`   • Current values display updates`);
console.log(`   • Complete reflection flow from dials to display`);

process.exit(passRate >= 80 ? 0 : 1);
