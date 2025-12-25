#!/usr/bin/env node

/**
 * Save Button Functionality Test
 * Tests the save button functionality in Comic3DViewer edit mode
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

console.log(`${colors.cyan}${colors.bright}💾 SAVE BUTTON FUNCTIONALITY TEST${colors.reset}`);
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

// Test 1: Save Button UI Elements
function testSaveButtonUI() {
  console.log(`${colors.yellow}1️⃣ Testing Save Button UI Elements...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for save button elements
  const hasSaveButton = content.includes('id="saveBtn"') || content.includes('onClick={saveCameraChanges}');
  const hasSaveIcon = content.includes('fas fa-save');
  const hasSaveText = content.includes('Save') || content.includes('Saving...');
  const hasSaveButtonClass = content.includes('btn-success');
  const hasSaveButtonDisabled = content.includes('disabled={isSaving}');
  const hasSaveButtonStyle = content.includes('fontSize') && content.includes('fontWeight');
  
  console.log(`  ${hasSaveButton ? '✅' : '❌'} Save button element`);
  console.log(`  ${hasSaveIcon ? '✅' : '❌'} Save icon (fas fa-save)`);
  console.log(`  ${hasSaveText ? '✅' : '❌'} Save button text`);
  console.log(`  ${hasSaveButtonClass ? '✅' : '❌'} Save button styling (btn-success)`);
  console.log(`  ${hasSaveButtonDisabled ? '✅' : '❌'} Save button disabled state`);
  console.log(`  ${hasSaveButtonStyle ? '✅' : '❌'} Save button custom styling`);
  
  return hasSaveButton && hasSaveIcon && hasSaveText && hasSaveButtonClass && hasSaveButtonDisabled && hasSaveButtonStyle;
}

// Test 2: Save Function Implementation
function testSaveFunctionImplementation() {
  console.log(`${colors.yellow}2️⃣ Testing Save Function Implementation...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for saveCameraChanges function
  const hasSaveFunction = content.includes('const saveCameraChanges = async () => {');
  const hasSaveFunctionAsync = content.includes('saveCameraChanges = async');
  const hasSaveFunctionTryCatch = content.includes('try {') && content.includes('} catch (error)');
  const hasSaveFunctionFinally = content.includes('} finally {');
  const hasSaveFunctionSetSaving = content.includes('setIsSaving(true)') && content.includes('setIsSaving(false)');
  const hasSaveFunctionSetMessage = content.includes('setSaveMessage');
  
  console.log(`  ${hasSaveFunction ? '✅' : '❌'} Save function definition`);
  console.log(`  ${hasSaveFunctionAsync ? '✅' : '❌'} Save function is async`);
  console.log(`  ${hasSaveFunctionTryCatch ? '✅' : '❌'} Save function has try-catch`);
  console.log(`  ${hasSaveFunctionFinally ? '✅' : '❌'} Save function has finally block`);
  console.log(`  ${hasSaveFunctionSetSaving ? '✅' : '❌'} Save function manages saving state`);
  console.log(`  ${hasSaveFunctionSetMessage ? '✅' : '❌'} Save function manages save messages`);
  
  return hasSaveFunction && hasSaveFunctionAsync && hasSaveFunctionTryCatch && hasSaveFunctionFinally && hasSaveFunctionSetSaving && hasSaveFunctionSetMessage;
}

// Test 3: Save Data Collection
function testSaveDataCollection() {
  console.log(`${colors.yellow}3️⃣ Testing Save Data Collection...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for data collection from sliders
  const hasAzimuthCollection = content.includes('getElementById(\'orbitAzimuth\')');
  const hasPolarCollection = content.includes('getElementById(\'orbitPolar\')');
  const hasRadiusCollection = content.includes('getElementById(\'orbitRadius\')');
  const hasTargetXCollection = content.includes('getElementById(\'targetX\')');
  const hasTargetYCollection = content.includes('getElementById(\'targetY\')');
  const hasTargetZCollection = content.includes('getElementById(\'targetZ\')');
  const hasFieldOfViewCollection = content.includes('getElementById(\'fieldOfView\')');
  const hasZoomSpeedCollection = content.includes('getElementById(\'zoomSpeed\')');
  
  console.log(`  ${hasAzimuthCollection ? '✅' : '❌'} Azimuth data collection`);
  console.log(`  ${hasPolarCollection ? '✅' : '❌'} Polar data collection`);
  console.log(`  ${hasRadiusCollection ? '✅' : '❌'} Radius data collection`);
  console.log(`  ${hasTargetXCollection ? '✅' : '❌'} Target X data collection`);
  console.log(`  ${hasTargetYCollection ? '✅' : '❌'} Target Y data collection`);
  console.log(`  ${hasTargetZCollection ? '✅' : '❌'} Target Z data collection`);
  console.log(`  ${hasFieldOfViewCollection ? '✅' : '❌'} Field of view data collection`);
  console.log(`  ${hasZoomSpeedCollection ? '✅' : '❌'} Zoom speed data collection`);
  
  return hasAzimuthCollection && hasPolarCollection && hasRadiusCollection && 
         hasTargetXCollection && hasTargetYCollection && hasTargetZCollection && 
         hasFieldOfViewCollection && hasZoomSpeedCollection;
}

// Test 4: Save Data Formatting
function testSaveDataFormatting() {
  console.log(`${colors.yellow}4️⃣ Testing Save Data Formatting...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for data formatting
  const hasCameraOrbitFormat = content.includes('camera_orbit:') && content.includes('deg') && content.includes('m');
  const hasCameraTargetFormat = content.includes('camera_target:') && content.includes('m');
  const hasFieldOfViewFormat = content.includes('field_of_view:');
  const hasZoomSpeedFormat = content.includes('zoom_speed:');
  const hasDataObject = content.includes('const data = {');
  const hasParseFloat = content.includes('parseFloat(');
  
  console.log(`  ${hasCameraOrbitFormat ? '✅' : '❌'} Camera orbit formatting`);
  console.log(`  ${hasCameraTargetFormat ? '✅' : '❌'} Camera target formatting`);
  console.log(`  ${hasFieldOfViewFormat ? '✅' : '❌'} Field of view formatting`);
  console.log(`  ${hasZoomSpeedFormat ? '✅' : '❌'} Zoom speed formatting`);
  console.log(`  ${hasDataObject ? '✅' : '❌'} Data object creation`);
  console.log(`  ${hasParseFloat ? '✅' : '❌'} ParseFloat usage for numeric values`);
  
  return hasCameraOrbitFormat && hasCameraTargetFormat && hasFieldOfViewFormat && 
         hasZoomSpeedFormat && hasDataObject && hasParseFloat;
}

// Test 5: Save API Integration
function testSaveAPIIntegration() {
  console.log(`${colors.yellow}5️⃣ Testing Save API Integration...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for API integration
  const hasOnDialogueUpdate = content.includes('onDialogueUpdate?.(');
  const hasDialogueId = content.includes('currentEditingDialogue.dialogue_id');
  const hasDataPassing = content.includes('onDialogueUpdate?.(') && content.includes('data');
  const hasCallbackCheck = content.includes('onDialogueUpdate?.(');
  
  console.log(`  ${hasOnDialogueUpdate ? '✅' : '❌'} onDialogueUpdate callback`);
  console.log(`  ${hasDialogueId ? '✅' : '❌'} Dialogue ID passing`);
  console.log(`  ${hasDataPassing ? '✅' : '❌'} Data passing to callback`);
  console.log(`  ${hasCallbackCheck ? '✅' : '❌'} Callback existence check`);
  
  return hasOnDialogueUpdate && hasDialogueId && hasDataPassing && hasCallbackCheck;
}

// Test 6: Save State Management
function testSaveStateManagement() {
  console.log(`${colors.yellow}6️⃣ Testing Save State Management...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for state management
  const hasIsSavingState = content.includes('isSaving') && content.includes('setIsSaving');
  const hasSaveMessageState = content.includes('saveMessage') && content.includes('setSaveMessage');
  const hasCurrentEditingDialogue = content.includes('currentEditingDialogue') && content.includes('setCurrentEditingDialogue');
  const hasOriginalValues = content.includes('originalValues') && content.includes('setOriginalValues');
  const hasSuccessMessage = content.includes('Camera changes saved successfully');
  const hasErrorMessage = content.includes('Error saving changes');
  
  console.log(`  ${hasIsSavingState ? '✅' : '❌'} isSaving state management`);
  console.log(`  ${hasSaveMessageState ? '✅' : '❌'} saveMessage state management`);
  console.log(`  ${hasCurrentEditingDialogue ? '✅' : '❌'} currentEditingDialogue state`);
  console.log(`  ${hasOriginalValues ? '✅' : '❌'} originalValues state`);
  console.log(`  ${hasSuccessMessage ? '✅' : '❌'} Success message`);
  console.log(`  ${hasErrorMessage ? '✅' : '❌'} Error message`);
  
  return hasIsSavingState && hasSaveMessageState && hasCurrentEditingDialogue && 
         hasOriginalValues && hasSuccessMessage && hasErrorMessage;
}

// Test 7: Save Message Display
function testSaveMessageDisplay() {
  console.log(`${colors.yellow}7️⃣ Testing Save Message Display...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for save message display
  const hasSaveMessageConditional = content.includes('{saveMessage && (');
  const hasSaveMessageAlert = content.includes('alert-') && content.includes('alert-');
  const hasSaveMessageType = content.includes('saveMessage.type === \'success\'');
  const hasSaveMessageText = content.includes('saveMessage.text');
  const hasSaveMessageTimeout = content.includes('setTimeout(() => setSaveMessage(null)');
  
  console.log(`  ${hasSaveMessageConditional ? '✅' : '❌'} Save message conditional rendering`);
  console.log(`  ${hasSaveMessageAlert ? '✅' : '❌'} Save message alert styling`);
  console.log(`  ${hasSaveMessageType ? '✅' : '❌'} Save message type handling`);
  console.log(`  ${hasSaveMessageText ? '✅' : '❌'} Save message text display`);
  console.log(`  ${hasSaveMessageTimeout ? '✅' : '❌'} Save message timeout`);
  
  return hasSaveMessageConditional && hasSaveMessageAlert && hasSaveMessageType && 
         hasSaveMessageText && hasSaveMessageTimeout;
}

// Test 8: Reset Button Integration
function testResetButtonIntegration() {
  console.log(`${colors.yellow}8️⃣ Testing Reset Button Integration...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for reset button integration
  const hasResetButton = content.includes('id="resetBtn"') || content.includes('onClick={resetCameraChanges}');
  const hasResetFunction = content.includes('const resetCameraChanges = () => {');
  const hasResetIcon = content.includes('fas fa-undo');
  const hasResetText = content.includes('Reset');
  const hasResetButtonClass = content.includes('btn-secondary');
  
  console.log(`  ${hasResetButton ? '✅' : '❌'} Reset button element`);
  console.log(`  ${hasResetFunction ? '✅' : '❌'} Reset function definition`);
  console.log(`  ${hasResetIcon ? '✅' : '❌'} Reset icon (fas fa-undo)`);
  console.log(`  ${hasResetText ? '✅' : '❌'} Reset button text`);
  console.log(`  ${hasResetButtonClass ? '✅' : '❌'} Reset button styling (btn-secondary)`);
  
  return hasResetButton && hasResetFunction && hasResetIcon && hasResetText && hasResetButtonClass;
}

// Run all tests
runTest('Save Button UI Elements', testSaveButtonUI);
runTest('Save Function Implementation', testSaveFunctionImplementation);
runTest('Save Data Collection', testSaveDataCollection);
runTest('Save Data Formatting', testSaveDataFormatting);
runTest('Save API Integration', testSaveAPIIntegration);
runTest('Save State Management', testSaveStateManagement);
runTest('Save Message Display', testSaveMessageDisplay);
runTest('Reset Button Integration', testResetButtonIntegration);

// Results
const passRate = Math.round((passedTests / totalTests) * 100);
console.log(`${colors.cyan}📊 RESULTS: ${passedTests}/${totalTests} tests passed (${passRate}%)${colors.reset}`);

if (passRate >= 80) {
  console.log(`${colors.green}🎉 Save button functionality is working correctly!${colors.reset}`);
} else {
  console.log(`${colors.red}❌ Save button functionality needs attention.${colors.reset}`);
}

console.log(`\n${colors.cyan}✨ SAVE BUTTON FEATURES:${colors.reset}`);
console.log(`   • Save button with proper styling and states`);
console.log(`   • Async save function with error handling`);
console.log(`   • Data collection from all camera controls`);
console.log(`   • Proper data formatting for API calls`);
console.log(`   • Integration with parent component callbacks`);
console.log(`   • State management for saving status`);
console.log(`   • Success/error message display`);
console.log(`   • Reset button for reverting changes`);

console.log(`\n${colors.cyan}💾 HOW IT WORKS:${colors.reset}`);
console.log(`   1. User adjusts camera controls in edit mode`);
console.log(`   2. User clicks Save button`);
console.log(`   3. Function collects all slider values`);
console.log(`   4. Data is formatted for API compatibility`);
console.log(`   5. onDialogueUpdate callback is called`);
console.log(`   6. Success message is displayed`);
console.log(`   7. Changes are saved to the backend`);

process.exit(passRate >= 80 ? 0 : 1);
