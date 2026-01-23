#!/usr/bin/env node

/**
 * CONSOLIDATED AUTOPLAY TESTING SUITE
 * 
 * This consolidated test replaces 2 individual autoplay test files:
 * - test-autoplay-camera-fix.js
 * - test-autoplay-fix.js
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

console.log(`${colors.cyan}${colors.bright}🧪 CONSOLIDATED AUTOPLAY TESTING SUITE${colors.reset}`);
console.log(`${colors.blue}Testing all autoplay functionality in one comprehensive test${colors.reset}\n`);

// Test 1: Autoplay Basic Functionality
function testAutoplayBasic() {
  console.log(`${colors.yellow}1️⃣ Testing Autoplay Basic Functionality...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for autoplay functionality
  const hasStartPlayback = content.includes('startPlayback');
  const hasPausePlayback = content.includes('pausePlayback');
  const hasTogglePlay = content.includes('togglePlay');
  const hasIsPlaying = content.includes('isPlaying');
  const hasPlayInterval = content.includes('playIntervalRef');
  const hasPlaySpeed = content.includes('playSpeed');
  
  console.log(`  ${hasStartPlayback ? '✅' : '❌'} Start playback function`);
  console.log(`  ${hasPausePlayback ? '✅' : '❌'} Pause playback function`);
  console.log(`  ${hasTogglePlay ? '✅' : '❌'} Toggle play function`);
  console.log(`  ${hasIsPlaying ? '✅' : '❌'} Playing state tracking`);
  console.log(`  ${hasPlayInterval ? '✅' : '❌'} Play interval management`);
  console.log(`  ${hasPlaySpeed ? '✅' : '❌'} Play speed controls`);
  
  return hasStartPlayback && hasPausePlayback && hasTogglePlay && hasIsPlaying && hasPlayInterval && hasPlaySpeed;
}

// Test 2: Autoplay Camera Integration
function testAutoplayCameraIntegration() {
  console.log(`${colors.yellow}2️⃣ Testing Autoplay Camera Integration...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for camera integration in autoplay
  const hasLoadDialogue = content.includes('loadDialogue');
  const hasShowDialogue = content.includes('showDialogue');
  const hasCameraAnimation = content.includes('animate(') && content.includes('cameraOrbit');
  const hasCurrentDialogueIndex = content.includes('currentDialogueIndex');
  const hasDialogueIndexUpdate = content.includes('setCurrentDialogueIndex');
  const hasCameraValues = content.includes('camera_orbit') && content.includes('camera_target');
  
  console.log(`  ${hasLoadDialogue ? '✅' : '❌'} Load dialogue function`);
  console.log(`  ${hasShowDialogue ? '✅' : '❌'} Show dialogue function`);
  console.log(`  ${hasCameraAnimation ? '✅' : '❌'} Camera animation in autoplay`);
  console.log(`  ${hasCurrentDialogueIndex ? '✅' : '❌'} Current dialogue index tracking`);
  console.log(`  ${hasDialogueIndexUpdate ? '✅' : '❌'} Dialogue index updates`);
  console.log(`  ${hasCameraValues ? '✅' : '❌'} Camera values integration`);
  
  return hasLoadDialogue && hasShowDialogue && hasCameraAnimation && hasCurrentDialogueIndex && hasDialogueIndexUpdate && hasCameraValues;
}

// Test 3: Autoplay Controls
function testAutoplayControls() {
  console.log(`${colors.yellow}3️⃣ Testing Autoplay Controls...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for autoplay controls
  const hasPlayButton = content.includes('fa-play') || content.includes('fa-pause');
  const hasPlaySpeedControls = content.includes('1x') && content.includes('1.5x');
  const hasPlayButtonToggle = content.includes('isPlaying ? \'fa-pause\' : \'fa-play\'');
  const hasPlaySpeedSelection = content.includes('playSpeed === 5000') || content.includes('playSpeed === 3333');
  const hasPlayButtonClick = content.includes('onClick={togglePlay}');
  const hasSpeedButtonClick = content.includes('onClick={() => setPlaySpeed');
  
  console.log(`  ${hasPlayButton ? '✅' : '❌'} Play/pause button`);
  console.log(`  ${hasPlaySpeedControls ? '✅' : '❌'} Play speed controls`);
  console.log(`  ${hasPlayButtonToggle ? '✅' : '❌'} Play button toggle`);
  console.log(`  ${hasPlaySpeedSelection ? '✅' : '❌'} Play speed selection`);
  console.log(`  ${hasPlayButtonClick ? '✅' : '❌'} Play button click handler`);
  console.log(`  ${hasSpeedButtonClick ? '✅' : '❌'} Speed button click handlers`);
  
  return hasPlayButton && hasPlaySpeedControls && hasPlayButtonToggle && hasPlaySpeedSelection && hasPlayButtonClick && hasSpeedButtonClick;
}

// Test 4: Autoplay State Management
function testAutoplayStateManagement() {
  console.log(`${colors.yellow}4️⃣ Testing Autoplay State Management...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for state management
  const hasIsPlayingState = content.includes('const [isPlaying, setIsPlaying]');
  const hasPlaySpeedState = content.includes('const [playSpeed, setPlaySpeed]');
  const hasPlayIntervalRef = content.includes('const playIntervalRef = useRef');
  const hasIntervalCleanup = content.includes('clearInterval') && content.includes('playIntervalRef.current');
  const hasStateReset = content.includes('setIsPlaying(false)') || content.includes('setIsPlaying(true)');
  const hasIntervalManagement = content.includes('setInterval') && content.includes('playIntervalRef.current');
  
  console.log(`  ${hasIsPlayingState ? '✅' : '❌'} Playing state management`);
  console.log(`  ${hasPlaySpeedState ? '✅' : '❌'} Play speed state management`);
  console.log(`  ${hasPlayIntervalRef ? '✅' : '❌'} Play interval ref`);
  console.log(`  ${hasIntervalCleanup ? '✅' : '❌'} Interval cleanup`);
  console.log(`  ${hasStateReset ? '✅' : '❌'} State reset functionality`);
  console.log(`  ${hasIntervalManagement ? '✅' : '❌'} Interval management`);
  
  return hasIsPlayingState && hasPlaySpeedState && hasPlayIntervalRef && hasIntervalCleanup && hasStateReset && hasIntervalManagement;
}

// Test 5: Autoplay End Behavior
function testAutoplayEndBehavior() {
  console.log(`${colors.yellow}5️⃣ Testing Autoplay End Behavior...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for end behavior
  const hasEndCondition = content.includes('currentIndex < episodeDialogues.length - 1');
  const hasSummaryDisplay = content.includes('setIsShowingSummary(true)');
  const hasPauseOnEnd = content.includes('pausePlayback()');
  const hasEndLogging = content.includes('Auto-play reached end') || content.includes('Auto-play end');
  const hasIndexValidation = content.includes('currentIndex') && content.includes('episodeDialogues.length');
  const hasEndStateReset = content.includes('setIsShowingSummary') && content.includes('pausePlayback');
  
  console.log(`  ${hasEndCondition ? '✅' : '❌'} End condition check`);
  console.log(`  ${hasSummaryDisplay ? '✅' : '❌'} Summary display on end`);
  console.log(`  ${hasPauseOnEnd ? '✅' : '❌'} Pause on end`);
  console.log(`  ${hasEndLogging ? '✅' : '❌'} End behavior logging`);
  console.log(`  ${hasIndexValidation ? '✅' : '❌'} Index validation`);
  console.log(`  ${hasEndStateReset ? '✅' : '❌'} End state reset`);
  
  return hasEndCondition && hasSummaryDisplay && hasPauseOnEnd && hasEndLogging && hasIndexValidation && hasEndStateReset;
}

// Run all tests
function runAllTests() {
  console.log(`${colors.cyan}${colors.bright}📊 CONSOLIDATED AUTOPLAY TEST RESULTS${colors.reset}\n`);
  
  const tests = [
    { name: 'Autoplay Basic Functionality', fn: testAutoplayBasic },
    { name: 'Autoplay Camera Integration', fn: testAutoplayCameraIntegration },
    { name: 'Autoplay Controls', fn: testAutoplayControls },
    { name: 'Autoplay State Management', fn: testAutoplayStateManagement },
    { name: 'Autoplay End Behavior', fn: testAutoplayEndBehavior }
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
    console.log(`\n${colors.green}${colors.bright}🎉 ALL AUTOPLAY TESTS PASSED!${colors.reset}`);
    console.log(`${colors.blue}Consolidated test successfully replaces 2 individual test files${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}⚠️ Some autoplay tests failed${colors.reset}`);
    console.log(`${colors.yellow}Review the failed tests above${colors.reset}`);
  }
  
  return passed === total;
}

// Execute tests
runAllTests();
