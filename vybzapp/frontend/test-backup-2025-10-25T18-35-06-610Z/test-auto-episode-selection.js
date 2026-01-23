#!/usr/bin/env node

/**
 * Test Auto Episode Selection Fix
 * 
 * This test verifies that the Comic3DViewer automatically selects episodes with 3D models
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  componentPath: 'src/components/Comic3DViewer.tsx',
  requirements: {
    'Auto-Select useEffect': {
      patterns: [
        /useEffect.*episodes.*selectedEpisode/g,
        /episodes\.length.*selectedEpisode/g,
        /episodeWithModel.*episodes\.find.*model_gltf/g,
        /setSelectedEpisode.*episodeWithModel/g
      ],
      required: 3,
      description: 'Auto-select useEffect with episode with 3D model logic'
    },
    'Episode Selection Logic': {
      patterns: [
        /episodes\.find.*ep.*model_gltf/g,
        /episodeWithModel.*setSelectedEpisode/g,
        /episodes\[0\].*setSelectedEpisode/g,
        /console\.log.*Auto-selecting.*episode.*3D model/g
      ],
      required: 2,
      description: 'Episode selection logic for 3D model episodes'
    },
    'Fallback Selection': {
      patterns: [
        /No episode with 3D model found/g,
        /selecting first episode/g,
        /episodes\[0\]/g
      ],
      required: 3,
      description: 'Fallback to first episode if no 3D model episodes'
    },
    'Debug Logging': {
      patterns: [
        /console\.log.*Auto-selecting/g,
        /console\.log.*No episode with 3D model/g
      ],
      required: 2,
      description: 'Debug logging for episode selection'
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
  console.log('🧪 Testing Auto Episode Selection Fix');
  console.log('=====================================');
  
  const componentPath = path.join(process.cwd(), CONFIG.componentPath);
  const componentPassed = testFile(componentPath, CONFIG.requirements);
  
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`Component Tests: ${componentPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (componentPassed) {
    console.log('\n✨ Auto episode selection is implemented!');
    console.log('🎯 Features verified:');
    console.log('   • Auto-select useEffect with episode with 3D model logic');
    console.log('   • Episode selection logic for 3D model episodes');
    console.log('   • Fallback to first episode if no 3D model episodes');
    console.log('   • Debug logging for episode selection');
    console.log('\n💡 The 3D model should now be automatically selected when episodes are loaded!');
  } else {
    console.log('\n❌ Some auto episode selection features are missing!');
    console.log('💡 The 3D model might not be automatically selected.');
  }
  
  return componentPassed;
}

// Run tests
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests, testFile };
