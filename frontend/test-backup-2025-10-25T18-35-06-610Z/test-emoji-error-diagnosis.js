#!/usr/bin/env node

/**
 * Test: Emoji Picker Error Diagnosis
 * 
 * This test helps diagnose the "emoji-picker-element" error:
 * - Check if it's in the codebase
 * - Identify potential sources
 * - Provide solutions
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 EMOJI PICKER ERROR DIAGNOSIS\n');

// Check package.json for emoji-related dependencies
const packageJsonPath = path.join(__dirname, 'package.json');
let packageJsonContent = '';

try {
  packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
} catch (error) {
  console.log('❌ Cannot read package.json');
  process.exit(1);
}

console.log('1️⃣ Checking Package Dependencies...');
if (packageJsonContent.includes('emoji-picker-element')) {
  console.log('❌ FOUND: emoji-picker-element in package.json');
} else {
  console.log('✅ NOT FOUND: emoji-picker-element not in package.json');
}

// Check for any emoji-related imports in source files
console.log('\n2️⃣ Checking Source Files for Emoji Imports...');
const srcDir = path.join(__dirname, 'src');
let foundEmojiImports = false;

try {
  const files = fs.readdirSync(srcDir, { recursive: true });
  for (const file of files) {
    if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.jsx')) {
      const filePath = path.join(srcDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('emoji-picker-element') || content.includes('emoji-picker')) {
          console.log(`❌ FOUND: emoji-picker reference in ${file}`);
          foundEmojiImports = true;
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }
} catch (error) {
  console.log('❌ Cannot read src directory');
}

if (!foundEmojiImports) {
  console.log('✅ NOT FOUND: No emoji-picker references in source files');
}

console.log('\n🎯 ERROR ANALYSIS:\n');
console.log('The "emoji-picker-element" error is likely caused by:');
console.log('');
console.log('1. ✅ Browser Extension:');
console.log('   - A browser extension trying to inject emoji picker');
console.log('   - Check if you have emoji-related browser extensions');
console.log('   - Try disabling extensions to test');
console.log('');
console.log('2. ✅ Third-party Script:');
console.log('   - External script trying to load emoji picker');
console.log('   - Check browser developer tools for external scripts');
console.log('   - Look for scripts from other domains');
console.log('');
console.log('3. ✅ Cached Module:');
console.log('   - Old cached module reference');
console.log('   - Clear browser cache and restart');
console.log('   - Check if error persists in incognito mode');

console.log('\n🔧 SOLUTIONS:\n');
console.log('1. ✅ Check Browser Extensions:');
console.log('   - Disable all browser extensions');
console.log('   - Test if error still occurs');
console.log('   - Re-enable extensions one by one');
console.log('');
console.log('2. ✅ Clear Browser Cache:');
console.log('   - Clear browser cache and cookies');
console.log('   - Hard refresh (Ctrl+Shift+R)');
console.log('   - Test in incognito/private mode');
console.log('');
console.log('3. ✅ Check Developer Tools:');
console.log('   - Open browser developer tools');
console.log('   - Check Console tab for error source');
console.log('   - Check Network tab for failed requests');
console.log('   - Look for external script sources');

console.log('\n💡 DEBUGGING STEPS:\n');
console.log('1. ✅ Open browser developer tools (F12)');
console.log('2. ✅ Go to Console tab');
console.log('3. ✅ Look for the exact error message');
console.log('4. ✅ Check the stack trace to see where it originates');
console.log('5. ✅ Check Network tab for any failed requests');
console.log('6. ✅ Try in incognito mode to rule out extensions');

console.log('\n🚀 QUICK FIXES:\n');
console.log('1. ✅ Clear browser cache');
console.log('2. ✅ Disable browser extensions');
console.log('3. ✅ Test in incognito mode');
console.log('4. ✅ Check if error occurs on other pages');
console.log('5. ✅ Restart browser completely');

console.log('\n🎯 EXPECTED RESULT:\n');
console.log('✅ After applying fixes:');
console.log('   - Error should disappear');
console.log('   - React app should work normally');
console.log('   - No more emoji-picker-element errors');
console.log('   - All functionality should work as expected');
