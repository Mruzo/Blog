#!/usr/bin/env node

/**
 * Comic3DViewer Features Comparison Test
 * 
 * Compares React Comic3DViewer implementation with Django episode_preview.html features
 * 
 * Usage: node test-comic3dviewer-features.js
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Files to compare
const REACT_FILE = 'src/components/Comic3DViewer.tsx';
const DJANGO_FILE = '/home/chris/applications/Blog/tilf/templates/tilf/episode_preview.html';

// Features from Django template that should be implemented in React
const FEATURES = {
  '3D Model Viewer': {
    patterns: [
      /model-viewer|data-model-viewer/g,
      /data-src.*model_gltf/g,
      /camera-orbit/g,
      /camera-target/g,
      /field-of-view/g,
      /camera-controls/g
    ],
    required: 4,
    description: '3D model display with camera controls'
  },
  'Dialogue Management': {
    patterns: [
      /dialogue.*character.*text/g,
      /speech-bubble/g,
      /currentDialogueIndex/g,
      /episodeDialogues/g,
      /showDialogue/g
    ],
    required: 3,
    description: 'Dialogue display and management system'
  },
  'Camera Controls': {
    patterns: [
      /camera.*orbit/g,
      /camera.*target/g,
      /field.*of.*view/g,
      /zoom.*speed/g,
      /updateCamera/g
    ],
    required: 3,
    description: 'Camera positioning and movement controls'
  },
  'Animation System': {
    patterns: [
      /isPlaying/g,
      /playIntervalRef/g,
      /startEpisode/g,
      /pausePlayback/g,
      /playSpeed/g,
      /setInterval/g
    ],
    required: 4,
    description: 'Auto-play and animation system'
  },
  'Hotspot System': {
    patterns: [
      /pointer.*svg/g,
      /pointer.*path/g,
      /head_[xyz]/g,
      /hotspot/g
    ],
    required: 2,
    description: 'Interactive hotspots and pointer system'
  },
  'Navigation Controls': {
    patterns: [
      /goToPrevious/g,
      /goToNext/g,
      /prevButton|nextButton/g,
      /playButton/g,
      /togglePlay/g
    ],
    required: 4,
    description: 'Episode and dialogue navigation'
  },
  'Auto-play Functionality': {
    patterns: [
      /auto.*play/g,
      /play.*speed/g,
      /speed.*btn/g,
      /1x.*1\.5x/g,
      /setPlaySpeed/g
    ],
    required: 3,
    description: 'Auto-play with speed controls'
  },
  'Edit Mode': {
    patterns: [
      /isEditMode/g,
      /edit.*mode/g,
      /preview.*mode/g,
      /edit.*controls/g,
      /camera.*editing/g
    ],
    required: 3,
    description: 'Edit mode for camera adjustments'
  },
  'Progress Tracking': {
    patterns: [
      /progress.*bar/g,
      /currentDialogueIndex/g,
      /episodeDialogues\.length/g,
      /progress.*text/g
    ],
    required: 3,
    description: 'Progress tracking and display'
  },
  'Episode Summary': {
    patterns: [
      /isShowingSummary/g,
      /episode.*summary/g,
      /summary.*overlay/g,
      /episode.*description/g
    ],
    required: 2,
    description: 'Episode summary display'
  },
  'Mode Toggle': {
    patterns: [
      /Preview Mode/g,
      /Edit Mode/g,
      /mode.*toggle/g,
      /btn.*group.*mode/g,
      /isEditMode/g
    ],
    required: 2,
    description: 'Preview/Edit mode toggle'
  },
  'Start Button': {
    patterns: [
      /Start Episode/g,
      /start.*episode/g,
      /overlay.*container/g,
      /startButton/g,
      /fas fa-play/g
    ],
    required: 2,
    description: 'Start episode button with overlay'
  }
};

// Test results
let testResults = {
  totalFeatures: Object.keys(FEATURES).length,
  implementedFeatures: 0,
  missingFeatures: 0,
  details: {},
  issues: []
};

// Analyze file content
function analyzeFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`${colors.red}❌ File not found: ${filePath}${colors.reset}`);
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  return {
    content,
    lines,
    lineCount: lines.length
  };
}

// Test a specific feature
function testFeature(featureName, feature, content) {
  const { patterns, required, description } = feature;
  let totalMatches = 0;
  const foundPatterns = [];
  
  patterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      totalMatches += matches.length;
      foundPatterns.push(`${pattern.source}: ${matches.length}`);
    }
  });
  
  const implemented = totalMatches >= required;
  const status = implemented ? '✅' : '❌';
  const color = implemented ? colors.green : colors.red;
  
  console.log(`${status} ${color}${featureName}${colors.reset}: ${totalMatches}/${required} (${description})`);
  
  if (foundPatterns.length > 0) {
    foundPatterns.forEach(pattern => {
      console.log(`    ${colors.cyan}  ${pattern}${colors.reset}`);
    });
  }
  
  if (!implemented) {
    testResults.issues.push(`${featureName}: Only ${totalMatches}/${required} patterns found`);
  }
  
  testResults.details[featureName] = {
    implemented,
    found: totalMatches,
    required,
    patterns: foundPatterns
  };
  
  if (implemented) {
    testResults.implementedFeatures++;
  } else {
    testResults.missingFeatures++;
  }
  
  return implemented;
}

// Check for missing critical features
function checkMissingFeatures(content) {
  const issues = [];
  
  // Check for model-viewer element
  if (!content.includes('model-viewer') && !content.includes('data-model-viewer')) {
    issues.push('Missing model-viewer element for 3D display');
  }
  
  // Check for dialogue management
  if (!content.includes('dialogue') && !content.includes('speech-bubble')) {
    issues.push('Missing dialogue management system');
  }
  
  // Check for camera controls
  if (!content.includes('camera') && !content.includes('orbit') && !content.includes('target')) {
    issues.push('Missing camera control system');
  }
  
  // Check for navigation
  if (!content.includes('goToPrevious') && !content.includes('goToNext')) {
    issues.push('Missing navigation controls');
  }
  
  // Check for edit mode
  if (!content.includes('isEditMode') && !content.includes('editMode')) {
    issues.push('Missing edit mode functionality');
  }
  
  return issues;
}

// Main test function
function runComic3DViewerFeaturesTest() {
  console.log(`${colors.blue}${colors.bold}🧪 Comic3DViewer Features Test${colors.reset}`);
  console.log(`${colors.cyan}Comparing React implementation with Django episode_preview.html features${colors.reset}\n`);
  
  // Analyze React file
  const reactAnalysis = analyzeFile(path.join(__dirname, REACT_FILE));
  if (!reactAnalysis) {
    process.exit(1);
  }
  
  const { content: reactContent, lineCount: reactLines } = reactAnalysis;
  
  console.log(`${colors.yellow}React File: ${REACT_FILE} (${reactLines} lines)${colors.reset}\n`);
  
  // Test each feature
  Object.entries(FEATURES).forEach(([featureName, feature]) => {
    testFeature(featureName, feature, reactContent);
  });
  
  // Check for missing critical features
  const issues = checkMissingFeatures(reactContent);
  if (issues.length > 0) {
    console.log(`\n${colors.red}${colors.bold}Critical Issues Found:${colors.reset}`);
    issues.forEach(issue => {
      console.log(`  ⚠️  ${issue}`);
      testResults.issues.push(issue);
    });
  }
  
  // Generate summary
  console.log(`\n${colors.blue}${colors.bold}📊 Feature Implementation Summary${colors.reset}`);
  console.log(`${colors.cyan}Total Features: ${testResults.totalFeatures}${colors.reset}`);
  console.log(`${colors.green}Implemented: ${testResults.implementedFeatures}${colors.reset}`);
  console.log(`${colors.red}Missing: ${testResults.missingFeatures}${colors.reset}`);
  
  const implementationRate = ((testResults.implementedFeatures / testResults.totalFeatures) * 100).toFixed(1);
  console.log(`${colors.yellow}Implementation Rate: ${implementationRate}%${colors.reset}`);
  
  // Overall assessment
  if (testResults.missingFeatures === 0 && testResults.issues.length === 0) {
    console.log(`\n${colors.green}${colors.bold}🎉 All features are fully implemented!${colors.reset}`);
    console.log(`${colors.cyan}React Comic3DViewer matches Django episode_preview.html functionality.${colors.reset}`);
    return true;
  } else if (testResults.implementedFeatures >= testResults.totalFeatures * 0.8) {
    console.log(`\n${colors.yellow}${colors.bold}⚠️  Most features implemented (${implementationRate}%)${colors.reset}`);
    console.log(`${colors.cyan}Some features may need refinement.${colors.reset}`);
    return false;
  } else {
    console.log(`\n${colors.red}${colors.bold}❌ Significant features missing (${implementationRate}%)${colors.reset}`);
    console.log(`${colors.cyan}Major development needed to match Django functionality.${colors.reset}`);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  const success = runComic3DViewerFeaturesTest();
  process.exit(success ? 0 : 1);
}

module.exports = { runComic3DViewerFeaturesTest, testFeature, checkMissingFeatures };
