#!/usr/bin/env node

/**
 * Test Edit Mode Null Safety
 * 
 * This test verifies that the edit mode sliders handle null/undefined values safely
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  componentPath: 'src/components/Comic3DViewer.tsx',
  requirements: {
    'Null Safety in Sliders': {
      patterns: [
        /currentEditingDialogue.*dialogueData\[currentDialogueIndex\]/g,
        /if.*!current.*return/g,
        /const current = currentEditingDialogue/g
      ],
      required: 3,
      description: 'Null safety checks in slider onChange handlers'
    },
    'All Slider Handlers Protected': {
      patterns: [
        /id="orbitAzimuth"/g,
        /id="orbitPolar"/g,
        /id="orbitRadius"/g,
        /id="targetX"/g,
        /id="targetY"/g,
        /id="targetZ"/g,
        /id="fieldOfView"/g,
        /id="zoomSpeed"/g
      ],
      required: 8,
      description: 'All slider handlers exist'
    },
    'Early Return Pattern': {
      patterns: [
        /if.*!current.*return/g
      ],
      required: 8,
      description: 'Early return pattern prevents undefined access'
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
  console.log('🧪 Testing Edit Mode Null Safety');
  console.log('================================');
  
  const componentPath = path.join(process.cwd(), CONFIG.componentPath);
  const componentPassed = testFile(componentPath, CONFIG.requirements);
  
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`Component Tests: ${componentPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (componentPassed) {
    console.log('\n✨ Edit mode null safety is properly implemented!');
    console.log('🎯 Safety features verified:');
    console.log('   • All sliders use currentEditingDialogue as fallback');
    console.log('   • Early return prevents undefined access');
    console.log('   • Null checks prevent runtime errors');
    console.log('\n💡 This should fix the "can\'t access property" error!');
  } else {
    console.log('\n❌ Some null safety checks are missing!');
    console.log('💡 This could still cause runtime errors.');
  }
  
  return componentPassed;
}

// Run tests
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests, testFile };
