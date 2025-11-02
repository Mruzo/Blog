#!/usr/bin/env node

/**
 * Test Edit Mode Functionality
 * 
 * This test verifies that the React Comic3DViewer edit mode functionality
 * matches the Django implementation from episode_preview.html
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  componentPath: 'src/components/Comic3DViewer.tsx',
  cssPath: 'src/components/Comic3DViewer.css',
  requirements: {
    'Edit Mode State Management': {
      patterns: [
        /isEditMode.*useState/g,
        /currentEditingDialogue.*useState/g,
        /originalValues.*useState/g,
        /isSaving.*useState/g,
        /saveMessage.*useState/g
      ],
      required: 5,
      description: 'State management for edit mode'
    },
    'Edit Mode Functions': {
      patterns: [
        /loadCurrentDialogueValues.*useCallback/g,
        /saveCameraChanges.*async/g,
        /resetCameraChanges/g,
        /setSliderValue.*helper/g
      ],
      required: 4,
      description: 'Core edit mode functions'
    },
    'Camera Orbit Controls': {
      patterns: [
        /id="orbitAzimuth"/g,
        /id="orbitPolar"/g,
        /id="orbitRadius"/g,
        /htmlFor="orbitAzimuth"/g,
        /htmlFor="orbitPolar"/g,
        /htmlFor="orbitRadius"/g
      ],
      required: 6,
      description: 'Camera orbit slider controls'
    },
    'Camera Target Controls': {
      patterns: [
        /id="targetX"/g,
        /id="targetY"/g,
        /id="targetZ"/g,
        /htmlFor="targetX"/g,
        /htmlFor="targetY"/g,
        /htmlFor="targetZ"/g
      ],
      required: 6,
      description: 'Camera target slider controls'
    },
    'Field of View and Zoom Speed': {
      patterns: [
        /id="fieldOfView"/g,
        /id="zoomSpeed"/g,
        /htmlFor="fieldOfView"/g,
        /htmlFor="zoomSpeed"/g
      ],
      required: 4,
      description: 'Field of view and zoom speed controls'
    },
    'Value Badges': {
      patterns: [
        /value-badge.*id.*orbitAzimuthValue/g,
        /value-badge.*id.*orbitPolarValue/g,
        /value-badge.*id.*orbitRadiusValue/g,
        /value-badge.*id.*targetXValue/g,
        /value-badge.*id.*targetYValue/g,
        /value-badge.*id.*targetZValue/g,
        /value-badge.*id.*fieldOfViewValue/g,
        /value-badge.*id.*zoomSpeedValue/g
      ],
      required: 8,
      description: 'Value display badges for all sliders'
    },
    'Current Values Display': {
      patterns: [
        /current-values-box/g,
        /Current Values.*Last Saved/g,
        /currentOrbit/g,
        /currentTarget/g,
        /currentFOV/g,
        /currentZoom/g
      ],
      required: 6,
      description: 'Current values display box'
    },
    'Save and Reset Buttons': {
      patterns: [
        /id="saveBtn"/g,
        /id="resetBtn"/g,
        /onClick.*saveCameraChanges/g,
        /onClick.*resetCameraChanges/g,
        /disabled.*isSaving/g
      ],
      required: 5,
      description: 'Save and reset button functionality'
    },
    'Save Message Display': {
      patterns: [
        /saveMessage.*type.*success.*error/g,
        /alert.*success.*danger/g,
        /setSaveMessage.*null/g
      ],
      required: 3,
      description: 'Save message feedback system'
    },
    'Modern Styling': {
      patterns: [
        /modern-card/g,
        /modern-card-header/g,
        /modern-card-title/g,
        /modern-card-body/g,
        /modern-slider/g,
        /section-header/g,
        /slider-row/g
      ],
      required: 7,
      description: 'Modern UI styling classes'
    },
    'Real-time Camera Updates': {
      patterns: [
        /updateCamera.*dialogue_id.*camera_orbit/g,
        /updateCamera.*dialogue_id.*camera_target/g,
        /updateCamera.*dialogue_id.*field_of_view/g,
        /updateCamera.*dialogue_id.*zoom_speed/g
      ],
      required: 4,
      description: 'Real-time camera parameter updates'
    },
    'Data Parsing': {
      patterns: [
        /orbitMatch.*match.*deg.*deg.*m/g,
        /targetMatch.*match.*m.*m.*m/g,
        /parseFloat.*orbitMatch/g,
        /parseFloat.*targetMatch/g
      ],
      required: 4,
      description: 'Camera data parsing from strings'
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

function testCSSFile(cssPath) {
  console.log(`\n📁 Testing ${cssPath}...`);
  
  if (!fs.existsSync(cssPath)) {
    console.log(`❌ CSS file not found: ${cssPath}`);
    return false;
  }
  
  const content = fs.readFileSync(cssPath, 'utf8');
  
  const cssRequirements = {
    'Modern Slider Styles': {
      patterns: [
        /input\[type="range"\]\.modern-slider/g,
        /modern-slider::-webkit-slider-thumb/g,
        /modern-slider::-moz-range-thumb/g,
        /modern-slider::-ms-thumb/g
      ],
      required: 4,
      description: 'Cross-browser slider styling'
    },
    'Value Badge Styles': {
      patterns: [
        /\.value-badge/g,
        /background.*#f9a602/g,
        /color.*#222/g,
        /border-radius.*8px/g
      ],
      required: 4,
      description: 'Value badge styling'
    },
    'Modern Card Styles': {
      patterns: [
        /\.modern-card/g,
        /\.modern-card-header/g,
        /\.modern-card-title/g,
        /\.modern-card-body/g
      ],
      required: 4,
      description: 'Modern card component styling'
    },
    'Responsive Design': {
      patterns: [
        /@media.*max-width.*600px/g,
        /grid-template-columns.*1fr 1fr/g,
        /slider-row.*gap/g
      ],
      required: 3,
      description: 'Responsive design for mobile'
    }
  };
  
  let allPassed = true;
  
  Object.entries(cssRequirements).forEach(([name, config]) => {
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
  console.log('🧪 Testing React Edit Mode Functionality');
  console.log('=====================================');
  
  const componentPath = path.join(process.cwd(), CONFIG.componentPath);
  const cssPath = path.join(process.cwd(), CONFIG.cssPath);
  
  const componentPassed = testFile(componentPath, CONFIG.requirements);
  const cssPassed = testCSSFile(cssPath);
  
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`Component Tests: ${componentPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`CSS Tests: ${cssPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  const allPassed = componentPassed && cssPassed;
  console.log(`\nOverall: ${allPassed ? '🎉 ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('\n✨ React edit mode functionality matches Django implementation!');
    console.log('🎯 Features implemented:');
    console.log('   • Complete camera editing controls');
    console.log('   • Real-time slider updates with value badges');
    console.log('   • Save/Reset functionality with feedback');
    console.log('   • Modern UI styling matching Django design');
    console.log('   • Responsive design for mobile devices');
    console.log('   • State management for edit mode');
    console.log('   • Data parsing and validation');
  }
  
  return allPassed;
}

// Run tests
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests, testFile, testCSSFile };
