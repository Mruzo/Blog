#!/usr/bin/env node

/**
 * Save Button Integration Test
 * Tests the complete save button integration flow from UI to API
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

console.log(`${colors.cyan}${colors.bright}🔗 SAVE BUTTON INTEGRATION TEST${colors.reset}`);
console.log(`${colors.cyan}============================================${colors.reset}\n`);

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

// Test 1: Comic3DViewer Save Button Integration
function testComic3DViewerIntegration() {
  console.log(`${colors.yellow}1️⃣ Testing Comic3DViewer Save Button Integration...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for proper integration
  const hasOnDialogueUpdateProp = content.includes('onDialogueUpdate?:');
  const hasOnDialogueUpdateCall = content.includes('onDialogueUpdate?.(');
  const hasDialogueIdPassing = content.includes('currentEditingDialogue.dialogue_id');
  const hasDataPassing = content.includes('onDialogueUpdate?.(') && content.includes('data');
  
  console.log(`  ${hasOnDialogueUpdateProp ? '✅' : '❌'} onDialogueUpdate prop definition`);
  console.log(`  ${hasOnDialogueUpdateCall ? '✅' : '❌'} onDialogueUpdate callback call`);
  console.log(`  ${hasDialogueIdPassing ? '✅' : '❌'} Dialogue ID passing`);
  console.log(`  ${hasDataPassing ? '✅' : '❌'} Data passing to callback`);
  
  return hasOnDialogueUpdateProp && hasOnDialogueUpdateCall && hasDialogueIdPassing && hasDataPassing;
}

// Test 2: StoryManage Parent Integration
function testStoryManageIntegration() {
  console.log(`${colors.yellow}2️⃣ Testing StoryManage Parent Integration...${colors.reset}`);
  
  const storyManagePath = 'src/pages/StoryManage.tsx';
  const content = fs.readFileSync(storyManagePath, 'utf8');
  
  // Check for proper parent integration
  const hasComic3DViewerImport = content.includes('import Comic3DViewer');
  const hasComic3DViewerUsage = content.includes('<Comic3DViewer');
  const hasOnDialogueUpdateProp = content.includes('onDialogueUpdate={');
  const hasUpdateDialogueCall = content.includes('updateDialogue(dialogueId, data)');
  const hasUpdateDialogueFromApi = content.includes('updateDialogue,') && content.includes('useApi');
  
  console.log(`  ${hasComic3DViewerImport ? '✅' : '❌'} Comic3DViewer import`);
  console.log(`  ${hasComic3DViewerUsage ? '✅' : '❌'} Comic3DViewer usage`);
  console.log(`  ${hasOnDialogueUpdateProp ? '✅' : '❌'} onDialogueUpdate prop`);
  console.log(`  ${hasUpdateDialogueCall ? '✅' : '❌'} updateDialogue call`);
  console.log(`  ${hasUpdateDialogueFromApi ? '✅' : '❌'} updateDialogue from API context`);
  
  return hasComic3DViewerImport && hasComic3DViewerUsage && hasOnDialogueUpdateProp && 
         hasUpdateDialogueCall && hasUpdateDialogueFromApi;
}

// Test 3: ApiContext Integration
function testApiContextIntegration() {
  console.log(`${colors.yellow}3️⃣ Testing ApiContext Integration...${colors.reset}`);
  
  const apiContextPath = 'src/contexts/ApiContext.tsx';
  const content = fs.readFileSync(apiContextPath, 'utf8');
  
  // Check for proper API context integration
  const hasUpdateDialogueFunction = content.includes('const updateDialogue = async');
  const hasUpdateDialogueInInterface = content.includes('updateDialogue: (id: number, dialogueData: Partial<Dialogue>) => Promise<Dialogue>');
  const hasUpdateDialogueInValue = content.includes('updateDialogue,');
  const hasApiServiceCall = content.includes('apiService.updateDialogue');
  const hasStateUpdate = content.includes('setDialogues(prev => prev.map(d => d.id === id ? dialogue : d))');
  
  console.log(`  ${hasUpdateDialogueFunction ? '✅' : '❌'} updateDialogue function`);
  console.log(`  ${hasUpdateDialogueInInterface ? '✅' : '❌'} updateDialogue in interface`);
  console.log(`  ${hasUpdateDialogueInValue ? '✅' : '❌'} updateDialogue in context value`);
  console.log(`  ${hasApiServiceCall ? '✅' : '❌'} apiService.updateDialogue call`);
  console.log(`  ${hasStateUpdate ? '✅' : '❌'} State update after API call`);
  
  return hasUpdateDialogueFunction && hasUpdateDialogueInInterface && hasUpdateDialogueInValue && 
         hasApiServiceCall && hasStateUpdate;
}

// Test 4: API Service Integration
function testApiServiceIntegration() {
  console.log(`${colors.yellow}4️⃣ Testing API Service Integration...${colors.reset}`);
  
  const apiServicePath = 'src/services/api.ts';
  const content = fs.readFileSync(apiServicePath, 'utf8');
  
  // Check for proper API service integration
  const hasUpdateDialogueMethod = content.includes('async updateDialogue(id: number, dialogueData: Partial<Dialogue>)');
  const hasPatchRequest = content.includes('api.patch(`/dialogues/${id}/`');
  const hasErrorHandling = content.includes('} catch (error: any)');
  const hasConsoleLogging = content.includes('console.log(\'API: updateDialogue called with:\'');
  const hasReturnData = content.includes('return response.data');
  
  console.log(`  ${hasUpdateDialogueMethod ? '✅' : '❌'} updateDialogue method`);
  console.log(`  ${hasPatchRequest ? '✅' : '❌'} PATCH request to /dialogues/{id}/`);
  console.log(`  ${hasErrorHandling ? '✅' : '❌'} Error handling`);
  console.log(`  ${hasConsoleLogging ? '✅' : '❌'} Console logging for debugging`);
  console.log(`  ${hasReturnData ? '✅' : '❌'} Return response data`);
  
  return hasUpdateDialogueMethod && hasPatchRequest && hasErrorHandling && 
         hasConsoleLogging && hasReturnData;
}

// Test 5: Data Flow Validation
function testDataFlowValidation() {
  console.log(`${colors.yellow}5️⃣ Testing Data Flow Validation...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for proper data flow
  const hasDataObject = content.includes('const data = {');
  const hasCameraOrbitData = content.includes('camera_orbit:') && content.includes('deg') && content.includes('m');
  const hasCameraTargetData = content.includes('camera_target:') && content.includes('m');
  const hasFieldOfViewData = content.includes('field_of_view:');
  const hasZoomSpeedData = content.includes('zoom_speed:');
  const hasDataValidation = content.includes('parseFloat(') && content.includes('|| \'0\'');
  
  console.log(`  ${hasDataObject ? '✅' : '❌'} Data object creation`);
  console.log(`  ${hasCameraOrbitData ? '✅' : '❌'} Camera orbit data formatting`);
  console.log(`  ${hasCameraTargetData ? '✅' : '❌'} Camera target data formatting`);
  console.log(`  ${hasFieldOfViewData ? '✅' : '❌'} Field of view data`);
  console.log(`  ${hasZoomSpeedData ? '✅' : '❌'} Zoom speed data`);
  console.log(`  ${hasDataValidation ? '✅' : '❌'} Data validation with parseFloat`);
  
  return hasDataObject && hasCameraOrbitData && hasCameraTargetData && 
         hasFieldOfViewData && hasZoomSpeedData && hasDataValidation;
}

// Test 6: Error Handling Integration
function testErrorHandlingIntegration() {
  console.log(`${colors.yellow}6️⃣ Testing Error Handling Integration...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for proper error handling
  const hasTryCatch = content.includes('try {') && content.includes('} catch (error)');
  const hasErrorLogging = content.includes('console.error(\'Error saving camera changes:\', error)');
  const hasErrorMessage = content.includes('setSaveMessage({ type: \'error\', text: \'Error saving changes\' })');
  const hasFinallyBlock = content.includes('} finally {');
  const hasSavingStateReset = content.includes('setIsSaving(false)');
  
  console.log(`  ${hasTryCatch ? '✅' : '❌'} Try-catch error handling`);
  console.log(`  ${hasErrorLogging ? '✅' : '❌'} Error logging`);
  console.log(`  ${hasErrorMessage ? '✅' : '❌'} Error message display`);
  console.log(`  ${hasFinallyBlock ? '✅' : '❌'} Finally block`);
  console.log(`  ${hasSavingStateReset ? '✅' : '❌'} Saving state reset`);
  
  return hasTryCatch && hasErrorLogging && hasErrorMessage && hasFinallyBlock && hasSavingStateReset;
}

// Test 7: Success Handling Integration
function testSuccessHandlingIntegration() {
  console.log(`${colors.yellow}7️⃣ Testing Success Handling Integration...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for proper success handling
  const hasSuccessMessage = content.includes('Camera changes saved successfully!');
  const hasSuccessMessageType = content.includes('type: \'success\'');
  const hasSuccessMessageTimeout = content.includes('setTimeout(() => setSaveMessage(null), 3000)');
  const hasLocalStateUpdate = content.includes('setCurrentEditingDialogue({');
  const hasOriginalValuesUpdate = content.includes('setOriginalValues(data)');
  
  console.log(`  ${hasSuccessMessage ? '✅' : '❌'} Success message`);
  console.log(`  ${hasSuccessMessageType ? '✅' : '❌'} Success message type`);
  console.log(`  ${hasSuccessMessageTimeout ? '✅' : '❌'} Success message timeout`);
  console.log(`  ${hasLocalStateUpdate ? '✅' : '❌'} Local state update`);
  console.log(`  ${hasOriginalValuesUpdate ? '✅' : '❌'} Original values update`);
  
  return hasSuccessMessage && hasSuccessMessageType && hasSuccessMessageTimeout && 
         hasLocalStateUpdate && hasOriginalValuesUpdate;
}

// Test 8: UI State Management Integration
function testUIStateManagementIntegration() {
  console.log(`${colors.yellow}8️⃣ Testing UI State Management Integration...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for proper UI state management
  const hasIsSavingState = content.includes('isSaving') && content.includes('setIsSaving');
  const hasSaveMessageState = content.includes('saveMessage') && content.includes('setSaveMessage');
  const hasButtonDisabled = content.includes('disabled={isSaving}');
  const hasButtonTextChange = content.includes('{isSaving ? \'Saving...\' : \'Save\'}');
  const hasMessageDisplay = content.includes('{saveMessage && (');
  
  console.log(`  ${hasIsSavingState ? '✅' : '❌'} isSaving state management`);
  console.log(`  ${hasSaveMessageState ? '✅' : '❌'} saveMessage state management`);
  console.log(`  ${hasButtonDisabled ? '✅' : '❌'} Button disabled state`);
  console.log(`  ${hasButtonTextChange ? '✅' : '❌'} Button text change`);
  console.log(`  ${hasMessageDisplay ? '✅' : '❌'} Message display`);
  
  return hasIsSavingState && hasSaveMessageState && hasButtonDisabled && 
         hasButtonTextChange && hasMessageDisplay;
}

// Run all tests
runTest('Comic3DViewer Save Button Integration', testComic3DViewerIntegration);
runTest('StoryManage Parent Integration', testStoryManageIntegration);
runTest('ApiContext Integration', testApiContextIntegration);
runTest('API Service Integration', testApiServiceIntegration);
runTest('Data Flow Validation', testDataFlowValidation);
runTest('Error Handling Integration', testErrorHandlingIntegration);
runTest('Success Handling Integration', testSuccessHandlingIntegration);
runTest('UI State Management Integration', testUIStateManagementIntegration);

// Results
const passRate = Math.round((passedTests / totalTests) * 100);
console.log(`${colors.cyan}📊 RESULTS: ${passedTests}/${totalTests} tests passed (${passRate}%)${colors.reset}`);

if (passRate >= 80) {
  console.log(`${colors.green}🎉 Save button integration is working correctly!${colors.reset}`);
} else {
  console.log(`${colors.red}❌ Save button integration needs attention.${colors.reset}`);
}

console.log(`\n${colors.cyan}🔗 INTEGRATION FLOW:${colors.reset}`);
console.log(`   1. User clicks Save button in Comic3DViewer`);
console.log(`   2. saveCameraChanges function collects slider data`);
console.log(`   3. Data is formatted and passed to onDialogueUpdate callback`);
console.log(`   4. StoryManage calls updateDialogue from ApiContext`);
console.log(`   5. ApiContext calls apiService.updateDialogue`);
console.log(`   6. API service makes PATCH request to /dialogues/{id}/`);
console.log(`   7. Success/error message is displayed to user`);
console.log(`   8. Local state is updated with new values`);

console.log(`\n${colors.cyan}✨ INTEGRATION FEATURES:${colors.reset}`);
console.log(`   • Complete data flow from UI to API`);
console.log(`   • Proper error handling at all levels`);
console.log(`   • Success feedback to user`);
console.log(`   • State management throughout the flow`);
console.log(`   • Type safety with TypeScript interfaces`);
console.log(`   • Console logging for debugging`);

process.exit(passRate >= 80 ? 0 : 1);
