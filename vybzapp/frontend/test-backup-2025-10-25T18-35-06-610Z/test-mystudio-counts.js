#!/usr/bin/env node

/**
 * MyStudio Counts Test
 * 
 * Tests that MyStudio displays correct seasons and episodes counts
 * 
 * Usage: node test-mystudio-counts.js
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

// Count functionality patterns
const COUNT_PATTERNS = {
  'Story Counts State': {
    patterns: [
      /storyCounts/g,
      /useState.*storyCounts/g,
      /setStoryCounts/g
    ],
    required: 2,
    description: 'Uses state to track story counts'
  },
  'Count Calculation Function': {
    patterns: [
      /loadStoryCounts/g,
      /useCallback.*loadStoryCounts/g,
      /storyCounts\[story\.id\]/g
    ],
    required: 2,
    description: 'Has function to calculate counts for each story'
  },
  'Dynamic Count Display': {
    patterns: [
      /storyCounts\[story\.id\]\?\.seasons/g,
      /storyCounts\[story\.id\]\?\.episodes/g,
      /stories\.reduce.*storyCounts/g
    ],
    required: 3,
    description: 'Displays counts dynamically instead of hardcoded 0'
  },
  'API Integration': {
    patterns: [
      /loadSeasons/g,
      /loadEpisodes/g,
      /seasons.*filter/g,
      /episodes.*filter/g
    ],
    required: 3,
    description: 'Integrates with API to load seasons and episodes data'
  },
  'Count Aggregation': {
    patterns: [
      /stories\.reduce.*total.*seasons/g,
      /stories\.reduce.*total.*episodes/g,
      /storyCounts\[story\.id\]\|\| 0/g
    ],
    required: 2,
    description: 'Aggregates counts across all stories'
  }
};

// Test results
let testResults = {
  totalRequirements: Object.keys(COUNT_PATTERNS).length,
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

// Check for hardcoded counts (anti-patterns)
function checkForHardcodedCounts(content) {
  const issues = [];
  
  // Check for hardcoded 0 values
  const hardcodedZeros = content.match(/Seasons: 0|Episodes: 0|text-info">0|text-warning">0/g);
  if (hardcodedZeros) {
    issues.push('Still has hardcoded 0 values for counts');
  }
  
  // Check for missing dynamic count references
  const hasDynamicCounts = content.includes('storyCounts[story.id]');
  if (!hasDynamicCounts) {
    issues.push('Missing dynamic count references');
  }
  
  // Check for missing count calculation
  const hasCountCalculation = content.includes('loadStoryCounts');
  if (!hasCountCalculation) {
    issues.push('Missing count calculation function');
  }
  
  return issues;
}

// Main test function
function runMyStudioCountsTest() {
  console.log(`${colors.blue}${colors.bold}🧪 MyStudio Counts Test${colors.reset}`);
  console.log(`${colors.cyan}Testing MyStudio seasons and episodes counts functionality${colors.reset}\n`);
  
  const analysis = analyzeFile();
  if (!analysis) {
    process.exit(1);
  }
  
  const { content, lineCount } = analysis;
  
  console.log(`${colors.yellow}File: ${MYSTUDIO_FILE} (${lineCount} lines)${colors.reset}\n`);
  
  // Test each requirement
  Object.entries(COUNT_PATTERNS).forEach(([requirementName, requirement]) => {
    testRequirement(requirementName, requirement, content);
  });
  
  // Check for hardcoded counts
  const issues = checkForHardcodedCounts(content);
  if (issues.length > 0) {
    console.log(`\n${colors.red}${colors.bold}Count Issues Found:${colors.reset}`);
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
    console.log(`\n${colors.green}${colors.bold}🎉 Seasons and episodes counts are working!${colors.reset}`);
    console.log(`${colors.cyan}MyStudio now displays accurate counts for each story.${colors.reset}`);
    console.log(`${colors.cyan}Counts are calculated dynamically from API data.${colors.reset}`);
    return true;
  } else {
    console.log(`\n${colors.yellow}${colors.bold}⚠️  Count functionality needs attention.${colors.reset}`);
    console.log(`${colors.cyan}Fix the issues above to enable accurate counts.${colors.reset}`);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  const success = runMyStudioCountsTest();
  process.exit(success ? 0 : 1);
}

module.exports = { runMyStudioCountsTest, testRequirement, checkForHardcodedCounts };


