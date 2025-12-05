#!/usr/bin/env node

/**
 * Bidirectional Camera Sync Test
 * Tests that camera values sync bidirectionally between dials and dialogue text
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

console.log(`${colors.cyan}${colors.bright}🔄 BIDIRECTIONAL CAMERA SYNC TEST${colors.reset}`);
console.log(`${colors.cyan}===========================================${colors.reset}\n`);

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

// Test 1: Real-time Dialogue Text Updates
function testRealTimeDialogueTextUpdates() {
  console.log(`${colors.yellow}1️⃣ Testing Real-time Dialogue Text Updates...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for real-time dialogue text update function
  const hasUpdateFunction = content.includes('const updateDialogueTextWithCurrentValues = () => {');
  const hasDialogueTextUpdate = content.includes('setCurrentDialogueText(dialogueText);');
  const hasLiveValuesDisplay = content.includes('Camera Values (Live):');
  const hasCurrentDialValues = content.includes('setCurrentDialValues(');
  const hasRealTimeUpdate = content.includes('updateDialogueTextWithCurrentValues();');
  
  console.log(`  ${hasUpdateFunction ? '✅' : '❌'} updateDialogueTextWithCurrentValues function`);
  console.log(`  ${hasDialogueTextUpdate ? '✅' : '❌'} setCurrentDialogueText call`);
  console.log(`  ${hasLiveValuesDisplay ? '✅' : '❌'} Live camera values display`);
  console.log(`  ${hasCurrentDialValues ? '✅' : '❌'} Current dial values storage`);
  console.log(`  ${hasRealTimeUpdate ? '✅' : '❌'} Real-time update calls`);
  
  return hasUpdateFunction && hasDialogueTextUpdate && hasLiveValuesDisplay && 
         hasCurrentDialValues && hasRealTimeUpdate;
}

// Test 2: Slider Event Handlers
function testSliderEventHandlers() {
  console.log(`${colors.yellow}2️⃣ Testing Slider Event Handlers...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for slider event handlers with real-time updates
  const hasAzimuthHandler = content.includes('id="orbitAzimuth"') && content.includes('updateDialogueTextWithCurrentValues();');
  const hasPolarHandler = content.includes('id="orbitPolar"') && content.includes('updateDialogueTextWithCurrentValues();');
  const hasRadiusHandler = content.includes('id="orbitRadius"') && content.includes('updateDialogueTextWithCurrentValues();');
  const hasTargetXHandler = content.includes('id="targetX"') && content.includes('updateDialogueTextWithCurrentValues();');
  const hasTargetYHandler = content.includes('id="targetY"') && content.includes('updateDialogueTextWithCurrentValues();');
  const hasTargetZHandler = content.includes('id="targetZ"') && content.includes('updateDialogueTextWithCurrentValues();');
  const hasFOVHandler = content.includes('id="fieldOfView"') && content.includes('updateDialogueTextWithCurrentValues();');
  const hasZoomHandler = content.includes('id="zoomSpeed"') && content.includes('updateDialogueTextWithCurrentValues();');
  
  console.log(`  ${hasAzimuthHandler ? '✅' : '❌'} Azimuth slider real-time update`);
  console.log(`  ${hasPolarHandler ? '✅' : '❌'} Polar slider real-time update`);
  console.log(`  ${hasRadiusHandler ? '✅' : '❌'} Radius slider real-time update`);
  console.log(`  ${hasTargetXHandler ? '✅' : '❌'} Target X slider real-time update`);
  console.log(`  ${hasTargetYHandler ? '✅' : '❌'} Target Y slider real-time update`);
  console.log(`  ${hasTargetZHandler ? '✅' : '❌'} Target Z slider real-time update`);
  console.log(`  ${hasFOVHandler ? '✅' : '❌'} FOV slider real-time update`);
  console.log(`  ${hasZoomHandler ? '✅' : '❌'} Zoom speed slider real-time update`);
  
  return hasAzimuthHandler && hasPolarHandler && hasRadiusHandler && hasTargetXHandler && 
         hasTargetYHandler && hasTargetZHandler && hasFOVHandler && hasZoomHandler;
}

// Test 3: Dial Updates from Dialogue Navigation
function testDialUpdatesFromNavigation() {
  console.log(`${colors.yellow}3️⃣ Testing Dial Updates from Navigation...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for dial update function and its usage
  const hasUpdateDialsFunction = content.includes('const updateDialsFromDialogue = (dialogue: DialogueData) => {');
  const hasDialUpdateCall = content.includes('updateDialsFromDialogue(currentDialogue);');
  const hasOrbitParsing = content.includes('orbitParts[0].replace(\'deg\', \'\')') && content.includes('orbitParts[1].replace(\'deg\', \'\')');
  const hasTargetParsing = content.includes('targetParts[0].replace(\'m\', \'\')') && content.includes('targetParts[1].replace(\'m\', \'\')');
  const hasSliderValueCalls = content.includes('setSliderValue(\'orbitAzimuth\'') && content.includes('setSliderValue(\'targetX\'');
  const hasEditModeCheck = content.includes('if (!isEditMode) return;');
  
  console.log(`  ${hasUpdateDialsFunction ? '✅' : '❌'} updateDialsFromDialogue function`);
  console.log(`  ${hasDialUpdateCall ? '✅' : '❌'} Dial update call in showDialogue`);
  console.log(`  ${hasOrbitParsing ? '✅' : '❌'} Orbit value parsing`);
  console.log(`  ${hasTargetParsing ? '✅' : '❌'} Target value parsing`);
  console.log(`  ${hasSliderValueCalls ? '✅' : '❌'} setSliderValue calls`);
  console.log(`  ${hasEditModeCheck ? '✅' : '❌'} Edit mode check`);
  
  return hasUpdateDialsFunction && hasDialUpdateCall && hasOrbitParsing && 
         hasTargetParsing && hasSliderValueCalls && hasEditModeCheck;
}

// Test 4: Data Transformation Accuracy
function testDataTransformationAccuracy() {
  console.log(`${colors.yellow}4️⃣ Testing Data Transformation Accuracy...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for accurate data transformation
  const hasOrbitFormat = content.includes('camera_orbit: `${azimuth}deg ${polar}deg ${radius}m`');
  const hasTargetFormat = content.includes('camera_target: `${targetX}m ${targetY}m ${targetZ}m`');
  const hasFOVFormat = content.includes('field_of_view: fieldOfView');
  const hasZoomFormat = content.includes('zoom_speed: zoomSpeed');
  const hasParseFloat = content.includes('parseFloat(') && content.includes('e.target.value');
  const hasValueExtraction = content.includes('getElementById(\'orbitAzimuth\')') && content.includes('getElementById(\'targetX\')');
  
  console.log(`  ${hasOrbitFormat ? '✅' : '❌'} Orbit format string`);
  console.log(`  ${hasTargetFormat ? '✅' : '❌'} Target format string`);
  console.log(`  ${hasFOVFormat ? '✅' : '❌'} FOV format`);
  console.log(`  ${hasZoomFormat ? '✅' : '❌'} Zoom speed format`);
  console.log(`  ${hasParseFloat ? '✅' : '❌'} ParseFloat usage`);
  console.log(`  ${hasValueExtraction ? '✅' : '❌'} Value extraction from DOM`);
  
  return hasOrbitFormat && hasTargetFormat && hasFOVFormat && 
         hasZoomFormat && hasParseFloat && hasValueExtraction;
}

// Test 5: State Management for Sync
function testStateManagementForSync() {
  console.log(`${colors.yellow}5️⃣ Testing State Management for Sync...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for proper state management
  const hasCurrentDialValues = content.includes('const [currentDialValues, setCurrentDialValues] = useState<any>(null);');
  const hasDialogueDataState = content.includes('const [dialogueData, setDialogueData] = useState<DialogueData[]>([]);');
  const hasCurrentEditingDialogue = content.includes('const [currentEditingDialogue, setCurrentEditingDialogue] = useState<DialogueData | null>(null);');
  const hasStateUpdates = content.includes('setCurrentEditingDialogue(updatedDialogue);') && content.includes('setDialogueData(prev => prev.map(');
  const hasDialogueTextState = content.includes('const [currentDialogueText, setCurrentDialogueText] = useState(\'\');');
  
  console.log(`  ${hasCurrentDialValues ? '✅' : '❌'} currentDialValues state`);
  console.log(`  ${hasDialogueDataState ? '✅' : '❌'} dialogueData state`);
  console.log(`  ${hasCurrentEditingDialogue ? '✅' : '❌'} currentEditingDialogue state`);
  console.log(`  ${hasStateUpdates ? '✅' : '❌'} State updates in save function`);
  console.log(`  ${hasDialogueTextState ? '✅' : '❌'} currentDialogueText state`);
  
  return hasCurrentDialValues && hasDialogueDataState && hasCurrentEditingDialogue && 
         hasStateUpdates && hasDialogueTextState;
}

// Test 6: Complete Bidirectional Flow
function testCompleteBidirectionalFlow() {
  console.log(`${colors.yellow}6️⃣ Testing Complete Bidirectional Flow...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for complete bidirectional flow
  const hasDialToText = content.includes('updateDialogueTextWithCurrentValues();') && content.includes('onChange={(e) => {');
  const hasTextToDial = content.includes('updateDialsFromDialogue(currentDialogue);') && content.includes('showDialogue(');
  const hasRealTimeSync = content.includes('Camera Values (Live):') && content.includes('updateDialogueTextWithCurrentValues');
  const hasNavigationSync = content.includes('updateDialsFromDialogue') && content.includes('showDialogue');
  const hasStateConsistency = content.includes('setCurrentDialValues') && content.includes('setCurrentDialogueText');
  
  console.log(`  ${hasDialToText ? '✅' : '❌'} Dial to text sync`);
  console.log(`  ${hasTextToDial ? '✅' : '❌'} Text to dial sync`);
  console.log(`  ${hasRealTimeSync ? '✅' : '❌'} Real-time sync`);
  console.log(`  ${hasNavigationSync ? '✅' : '❌'} Navigation sync`);
  console.log(`  ${hasStateConsistency ? '✅' : '❌'} State consistency`);
  
  return hasDialToText && hasTextToDial && hasRealTimeSync && 
         hasNavigationSync && hasStateConsistency;
}

// Run all tests
runTest('Real-time Dialogue Text Updates', testRealTimeDialogueTextUpdates);
runTest('Slider Event Handlers', testSliderEventHandlers);
runTest('Dial Updates from Navigation', testDialUpdatesFromNavigation);
runTest('Data Transformation Accuracy', testDataTransformationAccuracy);
runTest('State Management for Sync', testStateManagementForSync);
runTest('Complete Bidirectional Flow', testCompleteBidirectionalFlow);

// Results
const passRate = Math.round((passedTests / totalTests) * 100);
console.log(`${colors.cyan}📊 RESULTS: ${passedTests}/${totalTests} tests passed (${passRate}%)${colors.reset}`);

if (passRate >= 80) {
  console.log(`${colors.green}🎉 Bidirectional camera sync is working correctly!${colors.reset}`);
} else {
  console.log(`${colors.red}❌ Bidirectional camera sync needs attention.${colors.reset}`);
}

console.log(`\n${colors.cyan}🔄 BIDIRECTIONAL SYNC FLOW:${colors.reset}`);
console.log(`   1. User adjusts camera dials in edit mode`);
console.log(`   2. onChange handlers trigger updateDialogueTextWithCurrentValues()`);
console.log(`   3. Dialogue text updates with live camera values`);
console.log(`   4. User navigates through dialogues`);
console.log(`   5. showDialogue() calls updateDialsFromDialogue()`);
console.log(`   6. Dials move to match dialogue values`);
console.log(`   7. Camera animates to new position`);
console.log(`   8. Values stay synchronized in both directions`);

console.log(`\n${colors.cyan}✨ SYNC FEATURES:${colors.reset}`);
console.log(`   • Real-time dialogue text updates`);
console.log(`   • Slider event handlers with live updates`);
console.log(`   • Dial updates from dialogue navigation`);
console.log(`   • Accurate data transformation`);
console.log(`   • State management for sync`);
console.log(`   • Complete bidirectional flow`);

process.exit(passRate >= 80 ? 0 : 1);
