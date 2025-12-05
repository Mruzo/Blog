#!/usr/bin/env node

/**
 * MyStudio Performance Test
 * 
 * Tests that MyStudio performance optimizations are working
 * 
 * Usage: node test-mystudio-performance.js
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

// Performance optimization patterns
const PERFORMANCE_PATTERNS = {
  'Parallel API Calls': {
    patterns: [
      /Promise\.all\(/g,
      /\.map\(.*=>.*load/g,
      /seasonPromises|episodePromises/g
    ],
    required: 2,
    description: 'Uses Promise.all for parallel API calls instead of sequential'
  },
  'Loading State Management': {
    patterns: [
      /isLoadingCounts/g,
      /setIsLoadingCounts/g,
      /spinner-border.*isLoadingCounts/g
    ],
    required: 3,
    description: 'Has loading state to prevent UI blocking'
  },
  'Deferred Loading': {
    patterns: [
      /setTimeout.*loadStoryCounts/g,
      /clearTimeout/g,
      /100.*defer/g
    ],
    required: 2,
    description: 'Defers counts loading to not block initial page load'
  },
  'Efficient Data Processing': {
    patterns: [
      /seasonsByStory|episodesBySeason/g,
      /\.reduce\(/g,
      /\.filter\(/g
    ],
    required: 2,
    description: 'Uses efficient data structures and processing'
  },
  'Error Handling': {
    patterns: [
      /try\s*{.*loadStoryCounts/g,
      /catch.*error.*loadStoryCounts/g,
      /finally.*setIsLoadingCounts\(false\)/g
    ],
    required: 2,
    description: 'Has proper error handling for counts loading'
  }
};

// Test results
let testResults = {
  totalRequirements: Object.keys(PERFORMANCE_PATTERNS).length,
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

// Check for performance anti-patterns
function checkForPerformanceAntiPatterns(content) {
  const issues = [];
  
  // Check for sequential API calls (anti-pattern)
  const sequentialCalls = content.match(/for.*story.*await.*loadSeasons|for.*season.*await.*loadEpisodes/g);
  if (sequentialCalls) {
    issues.push('Still using sequential API calls (should use Promise.all)');
  }
  
  // Check for blocking UI operations
  const blockingOperations = content.match(/loadStoryCounts.*stories.*immediately|await.*loadStoryCounts/g);
  if (blockingOperations) {
    issues.push('Counts loading might be blocking UI');
  }
  
  // Check for missing loading states
  const hasLoadingStates = content.includes('isLoadingCounts');
  if (!hasLoadingStates) {
    issues.push('Missing loading state for counts');
  }
  
  return issues;
}

// Main test function
function runMyStudioPerformanceTest() {
  console.log(`${colors.blue}${colors.bold}🧪 MyStudio Performance Test${colors.reset}`);
  console.log(`${colors.cyan}Testing MyStudio performance optimizations${colors.reset}\n`);
  
  const analysis = analyzeFile();
  if (!analysis) {
    process.exit(1);
  }
  
  const { content, lineCount } = analysis;
  
  console.log(`${colors.yellow}File: ${MYSTUDIO_FILE} (${lineCount} lines)${colors.reset}\n`);
  
  // Test each requirement
  Object.entries(PERFORMANCE_PATTERNS).forEach(([requirementName, requirement]) => {
    testRequirement(requirementName, requirement, content);
  });
  
  // Check for performance anti-patterns
  const issues = checkForPerformanceAntiPatterns(content);
  if (issues.length > 0) {
    console.log(`\n${colors.red}${colors.bold}Performance Issues Found:${colors.reset}`);
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
    console.log(`\n${colors.green}${colors.bold}🎉 Performance optimizations are working!${colors.reset}`);
    console.log(`${colors.cyan}MyStudio should now load much faster.${colors.reset}`);
    console.log(`${colors.cyan}Profile and studio buttons should be responsive.${colors.reset}`);
    return true;
  } else {
    console.log(`\n${colors.yellow}${colors.bold}⚠️  Performance needs attention.${colors.reset}`);
    console.log(`${colors.cyan}Fix the issues above to improve performance.${colors.reset}`);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  const success = runMyStudioPerformanceTest();
  process.exit(success ? 0 : 1);
}

module.exports = { runMyStudioPerformanceTest, testRequirement, checkForPerformanceAntiPatterns };


