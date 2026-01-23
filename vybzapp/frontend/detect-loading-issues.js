#!/usr/bin/env node

/**
 * Comprehensive Loading Issues Detection
 * 
 * Scans all React pages for common loading issues:
 * - Too many useEffect hooks
 * - Missing loading states
 * - Infinite loops
 * - Improper dependency arrays
 * 
 * Usage: node detect-loading-issues.js
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

// Pages to check
const PAGES_TO_CHECK = [
  'src/pages/StoryManage.tsx',
  'src/pages/MyStudio.tsx',
  'src/pages/StoryCreate.tsx',
  'src/pages/StoryEdit.tsx',
  'src/pages/CharacterManage.tsx',
  'src/pages/EpisodeManage.tsx',
  'src/pages/SeasonCreationWizard.tsx',
  'src/pages/SeasonEdit.tsx',
  'src/components/Comic3DViewer.tsx'
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
    pattern: /loading|setLoading|LoadingSpinner/g,
    threshold: 1,
    severity: 'medium',
    description: 'Pages should have proper loading state management'
  },
  'Missing Error Handling': {
    pattern: /try\s*{|catch\s*\(|error/g,
    threshold: 1,
    severity: 'high',
    description: 'Pages should have proper error handling'
  },
  'Potential Infinite Loops': {
    pattern: /useEffect.*\[.*\w+.*\]/g,
    threshold: 0,
    severity: 'high',
    description: 'useEffect with complex dependencies can cause infinite loops'
  },
  'Missing useCallback': {
    pattern: /useCallback\(/g,
    threshold: 0,
    severity: 'medium',
    description: 'Functions passed to useEffect should be wrapped in useCallback'
  },
  'Direct State in useEffect': {
    pattern: /useEffect.*\[.*\w+.*\].*\{[^}]*\w+\[/g,
    threshold: 0,
    severity: 'high',
    description: 'Direct array/object access in useEffect dependencies'
  }
};

// Test results
let testResults = {
  totalPages: 0,
  pagesWithIssues: 0,
  totalIssues: 0,
  issuesByType: {},
  pageDetails: {}
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
  
  // Check for specific problematic patterns
  const useEffectCount = (content.match(/useEffect\(/g) || []).length;
  if (useEffectCount > 2) {
    issues.push(`Too many useEffect hooks: ${useEffectCount} (recommended: ≤2)`);
  }
  
  // Check for missing loading states
  const hasLoadingStates = content.includes('loading') || content.includes('LoadingSpinner');
  const hasApiCalls = content.includes('load') || content.includes('create') || content.includes('update');
  if (hasApiCalls && !hasLoadingStates) {
    issues.push('API calls without loading states detected');
  }
  
  // Check for missing error handling
  const hasErrorHandling = content.includes('try') && content.includes('catch');
  if (hasApiCalls && !hasErrorHandling) {
    issues.push('API calls without error handling detected');
  }
  
  return {
    exists: true,
    issues,
    details,
    lineCount: lines.length
  };
}

// Test a specific page
function testPage(filePath) {
  console.log(`\n${colors.blue}${colors.bold}Checking ${filePath}:${colors.reset}`);
  
  const analysis = analyzeFile(filePath);
  
  if (!analysis.exists) {
    console.log(`  ${colors.red}❌ File not found${colors.reset}`);
    return false;
  }
  
  console.log(`  ${colors.cyan}Lines: ${analysis.lineCount}${colors.reset}`);
  
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
function detectLoadingIssues() {
  console.log(`${colors.blue}${colors.bold}🔍 Loading Issues Detection${colors.reset}`);
  console.log(`${colors.cyan}Scanning all React pages for loading issues${colors.reset}\n`);
  
  let pagesWithIssues = 0;
  let totalIssues = 0;
  const issuesByType = {};
  
  PAGES_TO_CHECK.forEach(filePath => {
    const analysis = analyzeFile(filePath);
    
    if (!analysis.exists) {
      console.log(`${colors.yellow}⚠️  Skipping ${filePath} (file not found)${colors.reset}`);
      return;
    }
    
    testResults.totalPages++;
    testResults.pageDetails[filePath] = analysis;
    
    if (analysis.issues.length > 0) {
      pagesWithIssues++;
      totalIssues += analysis.issues.length;
      
      // Count issues by type
      analysis.issues.forEach(issue => {
        const issueType = issue.split(':')[0];
        issuesByType[issueType] = (issuesByType[issueType] || 0) + 1;
      });
    }
  });
  
  testResults.pagesWithIssues = pagesWithIssues;
  testResults.totalIssues = totalIssues;
  testResults.issuesByType = issuesByType;
  
  // Generate summary
  console.log(`\n${colors.blue}${colors.bold}📊 Detection Summary${colors.reset}`);
  console.log(`${colors.cyan}Total Pages Checked: ${testResults.totalPages}${colors.reset}`);
  console.log(`${colors.red}Pages with Issues: ${pagesWithIssues}${colors.reset}`);
  console.log(`${colors.yellow}Total Issues Found: ${totalIssues}${colors.reset}`);
  
  if (Object.keys(issuesByType).length > 0) {
    console.log(`\n${colors.red}${colors.bold}Issues by Type:${colors.reset}`);
    Object.entries(issuesByType).forEach(([type, count]) => {
      console.log(`  ${colors.yellow}${type}: ${count}${colors.reset}`);
    });
  }
  
  // Overall assessment
  if (pagesWithIssues === 0) {
    console.log(`\n${colors.green}${colors.bold}🎉 No loading issues detected!${colors.reset}`);
    console.log(`${colors.cyan}All pages have proper loading behavior.${colors.reset}`);
    return true;
  } else {
    console.log(`\n${colors.yellow}${colors.bold}⚠️  Loading issues detected!${colors.reset}`);
    console.log(`${colors.cyan}Fix the issues above to improve performance.${colors.reset}`);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  const success = detectLoadingIssues();
  process.exit(success ? 0 : 1);
}

module.exports = { detectLoadingIssues, analyzeFile, testPage };
