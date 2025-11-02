#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Function to find all React/TypeScript files
function findReactFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      findReactFiles(filePath, fileList);
    } else if (file.match(/\.(tsx?|jsx?)$/) && !file.includes('.test.') && !file.includes('.spec.')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to check loading behavior patterns
function checkLoadingBehavior(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  // Check for LoadingSpinner usage
  const loadingSpinnerUsage = content.match(/LoadingSpinner/g) || [];
  const isLoadingUsage = content.match(/isLoading/g) || [];
  const loadingConditionUsage = content.match(/if\s*\(\s*isLoading/g) || [];
  
  // Check for problematic patterns
  const problematicPatterns = [
    // Multiple loading states
    { pattern: /const\s+\[.*loading.*\]\s*=\s*useState/g, message: 'Multiple loading states detected' },
    // Direct spinner HTML
    { pattern: /<div.*spinner.*>/g, message: 'Direct spinner HTML instead of LoadingSpinner component' },
    // FontAwesome spinners
    { pattern: /fa-spinner/g, message: 'FontAwesome spinner detected, should use LoadingSpinner component' },
    // Custom loading logic
    { pattern: /loading.*\?\s*<.*>\s*:\s*<.*>/g, message: 'Custom loading logic detected, should use LoadingSpinner component' }
  ];
  
  problematicPatterns.forEach(({ pattern, message }) => {
    const matches = content.match(pattern);
    if (matches) {
      issues.push({
        type: 'warning',
        message: `${message}: ${matches.length} occurrence(s)`,
        matches: matches
      });
    }
  });
  
  // Check for good patterns
  const goodPatterns = [
    { pattern: /LoadingSpinner/g, message: 'Uses LoadingSpinner component' },
    { pattern: /isLoading.*\|\|/g, message: 'Proper loading condition logic' },
    { pattern: /useApi\(\)/g, message: 'Uses centralized API context' }
  ];
  
  goodPatterns.forEach(({ pattern, message }) => {
    const matches = content.match(pattern);
    if (matches) {
      issues.push({
        type: 'info',
        message: `${message}: ${matches.length} occurrence(s)`,
        matches: matches
      });
    }
  });
  
  return {
    filePath,
    issues,
    loadingSpinnerCount: loadingSpinnerUsage.length,
    isLoadingCount: isLoadingUsage.length,
    loadingConditionCount: loadingConditionUsage.length
  };
}

// Main function
function main() {
  console.log(`${colors.bold}${colors.blue}Loading Behavior Verification Script${colors.reset}\n`);
  
  const srcDir = path.join(__dirname, 'src');
  const files = findReactFiles(srcDir);
  
  console.log(`Found ${files.length} React/TypeScript files to analyze...\n`);
  
  const results = files.map(checkLoadingBehavior);
  
  // Summary statistics
  const totalFiles = results.length;
  const filesWithLoadingSpinner = results.filter(r => r.loadingSpinnerCount > 0).length;
  const filesWithIsLoading = results.filter(r => r.isLoadingCount > 0).length;
  const filesWithLoadingConditions = results.filter(r => r.loadingConditionCount > 0).length;
  
  console.log(`${colors.bold}Summary:${colors.reset}`);
  console.log(`Total files analyzed: ${totalFiles}`);
  console.log(`${colors.green}Files using LoadingSpinner: ${filesWithLoadingSpinner}${colors.reset}`);
  console.log(`${colors.blue}Files using isLoading: ${filesWithIsLoading}${colors.reset}`);
  console.log(`${colors.blue}Files with loading conditions: ${filesWithLoadingConditions}${colors.reset}\n`);
  
  // Detailed results
  let hasIssues = false;
  
  results.forEach(result => {
    if (result.issues.length > 0) {
      console.log(`${colors.bold}${path.relative(srcDir, result.filePath)}:${colors.reset}`);
      
      result.issues.forEach(issue => {
        const color = issue.type === 'warning' ? colors.red : 
                     issue.type === 'info' ? colors.green : colors.yellow;
        console.log(`  ${color}${issue.type.toUpperCase()}:${colors.reset} ${issue.message}`);
        
        if (issue.type === 'warning') {
          hasIssues = true;
        }
      });
      
      console.log('');
    }
  });
  
  // Recommendations
  console.log(`${colors.bold}Recommendations:${colors.reset}`);
  console.log(`1. Use LoadingSpinner component for all loading states`);
  console.log(`2. Use centralized isLoading state from useApi() hook`);
  console.log(`3. Avoid custom loading logic and direct spinner HTML`);
  console.log(`4. Ensure consistent loading behavior across all pages`);
  console.log(`5. Use proper loading conditions: isLoading || (!data && !error)`);
  
  if (hasIssues) {
    console.log(`\n${colors.red}⚠️  Issues found that may cause loading spinner glitches${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}✅ No loading behavior issues detected${colors.reset}`);
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { checkLoadingBehavior, findReactFiles };


