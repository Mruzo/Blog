#!/usr/bin/env node

/**
 * Infinite Loop Detection Test
 * 
 * Tests for infinite loops in React components
 * 
 * Usage: node test-infinite-loops.js
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

// Files to check
const FILES_TO_CHECK = [
  'src/contexts/ApiContext.tsx',
  'src/pages/MyStudio.tsx',
  'src/pages/StoryManage.tsx',
  'src/pages/EpisodeManage.tsx'
];

// Infinite loop patterns
const INFINITE_LOOP_PATTERNS = {
  'useEffect with function dependencies': {
    pattern: /useEffect\([^}]*\[[^\]]*load[A-Z]\w*[^\]]*\]/g,
    description: 'useEffect with load functions in dependencies can cause infinite loops'
  },
  'useCallback with changing dependencies': {
    pattern: /useCallback\([^}]*\[[^\]]*(stories|seasons|episodes|characters)[^\]]*\]/g,
    description: 'useCallback with state arrays in dependencies can cause infinite loops'
  },
  'useEffect calling functions that update dependencies': {
    pattern: /useEffect\([^}]*load[A-Z]\w*[^}]*\[[^\]]*load[A-Z]\w*[^\]]*\]/g,
    description: 'useEffect calling load functions that update its own dependencies'
  }
};

// Test results
let testResults = {
  totalFiles: 0,
  filesWithIssues: 0,
  totalIssues: 0,
  issues: []
};

// Analyze a single file
function analyzeFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    return {
      exists: false,
      issues: [`File not found: ${filePath}`],
      details: {}
    };
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  
  const issues = [];
  const details = {};
  
  // Check each infinite loop pattern
  Object.entries(INFINITE_LOOP_PATTERNS).forEach(([patternName, config]) => {
    const matches = content.match(config.pattern);
    if (matches) {
      issues.push(`${patternName}: ${matches.length} matches found`);
      details[patternName] = {
        count: matches.length,
        matches: matches
      };
    }
  });
  
  // Check for specific problematic patterns
  const problematicPatterns = [
    {
      pattern: /useEffect\([^}]*\[[^\]]*loadStories[^\]]*\]/g,
      description: 'useEffect with loadStories in dependencies'
    },
    {
      pattern: /useEffect\([^}]*\[[^\]]*loadSeasons[^\]]*\]/g,
      description: 'useEffect with loadSeasons in dependencies'
    },
    {
      pattern: /useEffect\([^}]*\[[^\]]*loadEpisodes[^\]]*\]/g,
      description: 'useEffect with loadEpisodes in dependencies'
    },
    {
      pattern: /useCallback\([^}]*\[[^\]]*seasons[^\]]*\]/g,
      description: 'useCallback with seasons in dependencies'
    },
    {
      pattern: /useCallback\([^}]*\[[^\]]*episodes[^\]]*\]/g,
      description: 'useCallback with episodes in dependencies'
    }
  ];
  
  problematicPatterns.forEach(({ pattern, description }) => {
    const matches = content.match(pattern);
    if (matches) {
      issues.push(`${description}: ${matches.length} matches`);
    }
  });
  
  return {
    exists: true,
    issues,
    details,
    lineCount: lines.length
  };
}

// Test a specific file
function testFile(filePath) {
  console.log(`\n${colors.blue}${colors.bold}🔍 Checking ${filePath}:${colors.reset}`);
  
  const analysis = analyzeFile(filePath);
  
  if (!analysis.exists) {
    console.log(`  ${colors.red}❌ File not found${colors.reset}`);
    return false;
  }
  
  console.log(`  ${colors.cyan}Lines: ${analysis.lineCount}${colors.reset}`);
  
  if (analysis.issues.length === 0) {
    console.log(`  ${colors.green}✅ No infinite loop patterns detected${colors.reset}`);
    return true;
  } else {
    console.log(`  ${colors.red}❌ ${analysis.issues.length} potential infinite loop patterns found:${colors.reset}`);
    analysis.issues.forEach(issue => {
      console.log(`    ⚠️  ${issue}`);
    });
    return false;
  }
}

// Main test function
function testInfiniteLoops() {
  console.log(`${colors.blue}${colors.bold}🧪 Infinite Loop Detection Test${colors.reset}`);
  console.log(`${colors.cyan}Testing for infinite loops in React components${colors.reset}\n`);
  
  let filesWithIssues = 0;
  let totalIssues = 0;
  
  FILES_TO_CHECK.forEach(filePath => {
    const hasIssues = !testFile(filePath);
    if (hasIssues) {
      filesWithIssues++;
      const analysis = analyzeFile(filePath);
      totalIssues += analysis.issues.length;
    }
  });
  
  testResults.totalFiles = FILES_TO_CHECK.length;
  testResults.filesWithIssues = filesWithIssues;
  testResults.totalIssues = totalIssues;
  
  // Generate summary
  console.log(`\n${colors.blue}${colors.bold}📊 Test Summary${colors.reset}`);
  console.log(`${colors.cyan}Total Files Checked: ${testResults.totalFiles}${colors.reset}`);
  console.log(`${colors.red}Files with Issues: ${filesWithIssues}${colors.reset}`);
  console.log(`${colors.yellow}Total Issues Found: ${totalIssues}${colors.reset}`);
  
  if (filesWithIssues === 0) {
    console.log(`\n${colors.green}${colors.bold}🎉 No infinite loops detected!${colors.reset}`);
    console.log(`${colors.cyan}All components should load properly.${colors.reset}`);
    return true;
  } else {
    console.log(`\n${colors.yellow}${colors.bold}⚠️  Potential infinite loops detected.${colors.reset}`);
    console.log(`${colors.cyan}Fix the issues above to resolve loading problems.${colors.reset}`);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  const success = testInfiniteLoops();
  process.exit(success ? 0 : 1);
}

module.exports = { testInfiniteLoops, analyzeFile, testFile };


