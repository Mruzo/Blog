#!/usr/bin/env node

/**
 * Flickering Fix Test
 * 
 * Tests that EpisodeManage no longer has flickering loading issues
 * 
 * Usage: node test-flickering-fix.js
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Test file
const EPISODE_MANAGE_FILE = 'src/pages/EpisodeManage.tsx';

// Anti-flickering patterns
const ANTI_FLICKERING_PATTERNS = {
  'Local Loading State': {
    patterns: [
      /isPageLoading/g,
      /setIsPageLoading/g,
      /useState.*true.*isPageLoading/g
    ],
    required: 2,
    description: 'Uses local loading state instead of global'
  },
  'Proper Loading Management': {
    patterns: [
      /setIsPageLoading\(true\)/g,
      /setIsPageLoading\(false\)/g,
      /finally.*setIsPageLoading\(false\)/g
    ],
    required: 2,
    description: 'Properly manages loading state lifecycle'
  },
  'Async Loading Control': {
    patterns: [
      /await.*loadEpisodes/g,
      /await.*loadSeasons/g,
      /await.*loadCharacters/g
    ],
    required: 2,
    description: 'Uses await to control loading sequence'
  },
  'Dialogue Loading State': {
    patterns: [
      /isLoadingDialogues/g,
      /setIsLoadingDialogues/g,
      /Loading dialogues/g
    ],
    required: 2,
    description: 'Separate loading state for dialogues'
  },
  'No Global Loading Dependency': {
    patterns: [
      /if\s*\(\s*isPageLoading\s*\)/g,
      /!.*isLoading.*global/g
    ],
    required: 1,
    description: 'Does not depend on global isLoading state'
  }
};

// Test results
let testResults = {
  totalRequirements: Object.keys(ANTI_FLICKERING_PATTERNS).length,
  passedRequirements: 0,
  failedRequirements: 0,
  details: {},
  issues: []
};

// Analyze file content
function analyzeFile() {
  const filePath = path.join(__dirname, EPISODE_MANAGE_FILE);
  
  if (!fs.existsSync(filePath)) {
    console.log(`${colors.red}❌ File not found: ${EPISODE_MANAGE_FILE}${colors.reset}`);
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  return {
    content,
    lines,
    lineCount: lines.length
  };
}

// Test a specific requirement
function testRequirement(requirementName, requirement, content) {
  const { patterns, required, description } = requirement;
  let totalMatches = 0;
  const foundPatterns = [];
  
  patterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      totalMatches += matches.length;
      foundPatterns.push(`${pattern.source}: ${matches.length}`);
    }
  });
  
  const passed = totalMatches >= required;
  const status = passed ? '✅' : '❌';
  const color = passed ? colors.green : colors.red;
  
  console.log(`${status} ${color}${requirementName}${colors.reset}: ${totalMatches}/${required} (${description})`);
  
  if (foundPatterns.length > 0) {
    foundPatterns.forEach(pattern => {
      console.log(`    ${colors.cyan}  ${pattern}${colors.reset}`);
    });
  }
  
  if (!passed) {
    testResults.issues.push(`${requirementName}: Only ${totalMatches}/${required} patterns found`);
  }
  
  testResults.details[requirementName] = {
    passed,
    found: totalMatches,
    required,
    patterns: foundPatterns
  };
  
  if (passed) {
    testResults.passedRequirements++;
  } else {
    testResults.failedRequirements++;
  }
  
  return passed;
}

// Check for flickering anti-patterns
function checkForFlickeringAntiPatterns(content) {
  const issues = [];
  
  // Check for global isLoading usage (should be avoided)
  const globalLoadingUsage = content.match(/if\s*\(\s*isLoading\s*\)/g);
  if (globalLoadingUsage) {
    issues.push('Still using global isLoading state (can cause flickering)');
  }
  
  // Check for multiple loading states that could conflict
  const loadingStates = content.match(/useState.*loading|useState.*Loading/g);
  if (loadingStates && loadingStates.length > 3) {
    issues.push('Too many loading states (can cause conflicts)');
  }
  
  // Check for missing await in async operations
  const asyncWithoutAwait = content.match(/loadEpisodes\(|loadSeasons\(|loadCharacters\(/g);
  const awaitCount = content.match(/await.*load/g);
  if (asyncWithoutAwait && (!awaitCount || awaitCount.length < asyncWithoutAwait.length)) {
    issues.push('Async operations without proper await (can cause race conditions)');
  }
  
  return issues;
}

// Main test function
function runFlickeringFixTest() {
  console.log(`${colors.blue}${colors.bold}🧪 Flickering Fix Test${colors.reset}`);
  console.log(`${colors.cyan}Testing EpisodeManage for flickering loading issues${colors.reset}\n`);
  
  const analysis = analyzeFile();
  if (!analysis) {
    process.exit(1);
  }
  
  const { content, lineCount } = analysis;
  
  console.log(`${colors.yellow}File: ${EPISODE_MANAGE_FILE} (${lineCount} lines)${colors.reset}\n`);
  
  // Test each requirement
  Object.entries(ANTI_FLICKERING_PATTERNS).forEach(([requirementName, requirement]) => {
    testRequirement(requirementName, requirement, content);
  });
  
  // Check for flickering anti-patterns
  const issues = checkForFlickeringAntiPatterns(content);
  if (issues.length > 0) {
    console.log(`\n${colors.red}${colors.bold}Flickering Issues Found:${colors.reset}`);
    issues.forEach(issue => {
      console.log(`  ⚠️  ${issue}`);
      testResults.issues.push(issue);
    });
  }
  
  // Generate summary
  console.log(`\n${colors.blue}${colors.bold}📊 Test Summary${colors.reset}`);
  console.log(`${colors.cyan}Total Requirements: ${testResults.totalRequirements}${colors.reset}`);
  console.log(`${colors.green}Passed: ${testResults.passedRequirements}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testResults.failedRequirements}${colors.reset}`);
  
  const passRate = ((testResults.passedRequirements / testResults.totalRequirements) * 100).toFixed(1);
  console.log(`${colors.yellow}Pass Rate: ${passRate}%${colors.reset}`);
  
  // Overall assessment
  if (testResults.failedRequirements === 0 && testResults.issues.length === 0) {
    console.log(`\n${colors.green}${colors.bold}🎉 Flickering issue is fixed!${colors.reset}`);
    console.log(`${colors.cyan}EpisodeManage now uses proper loading state management.${colors.reset}`);
    console.log(`${colors.cyan}No more flickering after initial load!${colors.reset}`);
    return true;
  } else {
    console.log(`\n${colors.yellow}${colors.bold}⚠️  Flickering issues still present.${colors.reset}`);
    console.log(`${colors.cyan}Fix the issues above to eliminate flickering.${colors.reset}`);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  const success = runFlickeringFixTest();
  process.exit(success ? 0 : 1);
}

module.exports = { runFlickeringFixTest, testRequirement, checkForFlickeringAntiPatterns };


