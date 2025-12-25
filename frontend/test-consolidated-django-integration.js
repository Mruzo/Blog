#!/usr/bin/env node

/**
 * CONSOLIDATED DJANGO INTEGRATION TESTING SUITE
 * 
 * This consolidated test replaces 7 individual Django integration test files:
 * - test-camera-controls-django-match.js
 * - test-django-camera-pattern.js
 * - test-django-dialogue-pattern.js
 * - test-django-export-explanation.js
 * - test-django-pattern-match.js
 * - test-django-template-analysis.js
 * - test-django-template-match.js
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

console.log(`${colors.cyan}${colors.bright}🧪 CONSOLIDATED DJANGO INTEGRATION TESTING SUITE${colors.reset}`);
console.log(`${colors.blue}Testing all Django integration functionality in one comprehensive test${colors.reset}\n`);

// Test 1: Django Camera Pattern Match
function testDjangoCameraPatternMatch() {
  console.log(`${colors.yellow}1️⃣ Testing Django Camera Pattern Match...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for Django camera pattern implementation
  const hasCameraTarget = content.includes('cameraTarget');
  const hasCameraOrbit = content.includes('cameraOrbit');
  const hasFieldOfView = content.includes('fieldOfView');
  const hasAnimation = content.includes('animate(') && content.includes('cameraOrbit');
  const hasDjangoPattern = content.includes('Django pattern') || content.includes('Django implementation');
  const hasCameraValues = content.includes('camera_orbit') && content.includes('camera_target');
  
  console.log(`  ${hasCameraTarget ? '✅' : '❌'} Camera target controls`);
  console.log(`  ${hasCameraOrbit ? '✅' : '❌'} Camera orbit controls`);
  console.log(`  ${hasFieldOfView ? '✅' : '❌'} Field of view controls`);
  console.log(`  ${hasAnimation ? '✅' : '❌'} Camera animation system`);
  console.log(`  ${hasDjangoPattern ? '✅' : '❌'} Django pattern implementation`);
  console.log(`  ${hasCameraValues ? '✅' : '❌'} Camera values integration`);
  
  return hasCameraTarget && hasCameraOrbit && hasFieldOfView && hasAnimation && hasDjangoPattern && hasCameraValues;
}

// Test 2: Django Dialogue Pattern
function testDjangoDialoguePattern() {
  console.log(`${colors.yellow}2️⃣ Testing Django Dialogue Pattern...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for Django dialogue pattern
  const hasLoadDialogue = content.includes('loadDialogue');
  const hasShowDialogue = content.includes('showDialogue');
  const hasDialogueData = content.includes('dialogueData') || content.includes('episodeDialogues');
  const hasDialogueText = content.includes('currentDialogueText') || content.includes('dialogueText');
  const hasDialogueIndex = content.includes('currentDialogueIndex');
  const hasDialogueNavigation = content.includes('goToPreviousDialogue') || content.includes('goToNextDialogue');
  
  console.log(`  ${hasLoadDialogue ? '✅' : '❌'} Load dialogue function`);
  console.log(`  ${hasShowDialogue ? '✅' : '❌'} Show dialogue function`);
  console.log(`  ${hasDialogueData ? '✅' : '❌'} Dialogue data management`);
  console.log(`  ${hasDialogueText ? '✅' : '❌'} Dialogue text display`);
  console.log(`  ${hasDialogueIndex ? '✅' : '❌'} Dialogue index tracking`);
  console.log(`  ${hasDialogueNavigation ? '✅' : '❌'} Dialogue navigation`);
  
  return hasLoadDialogue && hasShowDialogue && hasDialogueData && hasDialogueText && hasDialogueIndex && hasDialogueNavigation;
}

// Test 3: Django Export Explanation
function testDjangoExportExplanation() {
  console.log(`${colors.yellow}3️⃣ Testing Django Export Explanation...${colors.reset}`);
  
  const adminPath = '/home/chris/applications/Blog/tilf/admin.py';
  const urlsPath = '/home/chris/applications/Blog/snm/urls.py';
  
  // Check for Django export functionality
  const hasAdminActions = fs.existsSync(adminPath) && fs.readFileSync(adminPath, 'utf8').includes('export_comic_stories');
  const hasUrlRouting = fs.existsSync(urlsPath) && fs.readFileSync(urlsPath, 'utf8').includes('download_export');
  const hasExportData = fs.existsSync(adminPath) && fs.readFileSync(adminPath, 'utf8').includes('export_info');
  const hasJsonResponse = fs.existsSync(adminPath) && fs.readFileSync(adminPath, 'utf8').includes('JsonResponse');
  const hasContentDisposition = fs.existsSync(adminPath) && fs.readFileSync(adminPath, 'utf8').includes('Content-Disposition');
  const hasFilename = fs.existsSync(adminPath) && fs.readFileSync(adminPath, 'utf8').includes('filename');
  
  console.log(`  ${hasAdminActions ? '✅' : '❌'} Admin export actions`);
  console.log(`  ${hasUrlRouting ? '✅' : '❌'} URL routing for exports`);
  console.log(`  ${hasExportData ? '✅' : '❌'} Export data structure`);
  console.log(`  ${hasJsonResponse ? '✅' : '❌'} JSON response handling`);
  console.log(`  ${hasContentDisposition ? '✅' : '❌'} Content-Disposition headers`);
  console.log(`  ${hasFilename ? '✅' : '❌'} Filename specification`);
  
  return hasAdminActions && hasUrlRouting && hasExportData && hasJsonResponse && hasContentDisposition && hasFilename;
}

// Test 4: Django Pattern Match
function testDjangoPatternMatch() {
  console.log(`${colors.yellow}4️⃣ Testing Django Pattern Match...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for Django pattern matching
  const hasModelViewer = content.includes('<model-viewer');
  const hasModelViewerRef = content.includes('modelViewerRef');
  const hasCameraControls = content.includes('camera-controls');
  const hasShadowIntensity = content.includes('shadow-intensity');
  const hasExposure = content.includes('exposure');
  const hasInterpolation = content.includes('interpolation');
  
  console.log(`  ${hasModelViewer ? '✅' : '❌'} Model-viewer element`);
  console.log(`  ${hasModelViewerRef ? '✅' : '❌'} Model viewer ref`);
  console.log(`  ${hasCameraControls ? '✅' : '❌'} Camera controls attribute`);
  console.log(`  ${hasShadowIntensity ? '✅' : '❌'} Shadow intensity attribute`);
  console.log(`  ${hasExposure ? '✅' : '❌'} Exposure attribute`);
  console.log(`  ${hasInterpolation ? '✅' : '❌'} Interpolation attribute`);
  
  return hasModelViewer && hasModelViewerRef && hasCameraControls && hasShadowIntensity && hasExposure && hasInterpolation;
}

// Test 5: Django Template Analysis
function testDjangoTemplateAnalysis() {
  console.log(`${colors.yellow}5️⃣ Testing Django Template Analysis...${colors.reset}`);
  
  const templatePath = '/home/chris/applications/Blog/tilf/templates/tilf/episode_preview.html';
  const viewsPath = '/home/chris/applications/Blog/tilf/views.py';
  
  // Check for Django template analysis
  const hasTemplate = fs.existsSync(templatePath);
  const hasModelGltf = hasTemplate && fs.readFileSync(templatePath, 'utf8').includes('model_gltf');
  const hasModelViewer = hasTemplate && fs.readFileSync(templatePath, 'utf8').includes('<model-viewer');
  const hasDialoguesData = hasTemplate && fs.readFileSync(templatePath, 'utf8').includes('dialogues_data');
  const hasViews = fs.existsSync(viewsPath);
  const hasEpisodePreviewView = hasViews && fs.readFileSync(viewsPath, 'utf8').includes('EpisodePreviewView');
  
  console.log(`  ${hasTemplate ? '✅' : '❌'} Django template exists`);
  console.log(`  ${hasModelGltf ? '✅' : '❌'} Model GLTF in template`);
  console.log(`  ${hasModelViewer ? '✅' : '❌'} Model-viewer in template`);
  console.log(`  ${hasDialoguesData ? '✅' : '❌'} Dialogues data in template`);
  console.log(`  ${hasViews ? '✅' : '❌'} Django views exist`);
  console.log(`  ${hasEpisodePreviewView ? '✅' : '❌'} EpisodePreviewView exists`);
  
  return hasTemplate && hasModelGltf && hasModelViewer && hasDialoguesData && hasViews && hasEpisodePreviewView;
}

// Test 6: Django Template Match
function testDjangoTemplateMatch() {
  console.log(`${colors.yellow}6️⃣ Testing Django Template Match...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for Django template matching
  const hasModelViewerAttributes = content.includes('shadow-intensity') && content.includes('exposure');
  const hasCameraOrbit = content.includes('camera-orbit');
  const hasMinMaxOrbit = content.includes('min-camera-orbit') && content.includes('max-camera-orbit');
  const hasFieldOfView = content.includes('min-field-of-view') && content.includes('max-field-of-view');
  const hasAnimation = content.includes('animation') || content.includes('crossfade');
  const hasAutoRotate = content.includes('auto-rotate') || content.includes('rotate') || content.includes('autoRotate') || content.includes('auto-rotate-delay');
  
  console.log(`  ${hasModelViewerAttributes ? '✅' : '❌'} Model-viewer attributes`);
  console.log(`  ${hasCameraOrbit ? '✅' : '❌'} Camera orbit attribute`);
  console.log(`  ${hasMinMaxOrbit ? '✅' : '❌'} Min/max camera orbit`);
  console.log(`  ${hasFieldOfView ? '✅' : '❌'} Field of view attributes`);
  console.log(`  ${hasAnimation ? '✅' : '❌'} Animation attributes`);
  console.log(`  ${hasAutoRotate ? '✅' : '❌'} Auto-rotate attributes`);
  
  return hasModelViewerAttributes && hasCameraOrbit && hasMinMaxOrbit && hasFieldOfView && hasAnimation && hasAutoRotate;
}

// Test 7: Django Data Structure Compatibility
function testDjangoDataStructureCompatibility() {
  console.log(`${colors.yellow}7️⃣ Testing Django Data Structure Compatibility...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for Django data structure compatibility
  const hasStoryStructure = content.includes('story') && content.includes('seasons') && content.includes('episodes');
  const hasDialogueStructure = content.includes('dialogue') && content.includes('character') && content.includes('text');
  const hasCameraStructure = content.includes('camera_orbit') && content.includes('camera_target') && content.includes('field_of_view');
  const hasDataFlow = content.includes('story') && content.includes('seasons');
  const hasApiIntegration = content.includes('useApi') || content.includes('apiService') || content.includes('onDialogueUpdate');
  const hasStateManagement = content.includes('useState') && content.includes('useEffect');
  
  console.log(`  ${hasStoryStructure ? '✅' : '❌'} Story structure (story → seasons → episodes)`);
  console.log(`  ${hasDialogueStructure ? '✅' : '❌'} Dialogue structure (character, text, camera)`);
  console.log(`  ${hasCameraStructure ? '✅' : '❌'} Camera structure (orbit, target, FOV)`);
  console.log(`  ${hasDataFlow ? '✅' : '❌'} Data flow management`);
  console.log(`  ${hasApiIntegration ? '✅' : '❌'} API integration`);
  console.log(`  ${hasStateManagement ? '✅' : '❌'} State management`);
  
  return hasStoryStructure && hasDialogueStructure && hasCameraStructure && hasDataFlow && hasApiIntegration && hasStateManagement;
}

// Run all tests
function runAllTests() {
  console.log(`${colors.cyan}${colors.bright}📊 CONSOLIDATED DJANGO INTEGRATION TEST RESULTS${colors.reset}\n`);
  
  const tests = [
    { name: 'Django Camera Pattern Match', fn: testDjangoCameraPatternMatch },
    { name: 'Django Dialogue Pattern', fn: testDjangoDialoguePattern },
    { name: 'Django Export Explanation', fn: testDjangoExportExplanation },
    { name: 'Django Pattern Match', fn: testDjangoPatternMatch },
    { name: 'Django Template Analysis', fn: testDjangoTemplateAnalysis },
    { name: 'Django Template Match', fn: testDjangoTemplateMatch },
    { name: 'Django Data Structure Compatibility', fn: testDjangoDataStructureCompatibility }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  tests.forEach(test => {
    const result = test.fn();
    if (result) passed++;
    console.log('');
  });
  
  console.log(`${colors.cyan}${colors.bright}📊 CONSOLIDATED TEST SUMMARY${colors.reset}`);
  console.log(`${colors.blue}Total Tests: ${total}${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${total - passed}${colors.reset}`);
  console.log(`${colors.yellow}Pass Rate: ${((passed / total) * 100).toFixed(1)}%${colors.reset}`);
  
  if (passed === total) {
    console.log(`\n${colors.green}${colors.bright}🎉 ALL DJANGO INTEGRATION TESTS PASSED!${colors.reset}`);
    console.log(`${colors.blue}Consolidated test successfully replaces 7 individual test files${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}⚠️ Some Django integration tests failed${colors.reset}`);
    console.log(`${colors.yellow}Review the failed tests above${colors.reset}`);
  }
  
  return passed === total;
}

// Execute tests
runAllTests();
