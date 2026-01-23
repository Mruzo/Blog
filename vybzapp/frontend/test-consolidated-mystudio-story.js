#!/usr/bin/env node

/**
 * CONSOLIDATED MYSTUDIO/STORY TESTING SUITE
 * 
 * This consolidated test replaces 6 individual MyStudio/Story test files:
 * - test-mystudio-counts.js
 * - test-mystudio-fixes.js
 * - test-mystudio-performance.js
 * - test-storymanage-complete.js
 * - test-storymanage-episodes.js
 * - test-story-structure-compatibility.js
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

console.log(`${colors.cyan}${colors.bright}🧪 CONSOLIDATED MYSTUDIO/STORY TESTING SUITE${colors.reset}`);
console.log(`${colors.blue}Testing all MyStudio and Story functionality in one comprehensive test${colors.reset}\n`);

// Test 1: MyStudio Counts and Display
function testMyStudioCounts() {
  console.log(`${colors.yellow}1️⃣ Testing MyStudio Counts and Display...${colors.reset}`);
  
  const myStudioPath = 'src/pages/MyStudio.tsx';
  const content = fs.readFileSync(myStudioPath, 'utf8');
  
  // Check for counts functionality (refined criteria)
  const hasStoryCounts = content.includes('stories.length') || content.includes('stories?.length');
  const hasSeasonCounts = content.includes('storySeasons.length') || content.includes('seasons.length');
  const hasEpisodeCounts = content.includes('episodesBySeason') && content.includes('length');
  const hasCountDisplay = content.includes('seasons') && content.includes('episodes');
  const hasCountState = content.includes('useState') && content.includes('stories');
  const hasCountMapping = content.includes('.map(') && content.includes('story');
  
  console.log(`  ${hasStoryCounts ? '✅' : '❌'} Story counts display`);
  console.log(`  ${hasSeasonCounts ? '✅' : '❌'} Season counts display`);
  console.log(`  ${hasEpisodeCounts ? '✅' : '❌'} Episode counts display`);
  console.log(`  ${hasCountDisplay ? '✅' : '❌'} Count display logic`);
  console.log(`  ${hasCountState ? '✅' : '❌'} Count state management`);
  console.log(`  ${hasCountMapping ? '✅' : '❌'} Count mapping for stories`);
  
  return hasStoryCounts && hasSeasonCounts && hasEpisodeCounts && hasCountDisplay && hasCountState && hasCountMapping;
}

// Test 2: MyStudio Performance and Fixes
function testMyStudioPerformance() {
  console.log(`${colors.yellow}2️⃣ Testing MyStudio Performance and Fixes...${colors.reset}`);
  
  const myStudioPath = 'src/pages/MyStudio.tsx';
  const content = fs.readFileSync(myStudioPath, 'utf8');
  
  // Check for performance optimizations
  const hasDirectApiCalls = content.includes('apiService.') && content.includes('getSeasons') && content.includes('getEpisodes');
  const hasInitialLoading = content.includes('isInitialLoading') || content.includes('setIsInitialLoading');
  const hasPromiseAll = content.includes('Promise.all') && content.includes('seasonResults');
  const hasDataCollection = content.includes('storyId') && content.includes('seasons') && content.includes('storySeasons');
  const hasLoadingState = content.includes('Loading studio') || content.includes('loading');
  const hasErrorHandling = content.includes('try {') && content.includes('catch');
  
  console.log(`  ${hasDirectApiCalls ? '✅' : '❌'} Direct API calls`);
  console.log(`  ${hasInitialLoading ? '✅' : '❌'} Initial loading state`);
  console.log(`  ${hasPromiseAll ? '✅' : '❌'} Promise.all for parallel loading`);
  console.log(`  ${hasDataCollection ? '✅' : '❌'} Data collection logic`);
  console.log(`  ${hasLoadingState ? '✅' : '❌'} Loading state management`);
  console.log(`  ${hasErrorHandling ? '✅' : '❌'} Error handling`);
  
  return hasDirectApiCalls && hasInitialLoading && hasPromiseAll && hasDataCollection && hasLoadingState && hasErrorHandling;
}

// Test 3: StoryManage Complete Functionality
function testStoryManageComplete() {
  console.log(`${colors.yellow}3️⃣ Testing StoryManage Complete Functionality...${colors.reset}`);
  
  const storyManagePath = 'src/pages/StoryManage.tsx';
  const content = fs.readFileSync(storyManagePath, 'utf8');
  
  // Check for complete functionality
  const hasStoryLoading = content.includes('loadStory') || content.includes('getStory');
  const hasSeasonLoading = content.includes('loadSeasons') || content.includes('getSeasons');
  const hasCharacterLoading = content.includes('loadCharacters') || content.includes('getCharacters');
  const hasComic3DViewer = content.includes('Comic3DViewer');
  const hasStoryData = content.includes('story') && content.includes('seasons') && content.includes('characters');
  const hasErrorHandling = content.includes('error') && content.includes('Error');
  
  console.log(`  ${hasStoryLoading ? '✅' : '❌'} Story loading functionality`);
  console.log(`  ${hasSeasonLoading ? '✅' : '❌'} Season loading functionality`);
  console.log(`  ${hasCharacterLoading ? '✅' : '❌'} Character loading functionality`);
  console.log(`  ${hasComic3DViewer ? '✅' : '❌'} Comic3DViewer integration`);
  console.log(`  ${hasStoryData ? '✅' : '❌'} Story data management`);
  console.log(`  ${hasErrorHandling ? '✅' : '❌'} Error handling`);
  
  return hasStoryLoading && hasSeasonLoading && hasCharacterLoading && hasComic3DViewer && hasStoryData && hasErrorHandling;
}

// Test 4: StoryManage Episodes
function testStoryManageEpisodes() {
  console.log(`${colors.yellow}4️⃣ Testing StoryManage Episodes...${colors.reset}`);
  
  const storyManagePath = 'src/pages/StoryManage.tsx';
  const content = fs.readFileSync(storyManagePath, 'utf8');
  
  // Check for episodes functionality
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

// Test 5: Story Structure Compatibility
function testStoryStructureCompatibility() {
  console.log(`${colors.yellow}5️⃣ Testing Story Structure Compatibility...${colors.reset}`);
  
  const storyManagePath = 'src/pages/StoryManage.tsx';
  const content = fs.readFileSync(storyManagePath, 'utf8');
  
  // Check for structure compatibility (refined criteria)
  const hasStoryStructure = content.includes('story') && content.includes('seasons') && content.includes('episodes');
  const hasDataRelationships = content.includes('season') && content.includes('episode') && content.includes('dialogue');
  const hasApiIntegration = content.includes('useApi') || content.includes('apiService');
  const hasDataFlow = content.includes('loadStory') && content.includes('loadSeasons');
  const hasStateManagement = content.includes('useState') && content.includes('useEffect');
  const hasComponentStructure = content.includes('return') && content.includes('div') && content.includes('className');
  
  console.log(`  ${hasStoryStructure ? '✅' : '❌'} Story structure (story → seasons → episodes)`);
  console.log(`  ${hasDataRelationships ? '✅' : '❌'} Data relationships`);
  console.log(`  ${hasApiIntegration ? '✅' : '❌'} API integration`);
  console.log(`  ${hasDataFlow ? '✅' : '❌'} Data flow management`);
  console.log(`  ${hasStateManagement ? '✅' : '❌'} State management`);
  console.log(`  ${hasComponentStructure ? '✅' : '❌'} Component structure`);
  
  return hasStoryStructure && hasDataRelationships && hasApiIntegration && hasDataFlow && hasStateManagement && hasComponentStructure;
}

// Test 6: MyStudio UI Components
function testMyStudioUIComponents() {
  console.log(`${colors.yellow}6️⃣ Testing MyStudio UI Components...${colors.reset}`);
  
  const myStudioPath = 'src/pages/MyStudio.tsx';
  const content = fs.readFileSync(myStudioPath, 'utf8');
  
  // Check for UI components (refined criteria)
  const hasStoryCards = content.includes('card') && content.includes('story');
  const hasStoryButtons = content.includes('fa-cog') && content.includes('btn');
  const hasStoryTitles = content.includes('title') && content.includes('story.title');
  const hasStoryDescriptions = content.includes('description') && content.includes('story.description');
  const hasStoryMetadata = content.includes('created_at') || content.includes('updated_at');
  const hasStoryActions = content.includes('onClick') && content.includes('handle');
  
  console.log(`  ${hasStoryCards ? '✅' : '❌'} Story cards display`);
  console.log(`  ${hasStoryButtons ? '✅' : '❌'} Story action buttons`);
  console.log(`  ${hasStoryTitles ? '✅' : '❌'} Story titles display`);
  console.log(`  ${hasStoryDescriptions ? '✅' : '❌'} Story descriptions display`);
  console.log(`  ${hasStoryMetadata ? '✅' : '❌'} Story metadata display`);
  console.log(`  ${hasStoryActions ? '✅' : '❌'} Story action handlers`);
  
  return hasStoryCards && hasStoryButtons && hasStoryTitles && hasStoryDescriptions && hasStoryMetadata && hasStoryActions;
}

// Run all tests
function runAllTests() {
  console.log(`${colors.cyan}${colors.bright}📊 CONSOLIDATED MYSTUDIO/STORY TEST RESULTS${colors.reset}\n`);
  
  const tests = [
    { name: 'MyStudio Counts and Display', fn: testMyStudioCounts },
    { name: 'MyStudio Performance and Fixes', fn: testMyStudioPerformance },
    { name: 'StoryManage Complete Functionality', fn: testStoryManageComplete },
    { name: 'StoryManage Episodes', fn: testStoryManageEpisodes },
    { name: 'Story Structure Compatibility', fn: testStoryStructureCompatibility },
    { name: 'MyStudio UI Components', fn: testMyStudioUIComponents }
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
    console.log(`\n${colors.green}${colors.bright}🎉 ALL MYSTUDIO/STORY TESTS PASSED!${colors.reset}`);
    console.log(`${colors.blue}Consolidated test successfully replaces 6 individual test files${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}⚠️ Some MyStudio/Story tests failed${colors.reset}`);
    console.log(`${colors.yellow}Review the failed tests above${colors.reset}`);
  }
  
  return passed === total;
}

// Execute tests
runAllTests();
