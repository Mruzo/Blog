// Simple test to check loading behavior on StoryManage page
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking StoryManage loading behavior...\n');

// Read the StoryManage component
const storyManagePath = path.join(__dirname, 'src/pages/StoryManage.tsx');
const storyManageContent = fs.readFileSync(storyManagePath, 'utf8');

// Check for potential loading issues
const issues = [];

// 1. Check for multiple useEffect hooks that might cause re-renders
const useEffectMatches = storyManageContent.match(/useEffect\(/g);
if (useEffectMatches && useEffectMatches.length > 1) {
  issues.push(`⚠️  Found ${useEffectMatches.length} useEffect hooks - might cause re-renders`);
}

// 2. Check for missing dependencies in useEffect
const useEffectWithDeps = storyManageContent.match(/useEffect\([^}]+}, \[[^\]]*\]\)/g);
if (useEffectWithDeps) {
  useEffectWithDeps.forEach((match, index) => {
    if (match.includes('loadAllEpisodesAndDialogues') && !match.includes('loadAllEpisodesAndDialogues')) {
      issues.push(`⚠️  useEffect ${index + 1} might have missing dependencies`);
    }
  });
}

// 3. Check for potential infinite loops
if (storyManageContent.includes('loadAllEpisodesAndDialogues') && storyManageContent.includes('useEffect')) {
  const loadAllEpisodesMatch = storyManageContent.match(/loadAllEpisodesAndDialogues.*useEffect/g);
  if (loadAllEpisodesMatch) {
    issues.push('⚠️  loadAllEpisodesAndDialogues called in useEffect - potential infinite loop');
  }
}

// 4. Check for proper loading state management
if (!storyManageContent.includes('setLoading(false)')) {
  issues.push('❌ Missing setLoading(false) - loading state might not be cleared');
}

// 5. Check for error handling
if (!storyManageContent.includes('catch')) {
  issues.push('⚠️  Missing error handling in data loading');
}

// 6. Check for Comic3DViewer integration
if (storyManageContent.includes('Comic3DViewer')) {
  console.log('✅ Comic3DViewer is integrated');
} else {
  issues.push('❌ Comic3DViewer not found in StoryManage');
}

// 7. Check for proper data loading sequence
const dataLoadingSequence = [
  'loadStory',
  'loadSeasons', 
  'loadCharacters',
  'loadAllEpisodesAndDialogues'
];

let sequenceIssues = [];
dataLoadingSequence.forEach((method, index) => {
  if (storyManageContent.includes(method)) {
    console.log(`✅ ${method} found`);
  } else {
    sequenceIssues.push(`❌ ${method} not found`);
  }
});

// 8. Check for proper state management
const stateVariables = ['story', 'loading', 'error', 'allEpisodes', 'allDialogues'];
stateVariables.forEach(state => {
  if (storyManageContent.includes(`useState.*${state}`) || 
      storyManageContent.includes(`const ${state}`) ||
      storyManageContent.includes(`set${state.charAt(0).toUpperCase() + state.slice(1)}`)) {
    console.log(`✅ ${state} state managed`);
  } else {
    issues.push(`❌ ${state} state not properly managed`);
  }
});

console.log('\n📊 Analysis Results:');
console.log('==================');

if (issues.length === 0 && sequenceIssues.length === 0) {
  console.log('✅ No obvious loading issues detected');
} else {
  console.log('❌ Potential loading issues found:');
  issues.forEach(issue => console.log(`  ${issue}`));
  sequenceIssues.forEach(issue => console.log(`  ${issue}`));
}

// Check for specific patterns that might cause loading issues
console.log('\n🔍 Specific Loading Pattern Analysis:');
console.log('=====================================');

// Check if loadAllEpisodesAndDialogues is called in useEffect
if (storyManageContent.includes('loadAllEpisodesAndDialogues(storyId)')) {
  console.log('⚠️  loadAllEpisodesAndDialogues called in useEffect - this might cause loading issues');
}

// Check for proper dependency array
const useEffectMatch = storyManageContent.match(/useEffect\([^}]+}, \[([^\]]*)\]\)/);
if (useEffectMatch) {
  const deps = useEffectMatch[1];
  console.log(`📋 useEffect dependencies: [${deps}]`);
  
  if (deps.includes('loadAllEpisodesAndDialogues')) {
    console.log('⚠️  loadAllEpisodesAndDialogues in dependency array might cause re-renders');
  }
}

// Check for async/await patterns
const asyncMatches = storyManageContent.match(/async.*await/g);
if (asyncMatches) {
  console.log(`✅ Found ${asyncMatches.length} async/await patterns - good for data loading`);
}

console.log('\n🎯 Recommendations:');
console.log('===================');

if (issues.length > 0) {
  console.log('1. Review useEffect dependencies to prevent infinite loops');
  console.log('2. Ensure setLoading(false) is called in all code paths');
  console.log('3. Add proper error handling for data loading');
  console.log('4. Consider using useCallback for loadAllEpisodesAndDialogues');
} else {
  console.log('1. Loading behavior looks good - check browser console for runtime issues');
  console.log('2. Monitor network requests in browser dev tools');
  console.log('3. Check if API calls are completing successfully');
}

console.log('\n✨ Analysis complete!');
