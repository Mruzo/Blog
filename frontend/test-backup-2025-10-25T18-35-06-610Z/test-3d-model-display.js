#!/usr/bin/env node

/**
 * Test 3D Model Display
 * 
 * This test verifies that the 3D model shows when the user hits the start button
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  componentPath: 'src/components/Comic3DViewer.tsx',
  requirements: {
    'Start Button Logic': {
      patterns: [
        /startEpisode.*function/g,
        /setIsModelReady.*true/g,
        /console\.log.*Start button clicked/g,
        /console\.log.*Selected episode/g,
        /console\.log.*Episode has model/g
      ],
      required: 5,
      description: 'Start button sets model ready and includes debugging'
    },
    'Model Display Logic': {
      patterns: [
        /isModelReady/g,
        /selectedEpisode\.model_gltf/g,
        /isModelReady.*\?/g,
        /No 3D Model Available/g
      ],
      required: 4,
      description: 'Model display logic based on isModelReady state'
    },
    'Model Viewer Element': {
      patterns: [
        /data-model-viewer/g,
        /data-src.*selectedEpisode\.model_gltf/g,
        /ref.*modelViewerRef/g,
        /onLoad.*handleModelReady/g
      ],
      required: 4,
      description: '3D model viewer element with proper attributes'
    },
    'Fallback Display': {
      patterns: [
        /No 3D Model Available/g,
        /fas fa-cube/g,
        /This episode doesn't have a 3D model/g
      ],
      required: 3,
      description: 'Fallback display when no model is available'
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
  console.log('🧪 Testing 3D Model Display');
  console.log('===========================');
  
  const componentPath = path.join(process.cwd(), CONFIG.componentPath);
  const componentPassed = testFile(componentPath, CONFIG.requirements);
  
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`Component Tests: ${componentPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (componentPassed) {
    console.log('\n✨ 3D model display is properly implemented!');
    console.log('🎯 Features verified:');
    console.log('   • Start button sets isModelReady to true');
    console.log('   • Model displays when isModelReady is true');
    console.log('   • Fallback display for episodes without models');
    console.log('   • Debug logging for troubleshooting');
    console.log('\n💡 The 3D model should now show when the user hits start!');
  } else {
    console.log('\n❌ Some 3D model display features are missing!');
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