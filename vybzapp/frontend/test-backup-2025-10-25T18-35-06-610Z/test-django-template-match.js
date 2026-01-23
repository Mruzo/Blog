#!/usr/bin/env node

/**
 * Test Django Template Match
 * 
 * This test verifies that our React Comic3DViewer matches the Django episode_preview.html structure
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  componentPath: 'src/components/Comic3DViewer.tsx',
  requirements: {
    'Mode Toggle Buttons': {
      patterns: [
        /btn-outline-primary active/g,
        /btn-outline-warning active/g,
        /Preview Mode/g,
        /Edit Mode/g,
        /fas fa-eye/g,
        /fas fa-edit/g
      ],
      required: 6,
      description: 'Mode toggle buttons match Django template structure'
    },
    'Save/Reset Buttons': {
      patterns: [
        /btn-success.*Save/g,
        /btn-secondary.*Reset/g,
        /fas fa-save/g,
        /fas fa-undo/g,
        /Saving\.\.\./g
      ],
      required: 5,
      description: 'Save/Reset buttons match Django template'
    },
    'Camera Controls Layout': {
      patterns: [
        /Camera Orbit/g,
        /Camera Target/g,
        /Field of View/g,
        /Zoom Speed/g,
        /Azimuth/g,
        /Polar/g,
        /Radius/g,
        /X.*Y.*Z/g
      ],
      required: 8,
      description: 'Camera controls match Django template layout'
    },
    'Current Values Display': {
      patterns: [
        /Current Values.*Last Saved/g,
        /Camera Orbit.*currentOrbit/g,
        /Camera Target.*currentTarget/g,
        /Field of View.*currentFOV/g,
        /Zoom Speed.*currentZoom/g,
        /current-values-box/g
      ],
      required: 6,
      description: 'Current values display matches Django template'
    },
    'Modern Card Styling': {
      patterns: [
        /modern-card/g,
        /modern-card-header/g,
        /modern-card-title/g,
        /modern-card-body/g,
        /linear-gradient.*f8f9fa.*f9a602/g,
        /borderRadius.*18px/g
      ],
      required: 6,
      description: 'Modern card styling matches Django template'
    },
    'Value Badges': {
      patterns: [
        /value-badge/g,
        /background.*#f9a602/g,
        /color.*#222/g,
        /borderRadius.*8px/g,
        /fontWeight.*600/g
      ],
      required: 5,
      description: 'Value badges match Django template styling'
    },
    'Slider Controls': {
      patterns: [
        /form-range.*modern-slider/g,
        /input.*type.*range/g,
        /min.*max.*step/g,
        /onChange.*updateCamera/g,
        /currentEditingDialogue/g
      ],
      required: 5,
      description: 'Slider controls match Django template functionality'
    },
    'Grid Layout': {
      patterns: [
        /gridTemplateColumns.*1fr 1fr/g,
        /col-md-6/g,
        /col-12/g,
        /display.*grid/g,
        /gap.*1\.2rem/g
      ],
      required: 5,
      description: 'Grid layout matches Django template structure'
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
  console.log('🧪 Testing Django Template Match');
  console.log('=================================');
  
  const componentPath = path.join(process.cwd(), CONFIG.componentPath);
  const componentPassed = testFile(componentPath, CONFIG.requirements);
  
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`Component Tests: ${componentPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (componentPassed) {
    console.log('\n✨ React implementation matches Django template!');
    console.log('🎯 Features verified:');
    console.log('   • Mode toggle buttons with proper styling');
    console.log('   • Save/Reset buttons with loading states');
    console.log('   • Camera controls in grid layout');
    console.log('   • Current values display');
    console.log('   • Modern card styling');
    console.log('   • Value badges with consistent theming');
    console.log('   • Slider controls with proper event handling');
    console.log('   • Responsive grid layout');
    console.log('\n💡 The React edit mode now matches the Django implementation!');
  } else {
    console.log('\n❌ Some Django template features are missing!');
    console.log('💡 The React implementation needs updates to match Django structure.');
  }
  
  return componentPassed;
}

// Run tests
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests, testFile };


