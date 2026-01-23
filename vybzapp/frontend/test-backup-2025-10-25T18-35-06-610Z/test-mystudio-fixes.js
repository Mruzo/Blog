#!/usr/bin/env node

/**
 * MyStudio Fixes Test
 * 
 * Tests that MyStudio flickering and counts issues are fixed
 * 
 * Usage: node test-mystudio-fixes.js
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
const MYSTUDIO_FILE = 'src/pages/MyStudio.tsx';

// Fix patterns
const FIX_PATTERNS = {
  'Direct API Calls': {
    patterns: [
      /apiService\.getSeasons/g,
      /apiService\.getEpisodes/g,
      /import.*apiService/g
    ],
    required: 2,
    description: 'Uses direct API calls instead of context functions'
  },
  'Initial Loading State': {
    patterns: [
      /isInitialLoading/g,
      /setIsInitialLoading/g,
      /Loading studio/g
    ],
    required: 2,
    description: 'Has initial loading state to prevent flickering'
  },
  'Proper Data Collection': {
    patterns: [
      /seasonResults.*await Promise\.all/g,
      /episodeResults.*await Promise\.all/g,
      /storyId.*seasons.*storySeasons/g
    ],
    required: 2,
    description: 'Properly collects data from API calls'
  },
  'No Context Dependencies': {
    patterns: [
      /seasons\.filter.*stories/g,
      /episodes\.filter.*seasons/g
    ],
    required: 0,
    description: 'Does not depend on context state for data filtering'
  }
};

// Test results
let testResults = {
  totalRequirements: Object.keys(FIX_PATTERNS).length,
  passedRequirements: 0,
  failedRequirements: 0,
  details: {},
  issues: []
};

// Analyze file content
function analyzeFile() {
  const filePath = path.join(__dirname, MYSTUDIO_FILE);
  
  if (!fs.existsSync(filePath)) {
    console.log(`${colors.red}❌ File not found: ${MYSTUDIO_FILE}${colors.reset}`);
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

// Check for anti-patterns
function checkForAntiPatterns(content) {
  const issues = [];
  
  // Check for context state dependencies in loadStoryCounts
  const contextDependencies = content.match(/seasons\.filter|episodes\.filter/g);
  if (contextDependencies) {
    issues.push('Still using context state for data filtering (should use direct API results)');
  }
  
  // Check for missing initial loading state
  const hasInitialLoading = content.includes('isInitialLoading');
  if (!hasInitialLoading) {
    issues.push('Missing initial loading state to prevent flickering');
  }
  
  // Check for missing direct API calls
  const hasDirectApiCalls = content.includes('apiService.getSeasons') && content.includes('apiService.getEpisodes');
  if (!hasDirectApiCalls) {
    issues.push('Missing direct API calls for accurate data collection');
  }
  
  return issues;
}

// Main test function
function runMyStudioFixesTest() {
  console.log(`${colors.blue}${colors.bold}🧪 MyStudio Fixes Test${colors.reset}`);
  console.log(`${colors.cyan}Testing MyStudio flickering and counts fixes${colors.reset}\n`);
  
  const analysis = analyzeFile();
  if (!analysis) {
    process.exit(1);
  }
  
  const { content, lineCount } = analysis;
  
  console.log(`${colors.yellow}File: ${MYSTUDIO_FILE} (${lineCount} lines)${colors.reset}\n`);
  
  // Test each requirement
  Object.entries(FIX_PATTERNS).forEach(([requirementName, requirement]) => {
    testRequirement(requirementName, requirement, content);
  });
  
  // Check for anti-patterns
  const issues = checkForAntiPatterns(content);
  if (issues.length > 0) {
    console.log(`\n${colors.red}${colors.bold}Issues Found:${colors.reset}`);
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
    console.log(`\n${colors.green}${colors.bold}🎉 MyStudio fixes are working!${colors.reset}`);
    console.log(`${colors.cyan}Flickering should be fixed and counts should be accurate.${colors.reset}`);
    return true;
  } else {
    console.log(`\n${colors.yellow}${colors.bold}⚠️  Some fixes need attention.${colors.reset}`);
    console.log(`${colors.cyan}Check the issues above to complete the fixes.${colors.reset}`);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  const success = runMyStudioFixesTest();
  process.exit(success ? 0 : 1);
}

module.exports = { runMyStudioFixesTest, testRequirement, checkForAntiPatterns };


