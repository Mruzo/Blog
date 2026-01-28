#!/usr/bin/env node

/**
 * Script to replace console.log/warn/debug with logger utility
 * 
 * Usage:
 *   node scripts/replace-console-logs.js [--dry-run] [--file=path/to/file]
 * 
 * Options:
 *   --dry-run: Show what would be changed without making changes
 *   --file=path: Only process specific file
 *   --verbose: Show detailed output
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const SPECIFIC_FILE = process.argv.find(arg => arg.startsWith('--file='))?.split('=')[1];

// Directories to process
const SRC_DIR = path.join(__dirname, '../src');
const EXCLUDE_DIRS = ['node_modules', '.git', 'build', 'dist', '__tests__', '__mocks__'];
const EXCLUDE_FILES = ['.test.', '.spec.', 'replace-console-logs.js'];

// File extensions to process
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Console method mappings
const CONSOLE_METHODS = {
  'console.log': 'logger.log',
  'console.warn': 'logger.warn',
  'console.debug': 'logger.debug',
  'console.error': 'logger.error', // Keep errors, but use logger for consistency
};

// Special patterns that should use logger.camera() or logger.verbose()
const CAMERA_PATTERNS = [
  /camera/i,
  /Camera/i,
  /CAMERA/i,
  /orbit/i,
  /Orbit/i,
  /target/i,
  /Target/i,
  /field.*view/i,
  /Field.*View/i,
];

const VERBOSE_PATTERNS = [
  /debug/i,
  /DEBUG/i,
  /verbose/i,
  /VERBOSE/i,
  /===.*===/,
];

let filesProcessed = 0;
let replacementsMade = 0;
let filesChanged = [];

/**
 * Check if file should be processed
 */
function shouldProcessFile(filePath) {
  const fileName = path.basename(filePath);
  const relativePath = path.relative(SRC_DIR, filePath);
  
  // Skip excluded files
  if (EXCLUDE_FILES.some(pattern => fileName.includes(pattern))) {
    return false;
  }
  
  // Skip excluded directories
  if (EXCLUDE_DIRS.some(dir => relativePath.includes(dir))) {
    return false;
  }
  
  // Check extension
  const ext = path.extname(filePath);
  if (!EXTENSIONS.includes(ext)) {
    return false;
  }
  
  // If specific file requested, only process that
  if (SPECIFIC_FILE) {
    return filePath.includes(SPECIFIC_FILE);
  }
  
  return true;
}

/**
 * Determine which logger method to use based on content
 */
function getLoggerMethod(line, originalMethod) {
  const lowerLine = line.toLowerCase();
  
  // Check for camera-related logs
  if (CAMERA_PATTERNS.some(pattern => pattern.test(line))) {
    return 'logger.camera';
  }
  
  // Check for verbose/debug patterns
  if (VERBOSE_PATTERNS.some(pattern => pattern.test(line))) {
    return 'logger.verbose';
  }
  
  // Default mapping
  return CONSOLE_METHODS[originalMethod] || 'logger.log';
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;
    let hasLoggerImport = content.includes("import logger") || content.includes("from '../utils/logger'") || content.includes("from './utils/logger'");
    let needsLoggerImport = false;
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      let lineModified = false;
      
      // Match console.log, console.warn, console.debug, console.error
      for (const [consoleMethod, loggerMethod] of Object.entries(CONSOLE_METHODS)) {
        const regex = new RegExp(`\\b${consoleMethod.replace('.', '\\.')}\\s*\\(`, 'g');
        
        if (regex.test(line)) {
          // Determine which logger method to use
          const targetMethod = getLoggerMethod(line, consoleMethod);
          
          // Replace console.method with logger.method
          line = line.replace(new RegExp(`\\b${consoleMethod.replace('.', '\\.')}`, 'g'), targetMethod);
          
          if (line !== lines[i]) {
            lineModified = true;
            modified = true;
            needsLoggerImport = true;
            replacementsMade++;
            
            if (VERBOSE) {
              console.log(`  Line ${i + 1}: ${consoleMethod} → ${targetMethod}`);
            }
          }
        }
      }
      
      newLines.push(line);
    }
    
    // Add logger import if needed
    if (needsLoggerImport && !hasLoggerImport) {
      // Find the last import statement
      let lastImportIndex = -1;
      for (let i = 0; i < newLines.length; i++) {
        if (newLines[i].trim().startsWith('import ')) {
          lastImportIndex = i;
        }
      }
      
      // Determine relative path to logger
      const relativePath = path.relative(path.dirname(filePath), path.join(SRC_DIR, 'utils', 'logger'));
      const importPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
      const normalizedPath = importPath.replace(/\\/g, '/');
      
      // Add import after last import or at top of file
      const importLine = `import logger from '${normalizedPath}';`;
      if (lastImportIndex >= 0) {
        newLines.splice(lastImportIndex + 1, 0, importLine);
      } else {
        newLines.unshift(importLine);
      }
      
      modified = true;
      if (VERBOSE) {
        console.log(`  Added logger import: ${importLine}`);
      }
    }
    
    if (modified) {
      filesProcessed++;
      filesChanged.push(filePath);
      
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
        console.log(`✓ Updated: ${path.relative(SRC_DIR, filePath)}`);
      } else {
        console.log(`[DRY RUN] Would update: ${path.relative(SRC_DIR, filePath)}`);
      }
    }
    
    return modified;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Recursively find all files to process
 */
function findFiles(dir) {
  const files = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip excluded directories
        if (!EXCLUDE_DIRS.includes(entry.name)) {
          files.push(...findFiles(fullPath));
        }
      } else if (entry.isFile()) {
        if (shouldProcessFile(fullPath)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return files;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Finding console.log statements...\n');
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No files will be modified\n');
  }
  
  const files = SPECIFIC_FILE 
    ? [path.isAbsolute(SPECIFIC_FILE) ? SPECIFIC_FILE : path.resolve(SRC_DIR, SPECIFIC_FILE.replace(/^src\//, ''))]
    : findFiles(SRC_DIR);
  
  console.log(`Found ${files.length} files to check\n`);
  
  for (const file of files) {
    if (VERBOSE) {
      console.log(`Processing: ${path.relative(SRC_DIR, file)}`);
    }
    processFile(file);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Summary:');
  console.log(`  Files processed: ${filesProcessed}`);
  console.log(`  Replacements made: ${replacementsMade}`);
  
  if (DRY_RUN) {
    console.log('\n⚠️  This was a dry run. Run without --dry-run to apply changes.');
  } else if (filesChanged.length > 0) {
    console.log('\n✅ Changes applied successfully!');
    console.log('\nNext steps:');
    console.log('  1. Review the changes');
    console.log('  2. Test the application');
    console.log('  3. Commit the changes');
  } else {
    console.log('\n✅ No changes needed - all files are already using logger!');
  }
}

// Run the script
main();
