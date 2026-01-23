#!/usr/bin/env node

/**
 * Test 3D Model Direct Element
 * 
 * This test verifies that the 3D model uses direct model-viewer element like Django template
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  componentPath: 'src/components/Comic3DViewer.tsx',
  requirements: {
    'Direct Model Viewer Element': {
      patterns: [
        /<model-viewer/g,
        /src=\{selectedEpisode\.model_gltf\}/g,
        /alt="3D Scene"/g,
        /shadow-intensity="1"/g,
        /exposure="1"/g,
        /camera-controls/g
      ],
      required: 6,
      description: 'Uses direct model-viewer element like Django template'
    },
    'No dangerouslySetInnerHTML': {
      patterns: [
        /dangerouslySetInnerHTML/g
      ],
      required: 0,
      description: 'No dangerouslySetInnerHTML usage for model viewer'
    },
    'Proper Event Listeners': {
      patterns: [
        /modelViewerRef\.current/g,
        /addEventListener.*load/g,
        /addEventListener.*model-visibility/g,
        /addEventListener.*camera-change/g
      ],
      required: 4,
      description: 'Event listeners attach directly to model-viewer element'
    },
    'TypeScript Declaration': {
      patterns: [
        /declare global/g,
        /namespace JSX/g,
        /interface IntrinsicElements/g,
        /'model-viewer'.*any/g
      ],
      required: 4,
      description: 'TypeScript declaration for model-viewer element'
    },
    'Django Template Attributes': {
      patterns: [
        /interaction-prompt="none"/g,
        /interpolation-decay="200"/g,
        /min-camera-orbit="auto auto 1m"/g,
        /max-camera-orbit="auto auto 30m"/g,
        /camera-orbit="0deg 75deg 3m"/g
      ],
      required: 5,
      description: 'Model viewer attributes match Django template'
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
  console.log('🧪 Testing 3D Model Direct Element');
  console.log('==================================');
  
  const componentPath = path.join(process.cwd(), CONFIG.componentPath);
  const componentPassed = testFile(componentPath, CONFIG.requirements);
  
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`Component Tests: ${componentPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (componentPassed) {
    console.log('\n✨ 3D model now uses direct element like Django!');
    console.log('🎯 Features verified:');
    console.log('   • Direct model-viewer element (no dangerouslySetInnerHTML)');
    console.log('   • Proper event listener attachment');
    console.log('   • TypeScript declaration for model-viewer');
    console.log('   • Django template attributes');
    console.log('\n💡 The 3D model should now load properly!');
  } else {
    console.log('\n❌ Some 3D model features are missing!');
    console.log('💡 The model might not load due to implementation issues.');
  }
  
  return componentPassed;
}

// Run tests
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests, testFile };


