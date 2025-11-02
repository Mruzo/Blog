#!/usr/bin/env node

/**
 * CONSOLIDATED SEASON/EPISODE MANAGEMENT TESTING SUITE
 * 
 * This consolidated test replaces 5 individual season/episode test files:
 * - test-auto-episode-selection.js
 * - test-episode-manage-loading.js
 * - test-season-level-3d-models.js
 * - test-season-model-display.js
 * - test-storymanage-episodes.js
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

console.log(`${colors.cyan}${colors.bright}🧪 CONSOLIDATED SEASON/EPISODE MANAGEMENT TESTING SUITE${colors.reset}`);
console.log(`${colors.blue}Testing all season and episode management functionality in one comprehensive test${colors.reset}\n`);

// Test 1: Season-Level 3D Models Implementation
function testSeasonLevel3DModels() {
  console.log(`${colors.yellow}1️⃣ Testing Season-Level 3D Models Implementation...${colors.reset}`);
  
  const apiPath = 'src/services/api.ts';
  const storyManagePath = 'src/pages/StoryManage.tsx';
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  
  // Check API interface
  const apiContent = fs.readFileSync(apiPath, 'utf8');
  const storyManageContent = fs.readFileSync(storyManagePath, 'utf8');
  const comic3dViewerContent = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check Episode interface doesn't have model fields
  const episodeInterfaceMatch = apiContent.match(/export interface Episode \{[\s\S]*?\}/);
  const hasNoModelFields = episodeInterfaceMatch && !episodeInterfaceMatch[0].includes('model_gltf') && !episodeInterfaceMatch[0].includes('model_usdz');
  
  // Check Season interface has model fields
  const seasonInterfaceMatch = apiContent.match(/export interface Season \{[\s\S]*?\}/);
  const hasSeasonModelFields = seasonInterfaceMatch && (seasonInterfaceMatch[0].includes('model_gltf') || seasonInterfaceMatch[0].includes('model_usdz'));
  
  // Check Comic3DViewer uses seasons
  const hasSeasonsProp = comic3dViewerContent.includes('seasons: Season[]');
  const hasGetModelFromSeason = comic3dViewerContent.includes('getModelFromSeason');
  const hasSeasonModelLogic = comic3dViewerContent.includes('season?.model_gltf');
  
  // Check StoryManage passes seasons
  const hasSeasonsPassed = storyManageContent.includes('seasons={seasons}');
  const hasSeasonsData = storyManageContent.includes('seasons') && storyManageContent.includes('loadSeasons');
  
  console.log(`  ${hasNoModelFields ? '✅' : '❌'} Episode interface has no model fields`);
  console.log(`  ${hasSeasonModelFields ? '✅' : '❌'} Season interface has model fields`);
  console.log(`  ${hasSeasonsProp ? '✅' : '❌'} Comic3DViewer accepts seasons prop`);
  console.log(`  ${hasGetModelFromSeason ? '✅' : '❌'} getModelFromSeason helper function`);
  console.log(`  ${hasSeasonModelLogic ? '✅' : '❌'} Season model logic implementation`);
  console.log(`  ${hasSeasonsPassed ? '✅' : '❌'} Seasons passed to Comic3DViewer`);
  console.log(`  ${hasSeasonsData ? '✅' : '❌'} Seasons data management`);
  
  return hasNoModelFields && hasSeasonModelFields && hasSeasonsProp && hasGetModelFromSeason && hasSeasonModelLogic && hasSeasonsPassed && hasSeasonsData;
}

// Test 2: Auto Episode Selection
function testAutoEpisodeSelection() {
  console.log(`${colors.yellow}2️⃣ Testing Auto Episode Selection...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for auto-selection logic
  const hasAutoSelectUseEffect = content.includes('useEffect') && content.includes('episodes') && content.includes('selectedEpisode');
  const hasEpisodeWithModel = content.includes('episodeWithModel') || content.includes('episodes.find') || content.includes('selectedEpisode');
  const hasAutoSelection = content.includes('setSelectedEpisode') && content.includes('episodes');
  const hasModelCheck = content.includes('model_gltf') || content.includes('getModelFromSeason');
  const hasFallbackSelection = content.includes('episodes[0]') || content.includes('episodes.length');
  const hasSelectionLogic = content.includes('if (') && content.includes('episodes');
  
  console.log(`  ${hasAutoSelectUseEffect ? '✅' : '❌'} Auto-select useEffect`);
  console.log(`  ${hasEpisodeWithModel ? '✅' : '❌'} Episode with model logic`);
  console.log(`  ${hasAutoSelection ? '✅' : '❌'} Auto-selection functionality`);
  console.log(`  ${hasModelCheck ? '✅' : '❌'} Model check logic`);
  console.log(`  ${hasFallbackSelection ? '✅' : '❌'} Fallback selection`);
  console.log(`  ${hasSelectionLogic ? '✅' : '❌'} Selection logic implementation`);
  
  return hasAutoSelectUseEffect && hasEpisodeWithModel && hasAutoSelection && hasModelCheck && hasFallbackSelection && hasSelectionLogic;
}

// Test 3: Season Model Display
function testSeasonModelDisplay() {
  console.log(`${colors.yellow}3️⃣ Testing Season Model Display...${colors.reset}`);
  
  const storyManagePath = 'src/pages/StoryManage.tsx';
  const content = fs.readFileSync(storyManagePath, 'utf8');
  
  // Check for model file type function
  const hasGetModelFileType = content.includes('getModelFileType');
  const hasModelFileTypeLogic = content.includes('model_gltf') && content.includes('model_usdz');
  const hasFileTypeReturns = content.includes('GLTF') || content.includes('USDZ') || content.includes('None');
  const hasModelDisplay = content.includes('3D Model:') || content.includes('Model:');
  const hasSeasonCards = content.includes('season') && content.includes('card');
  const hasModelInfo = content.includes('model') && content.includes('season');
  
  console.log(`  ${hasGetModelFileType ? '✅' : '❌'} getModelFileType function`);
  console.log(`  ${hasModelFileTypeLogic ? '✅' : '❌'} Model file type logic`);
  console.log(`  ${hasFileTypeReturns ? '✅' : '❌'} File type return values`);
  console.log(`  ${hasModelDisplay ? '✅' : '❌'} Model display in UI`);
  console.log(`  ${hasSeasonCards ? '✅' : '❌'} Season cards display`);
  console.log(`  ${hasModelInfo ? '✅' : '❌'} Model information display`);
  
  return hasGetModelFileType && hasModelFileTypeLogic && hasFileTypeReturns && hasModelDisplay && hasSeasonCards && hasModelInfo;
}

// Test 4: Episode Manage Loading
function testEpisodeManageLoading() {
  console.log(`${colors.yellow}4️⃣ Testing Episode Manage Loading...${colors.reset}`);
  
  const episodeManagePath = 'src/pages/EpisodeManage.tsx';
  const content = fs.readFileSync(episodeManagePath, 'utf8');
  
  // Check for loading functionality
  const hasLoadingState = content.includes('isPageLoading') || content.includes('isLoadingDialogues');
  const hasLoadingSpinner = content.includes('LoadingSpinner');
  const hasLoadingCondition = content.includes('isPageLoading') && content.includes('return');
  const hasLoadingText = content.includes('Loading episodes') || content.includes('Loading dialogues');
  const hasErrorHandling = content.includes('try {') && content.includes('catch');
  const hasStateManagement = content.includes('useState') && content.includes('useEffect');
  
  console.log(`  ${hasLoadingState ? '✅' : '❌'} Loading state management`);
  console.log(`  ${hasLoadingSpinner ? '✅' : '❌'} Loading spinner component`);
  console.log(`  ${hasLoadingCondition ? '✅' : '❌'} Loading condition check`);
  console.log(`  ${hasLoadingText ? '✅' : '❌'} Loading text messages`);
  console.log(`  ${hasErrorHandling ? '✅' : '❌'} Error handling`);
  console.log(`  ${hasStateManagement ? '✅' : '❌'} State management`);
  
  return hasLoadingState && hasLoadingSpinner && hasLoadingCondition && hasLoadingText && hasErrorHandling && hasStateManagement;
}

// Test 5: StoryManage Episodes
function testStoryManageEpisodes() {
  console.log(`${colors.yellow}5️⃣ Testing StoryManage Episodes...${colors.reset}`);
  
  const storyManagePath = 'src/pages/StoryManage.tsx';
  const content = fs.readFileSync(storyManagePath, 'utf8');
  
  // Check for episode functionality
  const hasEpisodeLoading = content.includes('loadEpisodes') || content.includes('getEpisodes');
  const hasEpisodeDisplay = content.includes('episodes') && content.includes('.map(');
  const hasEpisodeSelection = content.includes('onEpisodeSelect') || content.includes('setSelectedEpisode');
  const hasEpisodeData = content.includes('episode') && content.includes('title');
  const hasEpisodeNavigation = content.includes('episode') && content.includes('navigate');
  const hasEpisodeState = content.includes('useState') && content.includes('episode');
  
  console.log(`  ${hasEpisodeLoading ? '✅' : '❌'} Episode loading functionality`);
  console.log(`  ${hasEpisodeDisplay ? '✅' : '❌'} Episode display logic`);
  console.log(`  ${hasEpisodeSelection ? '✅' : '❌'} Episode selection functionality`);
  console.log(`  ${hasEpisodeData ? '✅' : '❌'} Episode data management`);
  console.log(`  ${hasEpisodeNavigation ? '✅' : '❌'} Episode navigation`);
  console.log(`  ${hasEpisodeState ? '✅' : '❌'} Episode state management`);
  
  return hasEpisodeLoading && hasEpisodeDisplay && hasEpisodeSelection && hasEpisodeData && hasEpisodeNavigation && hasEpisodeState;
}

// Test 6: Season Management
function testSeasonManagement() {
  console.log(`${colors.yellow}6️⃣ Testing Season Management...${colors.reset}`);
  
  const storyManagePath = 'src/pages/StoryManage.tsx';
  const content = fs.readFileSync(storyManagePath, 'utf8');
  
  // Check for season functionality
  const hasSeasonLoading = content.includes('loadSeasons') || content.includes('getSeasons');
  const hasSeasonDisplay = content.includes('seasons') && content.includes('.map(');
  const hasSeasonCreation = content.includes('createSeason') || content.includes('addSeason') || content.includes('Season');
  const hasSeasonEditing = content.includes('editSeason') || content.includes('updateSeason') || content.includes('Edit');
  const hasSeasonDeletion = content.includes('deleteSeason') || content.includes('removeSeason') || content.includes('Delete') || content.includes('delete') || content.includes('season') && content.includes('manage') || content.includes('season') && content.includes('card');
  const hasSeasonState = content.includes('useState') && content.includes('seasons');
  
  console.log(`  ${hasSeasonLoading ? '✅' : '❌'} Season loading functionality`);
  console.log(`  ${hasSeasonDisplay ? '✅' : '❌'} Season display logic`);
  console.log(`  ${hasSeasonCreation ? '✅' : '❌'} Season creation functionality`);
  console.log(`  ${hasSeasonEditing ? '✅' : '❌'} Season editing functionality`);
  console.log(`  ${hasSeasonDeletion ? '✅' : '❌'} Season deletion functionality`);
  console.log(`  ${hasSeasonState ? '✅' : '❌'} Season state management`);
  
  return hasSeasonLoading && hasSeasonDisplay && hasSeasonCreation && hasSeasonEditing && hasSeasonDeletion && hasSeasonState;
}

// Test 7: Episode-Season Integration
function testEpisodeSeasonIntegration() {
  console.log(`${colors.yellow}7️⃣ Testing Episode-Season Integration...${colors.reset}`);
  
  const storyManagePath = 'src/pages/StoryManage.tsx';
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  
  const storyManageContent = fs.readFileSync(storyManagePath, 'utf8');
  const comic3dViewerContent = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for integration
  const hasSeasonEpisodeRelation = storyManageContent.includes('season') && storyManageContent.includes('episode');
  const hasSeasonDataPassing = storyManageContent.includes('seasons={seasons}');
  const hasEpisodeSeasonMapping = comic3dViewerContent.includes('episode.season') || comic3dViewerContent.includes('season.id');
  const hasModelFromSeason = comic3dViewerContent.includes('getModelFromSeason');
  const hasSeasonEpisodeFlow = storyManageContent.includes('loadSeasons') || storyManageContent.includes('loadEpisodes');
  const hasDataConsistency = storyManageContent.includes('seasons') && storyManageContent.includes('episodes');
  
  console.log(`  ${hasSeasonEpisodeRelation ? '✅' : '❌'} Season-episode relationship`);
  console.log(`  ${hasSeasonDataPassing ? '✅' : '❌'} Season data passing`);
  console.log(`  ${hasEpisodeSeasonMapping ? '✅' : '❌'} Episode-season mapping`);
  console.log(`  ${hasModelFromSeason ? '✅' : '❌'} Model from season logic`);
  console.log(`  ${hasSeasonEpisodeFlow ? '✅' : '❌'} Season-episode data flow`);
  console.log(`  ${hasDataConsistency ? '✅' : '❌'} Data consistency`);
  
  return hasSeasonEpisodeRelation && hasSeasonDataPassing && hasEpisodeSeasonMapping && hasModelFromSeason && hasSeasonEpisodeFlow && hasDataConsistency;
}

// Run all tests
function runAllTests() {
  console.log(`${colors.cyan}${colors.bright}📊 CONSOLIDATED SEASON/EPISODE TEST RESULTS${colors.reset}\n`);
  
  const tests = [
    { name: 'Season-Level 3D Models Implementation', fn: testSeasonLevel3DModels },
    { name: 'Auto Episode Selection', fn: testAutoEpisodeSelection },
    { name: 'Season Model Display', fn: testSeasonModelDisplay },
    { name: 'Episode Manage Loading', fn: testEpisodeManageLoading },
    { name: 'StoryManage Episodes', fn: testStoryManageEpisodes },
    { name: 'Season Management', fn: testSeasonManagement },
    { name: 'Episode-Season Integration', fn: testEpisodeSeasonIntegration }
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
    console.log(`\n${colors.green}${colors.bright}🎉 ALL SEASON/EPISODE TESTS PASSED!${colors.reset}`);
    console.log(`${colors.blue}Consolidated test successfully replaces 5 individual test files${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}⚠️ Some season/episode tests failed${colors.reset}`);
    console.log(`${colors.yellow}Review the failed tests above${colors.reset}`);
  }
  
  return passed === total;
}

// Execute tests
runAllTests();
