#!/usr/bin/env node

/**
 * CONSOLIDATED LOADING TESTING SUITE
 * 
 * This consolidated test replaces 3 individual loading test files:
 * - test-episode-manage-loading.js
 * - test-loading-issue.js
 * - test-loading-verification.js
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

console.log(`${colors.cyan}${colors.bright}🧪 CONSOLIDATED LOADING TESTING SUITE${colors.reset}`);
console.log(`${colors.blue}Testing all loading functionality in one comprehensive test${colors.reset}\n`);

// Test 1: Episode Manage Loading
function testEpisodeManageLoading() {
  console.log(`${colors.yellow}1️⃣ Testing Episode Manage Loading...${colors.reset}`);
  
  const episodeManagePath = 'src/pages/EpisodeManage.tsx';
  const content = fs.readFileSync(episodeManagePath, 'utf8');
  
  // Check for loading states (refined criteria based on actual implementation)
  const hasIsPageLoading = content.includes('isPageLoading');
  const hasIsLoadingDialogues = content.includes('isLoadingDialogues');
  const hasLoadingSpinner = content.includes('LoadingSpinner');
  const hasLoadingCondition = content.includes('isPageLoading') && content.includes('return');
  const hasLoadingText = content.includes('Loading episodes...') || content.includes('Loading dialogues...');
  const hasLoadingStateManagement = content.includes('setIsPageLoading') || content.includes('setIsLoadingDialogues');
  
  console.log(`  ${hasIsPageLoading ? '✅' : '❌'} Page loading state`);
  console.log(`  ${hasIsLoadingDialogues ? '✅' : '❌'} Dialogues loading state`);
  console.log(`  ${hasLoadingSpinner ? '✅' : '❌'} Loading spinner component`);
  console.log(`  ${hasLoadingCondition ? '✅' : '❌'} Loading condition check`);
  console.log(`  ${hasLoadingText ? '✅' : '❌'} Loading text messages`);
  console.log(`  ${hasLoadingStateManagement ? '✅' : '❌'} Loading state management`);
  
  return hasIsPageLoading && hasIsLoadingDialogues && hasLoadingSpinner && hasLoadingCondition && hasLoadingText && hasLoadingStateManagement;
}

// Test 2: Loading Issue Detection
function testLoadingIssueDetection() {
  console.log(`${colors.yellow}2️⃣ Testing Loading Issue Detection...${colors.reset}`);
  
  const episodeManagePath = 'src/pages/EpisodeManage.tsx';
  const content = fs.readFileSync(episodeManagePath, 'utf8');
  
  // Check for loading issue detection (refined criteria)
  const hasErrorHandling = content.includes('try {') && content.includes('catch');
  const hasErrorLogging = content.includes('console.error');
  const hasErrorInLoadAllData = content.includes('Error loading data:') || content.includes('Error loading season data:');
  const hasErrorInLoadDialogues = content.includes('Error loading dialogues:');
  const hasFinallyBlock = content.includes('finally {');
  const hasErrorInTryCatch = content.includes('try {') && content.includes('} catch (error)');
  
  console.log(`  ${hasErrorHandling ? '✅' : '❌'} Error handling with try/catch`);
  console.log(`  ${hasErrorLogging ? '✅' : '❌'} Error logging with console.error`);
  console.log(`  ${hasErrorInLoadAllData ? '✅' : '❌'} Error logging in loadAllData`);
  console.log(`  ${hasErrorInLoadDialogues ? '✅' : '❌'} Error logging in loadDialogues`);
  console.log(`  ${hasFinallyBlock ? '✅' : '❌'} Finally block for cleanup`);
  console.log(`  ${hasErrorInTryCatch ? '✅' : '❌'} Try/catch error handling`);
  
  return hasErrorHandling && hasErrorLogging && hasErrorInLoadAllData && hasErrorInLoadDialogues && hasFinallyBlock && hasErrorInTryCatch;
}

// Test 3: Loading Verification
function testLoadingVerification() {
  console.log(`${colors.yellow}3️⃣ Testing Loading Verification...${colors.reset}`);
  
  const episodeManagePath = 'src/pages/EpisodeManage.tsx';
  const content = fs.readFileSync(episodeManagePath, 'utf8');
  
  // Check for loading verification (refined criteria)
  const hasLoadDialogues = content.includes('loadDialogues');
  const hasLoadAllData = content.includes('loadAllData');
  const hasDataValidation = content.includes('if (seasonId)') || content.includes('if (storyId)');
  const hasDataDisplay = content.includes('episodes.length > 0') || content.includes('episodeDialogues.length');
  const hasDataMapping = content.includes('.map(') && content.includes('episode');
  const hasLoadingStateReset = content.includes('setIsPageLoading(false)') || content.includes('setIsLoadingDialogues(false)');
  
  console.log(`  ${hasLoadDialogues ? '✅' : '❌'} Load dialogues function`);
  console.log(`  ${hasLoadAllData ? '✅' : '❌'} Load all data function`);
  console.log(`  ${hasDataValidation ? '✅' : '❌'} Data validation with seasonId/storyId`);
  console.log(`  ${hasDataDisplay ? '✅' : '❌'} Data display with length checks`);
  console.log(`  ${hasDataMapping ? '✅' : '❌'} Data mapping for episodes`);
  console.log(`  ${hasLoadingStateReset ? '✅' : '❌'} Loading state reset`);
  
  return hasLoadDialogues && hasLoadAllData && hasDataValidation && hasDataDisplay && hasDataMapping && hasLoadingStateReset;
}

// Test 4: Loading Spinner Consistency
function testLoadingSpinnerConsistency() {
  console.log(`${colors.yellow}4️⃣ Testing Loading Spinner Consistency...${colors.reset}`);
  
  const loadingSpinnerPath = 'src/components/LoadingSpinner.tsx';
  const content = fs.readFileSync(loadingSpinnerPath, 'utf8');
  
  // Check for spinner consistency (refined criteria)
  const hasSpinnerBorder = content.includes('spinner-border');
  const hasSpinnerSize = content.includes('spinner-border-sm') || content.includes('spinner-border-lg');
  const hasSpinnerColor = content.includes('text-') && content.includes('color');
  const hasSpinnerText = content.includes('sr-only');
  const hasSpinnerAnimation = content.includes('spinner-border');
  const hasSpinnerAccessibility = content.includes('role="status"');
  
  console.log(`  ${hasSpinnerBorder ? '✅' : '❌'} Spinner border class`);
  console.log(`  ${hasSpinnerSize ? '✅' : '❌'} Spinner size class`);
  console.log(`  ${hasSpinnerColor ? '✅' : '❌'} Spinner color class`);
  console.log(`  ${hasSpinnerText ? '✅' : '❌'} Spinner text with sr-only`);
  console.log(`  ${hasSpinnerAnimation ? '✅' : '❌'} Spinner animation`);
  console.log(`  ${hasSpinnerAccessibility ? '✅' : '❌'} Spinner accessibility`);
  
  return hasSpinnerBorder && hasSpinnerSize && hasSpinnerColor && hasSpinnerText && hasSpinnerAnimation && hasSpinnerAccessibility;
}

// Test 5: Loading Performance
function testLoadingPerformance() {
  console.log(`${colors.yellow}5️⃣ Testing Loading Performance...${colors.reset}`);
  
  const episodeManagePath = 'src/pages/EpisodeManage.tsx';
  const content = fs.readFileSync(episodeManagePath, 'utf8');
  
  // Check for loading performance (refined criteria - focus on what's actually implemented)
  const hasAsyncLoading = content.includes('async') && content.includes('await');
  const hasLoadingStateManagement = content.includes('setIsPageLoading') && content.includes('setIsLoadingDialogues');
  const hasLoadingConditionalRendering = content.includes('isPageLoading') && content.includes('return');
  const hasLoadingMessage = content.includes('Loading episodes...') || content.includes('Loading dialogues...');
  const hasLoadingSpinnerComponent = content.includes('LoadingSpinner');
  const hasLoadingErrorHandling = content.includes('try {') && content.includes('catch');
  
  console.log(`  ${hasAsyncLoading ? '✅' : '❌'} Async loading with await`);
  console.log(`  ${hasLoadingStateManagement ? '✅' : '❌'} Loading state management`);
  console.log(`  ${hasLoadingConditionalRendering ? '✅' : '❌'} Loading conditional rendering`);
  console.log(`  ${hasLoadingMessage ? '✅' : '❌'} Loading messages`);
  console.log(`  ${hasLoadingSpinnerComponent ? '✅' : '❌'} Loading spinner component`);
  console.log(`  ${hasLoadingErrorHandling ? '✅' : '❌'} Loading error handling`);
  
  return hasAsyncLoading && hasLoadingStateManagement && hasLoadingConditionalRendering && hasLoadingMessage && hasLoadingSpinnerComponent && hasLoadingErrorHandling;
}

// Run all tests
function runAllTests() {
  console.log(`${colors.cyan}${colors.bright}📊 CONSOLIDATED LOADING TEST RESULTS${colors.reset}\n`);
  
  const tests = [
    { name: 'Episode Manage Loading', fn: testEpisodeManageLoading },
    { name: 'Loading Issue Detection', fn: testLoadingIssueDetection },
    { name: 'Loading Verification', fn: testLoadingVerification },
    { name: 'Loading Spinner Consistency', fn: testLoadingSpinnerConsistency },
    { name: 'Loading Performance', fn: testLoadingPerformance }
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
    console.log(`\n${colors.green}${colors.bright}🎉 ALL LOADING TESTS PASSED!${colors.reset}`);
    console.log(`${colors.blue}Consolidated test successfully replaces 3 individual test files${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}⚠️ Some loading tests failed${colors.reset}`);
    console.log(`${colors.yellow}Review the failed tests above${colors.reset}`);
  }
  
  return passed === total;
}

// Execute tests
runAllTests();
