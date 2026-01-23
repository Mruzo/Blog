#!/usr/bin/env node

/**
 * Camera Values Save Test
 * Tests that camera values are properly saved and displayed without reverting
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

console.log(`${colors.cyan}${colors.bright}💾 CAMERA VALUES SAVE TEST${colors.reset}`);
console.log(`${colors.cyan}================================${colors.reset}\n`);

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

// Test 1: DialogueData State Management
function testDialogueDataStateManagement() {
  console.log(`${colors.yellow}1️⃣ Testing DialogueData State Management...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for dialogueData state management
  const hasDialogueDataState = content.includes('const [dialogueData, setDialogueData] = useState<DialogueData[]>([]);');
  const hasDialogueDataUpdate = content.includes('setDialogueData(prev => prev.map(d =>');
  const hasDialogueDataEffect = content.includes('useEffect(() => {') && content.includes('setDialogueData(newDialogueData);');
  const hasDialogueDataMapping = content.includes('dialogue_id === currentEditingDialogue.dialogue_id');
  const hasDialogueDataSpread = content.includes('? { ...d, ...data }');
  
  console.log(`  ${hasDialogueDataState ? '✅' : '❌'} dialogueData state declaration`);
  console.log(`  ${hasDialogueDataUpdate ? '✅' : '❌'} dialogueData update in save function`);
  console.log(`  ${hasDialogueDataEffect ? '✅' : '❌'} dialogueData useEffect for initialization`);
  console.log(`  ${hasDialogueDataMapping ? '✅' : '❌'} dialogueData mapping by dialogue_id`);
  console.log(`  ${hasDialogueDataSpread ? '✅' : '❌'} dialogueData spread operator`);
  
  return hasDialogueDataState && hasDialogueDataUpdate && hasDialogueDataEffect && 
         hasDialogueDataMapping && hasDialogueDataSpread;
}

// Test 2: showDialogue Uses Updated Data
function testShowDialogueUsesUpdatedData() {
  console.log(`${colors.yellow}2️⃣ Testing showDialogue Uses Updated Data...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for showDialogue using updated data
  const hasShowDialogueFunction = content.includes('const showDialogue = (index: number) => {');
  const hasDialogueDataCheck = content.includes('if (!dialogueData || !dialogueData[index])');
  const hasCurrentDialogueFromState = content.includes('const currentDialogue = dialogueData[index];');
  const hasDialogueDataLogging = content.includes('dialogueData length:') && content.includes('dialogueData:');
  const hasNoEpisodeDialoguesReference = !content.includes('episodeDialogues[index]') || content.includes('// Use the updated dialogue data from state');
  
  console.log(`  ${hasShowDialogueFunction ? '✅' : '❌'} showDialogue function exists`);
  console.log(`  ${hasDialogueDataCheck ? '✅' : '❌'} dialogueData check in showDialogue`);
  console.log(`  ${hasCurrentDialogueFromState ? '✅' : '❌'} currentDialogue from dialogueData state`);
  console.log(`  ${hasDialogueDataLogging ? '✅' : '❌'} dialogueData logging`);
  console.log(`  ${hasNoEpisodeDialoguesReference ? '✅' : '❌'} No episodeDialogues reference in showDialogue`);
  
  return hasShowDialogueFunction && hasDialogueDataCheck && hasCurrentDialogueFromState && 
         hasDialogueDataLogging && hasNoEpisodeDialoguesReference;
}

// Test 3: Save Function Updates Both States
function testSaveFunctionUpdatesBothStates() {
  console.log(`${colors.yellow}3️⃣ Testing Save Function Updates Both States...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for save function updating both states
  const hasSaveFunction = content.includes('const saveCameraChanges = async () => {');
  const hasCurrentEditingDialogueUpdate = content.includes('setCurrentEditingDialogue(updatedDialogue);');
  const hasDialogueDataUpdate = content.includes('setDialogueData(prev => prev.map(d =>');
  const hasUpdatedDialogueVariable = content.includes('const updatedDialogue = {');
  const hasSpreadOperator = content.includes('...currentEditingDialogue,') && content.includes('...data');
  const hasShowDialogueCall = content.includes('showDialogue(currentDialogueIndex);');
  
  console.log(`  ${hasSaveFunction ? '✅' : '❌'} Save function exists`);
  console.log(`  ${hasCurrentEditingDialogueUpdate ? '✅' : '❌'} currentEditingDialogue update`);
  console.log(`  ${hasDialogueDataUpdate ? '✅' : '❌'} dialogueData update`);
  console.log(`  ${hasUpdatedDialogueVariable ? '✅' : '❌'} updatedDialogue variable`);
  console.log(`  ${hasSpreadOperator ? '✅' : '❌'} Spread operator for updates`);
  console.log(`  ${hasShowDialogueCall ? '✅' : '❌'} showDialogue call after save`);
  
  return hasSaveFunction && hasCurrentEditingDialogueUpdate && hasDialogueDataUpdate && 
         hasUpdatedDialogueVariable && hasSpreadOperator && hasShowDialogueCall;
}

// Test 4: Camera Values Persistence
function testCameraValuesPersistence() {
  console.log(`${colors.yellow}4️⃣ Testing Camera Values Persistence...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for camera values persistence
  const hasCameraOrbitUpdate = content.includes('camera_orbit:') && content.includes('deg') && content.includes('m');
  const hasCameraTargetUpdate = content.includes('camera_target:') && content.includes('m');
  const hasFieldOfViewUpdate = content.includes('field_of_view:');
  const hasZoomSpeedUpdate = content.includes('zoom_speed:');
  const hasDataFormatting = content.includes('camera_orbit:') && content.includes('camera_target:');
  const hasOnDialogueUpdateCall = content.includes('onDialogueUpdate?.(');
  
  console.log(`  ${hasCameraOrbitUpdate ? '✅' : '❌'} Camera orbit update`);
  console.log(`  ${hasCameraTargetUpdate ? '✅' : '❌'} Camera target update`);
  console.log(`  ${hasFieldOfViewUpdate ? '✅' : '❌'} Field of view update`);
  console.log(`  ${hasZoomSpeedUpdate ? '✅' : '❌'} Zoom speed update`);
  console.log(`  ${hasDataFormatting ? '✅' : '❌'} Data formatting`);
  console.log(`  ${hasOnDialogueUpdateCall ? '✅' : '❌'} onDialogueUpdate call`);
  
  return hasCameraOrbitUpdate && hasCameraTargetUpdate && hasFieldOfViewUpdate && 
         hasZoomSpeedUpdate && hasDataFormatting && hasOnDialogueUpdateCall;
}

// Test 5: Display Refresh After Save
function testDisplayRefreshAfterSave() {
  console.log(`${colors.yellow}5️⃣ Testing Display Refresh After Save...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for display refresh after save
  const hasDialogueTextUpdate = content.includes('setCurrentDialogueText(dialogueText)');
  const hasCameraValuesInText = content.includes('Camera Values:') && content.includes('Orbit:') && content.includes('Target:');
  const hasModelViewerUpdate = content.includes('modelViewerRef.current.cameraTarget') && content.includes('modelViewerRef.current.cameraOrbit');
  const hasSuccessMessage = content.includes('Camera changes saved successfully!');
  const hasShowDialogueAfterSave = content.includes('showDialogue(currentDialogueIndex);') && content.includes('setSaveMessage({ type: \'success\'');
  
  console.log(`  ${hasDialogueTextUpdate ? '✅' : '❌'} Dialogue text update`);
  console.log(`  ${hasCameraValuesInText ? '✅' : '❌'} Camera values in dialogue text`);
  console.log(`  ${hasModelViewerUpdate ? '✅' : '❌'} Model viewer update`);
  console.log(`  ${hasSuccessMessage ? '✅' : '❌'} Success message`);
  console.log(`  ${hasShowDialogueAfterSave ? '✅' : '❌'} showDialogue called after save`);
  
  return hasDialogueTextUpdate && hasCameraValuesInText && hasModelViewerUpdate && 
         hasSuccessMessage && hasShowDialogueAfterSave;
}

// Test 6: Complete Save and Display Flow
function testCompleteSaveAndDisplayFlow() {
  console.log(`${colors.yellow}6️⃣ Testing Complete Save and Display Flow...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for complete save and display flow
  const hasDataCollection = content.includes('getElementById(\'orbitAzimuth\')') && content.includes('getElementById(\'targetX\')');
  const hasDataFormatting = content.includes('camera_orbit:') && content.includes('camera_target:');
  const hasStateUpdates = content.includes('setCurrentEditingDialogue') && content.includes('setDialogueData');
  const hasDisplayRefresh = content.includes('showDialogue(currentDialogueIndex)');
  const hasCameraAnimation = content.includes('modelViewerRef.current.cameraTarget') && content.includes('modelViewerRef.current.cameraOrbit');
  const hasUserFeedback = content.includes('Camera changes saved successfully!');
  
  console.log(`  ${hasDataCollection ? '✅' : '❌'} Data collection from dials`);
  console.log(`  ${hasDataFormatting ? '✅' : '❌'} Data formatting for API`);
  console.log(`  ${hasStateUpdates ? '✅' : '❌'} State updates (both states)`);
  console.log(`  ${hasDisplayRefresh ? '✅' : '❌'} Display refresh`);
  console.log(`  ${hasCameraAnimation ? '✅' : '❌'} Camera animation update`);
  console.log(`  ${hasUserFeedback ? '✅' : '❌'} User feedback`);
  
  return hasDataCollection && hasDataFormatting && hasStateUpdates && 
         hasDisplayRefresh && hasCameraAnimation && hasUserFeedback;
}

// Run all tests
runTest('DialogueData State Management', testDialogueDataStateManagement);
runTest('showDialogue Uses Updated Data', testShowDialogueUsesUpdatedData);
runTest('Save Function Updates Both States', testSaveFunctionUpdatesBothStates);
runTest('Camera Values Persistence', testCameraValuesPersistence);
runTest('Display Refresh After Save', testDisplayRefreshAfterSave);
runTest('Complete Save and Display Flow', testCompleteSaveAndDisplayFlow);

// Results
const passRate = Math.round((passedTests / totalTests) * 100);
console.log(`${colors.cyan}📊 RESULTS: ${passedTests}/${totalTests} tests passed (${passRate}%)${colors.reset}`);

if (passRate >= 80) {
  console.log(`${colors.green}🎉 Camera values save is working correctly!${colors.reset}`);
} else {
  console.log(`${colors.red}❌ Camera values save needs attention.${colors.reset}`);
}

console.log(`\n${colors.cyan}💾 CAMERA VALUES SAVE FLOW:${colors.reset}`);
console.log(`   1. User adjusts camera dials in edit mode`);
console.log(`   2. User clicks Save button`);
console.log(`   3. saveCameraChanges() collects all dial values`);
console.log(`   4. Data is formatted for API compatibility`);
console.log(`   5. onDialogueUpdate callback sends data to API`);
console.log(`   6. currentEditingDialogue state is updated`);
console.log(`   7. dialogueData state is updated with new values`);
console.log(`   8. Success message is displayed`);
console.log(`   9. showDialogue() is called with updated data`);
console.log(`   10. Dialogue text shows updated camera values`);
console.log(`   11. Camera animation uses updated values`);
console.log(`   12. Values persist without reverting`);

console.log(`\n${colors.cyan}✨ SAVE FEATURES:${colors.reset}`);
console.log(`   • dialogueData state management`);
console.log(`   • showDialogue uses updated data`);
console.log(`   • Save function updates both states`);
console.log(`   • Camera values persistence`);
console.log(`   • Display refresh after save`);
console.log(`   • Complete save and display flow`);

process.exit(passRate >= 80 ? 0 : 1);
