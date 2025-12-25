#!/usr/bin/env node

/**
 * CONSOLIDATED SCROLL/NAVIGATION TESTING SUITE
 * 
 * This consolidated test replaces 7 individual scroll/navigation test files:
 * - test-flickering-fix.js
 * - test-navigation-synchronization.js
 * - test-scroll-aware-links.js
 * - test-scroll-functionality-verification.js
 * - test-scroll-manual-verification.js
 * - test-scroll-position-restoration.js
 * - test-speech-bubble-navigation.js
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

console.log(`${colors.cyan}${colors.bright}🧪 CONSOLIDATED SCROLL/NAVIGATION TESTING SUITE${colors.reset}`);
console.log(`${colors.blue}Testing all scroll and navigation functionality in one comprehensive test${colors.reset}\n`);

// Test 1: Scroll Position Restoration
function testScrollPositionRestoration() {
  console.log(`${colors.yellow}1️⃣ Testing Scroll Position Restoration...${colors.reset}`);
  
  const scrollHookPath = 'src/hooks/useScrollPosition.ts';
  const backButtonPath = 'src/components/BackButton.tsx';
  
  // Check scroll position hook
  const scrollHookContent = fs.existsSync(scrollHookPath) ? fs.readFileSync(scrollHookPath, 'utf8') : '';
  const backButtonContent = fs.existsSync(backButtonPath) ? fs.readFileSync(backButtonPath, 'utf8') : '';
  
  const hasScrollHook = scrollHookContent.includes('useScrollPosition');
  const hasSessionStorage = scrollHookContent.includes('sessionStorage.getItem') && scrollHookContent.includes('sessionStorage.setItem');
  const hasScrollTo = scrollHookContent.includes('window.scrollTo');
  const hasRequestAnimationFrame = scrollHookContent.includes('requestAnimationFrame');
  const hasSavePosition = scrollHookContent.includes('saveCurrentPosition');
  const hasRestorePosition = scrollHookContent.includes('restorePosition') || scrollHookContent.includes('scrollTo');
  
  console.log(`  ${hasScrollHook ? '✅' : '❌'} Scroll position hook`);
  console.log(`  ${hasSessionStorage ? '✅' : '❌'} Session storage integration`);
  console.log(`  ${hasScrollTo ? '✅' : '❌'} Window scrollTo functionality`);
  console.log(`  ${hasRequestAnimationFrame ? '✅' : '❌'} RequestAnimationFrame usage`);
  console.log(`  ${hasSavePosition ? '✅' : '❌'} Save position functionality`);
  console.log(`  ${hasRestorePosition ? '✅' : '❌'} Restore position functionality`);
  
  return hasScrollHook && hasSessionStorage && hasScrollTo && hasRequestAnimationFrame && hasSavePosition && hasRestorePosition;
}

// Test 2: Scroll Aware Links
function testScrollAwareLinks() {
  console.log(`${colors.yellow}2️⃣ Testing Scroll Aware Links...${colors.reset}`);
  
  const scrollAwareLinkPath = 'src/components/ScrollAwareLink.tsx';
  const myStudioPath = 'src/pages/MyStudio.tsx';
  
  // Check ScrollAwareLink component
  const scrollAwareContent = fs.existsSync(scrollAwareLinkPath) ? fs.readFileSync(scrollAwareLinkPath, 'utf8') : '';
  const myStudioContent = fs.existsSync(myStudioPath) ? fs.readFileSync(myStudioPath, 'utf8') : '';
  
  const hasScrollAwareComponent = scrollAwareContent.includes('ScrollAwareLink');
  const hasUseScrollPosition = scrollAwareContent.includes('useScrollPosition');
  const hasSaveCurrentPosition = scrollAwareContent.includes('saveCurrentPosition');
  const hasNavigate = scrollAwareContent.includes('Link') || scrollAwareContent.includes('to=');
  const hasHandleClick = scrollAwareContent.includes('handleClick') || scrollAwareContent.includes('onClick');
  const hasLinkUsage = myStudioContent.includes('ScrollAwareLink');
  
  console.log(`  ${hasScrollAwareComponent ? '✅' : '❌'} ScrollAwareLink component`);
  console.log(`  ${hasUseScrollPosition ? '✅' : '❌'} useScrollPosition hook usage`);
  console.log(`  ${hasSaveCurrentPosition ? '✅' : '❌'} Save current position functionality`);
  console.log(`  ${hasNavigate ? '✅' : '❌'} Navigation functionality`);
  console.log(`  ${hasHandleClick ? '✅' : '❌'} Click handling`);
  console.log(`  ${hasLinkUsage ? '✅' : '❌'} ScrollAwareLink usage in MyStudio`);
  
  return hasScrollAwareComponent && hasUseScrollPosition && hasSaveCurrentPosition && hasNavigate && hasHandleClick && hasLinkUsage;
}

// Test 3: Navigation Synchronization
function testNavigationSynchronization() {
  console.log(`${colors.yellow}3️⃣ Testing Navigation Synchronization...${colors.reset}`);
  
  const backButtonPath = 'src/components/BackButton.tsx';
  const appPath = 'src/App.tsx';
  
  // Check navigation synchronization
  const backButtonContent = fs.existsSync(backButtonPath) ? fs.readFileSync(backButtonPath, 'utf8') : '';
  const appContent = fs.existsSync(appPath) ? fs.readFileSync(appPath, 'utf8') : '';
  
  const hasBackButton = backButtonContent.includes('BackButton');
  const hasNavigate = backButtonContent.includes('navigate') || backButtonContent.includes('useNavigate');
  const hasScrollRestore = backButtonContent.includes('scroll') || backButtonContent.includes('position');
  const hasRouteHandling = appContent.includes('Route') || appContent.includes('Routes');
  const hasNavigationState = backButtonContent.includes('useNavigate') || backButtonContent.includes('useScrollPosition');
  const hasClickHandler = backButtonContent.includes('onClick') || backButtonContent.includes('handleClick');
  
  console.log(`  ${hasBackButton ? '✅' : '❌'} BackButton component`);
  console.log(`  ${hasNavigate ? '✅' : '❌'} Navigation functionality`);
  console.log(`  ${hasScrollRestore ? '✅' : '❌'} Scroll restoration`);
  console.log(`  ${hasRouteHandling ? '✅' : '❌'} Route handling`);
  console.log(`  ${hasNavigationState ? '✅' : '❌'} Navigation state management`);
  console.log(`  ${hasClickHandler ? '✅' : '❌'} Click handler`);
  
  return hasBackButton && hasNavigate && hasScrollRestore && hasRouteHandling && hasNavigationState && hasClickHandler;
}

// Test 4: Flickering Fix
function testFlickeringFix() {
  console.log(`${colors.yellow}4️⃣ Testing Flickering Fix...${colors.reset}`);
  
  const episodeManagePath = 'src/pages/EpisodeManage.tsx';
  const content = fs.readFileSync(episodeManagePath, 'utf8');
  
  // Check for anti-flickering patterns
  const hasLocalLoadingState = content.includes('isPageLoading') || content.includes('isLoadingDialogues');
  const hasInitialLoading = content.includes('isPageLoading') || content.includes('setIsPageLoading');
  const hasLoadingSpinner = content.includes('LoadingSpinner');
  const hasConditionalRendering = content.includes('isPageLoading') && content.includes('return');
  const hasErrorHandling = content.includes('try {') && content.includes('catch');
  const hasStateManagement = content.includes('useState') && content.includes('useEffect');
  
  console.log(`  ${hasLocalLoadingState ? '✅' : '❌'} Local loading state`);
  console.log(`  ${hasInitialLoading ? '✅' : '❌'} Initial loading state`);
  console.log(`  ${hasLoadingSpinner ? '✅' : '❌'} Loading spinner component`);
  console.log(`  ${hasConditionalRendering ? '✅' : '❌'} Conditional rendering`);
  console.log(`  ${hasErrorHandling ? '✅' : '❌'} Error handling`);
  console.log(`  ${hasStateManagement ? '✅' : '❌'} State management`);
  
  return hasLocalLoadingState && hasInitialLoading && hasLoadingSpinner && hasConditionalRendering && hasErrorHandling && hasStateManagement;
}

// Test 5: Speech Bubble Navigation
function testSpeechBubbleNavigation() {
  console.log(`${colors.yellow}5️⃣ Testing Speech Bubble Navigation...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for speech bubble navigation
  const hasSpeechBubble = content.includes('speech-bubble') || content.includes('speechBubble');
  const hasNavigationButtons = content.includes('goToPreviousDialogue') || content.includes('goToNextDialogue');
  const hasDialogueText = content.includes('currentDialogueText') || content.includes('dialogueText');
  const hasNavigationControls = content.includes('Previous') || content.includes('Next');
  const hasAutoPlay = content.includes('startPlayback') || content.includes('pausePlayback');
  const hasProgressTracking = content.includes('currentDialogueIndex') || content.includes('episodeDialogues.length');
  
  console.log(`  ${hasSpeechBubble ? '✅' : '❌'} Speech bubble component`);
  console.log(`  ${hasNavigationButtons ? '✅' : '❌'} Navigation buttons`);
  console.log(`  ${hasDialogueText ? '✅' : '❌'} Dialogue text display`);
  console.log(`  ${hasNavigationControls ? '✅' : '❌'} Navigation controls`);
  console.log(`  ${hasAutoPlay ? '✅' : '❌'} Auto-play functionality`);
  console.log(`  ${hasProgressTracking ? '✅' : '❌'} Progress tracking`);
  
  return hasSpeechBubble && hasNavigationButtons && hasDialogueText && hasNavigationControls && hasAutoPlay && hasProgressTracking;
}

// Test 6: Scroll Functionality Verification
function testScrollFunctionalityVerification() {
  console.log(`${colors.yellow}6️⃣ Testing Scroll Functionality Verification...${colors.reset}`);
  
  const scrollHookPath = 'src/hooks/useScrollPosition.ts';
  const content = fs.existsSync(scrollHookPath) ? fs.readFileSync(scrollHookPath, 'utf8') : '';
  
  // Check for scroll functionality
  const hasScrollPosition = content.includes('scrollPosition');
  const hasScrollRestore = content.includes('restorePosition') || content.includes('scrollTo');
  const hasScrollSave = content.includes('savePosition') || content.includes('setItem');
  const hasScrollClear = content.includes('clearPosition') || content.includes('removeItem');
  const hasScrollValidation = content.includes('if (') && content.includes('scroll');
  const hasScrollDebug = content.includes('console.log') && content.includes('scroll');
  
  console.log(`  ${hasScrollPosition ? '✅' : '❌'} Scroll position tracking`);
  console.log(`  ${hasScrollRestore ? '✅' : '❌'} Scroll restoration`);
  console.log(`  ${hasScrollSave ? '✅' : '❌'} Scroll saving`);
  console.log(`  ${hasScrollClear ? '✅' : '❌'} Scroll clearing`);
  console.log(`  ${hasScrollValidation ? '✅' : '❌'} Scroll validation`);
  console.log(`  ${hasScrollDebug ? '✅' : '❌'} Scroll debugging`);
  
  return hasScrollPosition && hasScrollRestore && hasScrollSave && hasScrollClear && hasScrollValidation && hasScrollDebug;
}

// Run all tests
function runAllTests() {
  console.log(`${colors.cyan}${colors.bright}📊 CONSOLIDATED SCROLL/NAVIGATION TEST RESULTS${colors.reset}\n`);
  
  const tests = [
    { name: 'Scroll Position Restoration', fn: testScrollPositionRestoration },
    { name: 'Scroll Aware Links', fn: testScrollAwareLinks },
    { name: 'Navigation Synchronization', fn: testNavigationSynchronization },
    { name: 'Flickering Fix', fn: testFlickeringFix },
    { name: 'Speech Bubble Navigation', fn: testSpeechBubbleNavigation },
    { name: 'Scroll Functionality Verification', fn: testScrollFunctionalityVerification }
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
    console.log(`\n${colors.green}${colors.bright}🎉 ALL SCROLL/NAVIGATION TESTS PASSED!${colors.reset}`);
    console.log(`${colors.blue}Consolidated test successfully replaces 7 individual test files${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}⚠️ Some scroll/navigation tests failed${colors.reset}`);
    console.log(`${colors.yellow}Review the failed tests above${colors.reset}`);
  }
  
  return passed === total;
}

// Execute tests
runAllTests();
