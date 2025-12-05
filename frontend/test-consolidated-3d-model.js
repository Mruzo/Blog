#!/usr/bin/env node

/**
 * CONSOLIDATED 3D MODEL TESTING SUITE
 * 
 * This consolidated test replaces the following individual 3D model test files:
 * - test-3d-model-debug.js
 * - test-3d-model-direct-element.js
 * - test-3d-model-display.js
 * - test-3d-model-fix.js
 * - test-3d-model-react-fix.js
 * - test-3d-model-switching-final.js
 * - test-3d-model-switching.js
 * - test-3d-model-viewer-start.js
 * - test-glb-animation-functionality.js
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

console.log(`${colors.cyan}${colors.bright}🧪 CONSOLIDATED 3D MODEL TESTING SUITE${colors.reset}`);
console.log(`${colors.blue}Testing all 3D model functionality in one comprehensive test${colors.reset}\n`);

// Test 1: 3D Model Display and Loading
function testModelDisplay() {
  console.log(`${colors.yellow}1️⃣ Testing 3D Model Display...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  if (!fs.existsSync(comic3dViewerPath)) {
    console.log(`${colors.red}❌ Comic3DViewer component not found${colors.reset}`);
    return false;
  }
  
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for model-viewer element
  const hasModelViewer = content.includes('<model-viewer');
  const hasModelViewerRef = content.includes('modelViewerRef');
  const hasModelReady = content.includes('isModelReady');
  const hasModelStarted = content.includes('isStarted');
  
  console.log(`  ${hasModelViewer ? '✅' : '❌'} Model-viewer element present`);
  console.log(`  ${hasModelViewerRef ? '✅' : '❌'} Model viewer ref implemented`);
  console.log(`  ${hasModelReady ? '✅' : '❌'} Model ready state tracking`);
  console.log(`  ${hasModelStarted ? '✅' : '❌'} Model started state tracking`);
  
  return hasModelViewer && hasModelViewerRef && hasModelReady && hasModelStarted;
}

// Test 2: 3D Model Switching
function testModelSwitching() {
  console.log(`${colors.yellow}2️⃣ Testing 3D Model Switching...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for model switching functionality
  const hasPreviousModel = content.includes('previousModel');
  const hasModelChangeDetection = content.includes('getModelFromSeason');
  const hasModelViewerKey = content.includes('key={`model-viewer-${selectedEpisode?.id}-${getModelFromSeason(selectedEpisode)}`}');
  const hasStateReset = content.includes('setIsModelReady(false)');
  
  console.log(`  ${hasPreviousModel ? '✅' : '❌'} Previous model state tracking`);
  console.log(`  ${hasModelChangeDetection ? '✅' : '❌'} Model change detection`);
  console.log(`  ${hasModelViewerKey ? '✅' : '❌'} Model viewer key prop for re-rendering`);
  console.log(`  ${hasStateReset ? '✅' : '❌'} State reset on model change`);
  
  return hasPreviousModel && hasModelChangeDetection && hasModelViewerKey && hasStateReset;
}

// Test 3: 3D Model Debug and Error Handling
function testModelDebug() {
  console.log(`${colors.yellow}3️⃣ Testing 3D Model Debug and Error Handling...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for debug logging
  const hasDebugLogging = content.includes('console.log') && content.includes('Comic3DViewer:');
  const hasErrorHandling = content.includes('try {') && content.includes('catch');
  const hasModelValidation = content.includes('getModelFromSeason(selectedEpisode)');
  const hasLoadingStates = content.includes('Loading...') || content.includes('isLoading');
  
  console.log(`  ${hasDebugLogging ? '✅' : '❌'} Debug logging implemented`);
  console.log(`  ${hasErrorHandling ? '✅' : '❌'} Error handling present`);
  console.log(`  ${hasModelValidation ? '✅' : '❌'} Model validation`);
  console.log(`  ${hasLoadingStates ? '✅' : '❌'} Loading states implemented`);
  
  return hasDebugLogging && hasErrorHandling && hasModelValidation && hasLoadingStates;
}

// Test 4: 3D Model React Integration
function testModelReactIntegration() {
  console.log(`${colors.yellow}4️⃣ Testing 3D Model React Integration...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for React patterns
  const hasUseEffect = content.includes('useEffect');
  const hasUseState = content.includes('useState');
  const hasUseCallback = content.includes('useCallback');
  const hasUseRef = content.includes('useRef');
  const hasPropsInterface = content.includes('interface Comic3DViewerProps');
  
  console.log(`  ${hasUseEffect ? '✅' : '❌'} useEffect hooks implemented`);
  console.log(`  ${hasUseState ? '✅' : '❌'} useState hooks implemented`);
  console.log(`  ${hasUseCallback ? '✅' : '❌'} useCallback hooks implemented`);
  console.log(`  ${hasUseRef ? '✅' : '❌'} useRef hooks implemented`);
  console.log(`  ${hasPropsInterface ? '✅' : '❌'} Props interface defined`);
  
  return hasUseEffect && hasUseState && hasUseCallback && hasUseRef && hasPropsInterface;
}

// Test 5: 3D Model Direct Element Access
function testModelDirectElement() {
  console.log(`${colors.yellow}5️⃣ Testing 3D Model Direct Element Access...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for direct element access
  const hasModelViewerRef = content.includes('modelViewerRef.current');
  const hasEventListeners = content.includes('addEventListener');
  const hasCameraControls = content.includes('cameraOrbit') || content.includes('cameraTarget');
  const hasModelViewerProps = content.includes('shadow-intensity') || content.includes('exposure');
  
  console.log(`  ${hasModelViewerRef ? '✅' : '❌'} Model viewer ref access`);
  console.log(`  ${hasEventListeners ? '✅' : '❌'} Event listeners implemented`);
  console.log(`  ${hasCameraControls ? '✅' : '❌'} Camera controls implemented`);
  console.log(`  ${hasModelViewerProps ? '✅' : '❌'} Model viewer properties set`);
  
  return hasModelViewerRef && hasEventListeners && hasCameraControls && hasModelViewerProps;
}

// Test 6: GLB Animation Functionality
function testGLBAnimation() {
  console.log(`${colors.yellow}6️⃣ Testing GLB Animation Functionality...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for animation functionality
  const hasAnimationController = content.includes('AnimationController');
  const hasModelViewerPlay = content.includes('modelViewerRef.current.play') || content.includes('modelViewer.play');
  const hasModelViewerPause = content.includes('modelViewerRef.current.pause') || content.includes('modelViewer.pause');
  const hasAvailableAnimations = content.includes('availableAnimations') || content.includes('available.*animations');
  const hasAnimationSequencing = content.includes('animationsStartedRef') || content.includes('animation.*sequence');
  const hasAutoPlayAll = content.includes('play.*all.*animations') || (content.includes('availableAnimations') && content.includes('forEach') && content.includes('play'));
  
  console.log(`  ${hasAnimationController ? '✅' : '❌'} AnimationController component`);
  console.log(`  ${hasModelViewerPlay ? '✅' : '❌'} Model viewer play method`);
  console.log(`  ${hasModelViewerPause ? '✅' : '❌'} Model viewer pause method`);
  console.log(`  ${hasAvailableAnimations ? '✅' : '❌'} Available animations access`);
  console.log(`  ${hasAnimationSequencing ? '✅' : '❌'} Animation sequencing logic`);
  console.log(`  ${hasAutoPlayAll ? '✅' : '❌'} Auto-play all animations`);
  
  return hasAnimationController && hasModelViewerPlay && hasAvailableAnimations && hasAnimationSequencing;
}

// Run all tests
function runAllTests() {
  console.log(`${colors.cyan}${colors.bright}📊 CONSOLIDATED 3D MODEL TEST RESULTS${colors.reset}\n`);
  
  const tests = [
    { name: '3D Model Display', fn: testModelDisplay },
    { name: '3D Model Switching', fn: testModelSwitching },
    { name: '3D Model Debug', fn: testModelDebug },
    { name: '3D Model React Integration', fn: testModelReactIntegration },
    { name: '3D Model Direct Element Access', fn: testModelDirectElement },
    { name: 'GLB Animation Functionality', fn: testGLBAnimation }
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
    console.log(`\n${colors.green}${colors.bright}🎉 ALL 3D MODEL TESTS PASSED!${colors.reset}`);
    console.log(`${colors.blue}Consolidated test successfully replaces 9 individual test files${colors.reset}`);
    console.log(`${colors.yellow}  • Basic 3D model tests: 8 files${colors.reset}`);
    console.log(`${colors.yellow}  • GLB animation test: 1 file${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}⚠️ Some 3D model tests failed${colors.reset}`);
    console.log(`${colors.yellow}Review the failed tests above${colors.reset}`);
  }
  
  return passed === total;
}

// Execute tests
runAllTests();
