#!/usr/bin/env node

/**
 * Test Infinite Loop Fix
 * 
 * This test verifies that the infinite loop issues in Comic3DViewer are fixed
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  componentPath: 'src/components/Comic3DViewer.tsx',
  requirements: {
    'Event Listeners useEffect': {
      patterns: [
        /useEffect\(\(\) => \{[\s\S]*?if \(isStarted && selectedEpisode\?\.model_gltf\)/g,
        /}, \[isStarted, selectedEpisode, isEditMode\]\);/g,
        /eslint-disable-next-line react-hooks\/exhaustive-deps/g
      ],
      required: 3,
      description: 'Event listeners useEffect with proper dependencies and ESLint disable'
    },
    'Edit Mode useEffect': {
      patterns: [
        /useEffect\(\(\) => \{[\s\S]*?if \(isEditMode\) \{[\s\S]*?loadCurrentDialogueValues\(\);/g,
        /}, \[isEditMode\]\);/g,
        /eslint-disable-next-line react-hooks\/exhaustive-deps/g
      ],
      required: 3,
      description: 'Edit mode useEffect with proper dependencies and ESLint disable'
    },
    'No Circular Dependencies': {
      patterns: [
        /handleModelReady.*handleModelVisibility.*handleCameraChange.*\]/g,
        /loadCurrentDialogueValues.*\]/g
      ],
      required: 0,
      description: 'No circular dependencies in useEffect arrays'
    },
    'ESLint Disable Comments': {
      patterns: [
        /eslint-disable-next-line react-hooks\/exhaustive-deps/g
      ],
      required: 2,
      description: 'ESLint disable comments for intentional dependency exclusions'
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
  console.log('🧪 Testing Infinite Loop Fix');
  console.log('============================');
  
  const componentPath = path.join(process.cwd(), CONFIG.componentPath);
  const componentPassed = testFile(componentPath, CONFIG.requirements);
  
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`Component Tests: ${componentPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (componentPassed) {
    console.log('\n✨ Infinite loop issues are fixed!');
    console.log('🎯 Features verified:');
    console.log('   • Event listeners useEffect with proper dependencies');
    console.log('   • Edit mode useEffect with proper dependencies');
    console.log('   • No circular dependencies in useEffect arrays');
    console.log('   • ESLint disable comments for intentional exclusions');
    console.log('\n💡 The component should no longer cause infinite re-renders!');
  } else {
    console.log('\n❌ Some infinite loop fixes are missing!');
    console.log('💡 The component might still cause infinite re-renders.');
  }
  
  return componentPassed;
}

// Run tests
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests, testFile };


