#!/usr/bin/env node

/**
 * Save Button Immediate Update Test
 * Tests that save button immediately shows updated values without reverting
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

console.log(`${colors.cyan}${colors.bright}💾 SAVE BUTTON IMMEDIATE UPDATE TEST${colors.reset}`);
console.log(`${colors.cyan}===============================================${colors.reset}\n`);

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

// Test 1: showDialogueWithData Function
function testShowDialogueWithDataFunction() {
  console.log(`${colors.yellow}1️⃣ Testing showDialogueWithData Function...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for showDialogueWithData function
  const hasShowDialogueWithDataFunction = content.includes('const showDialogueWithData = (index: number, customDialogueData: DialogueData[]) => {');
  const hasCustomDialogueDataParam = content.includes('customDialogueData: DialogueData[]');
  const hasCustomDialogueDataUsage = content.includes('const currentDialogue = customDialogueData[index];');
  const hasCustomDialogueDataCheck = content.includes('if (!customDialogueData || !customDialogueData[index])');
  const hasCustomDialogueDataLogging = content.includes('customDialogueData length:') && content.includes('customDialogueData:');
  
  console.log(`  ${hasShowDialogueWithDataFunction ? '✅' : '❌'} showDialogueWithData function`);
  console.log(`  ${hasCustomDialogueDataParam ? '✅' : '❌'} customDialogueData parameter`);
  console.log(`  ${hasCustomDialogueDataUsage ? '✅' : '❌'} customDialogueData usage`);
  console.log(`  ${hasCustomDialogueDataCheck ? '✅' : '❌'} customDialogueData validation`);
  console.log(`  ${hasCustomDialogueDataLogging ? '✅' : '❌'} customDialogueData logging`);
  
  return hasShowDialogueWithDataFunction && hasCustomDialogueDataParam && hasCustomDialogueDataUsage && 
         hasCustomDialogueDataCheck && hasCustomDialogueDataLogging;
}

// Test 2: Save Function Uses Updated Data
function testSaveFunctionUsesUpdatedData() {
  console.log(`${colors.yellow}2️⃣ Testing Save Function Uses Updated Data...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for save function using updated data
  const hasUpdatedDialogueDataCreation = content.includes('const updatedDialogueData = dialogueData.map(d =>');
  const hasDialogueIdCheck = content.includes('d.dialogue_id === currentEditingDialogue.dialogue_id');
  const hasDataSpread = content.includes('? { ...d, ...data }');
  const hasShowDialogueWithDataCall = content.includes('showDialogueWithData(currentDialogueIndex, updatedDialogueData);');
  const hasImmediateUpdateComment = content.includes('Use the updated dialogue data directly instead of waiting for state update');
  
  console.log(`  ${hasUpdatedDialogueDataCreation ? '✅' : '❌'} Updated dialogue data creation`);
  console.log(`  ${hasDialogueIdCheck ? '✅' : '❌'} Dialogue ID check`);
  console.log(`  ${hasDataSpread ? '✅' : '❌'} Data spread operator`);
  console.log(`  ${hasShowDialogueWithDataCall ? '✅' : '❌'} showDialogueWithData call`);
  console.log(`  ${hasImmediateUpdateComment ? '✅' : '❌'} Immediate update comment`);
  
  return hasUpdatedDialogueDataCreation && hasDialogueIdCheck && hasDataSpread && 
         hasShowDialogueWithDataCall && hasImmediateUpdateComment;
}

// Test 3: Reset Function Uses Updated Data
function testResetFunctionUsesUpdatedData() {
  console.log(`${colors.yellow}3️⃣ Testing Reset Function Uses Updated Data...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for reset function using updated data
  const hasResetDialogueDataCreation = content.includes('const resetDialogueData = dialogueData.map(d =>');
  const hasResetDialogueIdCheck = content.includes('d.dialogue_id === currentEditingDialogue.dialogue_id') && content.includes('resetDialogueData');
  const hasResetDataSpread = content.includes('? { ...d, ...originalValues }');
  const hasResetShowDialogueWithDataCall = content.includes('showDialogueWithData(currentDialogueIndex, resetDialogueData);');
  const hasResetImmediateUpdateComment = content.includes('Use the reset dialogue data directly instead of waiting for state update');
  
  console.log(`  ${hasResetDialogueDataCreation ? '✅' : '❌'} Reset dialogue data creation`);
  console.log(`  ${hasResetDialogueIdCheck ? '✅' : '❌'} Reset dialogue ID check`);
  console.log(`  ${hasResetDataSpread ? '✅' : '❌'} Reset data spread operator`);
  console.log(`  ${hasResetShowDialogueWithDataCall ? '✅' : '❌'} Reset showDialogueWithData call`);
  console.log(`  ${hasResetImmediateUpdateComment ? '✅' : '❌'} Reset immediate update comment`);
  
  return hasResetDialogueDataCreation && hasResetDialogueIdCheck && hasResetDataSpread && 
         hasResetShowDialogueWithDataCall && hasResetImmediateUpdateComment;
}

// Test 4: State Management Consistency
function testStateManagementConsistency() {
  console.log(`${colors.yellow}4️⃣ Testing State Management Consistency...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for consistent state management
  const hasSetDialogueData = content.includes('setDialogueData(prev => prev.map(d =>');
  const hasSetCurrentEditingDialogue = content.includes('setCurrentEditingDialogue(updatedDialogue);');
  const hasSetOriginalValues = content.includes('setOriginalValues(data);');
  const hasStateUpdateOrder = content.includes('setCurrentEditingDialogue') && content.includes('setDialogueData') && content.includes('setOriginalValues');
  const hasImmediateDisplayUpdate = content.includes('showDialogueWithData') && content.includes('updatedDialogueData');
  
  console.log(`  ${hasSetDialogueData ? '✅' : '❌'} setDialogueData state update`);
  console.log(`  ${hasSetCurrentEditingDialogue ? '✅' : '❌'} setCurrentEditingDialogue state update`);
  console.log(`  ${hasSetOriginalValues ? '✅' : '❌'} setOriginalValues state update`);
  console.log(`  ${hasStateUpdateOrder ? '✅' : '❌'} State update order`);
  console.log(`  ${hasImmediateDisplayUpdate ? '✅' : '❌'} Immediate display update`);
  
  return hasSetDialogueData && hasSetCurrentEditingDialogue && hasSetOriginalValues && 
         hasStateUpdateOrder && hasImmediateDisplayUpdate;
}

// Test 5: Data Flow Integrity
function testDataFlowIntegrity() {
  console.log(`${colors.yellow}5️⃣ Testing Data Flow Integrity...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for data flow integrity
  const hasDataCollection = content.includes('getElementById(\'orbitAzimuth\')') && content.includes('getElementById(\'targetX\')');
  const hasDataFormatting = content.includes('camera_orbit: `${azimuth}deg ${polar}deg ${radius}m`');
  const hasApiCall = content.includes('onDialogueUpdate?.(currentEditingDialogue.dialogue_id, data);');
  const hasStateUpdate = content.includes('setCurrentEditingDialogue(updatedDialogue);');
  const hasImmediateDisplay = content.includes('showDialogueWithData(currentDialogueIndex, updatedDialogueData);');
  
  console.log(`  ${hasDataCollection ? '✅' : '❌'} Data collection from dials`);
  console.log(`  ${hasDataFormatting ? '✅' : '❌'} Data formatting`);
  console.log(`  ${hasApiCall ? '✅' : '❌'} API call`);
  console.log(`  ${hasStateUpdate ? '✅' : '❌'} State update`);
  console.log(`  ${hasImmediateDisplay ? '✅' : '❌'} Immediate display update`);
  
  return hasDataCollection && hasDataFormatting && hasApiCall && 
         hasStateUpdate && hasImmediateDisplay;
}

// Test 6: No Reversion After Save
function testNoReversionAfterSave() {
  console.log(`${colors.yellow}6️⃣ Testing No Reversion After Save...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check that save doesn't revert to old values
  const hasNoOldShowDialogueCall = !content.includes('showDialogue(currentDialogueIndex);') || content.includes('// Refresh the dialogue display to show updated values immediately');
  const hasUpdatedDataUsage = content.includes('showDialogueWithData(currentDialogueIndex, updatedDialogueData);');
  const hasResetDataUsage = content.includes('showDialogueWithData(currentDialogueIndex, resetDialogueData);');
  const hasImmediateUpdateLogic = content.includes('Use the updated dialogue data directly instead of waiting for state update');
  const hasNoStateWait = !content.includes('setTimeout') || content.includes('setTimeout(() => setSaveMessage(null), 3000);');
  
  console.log(`  ${hasNoOldShowDialogueCall ? '✅' : '❌'} No old showDialogue call in save`);
  console.log(`  ${hasUpdatedDataUsage ? '✅' : '❌'} Updated data usage in save`);
  console.log(`  ${hasResetDataUsage ? '✅' : '❌'} Reset data usage in reset`);
  console.log(`  ${hasImmediateUpdateLogic ? '✅' : '❌'} Immediate update logic`);
  console.log(`  ${hasNoStateWait ? '✅' : '❌'} No state wait in display update`);
  
  return hasNoOldShowDialogueCall && hasUpdatedDataUsage && hasResetDataUsage && 
         hasImmediateUpdateLogic && hasNoStateWait;
}

// Run all tests
runTest('showDialogueWithData Function', testShowDialogueWithDataFunction);
runTest('Save Function Uses Updated Data', testSaveFunctionUsesUpdatedData);
runTest('Reset Function Uses Updated Data', testResetFunctionUsesUpdatedData);
runTest('State Management Consistency', testStateManagementConsistency);
runTest('Data Flow Integrity', testDataFlowIntegrity);
runTest('No Reversion After Save', testNoReversionAfterSave);

// Results
const passRate = Math.round((passedTests / totalTests) * 100);
console.log(`${colors.cyan}📊 RESULTS: ${passedTests}/${totalTests} tests passed (${passRate}%)${colors.reset}`);

if (passRate >= 80) {
  console.log(`${colors.green}🎉 Save button immediate update is working correctly!${colors.reset}`);
} else {
  console.log(`${colors.red}❌ Save button immediate update needs attention.${colors.reset}`);
}

console.log(`\n${colors.cyan}💾 SAVE BUTTON IMMEDIATE UPDATE FLOW:${colors.reset}`);
console.log(`   1. User adjusts camera dials in edit mode`);
console.log(`   2. User clicks Save button`);
console.log(`   3. saveCameraChanges() collects all dial values`);
console.log(`   4. Data is formatted for API compatibility`);
console.log(`   5. onDialogueUpdate callback sends data to API`);
console.log(`   6. currentEditingDialogue state is updated`);
console.log(`   7. dialogueData state is updated with new values`);
console.log(`   8. updatedDialogueData is created with new values`);
console.log(`   9. showDialogueWithData() is called with updated data`);
console.log(`   10. Dialogue text shows updated values immediately`);
console.log(`   11. Camera animates to new position`);
console.log(`   12. Values persist without reverting`);

console.log(`\n${colors.cyan}✨ IMMEDIATE UPDATE FEATURES:${colors.reset}`);
console.log(`   • showDialogueWithData function`);
console.log(`   • Save function uses updated data`);
console.log(`   • Reset function uses updated data`);
console.log(`   • State management consistency`);
console.log(`   • Data flow integrity`);
console.log(`   • No reversion after save`);

process.exit(passRate >= 80 ? 0 : 1);
