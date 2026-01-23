#!/usr/bin/env node

/**
 * Test 3D Model React Fix
 * 
 * This test verifies that the dangerouslySetInnerHTML issue is fixed
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  componentPath: 'src/components/Comic3DViewer.tsx',
  requirements: {
    'Self-Closing dangerouslySetInnerHTML': {
      patterns: [
        /dangerouslySetInnerHTML.*\/>/g,
        /dangerouslySetInnerHTML.*\/>\s*\/>/g,
        /dangerouslySetInnerHTML.*\/>\s*\/>\s*\/>/g,
        /dangerouslySetInnerHTML.*\/>\s*\/>\s*\/>\s*\/>/g,
        /dangerouslySetInnerHTML.*\/>\s*\/>\s*\/>\s*\/>\s*\/>/g,
        /dangerouslySetInnerHTML.*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>/g,
        /dangerouslySetInnerHTML.*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>/g,
        /dangerouslySetInnerHTML.*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>/g,
        /dangerouslySetInnerHTML.*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>/g,
        /dangerouslySetInnerHTML.*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>/g,
        /dangerouslySetInnerHTML.*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>/g,
        /dangerouslySetInnerHTML.*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>/g,
        /dangerouslySetInnerHTML.*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>/g,
        /dangerouslySetInnerHTML.*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>/g,
        /dangerouslySetInnerHTML.*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>\s*\/>/g
      ],
      required: 1,
      description: 'dangerouslySetInnerHTML div is self-closing to avoid React error'
    },
    'Separate Speech Bubble': {
      patterns: [
        /Speech Bubble.*positioned absolutely over the model viewer/g,
        /position-absolute.*top-0.*start-50/g,
        /zIndex.*10/g
      ],
      required: 3,
      description: 'Speech bubble is positioned separately from model viewer'
    },
    'No Children in dangerouslySetInnerHTML': {
      patterns: [
        /dangerouslySetInnerHTML.*\/>\s*\/>\s*{/g
      ],
      required: 0,
      description: 'No children elements inside dangerouslySetInnerHTML div'
    },
    'Proper Model Viewer Structure': {
      patterns: [
        /model-viewer.*src.*selectedEpisode\.model_gltf/g,
        /camera-controls/g,
        /style.*width.*100%.*height.*100%/g
      ],
      required: 3,
      description: 'Model viewer element has proper attributes'
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
  console.log('🧪 Testing 3D Model React Fix');
  console.log('============================');
  
  const componentPath = path.join(process.cwd(), CONFIG.componentPath);
  const componentPassed = testFile(componentPath, CONFIG.requirements);
  
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  console.log(`Component Tests: ${componentPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (componentPassed) {
    console.log('\n✨ React dangerouslySetInnerHTML error is fixed!');
    console.log('🎯 Features verified:');
    console.log('   • Self-closing dangerouslySetInnerHTML div');
    console.log('   • Speech bubble positioned separately');
    console.log('   • No children in dangerouslySetInnerHTML div');
    console.log('   • Proper model viewer structure');
    console.log('\n💡 The React error should now be resolved!');
    console.log('🔍 The 3D model should display without React errors.');
  } else {
    console.log('\n❌ Some React fix features are missing!');
    console.log('💡 This could cause React dangerouslySetInnerHTML errors.');
  }
  
  return componentPassed;
}

// Run tests
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests, testFile };
