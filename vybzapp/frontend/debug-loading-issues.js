#!/usr/bin/env node

/**
 * Debug Loading Issues
 * 
 * Detailed analysis of loading issues in React pages
 * 
 * Usage: node debug-loading-issues.js
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

// Pages to check (only actual pages, not components)
const PAGES_TO_CHECK = [
  'src/pages/StoryManage.tsx',
  'src/pages/MyStudio.tsx',
  'src/pages/StoryCreate.tsx',
  'src/pages/StoryEdit.tsx',
  'src/pages/CharacterManage.tsx',
  'src/pages/EpisodeManage.tsx',
  'src/pages/SeasonEdit.tsx'
];

// Loading issue patterns
const LOADING_ISSUES = {
  'Too Many useEffect Hooks': {
    pattern: /useEffect\(/g,
    threshold: 2,
    severity: 'high',
    description: 'More than 2 useEffect hooks can cause performance issues'
  },
  'Missing Loading States': {
    pattern: /LoadingSpinner|loading.*state|isLoading/g,
    threshold: 1,
    severity: 'medium',
    description: 'Pages should have loading states'
  },
  'Missing Error Handling': {
    pattern: /try\s*{|catch\s*\(/g,
    threshold: 1,
    severity: 'medium',
    description: 'Pages should have error handling'
  }
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
  
  // Check each loading issue pattern
  Object.entries(LOADING_ISSUES).forEach(([issueType, config]) => {
    const matches = content.match(config.pattern);
    const count = matches ? matches.length : 0;
    
    details[issueType] = {
      count,
      threshold: config.threshold,
      severity: config.severity,
      description: config.description,
      passed: count >= config.threshold
    };
    
    // Special logic for "Too Many" checks
    const isTooMany = issueType.includes('Too Many');
    const shouldFail = isTooMany ? count > config.threshold : count < config.threshold;
    
    if (shouldFail) {
      issues.push(`${issueType}: ${count}/${config.threshold} (${config.description})`);
    }
  });
  
  // Additional checks
  const hasApiCalls = content.includes('loadStories') || content.includes('loadSeasons') || content.includes('loadEpisodes') || content.includes('loadCharacters');
  const hasLoadingStates = content.includes('LoadingSpinner') || content.includes('loading') || content.includes('isLoading');
  const hasErrorHandling = content.includes('try') && content.includes('catch');
  
  // Check for API calls without loading states
  if (hasApiCalls && !hasLoadingStates) {
    issues.push('API calls without loading states detected');
  }
  
  // Check for missing error handling
  if (hasApiCalls && !hasErrorHandling) {
    issues.push('API calls without error handling detected');
  }
  
  return {
    exists: true,
    issues,
    details,
    lineCount: lines.length,
    hasApiCalls,
    hasLoadingStates,
    hasErrorHandling
  };
}

// Test a specific page
function testPage(filePath) {
  console.log(`\n${colors.blue}${colors.bold}🔍 Checking ${filePath}:${colors.reset}`);
  
  const analysis = analyzeFile(filePath);
  
  if (!analysis.exists) {
    console.log(`  ${colors.red}❌ File not found${colors.reset}`);
    return false;
  }
  
  console.log(`  ${colors.cyan}Lines: ${analysis.lineCount}${colors.reset}`);
  console.log(`  ${colors.cyan}Has API calls: ${analysis.hasApiCalls}${colors.reset}`);
  console.log(`  ${colors.cyan}Has loading states: ${analysis.hasLoadingStates}${colors.reset}`);
  console.log(`  ${colors.cyan}Has error handling: ${analysis.hasErrorHandling}${colors.reset}`);
  
  // Show detailed pattern analysis
  console.log(`  ${colors.cyan}Pattern Analysis:${colors.reset}`);
  Object.entries(analysis.details).forEach(([pattern, data]) => {
    const status = data.passed ? '✅' : '❌';
    const color = data.passed ? colors.green : colors.red;
    console.log(`    ${status} ${color}${pattern}${colors.reset}: ${data.count}/${data.threshold}`);
  });
  
  if (analysis.issues.length === 0) {
    console.log(`  ${colors.green}✅ No loading issues detected${colors.reset}`);
    return true;
  } else {
    console.log(`  ${colors.red}❌ ${analysis.issues.length} issues found:${colors.reset}`);
    analysis.issues.forEach(issue => {
      console.log(`    ⚠️  ${issue}`);
    });
    return false;
  }
}

// Main detection function
function debugLoadingIssues() {
  console.log(`${colors.blue}${colors.bold}🔍 Debug Loading Issues${colors.reset}`);
  console.log(`${colors.cyan}Detailed analysis of React pages for loading issues${colors.reset}\n`);
  
  let pagesWithIssues = 0;
  let totalIssues = 0;
  
  PAGES_TO_CHECK.forEach(filePath => {
    const hasIssues = !testPage(filePath);
    if (hasIssues) {
      pagesWithIssues++;
      const analysis = analyzeFile(filePath);
      totalIssues += analysis.issues.length;
    }
  });
  
  // Generate summary
  console.log(`\n${colors.blue}${colors.bold}📊 Debug Summary${colors.reset}`);
  console.log(`${colors.cyan}Total Pages Checked: ${PAGES_TO_CHECK.length}${colors.reset}`);
  console.log(`${colors.red}Pages with Issues: ${pagesWithIssues}${colors.reset}`);
  console.log(`${colors.yellow}Total Issues Found: ${totalIssues}${colors.reset}`);
  
  if (pagesWithIssues === 0) {
    console.log(`\n${colors.green}${colors.bold}🎉 All pages are loading correctly!${colors.reset}`);
    console.log(`${colors.cyan}No loading issues detected in any pages.${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}${colors.bold}⚠️  Some pages have loading issues.${colors.reset}`);
    console.log(`${colors.cyan}Check the detailed analysis above for specific issues.${colors.reset}`);
  }
}

// Run if called directly
if (require.main === module) {
  debugLoadingIssues();
}

module.exports = { debugLoadingIssues, analyzeFile, testPage };


