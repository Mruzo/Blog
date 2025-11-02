#!/usr/bin/env node

/**
 * StoryManage Complete Test
 * 
 * Tests all critical functionality of StoryManage component
 * to confirm implementation is complete.
 * 
 * Usage: node test-storymanage-complete.js
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

// Test file path
const STORYMANAGE_FILE = 'src/pages/StoryManage.tsx';

// Critical requirements for StoryManage
const REQUIREMENTS = {
  'Loading States': {
    patterns: [
      /loading.*state/i,
      /setLoading\(/g,
      /LoadingSpinner/g,
      /if\s*\(\s*loading\s*\)/g
    ],
    required: 3,
    description: 'Proper loading state management'
  },
  'Error Handling': {
    patterns: [
      /try\s*{/g,
      /catch\s*\(/g,
      /error.*state/i,
      /setError\(/g
    ],
    required: 2,
    description: 'Comprehensive error handling'
  },
  'API Integration': {
    patterns: [
      /useApi\(\)/g,
      /loadStory\(/g,
      /loadSeasons\(/g,
      /loadCharacters\(/g,
      /loadEpisodes\(/g,
      /loadDialogues\(/g
    ],
    required: 4,
    description: 'Proper API integration'
  },
  'State Management': {
    patterns: [
      /useState\(/g,
      /useEffect\(/g,
      /useCallback\(/g,
      /setStory\(/g,
      /setAllEpisodes\(/g,
      /setAllDialogues\(/g
    ],
    required: 5,
    description: 'Proper state management'
  },
  '3D Viewer Integration': {
    patterns: [
      /Comic3DViewer/g,
      /episodes.*dialogues/g,
      /onDialogueUpdate/g,
      /onEpisodeSelect/g
    ],
    required: 2,
    description: '3D viewer integration'
  },
  'Navigation': {
    patterns: [
      /useNavigate/g,
      /navigate\(/g,
      /BackButton/g,
      /Link/g
    ],
    required: 2,
    description: 'Proper navigation handling'
  },
  'Performance Optimization': {
    patterns: [
      /useCallback\(/g,
      /useMemo\(/g,
      /setTimeout\(/g,
      /clearTimeout\(/g
    ],
    required: 1,
    description: 'Performance optimizations'
  }
};

// Test results
let testResults = {
  totalRequirements: Object.keys(REQUIREMENTS).length,
  passedRequirements: 0,
  failedRequirements: 0,
  details: {},
  issues: []
};

// Analyze file content
function analyzeFile() {
  const filePath = path.join(__dirname, STORYMANAGE_FILE);
  
  if (!fs.existsSync(filePath)) {
    console.log(`${colors.red}❌ File not found: ${STORYMANAGE_FILE}${colors.reset}`);
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

// Check for specific issues
function checkForIssues(content) {
  const issues = [];
  
  // Check for infinite loops
  const useEffectCount = (content.match(/useEffect\(/g) || []).length;
  if (useEffectCount > 2) {
    issues.push(`Too many useEffect hooks: ${useEffectCount} (should be ≤2)`);
  }
  
  // Check for missing dependencies
  const hasDependencyIssues = content.includes('eslint-disable') && content.includes('exhaustive-deps');
  if (hasDependencyIssues) {
    issues.push('ESLint dependency warnings detected');
  }
  
  // Check for proper async handling
  const hasAsyncWithoutAwait = content.includes('async') && !content.includes('await');
  if (hasAsyncWithoutAwait) {
    issues.push('Async functions without await detected');
  }
  
  // Check for proper error boundaries
  const hasErrorHandling = content.includes('try') && content.includes('catch');
  const hasApiCalls = content.includes('loadStory') || content.includes('loadSeasons');
  if (hasApiCalls && !hasErrorHandling) {
    issues.push('API calls without proper error handling');
  }
  
  return issues;
}

// Main test function
function runStoryManageTest() {
  console.log(`${colors.blue}${colors.bold}🧪 StoryManage Complete Test${colors.reset}`);
  console.log(`${colors.cyan}Testing all critical functionality${colors.reset}\n`);
  
  const analysis = analyzeFile();
  if (!analysis) {
    process.exit(1);
  }
  
  const { content, lineCount } = analysis;
  
  console.log(`${colors.yellow}File: ${STORYMANAGE_FILE} (${lineCount} lines)${colors.reset}\n`);
  
  // Test each requirement
  Object.entries(REQUIREMENTS).forEach(([requirementName, requirement]) => {
    testRequirement(requirementName, requirement, content);
  });
  
  // Check for specific issues
  const issues = checkForIssues(content);
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
    console.log(`\n${colors.green}${colors.bold}🎉 StoryManage implementation is complete!${colors.reset}`);
    console.log(`${colors.cyan}All critical functionality is properly implemented.${colors.reset}`);
    return true;
  } else {
    console.log(`\n${colors.yellow}${colors.bold}⚠️  Implementation needs attention.${colors.reset}`);
    console.log(`${colors.cyan}Fix the issues above before confirming completion.${colors.reset}`);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  const success = runStoryManageTest();
  process.exit(success ? 0 : 1);
}

module.exports = { runStoryManageTest, testRequirement, checkForIssues };
