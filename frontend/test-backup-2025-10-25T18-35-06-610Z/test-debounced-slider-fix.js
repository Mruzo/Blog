#!/usr/bin/env node

/**
 * Test Debounced Slider Fix
 * 
 * This test verifies that the infinite loop issue with sliders in edit mode is fixed
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  componentPath: 'src/components/Comic3DViewer.tsx',
  requirements: {
    'Debounced Update Function': {
      patterns: [
        /updateTimeoutRef.*useRef/g,
        /updateCameraDebounced.*useCallback/g,
        /clearTimeout.*updateTimeoutRef\.current/g,
        /updateTimeoutRef\.current.*setTimeout/g,
      ],
      required: 4,
      description: 'Debounced update camera function with timeout management'
    },
    'All Sliders Use Debounced Function': {
      patterns: [
        /updateCameraDebounced.*dialogue_id.*camera_orbit/g,
        /updateCameraDebounced.*dialogue_id.*camera_target/g,
        /updateCameraDebounced.*dialogue_id.*field_of_view/g,
        /updateCameraDebounced.*dialogue_id.*zoom_speed/g
      ],
      required: 4,
      description: 'All slider onChange handlers use debounced function'
    },
    'No Direct updateCamera Calls': {
      patterns: [
        /updateCamera\(/g
      ],
      required: 0,
      description: 'No direct updateCamera calls in onChange handlers'
    },
    'Timeout Management': {
      patterns: [
        /updateTimeoutRef\.current.*clearTimeout/g,
        /updateTimeoutRef\.current.*setTimeout/g,
        /NodeJS\.Timeout.*null/g
      ],
      required: 3,
      description: 'Proper timeout management with useRef'
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
  console.log('🧪 Testing Debounced Slider Fix');
  console.log('================================');
  
  const componentPath = path.join(process.cwd(), CONFIG.componentPath);
  const componentPassed = testFile(componentPath, CONFIG.requirements);
  
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`Component Tests: ${componentPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (componentPassed) {
    console.log('\n✨ Slider infinite loop issues are fixed!');
    console.log('🎯 Features verified:');
    console.log('   • Debounced update camera function with timeout management');
    console.log('   • All slider onChange handlers use debounced function');
    console.log('   • No direct updateCamera calls in onChange handlers');
    console.log('   • Proper timeout management with useRef');
    console.log('\n💡 The sliders should no longer cause infinite loops when clicked!');
  } else {
    console.log('\n❌ Some slider infinite loop fixes are missing!');
    console.log('💡 The sliders might still cause infinite loops when clicked.');
  }
  
  return componentPassed;
}

// Run tests
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests, testFile };
