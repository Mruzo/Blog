#!/usr/bin/env node

/**
 * Test 3D Model Debug Functionality
 * 
 * This test verifies that the 3D model viewer has proper debugging and fallback display
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  componentPath: 'src/components/Comic3DViewer.tsx',
  requirements: {
    'Debug Logging': {
      patterns: [
        /console\.log.*Start button clicked/g,
        /console\.log.*Selected episode/g,
        /console\.log.*Episode has model/g,
        /console\.log.*Model URL/g,
        /console\.log.*Set isStarted to true/g,
        /console\.log.*Model loaded and ready/g
      ],
      required: 6,
      description: 'Comprehensive debug logging for troubleshooting'
    },
    'Loading Indicator': {
      patterns: [
        /Loading 3D model/g,
        /spinner-border/g,
        /!isModelReady.*loading/g,
        /position-absolute.*top-50/g
      ],
      required: 4,
      description: 'Loading indicator when model is not ready'
    },
    'Model Display Structure': {
      patterns: [
        /data-model-viewer/g,
        /data-src.*selectedEpisode\.model_gltf/g,
        /data-camera-controls/g,
        /onLoad.*handleModelReady/g
      ],
      required: 4,
      description: 'Proper model viewer structure with data attributes'
    },
    'Fallback Display': {
      patterns: [
        /No 3D Model Available/g,
        /fas fa-cube/g,
        /This episode doesn't have a 3D model/g
      ],
      required: 3,
      description: 'Fallback display for episodes without models'
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
  console.log('🧪 Testing 3D Model Debug Functionality');
  console.log('=====================================');
  
  const componentPath = path.join(process.cwd(), CONFIG.componentPath);
  const componentPassed = testFile(componentPath, CONFIG.requirements);
  
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`Component Tests: ${componentPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (componentPassed) {
    console.log('\n✨ 3D model debug functionality is properly implemented!');
    console.log('🎯 Features verified:');
    console.log('   • Comprehensive debug logging for troubleshooting');
    console.log('   • Loading indicator when model is not ready');
    console.log('   • Proper model viewer structure with data attributes');
    console.log('   • Fallback display for episodes without models');
    console.log('\n💡 Check the browser console for debug messages when you click start!');
  } else {
    console.log('\n❌ Some 3D model debug features are missing!');
    console.log('💡 This could cause issues with model display and debugging.');
  }
  
  return componentPassed;
}

// Run tests
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests, testFile };


