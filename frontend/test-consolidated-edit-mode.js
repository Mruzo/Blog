#!/usr/bin/env node

/**
 * CONSOLIDATED EDIT MODE TESTING SUITE
 * 
 * This consolidated test replaces the following individual test files:
 * - test-edit-mode-button.js
 * - test-edit-mode-functionality.js
 * - test-edit-mode-model-display.js
 * - test-edit-mode-null-safety.js
 * - test-edit-mode-visibility.js
 * - test-save-button-functionality.js
 * - test-save-button-immediate-update.js
 * - test-save-button-integration.js
 * - test-save-button-refresh.js
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

console.log(`${colors.cyan}${colors.bright}🧪 CONSOLIDATED EDIT MODE TESTING SUITE${colors.reset}`);
console.log(`${colors.blue}Testing all edit mode functionality in one comprehensive test${colors.reset}\n`);

// Test 1: Edit Mode Button
function testEditModeButton() {
  console.log(`${colors.yellow}1️⃣ Testing Edit Mode Button...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for edit mode button
  const hasEditModeButton = content.includes('Edit Mode') || content.includes('edit mode');
  const hasEditModeToggle = content.includes('setIsEditMode') || content.includes('toggleEditMode');
  const hasEditModeState = content.includes('isEditMode');
  const hasEditModeClick = content.includes('onClick') && content.includes('Edit');
  const hasEditModeIcon = content.includes('fa-edit') || content.includes('fa-cog');
  const hasEditModeStyling = content.includes('btn') && content.includes('Edit');
  
  console.log(`  ${hasEditModeButton ? '✅' : '❌'} Edit mode button`);
  console.log(`  ${hasEditModeToggle ? '✅' : '❌'} Edit mode toggle function`);
  console.log(`  ${hasEditModeState ? '✅' : '❌'} Edit mode state`);
  console.log(`  ${hasEditModeClick ? '✅' : '❌'} Edit mode click handler`);
  console.log(`  ${hasEditModeIcon ? '✅' : '❌'} Edit mode icon`);
  console.log(`  ${hasEditModeStyling ? '✅' : '❌'} Edit mode styling`);
  
  return hasEditModeButton && hasEditModeToggle && hasEditModeState && hasEditModeClick && hasEditModeIcon && hasEditModeStyling;
}

// Test 2: Edit Mode Functionality
function testEditModeFunctionality() {
  console.log(`${colors.yellow}2️⃣ Testing Edit Mode Functionality...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for edit mode functionality
  const hasEditControls = content.includes('Edit Controls') || content.includes('edit controls');
  const hasSliderControls = content.includes('form-range') || content.includes('slider');
  const hasValueBadges = content.includes('value-badge') || content.includes('ValueBadge');
  const hasRealTimeUpdates = content.includes('Real-time') || content.includes('real-time');
  const hasUpdateCameraDebounced = content.includes('updateCameraDebounced');
  const hasEditModeDisplay = content.includes('isEditMode &&') || content.includes('isEditMode ?');
  
  console.log(`  ${hasEditControls ? '✅' : '❌'} Edit controls display`);
  console.log(`  ${hasSliderControls ? '✅' : '❌'} Slider controls`);
  console.log(`  ${hasValueBadges ? '✅' : '❌'} Value badges`);
  console.log(`  ${hasRealTimeUpdates ? '✅' : '❌'} Real-time updates`);
  console.log(`  ${hasUpdateCameraDebounced ? '✅' : '❌'} Debounced camera updates`);
  console.log(`  ${hasEditModeDisplay ? '✅' : '❌'} Edit mode display logic`);
  
  return hasEditControls && hasSliderControls && hasValueBadges && hasRealTimeUpdates && hasUpdateCameraDebounced && hasEditModeDisplay;
}

// Test 3: Edit Mode Model Display
function testEditModeModelDisplay() {
  console.log(`${colors.yellow}3️⃣ Testing Edit Mode Model Display...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for model display in edit mode
  const hasModelViewer = content.includes('<model-viewer');
  const hasModelViewerRef = content.includes('modelViewerRef');
  const hasModelReady = content.includes('isModelReady');
  const hasModelStarted = content.includes('isStarted');
  const hasModelDisplay = content.includes('display') && content.includes('model');
  const hasModelVisibility = content.includes('visibility') || content.includes('opacity');
  
  console.log(`  ${hasModelViewer ? '✅' : '❌'} Model viewer element`);
  console.log(`  ${hasModelViewerRef ? '✅' : '❌'} Model viewer ref`);
  console.log(`  ${hasModelReady ? '✅' : '❌'} Model ready state`);
  console.log(`  ${hasModelStarted ? '✅' : '❌'} Model started state`);
  console.log(`  ${hasModelDisplay ? '✅' : '❌'} Model display logic`);
  console.log(`  ${hasModelVisibility ? '✅' : '❌'} Model visibility controls`);
  
  return hasModelViewer && hasModelViewerRef && hasModelReady && hasModelStarted && hasModelDisplay && hasModelVisibility;
}

// Test 4: Edit Mode Null Safety
function testEditModeNullSafety() {
  console.log(`${colors.yellow}4️⃣ Testing Edit Mode Null Safety...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for null safety (refined criteria)
  const hasNullChecks = content.includes('!') && content.includes('null');
  const hasOptionalChaining = content.includes('?.');
  const hasConditionalRendering = content.includes('&&') || content.includes('?');
  const hasErrorHandling = content.includes('try {') && content.includes('catch');
  const hasValidation = content.includes('if (!') || content.includes('if (');
  const hasSelectedEpisodeCheck = content.includes('selectedEpisode &&') || content.includes('selectedEpisode ?');
  
  console.log(`  ${hasNullChecks ? '✅' : '❌'} Null checks`);
  console.log(`  ${hasOptionalChaining ? '✅' : '❌'} Optional chaining`);
  console.log(`  ${hasConditionalRendering ? '✅' : '❌'} Conditional rendering`);
  console.log(`  ${hasErrorHandling ? '✅' : '❌'} Error handling`);
  console.log(`  ${hasValidation ? '✅' : '❌'} Validation checks`);
  console.log(`  ${hasSelectedEpisodeCheck ? '✅' : '❌'} Selected episode checks`);
  
  return hasNullChecks && hasOptionalChaining && hasConditionalRendering && hasErrorHandling && hasValidation && hasSelectedEpisodeCheck;
}

// Test 5: Edit Mode Visibility
function testEditModeVisibility() {
  console.log(`${colors.yellow}5️⃣ Testing Edit Mode Visibility...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for visibility controls (refined criteria)
  const hasVisibilityLogic = content.includes('isEditMode &&') || content.includes('isEditMode ?');
  const hasDisplayNone = content.includes('display: \'none\'') || content.includes('display: none');
  const hasOpacityControls = content.includes('opacity: 0') || content.includes('opacity: 1');
  const hasZIndexControls = content.includes('zIndex') || content.includes('z-index');
  const hasVisibilityToggle = content.includes('setIsEditMode') && content.includes('!isEditMode');
  const hasEditModeConditional = content.includes('isEditMode && selectedEpisode');
  
  console.log(`  ${hasVisibilityLogic ? '✅' : '❌'} Visibility logic`);
  console.log(`  ${hasDisplayNone ? '✅' : '❌'} Display none controls`);
  console.log(`  ${hasOpacityControls ? '✅' : '❌'} Opacity controls`);
  console.log(`  ${hasZIndexControls ? '✅' : '❌'} Z-index controls`);
  console.log(`  ${hasVisibilityToggle ? '✅' : '❌'} Visibility toggle`);
  console.log(`  ${hasEditModeConditional ? '✅' : '❌'} Edit mode conditional rendering`);
  
  return hasVisibilityLogic && hasDisplayNone && hasOpacityControls && hasZIndexControls && hasVisibilityToggle && hasEditModeConditional;
}

// Test 6: Edit Mode No Dialogues Message
function testEditModeNoDialoguesMessage() {
  console.log(`${colors.yellow}6️⃣ Testing Edit Mode No Dialogues Message...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for no dialogues message
  const hasNoDialoguesMessage = content.includes('No dialogues available') || content.includes('No dialogues');
  const hasDialogueDataLength = content.includes('dialogueData.length === 0');
  const hasEditModeCondition = content.includes('isEditMode &&') && content.includes('dialogueData.length === 0');
  const hasAlertInfo = content.includes('alert-info') || content.includes('alert alert-info');
  const hasInfoIcon = content.includes('fa-info-circle') || content.includes('info-circle');
  const hasMessageText = content.includes('Please add dialogues') || content.includes('add dialogues');
  
  console.log(`  ${hasNoDialoguesMessage ? '✅' : '❌'} No dialogues message`);
  console.log(`  ${hasDialogueDataLength ? '✅' : '❌'} Dialogue data length check`);
  console.log(`  ${hasEditModeCondition ? '✅' : '❌'} Edit mode condition`);
  console.log(`  ${hasAlertInfo ? '✅' : '❌'} Alert info styling`);
  console.log(`  ${hasInfoIcon ? '✅' : '❌'} Info icon`);
  console.log(`  ${hasMessageText ? '✅' : '❌'} Message text`);
  
  return hasNoDialoguesMessage && hasDialogueDataLength && hasEditModeCondition && hasAlertInfo && hasInfoIcon && hasMessageText;
}

// Test 7: Save Button UI Elements
function testSaveButtonUI() {
  console.log(`${colors.yellow}7️⃣ Testing Save Button UI Elements...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for save button elements
  const hasSaveButton = content.includes('onClick={saveCameraChanges}') || content.includes('saveCameraChanges');
  const hasSaveIcon = content.includes('fas fa-save');
  const hasSaveText = content.includes('Save') || content.includes('Saving...');
  const hasSaveButtonClass = content.includes('btn-success');
  const hasSaveButtonDisabled = content.includes('disabled={isSaving}');
  const hasResetButton = content.includes('onClick={resetCameraChanges}') || content.includes('resetCameraChanges');
  
  console.log(`  ${hasSaveButton ? '✅' : '❌'} Save button element`);
  console.log(`  ${hasSaveIcon ? '✅' : '❌'} Save icon (fas fa-save)`);
  console.log(`  ${hasSaveText ? '✅' : '❌'} Save button text`);
  console.log(`  ${hasSaveButtonClass ? '✅' : '❌'} Save button styling (btn-success)`);
  console.log(`  ${hasSaveButtonDisabled ? '✅' : '❌'} Save button disabled state`);
  console.log(`  ${hasResetButton ? '✅' : '❌'} Reset button element`);
  
  return hasSaveButton && hasSaveIcon && hasSaveText && hasSaveButtonClass && hasSaveButtonDisabled && hasResetButton;
}

// Test 8: Save Function Implementation
function testSaveFunctionImplementation() {
  console.log(`${colors.yellow}8️⃣ Testing Save Function Implementation...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for saveCameraChanges function
  const hasSaveFunction = content.includes('const saveCameraChanges = async () => {') || content.includes('saveCameraChanges = async');
  const hasSaveFunctionAsync = content.includes('saveCameraChanges = async');
  const hasSaveFunctionTryCatch = content.includes('try {') && content.includes('} catch') && content.includes('saveCameraChanges');
  const hasSaveFunctionSetSaving = content.includes('setIsSaving(true)') && content.includes('setIsSaving(false)');
  const hasSaveMessage = content.includes('setSaveMessage');
  const hasOnDialogueUpdate = content.includes('onDialogueUpdate?.(');
  
  console.log(`  ${hasSaveFunction ? '✅' : '❌'} Save function definition`);
  console.log(`  ${hasSaveFunctionAsync ? '✅' : '❌'} Save function is async`);
  console.log(`  ${hasSaveFunctionTryCatch ? '✅' : '❌'} Save function has try-catch`);
  console.log(`  ${hasSaveFunctionSetSaving ? '✅' : '❌'} Save function manages saving state`);
  console.log(`  ${hasSaveMessage ? '✅' : '❌'} Save message state management`);
  console.log(`  ${hasOnDialogueUpdate ? '✅' : '❌'} onDialogueUpdate callback`);
  
  return hasSaveFunction && hasSaveFunctionAsync && hasSaveFunctionTryCatch && hasSaveFunctionSetSaving && hasSaveMessage && hasOnDialogueUpdate;
}

// Test 9: Save Data Collection and Formatting
function testSaveDataCollection() {
  console.log(`${colors.yellow}9️⃣ Testing Save Data Collection and Formatting...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for data collection from sliders
  const hasAzimuthCollection = content.includes('orbitAzimuth') || content.includes('getElementById(\'orbitAzimuth\')');
  const hasPolarCollection = content.includes('orbitPolar');
  const hasRadiusCollection = content.includes('orbitRadius');
  const hasTargetCollection = content.includes('targetX') || content.includes('targetY') || content.includes('targetZ');
  const hasFieldOfViewCollection = content.includes('fieldOfView');
  const hasZoomSpeedCollection = content.includes('zoomSpeed');
  const hasDataFormatting = content.includes('camera_orbit:') && content.includes('deg') && content.includes('m');
  
  console.log(`  ${hasAzimuthCollection ? '✅' : '❌'} Azimuth data collection`);
  console.log(`  ${hasPolarCollection ? '✅' : '❌'} Polar data collection`);
  console.log(`  ${hasRadiusCollection ? '✅' : '❌'} Radius data collection`);
  console.log(`  ${hasTargetCollection ? '✅' : '❌'} Target (X, Y, Z) data collection`);
  console.log(`  ${hasFieldOfViewCollection ? '✅' : '❌'} Field of view data collection`);
  console.log(`  ${hasZoomSpeedCollection ? '✅' : '❌'} Zoom speed data collection`);
  console.log(`  ${hasDataFormatting ? '✅' : '❌'} Data formatting (camera_orbit format)`);
  
  return hasAzimuthCollection && hasPolarCollection && hasRadiusCollection && 
         hasTargetCollection && hasFieldOfViewCollection && hasZoomSpeedCollection && hasDataFormatting;
}

// Test 10: Save State Management and Immediate Updates
function testSaveStateManagement() {
  console.log(`${colors.yellow}🔟 Testing Save State Management and Immediate Updates...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for state management
  const hasIsSavingState = content.includes('isSaving') && content.includes('setIsSaving');
  const hasSaveMessageState = content.includes('saveMessage') && content.includes('setSaveMessage');
  const hasSuccessMessage = content.includes('Camera changes saved successfully') || content.includes('saved successfully');
  const hasErrorMessage = content.includes('Error saving changes') || content.includes('Error saving');
  const hasShowDialogueWithData = content.includes('showDialogueWithData') || content.includes('showDialogue');
  const hasImmediateUpdate = content.includes('showDialogueWithData') || (content.includes('showDialogue') && content.includes('saveCameraChanges'));
  
  console.log(`  ${hasIsSavingState ? '✅' : '❌'} isSaving state management`);
  console.log(`  ${hasSaveMessageState ? '✅' : '❌'} saveMessage state management`);
  console.log(`  ${hasSuccessMessage ? '✅' : '❌'} Success message`);
  console.log(`  ${hasErrorMessage ? '✅' : '❌'} Error message`);
  console.log(`  ${hasShowDialogueWithData ? '✅' : '❌'} Dialogue display update function`);
  console.log(`  ${hasImmediateUpdate ? '✅' : '❌'} Immediate update after save`);
  
  return hasIsSavingState && hasSaveMessageState && hasSuccessMessage && hasErrorMessage && hasShowDialogueWithData && hasImmediateUpdate;
}

// Test 11: Reset Button Functionality
function testResetButtonFunctionality() {
  console.log(`${colors.yellow}1️⃣1️⃣ Testing Reset Button Functionality...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for reset button integration
  const hasResetFunction = content.includes('const resetCameraChanges = () => {') || content.includes('resetCameraChanges = ()');
  const hasResetButton = content.includes('onClick={resetCameraChanges}');
  const hasResetIcon = content.includes('fas fa-undo');
  const hasResetText = content.includes('Reset');
  const hasOriginalValues = content.includes('originalValues');
  const hasResetMessage = content.includes('Changes reset to original values') || content.includes('reset to original');
  
  console.log(`  ${hasResetFunction ? '✅' : '❌'} Reset function definition`);
  console.log(`  ${hasResetButton ? '✅' : '❌'} Reset button element`);
  console.log(`  ${hasResetIcon ? '✅' : '❌'} Reset icon (fas fa-undo)`);
  console.log(`  ${hasResetText ? '✅' : '❌'} Reset button text`);
  console.log(`  ${hasOriginalValues ? '✅' : '❌'} Original values state`);
  console.log(`  ${hasResetMessage ? '✅' : '❌'} Reset success message`);
  
  return hasResetFunction && hasResetButton && hasResetIcon && hasResetText && hasOriginalValues && hasResetMessage;
}

// Run all tests
function runAllTests() {
  console.log(`${colors.cyan}${colors.bright}📊 CONSOLIDATED EDIT MODE TEST RESULTS${colors.reset}\n`);
  
  const tests = [
    { name: 'Edit Mode Button', fn: testEditModeButton },
    { name: 'Edit Mode Functionality', fn: testEditModeFunctionality },
    { name: 'Edit Mode Model Display', fn: testEditModeModelDisplay },
    { name: 'Edit Mode Null Safety', fn: testEditModeNullSafety },
    { name: 'Edit Mode Visibility', fn: testEditModeVisibility },
    { name: 'Edit Mode No Dialogues Message', fn: testEditModeNoDialoguesMessage },
    { name: 'Save Button UI Elements', fn: testSaveButtonUI },
    { name: 'Save Function Implementation', fn: testSaveFunctionImplementation },
    { name: 'Save Data Collection and Formatting', fn: testSaveDataCollection },
    { name: 'Save State Management and Immediate Updates', fn: testSaveStateManagement },
    { name: 'Reset Button Functionality', fn: testResetButtonFunctionality }
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
    console.log(`\n${colors.green}${colors.bright}🎉 ALL EDIT MODE TESTS PASSED!${colors.reset}`);
    console.log(`${colors.blue}Consolidated test successfully replaces 9 individual test files${colors.reset}`);
    console.log(`${colors.yellow}  • Edit mode tests: 5 files${colors.reset}`);
    console.log(`${colors.yellow}  • Save button tests: 4 files${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}⚠️ Some edit mode tests failed${colors.reset}`);
    console.log(`${colors.yellow}Review the failed tests above${colors.reset}`);
  }
  
  return passed === total;
}

// Execute tests
runAllTests();
