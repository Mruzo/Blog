#!/usr/bin/env node

/**
 * Remove Redundant Test Files Script
 * 
 * Removes individual test files that have been consolidated into
 * consolidated test files. Creates a backup before deletion.
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
  cyan: '\x1b[36m'
};

console.log(`${colors.cyan}${colors.bright}🗑️  REMOVE REDUNDANT TEST FILES${colors.reset}`);
console.log(`${colors.blue}Removing consolidated individual test files${colors.reset}\n`);

// List of redundant test files to remove (consolidated into consolidated tests)
const redundantFiles = [
  // Save button tests (consolidated into test-consolidated-edit-mode.js)
  'test-save-button-functionality.js',
  'test-save-button-immediate-update.js',
  'test-save-button-integration.js',
  'test-save-button-refresh.js',
  
  // Camera tests (consolidated into test-consolidated-camera-controls.js)
  'test-bidirectional-camera-sync.js',
  'test-camera-dial-reflection.js',
  'test-camera-dial-save-confirmation.js',
  'test-camera-dial-save-integration.js',
  'test-camera-values-save.js',
  
  // Cover image tests (consolidated into test-consolidated-cover-image.js)
  'test-cover-image-functionality.js',
  'test-story-edit-cover-image.js',
  
  // GLB animation test (consolidated into test-consolidated-3d-model.js)
  'test-glb-animation-functionality.js'
];

// Create backup directory
const backupDir = 'test-backup-redundant-' + new Date().toISOString().replace(/[:.]/g, '-');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
  console.log(`${colors.yellow}📁 Created backup directory: ${backupDir}${colors.reset}\n`);
}

// Function to safely remove a file
function removeFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`${colors.yellow}  ⚠️  File not found: ${filePath}${colors.reset}`);
      return false;
    }
    
    // Create backup
    const backupPath = path.join(backupDir, path.basename(filePath));
    fs.copyFileSync(filePath, backupPath);
    
    // Remove original
    fs.unlinkSync(filePath);
    
    console.log(`${colors.green}  ✅ Removed: ${filePath}${colors.reset}`);
    return true;
  } catch (error) {
    console.log(`${colors.red}  ❌ Failed to remove ${filePath}: ${error.message}${colors.reset}`);
    return false;
  }
}

// Remove files
console.log(`${colors.yellow}🗑️  REMOVING REDUNDANT TEST FILES...${colors.reset}\n`);

let removedCount = 0;
let skippedCount = 0;
let failedCount = 0;

redundantFiles.forEach(file => {
  if (removeFile(file)) {
    removedCount++;
  } else if (fs.existsSync(file)) {
    failedCount++;
  } else {
    skippedCount++;
  }
});

// Final summary
console.log(`\n${colors.cyan}${colors.bright}📊 REMOVAL COMPLETE${colors.reset}`);
console.log(`${colors.green}Successfully removed: ${removedCount} files${colors.reset}`);
if (skippedCount > 0) {
  console.log(`${colors.yellow}Skipped (not found): ${skippedCount} files${colors.reset}`);
}
if (failedCount > 0) {
  console.log(`${colors.red}Failed to remove: ${failedCount} files${colors.reset}`);
}
console.log(`${colors.blue}Backup created in: ${backupDir}${colors.reset}`);

// Show consolidation summary
console.log(`\n${colors.cyan}${colors.bright}📈 CONSOLIDATION SUMMARY${colors.reset}`);
console.log(`${colors.blue}Files consolidated into:${colors.reset}`);
console.log(`${colors.yellow}  • test-consolidated-edit-mode.js (save button tests)${colors.reset}`);
console.log(`${colors.yellow}  • test-consolidated-camera-controls.js (camera tests)${colors.reset}`);
console.log(`${colors.yellow}  • test-consolidated-cover-image.js (cover image tests)${colors.reset}`);
console.log(`${colors.yellow}  • test-consolidated-3d-model.js (GLB animation test)${colors.reset}`);

console.log(`\n${colors.green}${colors.bright}🎉 CLEANUP SUCCESSFUL!${colors.reset}`);
console.log(`${colors.blue}Test suite is now optimized and consolidated${colors.reset}`);

