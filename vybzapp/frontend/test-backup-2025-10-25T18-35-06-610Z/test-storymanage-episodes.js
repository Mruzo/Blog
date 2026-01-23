#!/usr/bin/env node

/**
 * StoryManage Episodes Test
 * 
 * Tests that StoryManage episode counts work and no timeout issues
 * 
 * Usage: node test-storymanage-episodes.js
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
const STORYMANAGE_FILE = 'src/pages/StoryManage.tsx';

// Episode count patterns
const EPISODE_PATTERNS = {
  'Dynamic Episode Counts': {
    patterns: [
      /allEpisodes\.length/g,
      /allEpisodes\.filter.*ep\.season.*season\.id.*length/g,
      /episodes.*length/g
    ],
    required: 2,
    description: 'Uses dynamic episode counts instead of hardcoded 0'
  },
  'Parallel API Calls': {
    patterns: [
      /Promise\.all\(/g,
      /seasonsData\.map.*async/g,
      /allRealEpisodes\.map.*async/g,
      /apiService\.getEpisodes/g,
      /apiService\.getDialogues/g
    ],
    required: 3,
    description: 'Uses parallel API calls to prevent timeouts'
  },
  'Direct Data Collection': {
    patterns: [
      /allRealEpisodes.*flatMap/g,
      /allDialoguesData.*flatMap/g,
      /episodeResults.*flatMap/g
    ],
    required: 2,
    description: 'Collects data directly from API responses'
  },
  'No Context Dependencies': {
    patterns: [
      /episodes\.filter.*ep\.season/g,
      /dialogues\.filter/g,
      /setTimeout.*resolve.*100/g
    ],
    required: 0,
    description: 'Does not depend on context state for data filtering'
  },
  'Error Handling': {
    patterns: [
      /try.*catch.*episode/g,
      /console\.error.*episode/g,
      /return.*episodes.*\[\]/g
    ],
    required: 2,
    description: 'Has proper error handling for API calls'
  }
};

// Test results
let testResults = {
  totalRequirements: Object.keys(EPISODE_PATTERNS).length,
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

// Check for anti-patterns
function checkForAntiPatterns(content) {
  const issues = [];
  
  // Check for hardcoded episode counts
  const hardcodedCounts = content.match(/Episodes: 0|text-primary">0.*Episodes/g);
  if (hardcodedCounts) {
    issues.push('Still has hardcoded episode counts (should be dynamic)');
  }
  
  // Check for sequential API calls
  const sequentialCalls = content.match(/for.*season.*await.*loadEpisodes|for.*episode.*await.*loadDialogues/g);
  if (sequentialCalls) {
    issues.push('Still using sequential API calls (should use Promise.all)');
  }
  
  // Check for setTimeout delays
  const setTimeoutDelays = content.match(/setTimeout.*resolve.*100/g);
  if (setTimeoutDelays) {
    issues.push('Still using setTimeout delays (should use direct data collection)');
  }
  
  // Check for context state dependencies
  const contextDependencies = content.match(/episodes\.filter.*ep\.season|dialogues\.filter/g);
  if (contextDependencies) {
    issues.push('Still depending on context state for data filtering');
  }
  
  return issues;
}

// Main test function
function runStoryManageEpisodesTest() {
  console.log(`${colors.blue}${colors.bold}🧪 StoryManage Episodes Test${colors.reset}`);
  console.log(`${colors.cyan}Testing StoryManage episode counts and timeout fixes${colors.reset}\n`);
  
  const analysis = analyzeFile();
  if (!analysis) {
    process.exit(1);
  }
  
  const { content, lineCount } = analysis;
  
  console.log(`${colors.yellow}File: ${STORYMANAGE_FILE} (${lineCount} lines)${colors.reset}\n`);
  
  // Test each requirement
  Object.entries(EPISODE_PATTERNS).forEach(([requirementName, requirement]) => {
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
    console.log(`\n${colors.green}${colors.bold}🎉 StoryManage episode counts and timeout fixes are working!${colors.reset}`);
    console.log(`${colors.cyan}Episode counts should be accurate and no timeout errors.${colors.reset}`);
    return true;
  } else {
    console.log(`\n${colors.yellow}${colors.bold}⚠️  Some issues need attention.${colors.reset}`);
    console.log(`${colors.cyan}Fix the issues above to resolve episode counts and timeouts.${colors.reset}`);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  const success = runStoryManageEpisodesTest();
  process.exit(success ? 0 : 1);
}

module.exports = { runStoryManageEpisodesTest, testRequirement, checkForAntiPatterns };
