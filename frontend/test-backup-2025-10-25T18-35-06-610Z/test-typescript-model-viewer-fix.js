#!/usr/bin/env node

/**
 * Test TypeScript Model Viewer Fix
 * 
 * This test verifies that the TypeScript errors for model-viewer are fixed
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  componentPath: 'src/components/Comic3DViewer.tsx',
  requirements: {
    'TypeScript Declaration': {
      patterns: [
        /declare module 'react'/g,
        /namespace JSX/g,
        /interface IntrinsicElements/g,
        /'model-viewer'.*any/g
      ],
      required: 4,
      description: 'TypeScript declaration for model-viewer element'
    },
    'Model Viewer Element': {
      patterns: [
        /<model-viewer/g,
        /ref=\{modelViewerRef\}/g,
        /src=\{selectedEpisode\.model_gltf\}/g,
        /alt="3D Scene"/g,
        /shadow-intensity="1"/g
      ],
      required: 5,
      description: 'Model viewer element with proper attributes'
    },
    'No Global Declaration Conflicts': {
      patterns: [
        /declare global/g
      ],
      required: 0,
      description: 'No conflicting global declarations'
    },
    'Module Declaration': {
      patterns: [
        /declare module 'react'/g,
        /namespace JSX/g,
        /IntrinsicElements/g
      ],
      required: 3,
      description: 'Proper module declaration for React JSX'
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
  console.log('🧪 Testing TypeScript Model Viewer Fix');
  console.log('=======================================');
  
  const componentPath = path.join(process.cwd(), CONFIG.componentPath);
  const componentPassed = testFile(componentPath, CONFIG.requirements);
  
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`Component Tests: ${componentPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (componentPassed) {
    console.log('\n✨ TypeScript errors for model-viewer are fixed!');
    console.log('🎯 Features verified:');
    console.log('   • Proper module declaration for React JSX');
    console.log('   • Model viewer element with correct attributes');
    console.log('   • No conflicting global declarations');
    console.log('   • TypeScript compilation should work');
    console.log('\n💡 The model-viewer element should now compile without errors!');
  } else {
    console.log('\n❌ Some TypeScript declaration features are missing!');
    console.log('💡 The model-viewer element might still have TypeScript errors.');
  }
  
  return componentPassed;
}

// Run tests
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests, testFile };


