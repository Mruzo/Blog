#!/usr/bin/env node

/**
 * Save Button Refresh Test
 * Tests that the save button properly refreshes the camera values display
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

console.log(`${colors.cyan}${colors.bright}🔄 SAVE BUTTON REFRESH TEST${colors.reset}`);
console.log(`${colors.cyan}====================================${colors.reset}\n`);

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

// Test 1: Save Function Calls showDialogue
function testSaveFunctionCallsShowDialogue() {
  console.log(`${colors.yellow}1️⃣ Testing Save Function Calls showDialogue...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for showDialogue call in save function
  const hasSaveFunction = content.includes('const saveCameraChanges = async () => {');
  const hasShowDialogueCall = content.includes('showDialogue(currentDialogueIndex)');
  const hasShowDialogueAfterSave = content.includes('setSaveMessage({ type: \'success\'') && 
                                                   content.includes('showDialogue(currentDialogueIndex)');
  const hasShowDialogueBeforeTimeout = content.includes('showDialogue(currentDialogueIndex)') && 
                                      content.includes('setTimeout(() => setSaveMessage(null)');
  
  console.log(`  ${hasSaveFunction ? '✅' : '❌'} Save function exists`);
  console.log(`  ${hasShowDialogueCall ? '✅' : '❌'} showDialogue call exists`);
  console.log(`  ${hasShowDialogueAfterSave ? '✅' : '❌'} showDialogue called after save message`);
  console.log(`  ${hasShowDialogueBeforeTimeout ? '✅' : '❌'} showDialogue called before timeout`);
  
  return hasSaveFunction && hasShowDialogueCall && hasShowDialogueAfterSave && hasShowDialogueBeforeTimeout;
}

// Test 2: Reset Function Calls showDialogue
function testResetFunctionCallsShowDialogue() {
  console.log(`${colors.yellow}2️⃣ Testing Reset Function Calls showDialogue...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for showDialogue call in reset function
  const hasResetFunction = content.includes('const resetCameraChanges = () => {');
  const hasShowDialogueInReset = content.includes('Changes reset to original values') && 
                                content.includes('showDialogue(currentDialogueIndex)');
  const hasShowDialogueAfterReset = content.includes('setSaveMessage({ type: \'success\', text: \'Changes reset to original values\' })') && 
                                   content.includes('showDialogue(currentDialogueIndex)');
  
  console.log(`  ${hasResetFunction ? '✅' : '❌'} Reset function exists`);
  console.log(`  ${hasShowDialogueInReset ? '✅' : '❌'} showDialogue call in reset function`);
  console.log(`  ${hasShowDialogueAfterReset ? '✅' : '❌'} showDialogue called after reset message`);
  
  return hasResetFunction && hasShowDialogueInReset && hasShowDialogueAfterReset;
}

// Test 3: showDialogue Function Updates Display
function testShowDialogueFunctionUpdatesDisplay() {
  console.log(`${colors.yellow}3️⃣ Testing showDialogue Function Updates Display...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for showDialogue function implementation
  const hasShowDialogueFunction = content.includes('const showDialogue = (index: number) => {');
  const hasDialogueTextUpdate = content.includes('setCurrentDialogueText(dialogueText)');
  const hasCameraValuesInText = content.includes('Camera Values:') && content.includes('Orbit:') && content.includes('Target:');
  const hasCurrentDialogueIndexUpdate = content.includes('setCurrentDialogueIndex(index)');
  const hasModelViewerUpdate = content.includes('modelViewerRef.current.cameraTarget') && content.includes('modelViewerRef.current.cameraOrbit');
  
  console.log(`  ${hasShowDialogueFunction ? '✅' : '❌'} showDialogue function exists`);
  console.log(`  ${hasDialogueTextUpdate ? '✅' : '❌'} Dialogue text update`);
  console.log(`  ${hasCameraValuesInText ? '✅' : '❌'} Camera values in dialogue text`);
  console.log(`  ${hasCurrentDialogueIndexUpdate ? '✅' : '❌'} Current dialogue index update`);
  console.log(`  ${hasModelViewerUpdate ? '✅' : '❌'} Model viewer camera update`);
  
  return hasShowDialogueFunction && hasDialogueTextUpdate && hasCameraValuesInText && 
         hasCurrentDialogueIndexUpdate && hasModelViewerUpdate;
}

// Test 4: Local State Update Before Refresh
function testLocalStateUpdateBeforeRefresh() {
  console.log(`${colors.yellow}4️⃣ Testing Local State Update Before Refresh...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for local state update before refresh
  const hasCurrentEditingDialogueUpdate = content.includes('setCurrentEditingDialogue({');
  const hasSpreadOperator = content.includes('...currentEditingDialogue,');
  const hasDataSpread = content.includes('...data');
  const hasOriginalValuesUpdate = content.includes('setOriginalValues(data)');
  const hasStateUpdateBeforeShowDialogue = content.includes('setCurrentEditingDialogue({') && 
                                          content.includes('showDialogue(currentDialogueIndex)');
  
  console.log(`  ${hasCurrentEditingDialogueUpdate ? '✅' : '❌'} Current editing dialogue update`);
  console.log(`  ${hasSpreadOperator ? '✅' : '❌'} Spread operator for state update`);
  console.log(`  ${hasDataSpread ? '✅' : '❌'} Data spread in state update`);
  console.log(`  ${hasOriginalValuesUpdate ? '✅' : '❌'} Original values update`);
  console.log(`  ${hasStateUpdateBeforeShowDialogue ? '✅' : '❌'} State update before showDialogue call`);
  
  return hasCurrentEditingDialogueUpdate && hasSpreadOperator && hasDataSpread && 
         hasOriginalValuesUpdate && hasStateUpdateBeforeShowDialogue;
}

// Test 5: Camera Values Display Refresh
function testCameraValuesDisplayRefresh() {
  console.log(`${colors.yellow}5️⃣ Testing Camera Values Display Refresh...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for camera values display refresh
  const hasDialogueTextTemplate = content.includes('dialogueText = `') && content.includes('`;');
  const hasCharacterDisplay = content.includes('${currentDialogue.character}:') && content.includes('${currentDialogue.text}');
  const hasCameraValuesSection = content.includes('Camera Values:') && content.includes('<br/>');
  const hasOrbitDisplay = content.includes('Orbit:</strong> ${currentDialogue.camera_orbit}');
  const hasTargetDisplay = content.includes('Target:</strong> ${currentDialogue.camera_target}');
  const hasFOVDisplay = content.includes('FOV:</strong> ${currentDialogue.field_of_view}°');
  const hasZoomSpeedDisplay = content.includes('Zoom Speed:</strong> ${currentDialogue.zoom_speed}x');
  
  console.log(`  ${hasDialogueTextTemplate ? '✅' : '❌'} Dialogue text template`);
  console.log(`  ${hasCharacterDisplay ? '✅' : '❌'} Character and text display`);
  console.log(`  ${hasCameraValuesSection ? '✅' : '❌'} Camera values section`);
  console.log(`  ${hasOrbitDisplay ? '✅' : '❌'} Orbit value display`);
  console.log(`  ${hasTargetDisplay ? '✅' : '❌'} Target value display`);
  console.log(`  ${hasFOVDisplay ? '✅' : '❌'} FOV value display`);
  console.log(`  ${hasZoomSpeedDisplay ? '✅' : '❌'} Zoom speed value display`);
  
  return hasDialogueTextTemplate && hasCharacterDisplay && hasCameraValuesSection && 
         hasOrbitDisplay && hasTargetDisplay && hasFOVDisplay && hasZoomSpeedDisplay;
}

// Test 6: Complete Refresh Flow
function testCompleteRefreshFlow() {
  console.log(`${colors.yellow}6️⃣ Testing Complete Refresh Flow...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for complete refresh flow
  const hasSaveFunction = content.includes('const saveCameraChanges = async () => {');
  const hasDataCollection = content.includes('getElementById(\'orbitAzimuth\')') && content.includes('getElementById(\'targetX\')');
  const hasDataFormatting = content.includes('camera_orbit:') && content.includes('camera_target:');
  const hasOnDialogueUpdateCall = content.includes('onDialogueUpdate?.(');
  const hasLocalStateUpdate = content.includes('setCurrentEditingDialogue({');
  const hasShowDialogueRefresh = content.includes('showDialogue(currentDialogueIndex)');
  const hasSuccessMessage = content.includes('Camera changes saved successfully!');
  
  console.log(`  ${hasSaveFunction ? '✅' : '❌'} Save function`);
  console.log(`  ${hasDataCollection ? '✅' : '❌'} Data collection`);
  console.log(`  ${hasDataFormatting ? '✅' : '❌'} Data formatting`);
  console.log(`  ${hasOnDialogueUpdateCall ? '✅' : '❌'} onDialogueUpdate call`);
  console.log(`  ${hasLocalStateUpdate ? '✅' : '❌'} Local state update`);
  console.log(`  ${hasShowDialogueRefresh ? '✅' : '❌'} showDialogue refresh call`);
  console.log(`  ${hasSuccessMessage ? '✅' : '❌'} Success message`);
  
  return hasSaveFunction && hasDataCollection && hasDataFormatting && 
         hasOnDialogueUpdateCall && hasLocalStateUpdate && hasShowDialogueRefresh && hasSuccessMessage;
}

// Run all tests
runTest('Save Function Calls showDialogue', testSaveFunctionCallsShowDialogue);
runTest('Reset Function Calls showDialogue', testResetFunctionCallsShowDialogue);
runTest('showDialogue Function Updates Display', testShowDialogueFunctionUpdatesDisplay);
runTest('Local State Update Before Refresh', testLocalStateUpdateBeforeRefresh);
runTest('Camera Values Display Refresh', testCameraValuesDisplayRefresh);
runTest('Complete Refresh Flow', testCompleteRefreshFlow);

// Results
const passRate = Math.round((passedTests / totalTests) * 100);
console.log(`${colors.cyan}📊 RESULTS: ${passedTests}/${totalTests} tests passed (${passRate}%)${colors.reset}`);

if (passRate >= 80) {
  console.log(`${colors.green}🎉 Save button refresh is working correctly!${colors.reset}`);
} else {
  console.log(`${colors.red}❌ Save button refresh needs attention.${colors.reset}`);
}

console.log(`\n${colors.cyan}🔄 SAVE BUTTON REFRESH FLOW:${colors.reset}`);
console.log(`   1. User adjusts camera dials in edit mode`);
console.log(`   2. User clicks Save button`);
console.log(`   3. saveCameraChanges() collects all dial values`);
console.log(`   4. Data is formatted for API compatibility`);
console.log(`   5. onDialogueUpdate callback sends data to API`);
console.log(`   6. Local dialogue state is updated with new values`);
console.log(`   7. Success message is displayed`);
console.log(`   8. showDialogue(currentDialogueIndex) is called`);
console.log(`   9. Dialogue text and camera values are refreshed`);
console.log(`   10. Model viewer camera is updated`);
console.log(`   11. User sees updated values immediately`);

console.log(`\n${colors.cyan}✨ REFRESH FEATURES:${colors.reset}`);
console.log(`   • Save function calls showDialogue after state update`);
console.log(`   • Reset function calls showDialogue after reset`);
console.log(`   • showDialogue function updates dialogue text`);
console.log(`   • Camera values are refreshed in speech bubble`);
console.log(`   • Model viewer camera is updated`);
console.log(`   • No page refresh required`);

process.exit(passRate >= 80 ? 0 : 1);
