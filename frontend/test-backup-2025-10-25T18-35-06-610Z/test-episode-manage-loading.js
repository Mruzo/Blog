#!/usr/bin/env node

/**
 * EpisodeManage Loading Test
 * 
 * Specifically tests EpisodeManage page for loading issues
 * 
 * Usage: node test-episode-manage-loading.js
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

// Critical requirements for EpisodeManage
const REQUIREMENTS = {
  'Loading State Management': {
    patterns: [
      /isLoading/g,
      /LoadingSpinner/g,
      /if\s*\(\s*isLoading\s*\)/g
    ],
    required: 2,
    description: 'Proper loading state management'
  },
  'Error Handling': {
    patterns: [
      /try\s*{/g,
      /catch\s*\(/g,
      /error/g
    ],
    required: 2,
    description: 'Comprehensive error handling'
  },
  'useEffect Optimization': {
    patterns: [
      /useEffect\(/g,
      /useCallback\(/g,
      /useMemo\(/g
    ],
    required: 1,
    description: 'Optimized hooks usage'
  },
  'API Integration': {
    patterns: [
      /loadEpisodes/g,
      /loadDialogues/g,
      /loadCharacters/g,
      /createEpisode/g,
      /updateEpisode/g,
      /deleteEpisode/g
    ],
    required: 4,
    description: 'Proper API integration'
  },
  'State Management': {
    patterns: [
      /useState\(/g,
      /setState/g,
      /setShow/g,
      /setEditing/g
    ],
    required: 3,
    description: 'Proper state management'
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

// Check for specific loading issues
function checkForLoadingIssues(content) {
  const issues = [];
  
  // Check for too many useEffect hooks
  const useEffectCount = (content.match(/useEffect\(/g) || []).length;
  if (useEffectCount > 2) {
    issues.push(`Too many useEffect hooks: ${useEffectCount} (recommended: ≤2)`);
  }
  
  // Check for missing loading states
  const hasLoadingStates = content.includes('isLoading') || content.includes('LoadingSpinner');
  const hasApiCalls = content.includes('load') || content.includes('create') || content.includes('update');
  if (hasApiCalls && !hasLoadingStates) {
    issues.push('API calls without loading states detected');
  }
  
  // Check for missing error handling
  const hasErrorHandling = content.includes('try') && content.includes('catch');
  if (hasApiCalls && !hasErrorHandling) {
    issues.push('API calls without error handling detected');
  }
  
  // Check for potential infinite loops
  const hasComplexDependencies = content.match(/useEffect.*\[.*\w+.*\w+.*\]/g);
  if (hasComplexDependencies) {
    issues.push('Complex useEffect dependencies detected');
  }
  
  return issues;
}

// Main test function
function runEpisodeManageTest() {
  console.log(`${colors.blue}${colors.bold}🧪 EpisodeManage Loading Test${colors.reset}`);
  console.log(`${colors.cyan}Testing EpisodeManage page for loading issues${colors.reset}\n`);
  
  const analysis = analyzeFile();
  if (!analysis) {
    process.exit(1);
  }
  
  const { content, lineCount } = analysis;
  
  console.log(`${colors.yellow}File: ${EPISODE_MANAGE_FILE} (${lineCount} lines)${colors.reset}\n`);
  
  // Test each requirement
  Object.entries(REQUIREMENTS).forEach(([requirementName, requirement]) => {
    testRequirement(requirementName, requirement, content);
  });
  
  // Check for specific loading issues
  const issues = checkForLoadingIssues(content);
  if (issues.length > 0) {
    console.log(`\n${colors.red}${colors.bold}Loading Issues Found:${colors.reset}`);
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
    console.log(`\n${colors.green}${colors.bold}🎉 EpisodeManage loading is working correctly!${colors.reset}`);
    console.log(`${colors.cyan}No loading issues detected.${colors.reset}`);
    return true;
  } else {
    console.log(`\n${colors.yellow}${colors.bold}⚠️  EpisodeManage has loading issues.${colors.reset}`);
    console.log(`${colors.cyan}Fix the issues above to improve performance.${colors.reset}`);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  const success = runEpisodeManageTest();
  process.exit(success ? 0 : 1);
}

module.exports = { runEpisodeManageTest, testRequirement, checkForLoadingIssues };


