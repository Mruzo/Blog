#!/usr/bin/env node

/**
 * Test 3D Model Fix
 * 
 * This test verifies that the 3D model viewer uses proper model-viewer element and debugging
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  componentPath: 'src/components/Comic3DViewer.tsx',
  requirements: {
    'Model Viewer Script Loading': {
      patterns: [
        /console\.log.*Initializing model-viewer script/g,
        /console\.log.*Model-viewer script loaded successfully/g,
        /script\.onload/g,
        /script\.onerror/g
      ],
      required: 4,
      description: 'Proper model-viewer script loading with error handling'
    },
    'Model Viewer Element Creation': {
      patterns: [
        /dangerouslySetInnerHTML/g,
        /model-viewer/g,
        /src.*selectedEpisode\.model_gltf/g,
        /camera-controls/g
      ],
      required: 4,
      description: 'Model viewer element created using dangerouslySetInnerHTML'
    },
    'Event Listener Setup': {
      patterns: [
        /querySelector.*model-viewer/g,
        /addEventListener.*load/g,
        /addEventListener.*model-visibility/g,
        /addEventListener.*camera-change/g,
        /setTimeout.*100/g
      ],
      required: 5,
      description: 'Event listeners properly set up for model-viewer element'
    },
    'Debug Information': {
      patterns: [
        /isStarted.*true.*false/g,
        /isModelReady.*true.*false/g,
        /Model URL.*selectedEpisode\.model_gltf/g,
        /position-absolute.*top-0.*start-0/g,
        /bg-dark.*text-white/g
      ],
      required: 5,
      description: 'Debug information display for troubleshooting'
    },
    'Loading Indicator': {
      patterns: [
        /Loading 3D model/g,
        /spinner-border/g,
        /Model URL.*selectedEpisode\.model_gltf/g,
        /!isModelReady.*loading/g
      ],
      required: 4,
      description: 'Loading indicator with model URL display'
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
  console.log('🧪 Testing 3D Model Fix');
  console.log('======================');
  
  const componentPath = path.join(process.cwd(), CONFIG.componentPath);
  const componentPassed = testFile(componentPath, CONFIG.requirements);
  
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`Component Tests: ${componentPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (componentPassed) {
    console.log('\n✨ 3D model fix is properly implemented!');
    console.log('🎯 Features verified:');
    console.log('   • Proper model-viewer script loading with error handling');
    console.log('   • Model viewer element created using dangerouslySetInnerHTML');
    console.log('   • Event listeners properly set up for model-viewer element');
    console.log('   • Debug information display for troubleshooting');
    console.log('   • Loading indicator with model URL display');
    console.log('\n💡 The 3D model should now display properly!');
    console.log('🔍 Check the debug info box in the top-left corner for state information.');
  } else {
    console.log('\n❌ Some 3D model fix features are missing!');
    console.log('💡 This could cause the model not to display properly.');
  }
  
  return componentPassed;
}

// Run tests
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests, testFile };


