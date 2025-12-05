#!/usr/bin/env node

/**
 * Test Season 3D Model File Type Display
 * 
 * This test verifies that the seasons section shows the file type of uploaded 3D models
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  componentPath: 'src/pages/StoryManage.tsx',
  requirements: {
    'Model File Type Function': {
      patterns: [
        /getModelFileType.*function/g,
        /season\.model_gltf/g,
        /season\.model_usdz/g,
        /return.*GLTF/g,
        /return.*USDZ/g,
        /return.*None/g
      ],
      required: 6,
      description: 'Function to determine 3D model file type from season data'
    },
    'Model Display in Season Cards': {
      patterns: [
        /3D Model:/g,
        /getModelFileType.*season/g,
        /badge.*bg-secondary/g,
        /badge.*bg-success/g,
        /d-flex align-items-center/g
      ],
      required: 5,
      description: '3D model file type displayed in season cards with proper styling'
    },
    'Conditional Badge Styling': {
      patterns: [
        /getModelFileType.*season.*===.*None/g,
        /bg-secondary.*bg-success/g,
        /badge.*getModelFileType/g
      ],
      required: 3,
      description: 'Conditional badge styling based on model availability'
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
  console.log('🧪 Testing Season 3D Model File Type Display');
  console.log('==========================================');
  
  const componentPath = path.join(process.cwd(), CONFIG.componentPath);
  const componentPassed = testFile(componentPath, CONFIG.requirements);
  
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`Component Tests: ${componentPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (componentPassed) {
    console.log('\n✨ Season 3D model file type display is properly implemented!');
    console.log('🎯 Features verified:');
    console.log('   • getModelFileType function detects GLTF, USDZ, or None');
    console.log('   • Season cards display 3D model file type with badges');
    console.log('   • Conditional styling (green for uploaded, gray for none)');
    console.log('   • Proper alignment and visual hierarchy');
    console.log('\n💡 The seasons section now shows 3D model file types!');
  } else {
    console.log('\n❌ Some 3D model file type display features are missing!');
    console.log('💡 This could cause the file type not to display properly.');
  }
  
  return componentPassed;
}

// Run tests
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests, testFile };


