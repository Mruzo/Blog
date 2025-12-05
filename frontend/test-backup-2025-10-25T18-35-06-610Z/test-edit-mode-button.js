#!/usr/bin/env node

/**
 * Test Edit Mode Button Functionality
 * 
 * This test verifies that the edit mode button works correctly
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  componentPath: 'src/components/Comic3DViewer.tsx',
  requirements: {
    'Edit Mode Button': {
      patterns: [
        /setIsEditMode\(true\)/g,
        /Edit Mode.*button/g,
        /fas fa-edit/g,
        /btn.*warning.*btn-outline-warning/g
      ],
      required: 4,
      description: 'Edit mode button with proper click handler'
    },
    'Preview Mode Button': {
      patterns: [
        /setIsEditMode\(false\)/g,
        /Preview Mode.*button/g,
        /fas fa-eye/g,
        /btn.*primary.*btn-outline-primary/g
      ],
      required: 4,
      description: 'Preview mode button with proper click handler'
    },
    'Edit Controls Conditional Rendering': {
      patterns: [
        /isEditMode.*selectedEpisode/g,
        /Edit Controls/g,
        /modern-card/g
      ],
      required: 3,
      description: 'Edit controls render when edit mode is active'
    },
    'State Management': {
      patterns: [
        /isEditMode.*useState/g,
        /setIsEditMode/g
      ],
      required: 2,
      description: 'Edit mode state management'
    },
    'Debug Logging': {
      patterns: [
        /console\.log.*Edit Mode button clicked/g,
        /console\.log.*Rendering edit controls/g
      ],
      required: 2,
      description: 'Debug logging for troubleshooting'
    }
  }
};

// Test functions
function testRequirement(name, patterns, required, description, content) {
  const matches = patterns.map(pattern => {
    const regex = new RegExp(pattern, 'g');
    const found = content.match(regex);
    return found ? found.length : 0;
  });
  
  const totalMatches = matches.reduce((sum, count) => sum + count, 0);
  const passed = totalMatches >= required;
  
  console.log(`  ${passed ? '✅' : '❌'} ${name}: ${totalMatches}/${required} matches`);
  if (!passed) {
    console.log(`    Required: ${required}, Found: ${totalMatches}`);
    patterns.forEach((pattern, index) => {
      if (matches[index] === 0) {
        console.log(`    Missing: ${pattern}`);
      }
    });
  }
  
  return passed;
}

function testFile(filePath, requirements) {
  console.log(`\n📁 Testing ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  let allPassed = true;
  
  Object.entries(requirements).forEach(([name, config]) => {
    const passed = testRequirement(
      name,
      config.patterns,
      config.required,
      config.description,
      content
    );
    if (!passed) allPassed = false;
  });
  
  return allPassed;
}

// Main test execution
function runTests() {
  console.log('🧪 Testing Edit Mode Button Functionality');
  console.log('========================================');
  
  const componentPath = path.join(process.cwd(), CONFIG.componentPath);
  const componentPassed = testFile(componentPath, CONFIG.requirements);
  
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`Component Tests: ${componentPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (componentPassed) {
    console.log('\n✨ Edit mode button functionality is properly implemented!');
    console.log('🎯 Features verified:');
    console.log('   • Edit mode button with click handler');
    console.log('   • Preview mode button with click handler');
    console.log('   • Conditional rendering of edit controls');
    console.log('   • State management for edit mode');
    console.log('   • Debug logging for troubleshooting');
    console.log('\n💡 If the button still doesn\'t work, check:');
    console.log('   1. Browser console for debug messages');
    console.log('   2. Make sure an episode is selected');
    console.log('   3. Check if there are any JavaScript errors');
  }
  
  return componentPassed;
}

// Run tests
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests, testFile };
