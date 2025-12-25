#!/usr/bin/env node

/**
 * Test Cleanup Script
 * 
 * This script safely removes individual test files that have been consolidated
 * into the consolidated test files. It creates a backup and provides detailed logging.
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

console.log(`${colors.cyan}${colors.bright}🧹 TEST CLEANUP SCRIPT${colors.reset}`);
console.log(`${colors.blue}Removing individual test files that have been consolidated${colors.reset}\n`);

// Consolidated test files (keep these)
const consolidatedFiles = [
  'test-consolidated-3d-model.js',
  'test-consolidated-admin-export.js',
  'test-consolidated-autoplay.js',
  'test-consolidated-camera-controls.js',
  'test-consolidated-dialogue.js',
  'test-consolidated-django-integration.js',
  'test-consolidated-edit-mode.js',
  'test-consolidated-import-export.js',
  'test-consolidated-loading.js',
  'test-consolidated-mystudio-story.js',
  'test-consolidated-scroll-navigation.js',
  'test-consolidated-season-episode.js'
];

// Get all test files
const allTestFiles = fs.readdirSync('.')
  .filter(file => file.startsWith('test-') && file.endsWith('.js'))
  .sort();

// Identify files to remove (all test files except consolidated ones)
const filesToRemove = allTestFiles.filter(file => !consolidatedFiles.includes(file));

console.log(`${colors.yellow}📊 CLEANUP SUMMARY${colors.reset}`);
console.log(`${colors.blue}Total test files found: ${allTestFiles.length}${colors.reset}`);
console.log(`${colors.green}Consolidated files (keeping): ${consolidatedFiles.length}${colors.reset}`);
console.log(`${colors.red}Files to remove: ${filesToRemove.length}${colors.reset}\n`);

// Create backup directory
const backupDir = 'test-backup-' + new Date().toISOString().replace(/[:.]/g, '-');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
  console.log(`${colors.yellow}📁 Created backup directory: ${backupDir}${colors.reset}\n`);
}

// Function to safely remove a file
function removeFile(filePath) {
  try {
    // Create backup
    const backupPath = path.join(backupDir, filePath);
    fs.copyFileSync(filePath, backupPath);
    
    // Remove original
    fs.unlinkSync(filePath);
    
    console.log(`${colors.green}✅ Removed: ${filePath}${colors.reset}`);
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Failed to remove ${filePath}: ${error.message}${colors.reset}`);
    return false;
  }
}

// Remove files
console.log(`${colors.yellow}🗑️  REMOVING FILES...${colors.reset}\n`);

let removedCount = 0;
let failedCount = 0;

filesToRemove.forEach(file => {
  if (removeFile(file)) {
    removedCount++;
  } else {
    failedCount++;
  }
});

// Final summary
console.log(`\n${colors.cyan}${colors.bright}📊 CLEANUP COMPLETE${colors.reset}`);
console.log(`${colors.green}Successfully removed: ${removedCount} files${colors.reset}`);
console.log(`${colors.red}Failed to remove: ${failedCount} files${colors.reset}`);
console.log(`${colors.blue}Backup created in: ${backupDir}${colors.reset}`);

// Show remaining files
const remainingFiles = fs.readdirSync('.')
  .filter(file => file.startsWith('test-') && file.endsWith('.js'))
  .sort();

console.log(`\n${colors.yellow}📋 REMAINING TEST FILES:${colors.reset}`);
remainingFiles.forEach(file => {
  console.log(`${colors.green}  ✅ ${file}${colors.reset}`);
});

console.log(`\n${colors.cyan}${colors.bright}🎉 CLEANUP SUCCESSFUL!${colors.reset}`);
console.log(`${colors.blue}Reduced from ${allTestFiles.length} to ${remainingFiles.length} test files${colors.reset}`);
console.log(`${colors.yellow}Reduction: ${((allTestFiles.length - remainingFiles.length) / allTestFiles.length * 100).toFixed(1)}%${colors.reset}`);
