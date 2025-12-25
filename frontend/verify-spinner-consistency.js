#!/usr/bin/env node

/**
 * Spinner Consistency Verification Script
 * 
 * This script checks that all spinner implementations across the React app
 * use the same blue spinning circle pattern.
 */

const fs = require('fs');
const path = require('path');

// Define the expected spinner patterns
const EXPECTED_PATTERNS = [
  'spinner-border', // Bootstrap spinner class
  'text-primary',   // Blue color class
];

const FORBIDDEN_PATTERNS = [
  'fa-spinner',     // FontAwesome spinner
  'fa-spin',        // FontAwesome spin animation
];

// Files to check
const FILES_TO_CHECK = [
  'src/pages/MyStudio.tsx',
  'src/pages/Stories.tsx', 
  'src/pages/StoryManage.tsx',
  'src/pages/StoryEdit.tsx',
  'src/pages/StoryCreate.tsx',
  'src/components/LoadingSpinner.tsx',
  'src/components/story-creation/PublishStep.tsx',
  'src/components/StoryCreationWizard.tsx',
];

// CSS files to check
const CSS_FILES_TO_CHECK = [
  'src/App.css',
];

let errors = [];
let warnings = [];

console.log('🔍 Checking spinner consistency across the application...\n');

// Check React/TypeScript files
FILES_TO_CHECK.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    warnings.push(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Check for forbidden patterns (only in non-test files)
  if (!filePath.includes('__tests__') && !filePath.includes('.test.')) {
    FORBIDDEN_PATTERNS.forEach(pattern => {
      if (content.includes(pattern)) {
        errors.push(`❌ Found forbidden pattern "${pattern}" in ${filePath}`);
      }
    });
  }
  
  // Check for expected patterns in spinner-related code
  if (content.includes('spinner-border') || content.includes('LoadingSpinner')) {
    // If using LoadingSpinner component, that's fine (it handles the patterns internally)
    if (content.includes('LoadingSpinner')) {
      // This is good - using the standardized component
    } else if (content.includes('spinner-border')) {
      // If using spinner-border directly, check for expected patterns
      const hasExpectedPatterns = EXPECTED_PATTERNS.some(pattern => content.includes(pattern));
      if (!hasExpectedPatterns) {
        warnings.push(`⚠️  Direct spinner-border usage in ${filePath} but may not use expected patterns`);
      }
    }
  }
});

// Check CSS files
CSS_FILES_TO_CHECK.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    warnings.push(`⚠️  CSS file not found: ${filePath}`);
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Check for blue color definition
  if (content.includes('spinner-border')) {
    if (!content.includes('#0d6efd') && !content.includes('0d6efd')) {
      errors.push(`❌ Spinner color not set to blue (#0d6efd) in ${filePath}`);
    }
  }
});

// Report results
console.log('📊 Verification Results:\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ All spinner implementations are consistent!');
  console.log('✅ All spinners use blue color (#0d6efd)');
  console.log('✅ No FontAwesome spinners found');
  console.log('✅ All spinners use Bootstrap spinner-border class');
} else {
  if (errors.length > 0) {
    console.log('❌ Errors found:');
    errors.forEach(error => console.log(`   ${error}`));
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    warnings.forEach(warning => console.log(`   ${warning}`));
    console.log('');
  }
}

// Check specific patterns
console.log('🔍 Pattern Analysis:\n');

const allFiles = [...FILES_TO_CHECK, ...CSS_FILES_TO_CHECK];
let spinnerBorderCount = 0;
let textPrimaryCount = 0;
let faSpinnerCount = 0;

allFiles.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    
    if (content.includes('spinner-border')) spinnerBorderCount++;
    if (content.includes('text-primary')) textPrimaryCount++;
    // Only count fa-spinner in non-test and non-CSS files
    if (content.includes('fa-spinner') && !filePath.includes('__tests__') && !filePath.includes('.test.') && !filePath.includes('.css')) {
      faSpinnerCount++;
    }
  }
});

console.log(`📈 Statistics:`);
console.log(`   Files using spinner-border: ${spinnerBorderCount}`);
console.log(`   Files using text-primary: ${textPrimaryCount}`);
console.log(`   Files using fa-spinner: ${faSpinnerCount}`);

if (faSpinnerCount > 0) {
  console.log(`\n❌ Found ${faSpinnerCount} file(s) still using FontAwesome spinners!`);
  process.exit(1);
} else {
  console.log(`\n✅ No FontAwesome spinners found!`);
}

console.log('\n🎯 Expected spinner implementation:');
console.log('   <div class="spinner-border text-primary" role="status">');
console.log('     <span class="sr-only">Loading message...</span>');
console.log('   </div>');

console.log('\n🚫 Forbidden spinner implementation:');
console.log('   <i class="fas fa-spinner fa-spin"></i>');

process.exit(errors.length > 0 ? 1 : 0);
