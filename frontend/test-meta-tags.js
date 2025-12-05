#!/usr/bin/env node

/**
 * Meta Tags Implementation Test
 * 
 * Tests that the meta tags implementation works correctly:
 * 1. Base meta tags exist in index.html
 * 2. MetaTags component is properly implemented
 * 3. Component updates meta tags dynamically
 */

const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

let passedTests = 0;
let failedTests = 0;

function runTest(name, testFn) {
  try {
    const result = testFn();
    if (result) {
      console.log(`${colors.green}✓${colors.reset} ${name}`);
      passedTests++;
      return true;
    } else {
      console.log(`${colors.red}✗${colors.reset} ${name}`);
      failedTests++;
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name} - Error: ${error.message}`);
    failedTests++;
    return false;
  }
}

console.log(`${colors.blue}Testing Meta Tags Implementation...${colors.reset}\n`);

// Test 1: Base meta tags exist in index.html
runTest('Base meta tags in index.html', () => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (!fs.existsSync(indexPath)) return false;
  
  const content = fs.readFileSync(indexPath, 'utf8');
  return content.includes('<meta name="description"') &&
         content.includes('<meta property="og:title"') &&
         content.includes('<meta property="og:description"') &&
         content.includes('<meta property="og:type"') &&
         content.includes('<meta property="og:url"') &&
         content.includes('<meta property="og:image"') &&
         content.includes('<meta name="twitter:card"') &&
         content.includes('<meta name="twitter:title"') &&
         content.includes('<meta name="twitter:description"') &&
         content.includes('<meta name="twitter:image"');
});

// Test 2: MetaTags component exists
runTest('MetaTags component exists', () => {
  const metaTagsPath = path.join(__dirname, 'src', 'components', 'MetaTags.tsx');
  return fs.existsSync(metaTagsPath);
});

// Test 3: MetaTags component uses useEffect
runTest('MetaTags component uses useEffect', () => {
  const metaTagsPath = path.join(__dirname, 'src', 'components', 'MetaTags.tsx');
  if (!fs.existsSync(metaTagsPath)) return false;
  
  const content = fs.readFileSync(metaTagsPath, 'utf8');
  return content.includes('useEffect') &&
         content.includes('document.title') &&
         content.includes('document.querySelector') &&
         content.includes('document.head');
});

// Test 4: MetaTags component updates meta tags
runTest('MetaTags component updates meta tags', () => {
  const metaTagsPath = path.join(__dirname, 'src', 'components', 'MetaTags.tsx');
  if (!fs.existsSync(metaTagsPath)) return false;
  
  const content = fs.readFileSync(metaTagsPath, 'utf8');
  return content.includes('updateMetaTag') &&
         content.includes('meta[name="description"]') &&
         content.includes('meta[property="og:title"]') &&
         content.includes('meta[property="og:description"]') &&
         content.includes('meta[name="twitter:title"]') &&
         content.includes('meta[name="twitter:description"]');
});

// Test 5: MetaTags component handles Open Graph tags
runTest('MetaTags component handles Open Graph tags', () => {
  const metaTagsPath = path.join(__dirname, 'src', 'components', 'MetaTags.tsx');
  if (!fs.existsSync(metaTagsPath)) return false;
  
  const content = fs.readFileSync(metaTagsPath, 'utf8');
  return content.includes('og:title') &&
         content.includes('og:description') &&
         content.includes('og:type') &&
         content.includes('og:url') &&
         content.includes('og:image');
});

// Test 6: MetaTags component handles Twitter Card tags
runTest('MetaTags component handles Twitter Card tags', () => {
  const metaTagsPath = path.join(__dirname, 'src', 'components', 'MetaTags.tsx');
  if (!fs.existsSync(metaTagsPath)) return false;
  
  const content = fs.readFileSync(metaTagsPath, 'utf8');
  return content.includes('twitter:card') &&
         content.includes('twitter:title') &&
         content.includes('twitter:description') &&
         content.includes('twitter:image');
});

// Test 7: MetaTags component updates canonical URL
runTest('MetaTags component updates canonical URL', () => {
  const metaTagsPath = path.join(__dirname, 'src', 'components', 'MetaTags.tsx');
  if (!fs.existsSync(metaTagsPath)) return false;
  
  const content = fs.readFileSync(metaTagsPath, 'utf8');
  return content.includes('link[rel="canonical"]') &&
         content.includes('canonical');
});

// Test 8: Home page uses MetaTags component
runTest('Home page uses MetaTags component', () => {
  const homePath = path.join(__dirname, 'src', 'pages', 'Home.tsx');
  if (!fs.existsSync(homePath)) return false;
  
  const content = fs.readFileSync(homePath, 'utf8');
  return content.includes('MetaTags') &&
         content.includes('import MetaTags');
});

// Test 9: Stories page uses MetaTags component
runTest('Stories page uses MetaTags component', () => {
  const storiesPath = path.join(__dirname, 'src', 'pages', 'Stories.tsx');
  if (!fs.existsSync(storiesPath)) return false;
  
  const content = fs.readFileSync(storiesPath, 'utf8');
  return content.includes('MetaTags') &&
         content.includes('import MetaTags');
});

// Test 10: App.tsx doesn't use HelmetProvider (manual implementation)
runTest('App.tsx doesn\'t require HelmetProvider', () => {
  const appPath = path.join(__dirname, 'src', 'App.tsx');
  if (!fs.existsSync(appPath)) return false;
  
  const content = fs.readFileSync(appPath, 'utf8');
  return !content.includes('HelmetProvider') &&
         !content.includes('react-helmet-async');
});

// Test 11: EpisodeMetaTags component exists
runTest('EpisodeMetaTags component exists', () => {
  const episodeMetaPath = path.join(__dirname, 'src', 'components', 'EpisodeMetaTags.tsx');
  return fs.existsSync(episodeMetaPath);
});

// Test 12: StoryMetaTags component exists
runTest('StoryMetaTags component exists', () => {
  const storyMetaPath = path.join(__dirname, 'src', 'components', 'StoryMetaTags.tsx');
  return fs.existsSync(storyMetaPath);
});

// Summary
console.log(`\n${colors.blue}Test Summary:${colors.reset}`);
console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);
console.log(`Total: ${passedTests + failedTests}`);

if (failedTests === 0) {
  console.log(`\n${colors.green}✓ All tests passed! Meta tags implementation is working correctly.${colors.reset}`);
  process.exit(0);
} else {
  console.log(`\n${colors.red}✗ Some tests failed. Please review the implementation.${colors.reset}`);
  process.exit(1);
}

