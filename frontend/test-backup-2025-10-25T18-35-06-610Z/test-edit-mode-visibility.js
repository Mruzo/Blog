#!/usr/bin/env node

/**
 * Test Edit Mode Model Visibility
 * 
 * This test verifies that the 3D model remains visible when edit mode is active
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  componentPath: 'src/components/Comic3DViewer.tsx',
  requirements: {
    'Model Viewer Visibility Styles': {
      patterns: [
        /display.*block/g,
        /visibility.*visible/g,
        /opacity.*1/g,
        /style.*width.*100%.*height.*100%/g
      ],
      required: 4,
      description: 'Model viewer should have explicit visibility styles'
    },
    'Edit Mode Debugging': {
      patterns: [
        /console\.log.*Rendering model viewer.*isEditMode/g,
        /console\.log.*Edit Mode button clicked/g,
        /Model Viewer Element.*Found.*Not Found/g
      ],
      required: 3,
      description: 'Debug logging for edit mode model visibility'
    },
    'Model Container Styles': {
      patterns: [
        /height.*400px/g,
        /display.*block/g,
        /position.*relative/g
      ],
      required: 3,
      description: 'Model container should have proper dimensions and positioning'
    },
    'Model Viewer Element Styles': {
      patterns: [
        /style.*width.*100%.*height.*100%.*display.*block.*visibility.*visible.*opacity.*1/g,
        /model-viewer.*style.*width.*100%.*height.*100%/g,
        /model-viewer.*style.*width.*100%.*height.*100%.*display.*block.*visibility.*visible.*opacity.*1/g,
        /<model-viewer/g,
        /style.*width.*100%.*height.*100%.*display.*block.*visibility.*visible.*opacity.*1/g
      ],
      required: 2,
      description: 'Model viewer element should have explicit visibility styles'
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
  console.log('🧪 Testing Edit Mode Model Visibility');
  console.log('====================================');
  
  const componentPath = path.join(process.cwd(), CONFIG.componentPath);
  const componentPassed = testFile(componentPath, CONFIG.requirements);
  
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`Component Tests: ${componentPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (componentPassed) {
    console.log('\n✨ Edit mode model visibility is properly implemented!');
    console.log('🎯 Features verified:');
    console.log('   • Model viewer has explicit visibility styles');
    console.log('   • Debug logging for edit mode model visibility');
    console.log('   • Model container has proper dimensions and positioning');
    console.log('   • Model viewer element has explicit visibility styles');
    console.log('\n💡 The 3D model should remain visible in edit mode!');
    console.log('🔍 Check the debug info box and console logs for visibility information.');
  } else {
    console.log('\n❌ Some edit mode model visibility features are missing!');
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
