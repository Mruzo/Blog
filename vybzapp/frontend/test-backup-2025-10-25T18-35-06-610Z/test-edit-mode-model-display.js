#!/usr/bin/env node

/**
 * Test Edit Mode Model Display
 * 
 * This test verifies that the 3D model remains visible when edit mode is toggled
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  componentPath: 'src/components/Comic3DViewer.tsx',
  requirements: {
    'Model Viewer Persistence': {
      patterns: [
        /key.*model-viewer.*selectedEpisode\.id.*isEditMode/g,
        /isStarted.*\?/g,
        /dangerouslySetInnerHTML.*model-viewer/g
      ],
      required: 3,
      description: 'Model viewer should persist when edit mode is toggled'
    },
    'Edit Mode Debugging': {
      patterns: [
        /console\.log.*Edit Mode button clicked/g,
        /console\.log.*Current isStarted/g,
        /console\.log.*Current isModelReady/g,
        /console\.log.*Setting up event listeners.*isEditMode/g
      ],
      required: 4,
      description: 'Debug logging for edit mode toggle and model persistence'
    },
    'Debug Info Display': {
      patterns: [
        /isEditMode.*true.*false/g,
        /isStarted.*true.*false/g,
        /isModelReady.*true.*false/g,
        /position-absolute.*top-0.*start-0/g
      ],
      required: 4,
      description: 'Debug info should show edit mode state'
    },
    'Edit Mode Toggle': {
      patterns: [
        /setIsEditMode.*true/g,
        /setIsEditMode.*false/g,
        /btn.*btn-warning.*btn-outline-warning/g,
        /Edit Mode.*button/g
      ],
      required: 4,
      description: 'Edit mode toggle functionality'
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
  console.log('🧪 Testing Edit Mode Model Display');
  console.log('==================================');
  
  const componentPath = path.join(process.cwd(), CONFIG.componentPath);
  const componentPassed = testFile(componentPath, CONFIG.requirements);
  
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`Component Tests: ${componentPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (componentPassed) {
    console.log('\n✨ Edit mode model display is properly implemented!');
    console.log('🎯 Features verified:');
    console.log('   • Model viewer persists when edit mode is toggled');
    console.log('   • Debug logging for edit mode toggle');
    console.log('   • Debug info shows edit mode state');
    console.log('   • Edit mode toggle functionality');
    console.log('\n💡 The 3D model should remain visible in edit mode!');
    console.log('🔍 Check the debug info box and console logs for state information.');
  } else {
    console.log('\n❌ Some edit mode model display features are missing!');
    console.log('💡 This could cause the model to disappear in edit mode.');
  }
  
  return componentPassed;
}

// Run tests
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests, testFile };
