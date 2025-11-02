#!/usr/bin/env node

/**
 * CONSOLIDATED COVER IMAGE TESTING SUITE
 * 
 * This consolidated test replaces the following individual test files:
 * - test-cover-image-functionality.js
 * - test-story-edit-cover-image.js
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

console.log(`${colors.cyan}${colors.bright}🧪 CONSOLIDATED COVER IMAGE TESTING SUITE${colors.reset}`);
console.log(`${colors.blue}Testing all cover image functionality in one comprehensive test${colors.reset}\n`);

// File content cache
const fileCache = new Map();

function getCachedFileContent(filePath) {
  if (!fileCache.has(filePath)) {
    if (fs.existsSync(filePath)) {
      fileCache.set(filePath, fs.readFileSync(filePath, 'utf8'));
    } else {
      fileCache.set(filePath, '');
    }
  }
  return fileCache.get(filePath);
}

// Test 1: Backend API Serializer
function testBackendSerializer() {
  console.log(`${colors.yellow}1️⃣ Testing Backend API Serializer...${colors.reset}`);
  
  const serializerPath = '../icvybz/serializers.py';
  const content = getCachedFileContent(serializerPath);
  
  // Check for comic_image in serializer
  const hasComicImageInFields = content.includes('comic_image') && content.includes('fields');
  const hasComicImageInMeta = content.includes('comic_image') && (content.includes('class Meta') || content.includes('Meta:'));
  const hasSerializerClass = content.includes('class ComicSerializer') || content.includes('ComicSerializer');
  
  console.log(`  ${hasComicImageInFields ? '✅' : '❌'} comic_image in serializer fields`);
  console.log(`  ${hasComicImageInMeta ? '✅' : '❌'} comic_image in serializer Meta`);
  console.log(`  ${hasSerializerClass ? '✅' : '❌'} ComicSerializer class exists`);
  
  return hasComicImageInFields && hasSerializerClass;
}

// Test 2: Frontend Story Interface
function testFrontendStoryInterface() {
  console.log(`${colors.yellow}2️⃣ Testing Frontend Story Interface...${colors.reset}`);
  
  const apiServicePath = 'src/services/api.ts';
  const content = getCachedFileContent(apiServicePath);
  
  // Check for comic_image in Story interface
  const hasStoryInterface = content.includes('interface Story') || content.includes('export interface Story');
  const hasComicImageInInterface = content.includes('comic_image') && content.includes('Story');
  const hasComicImageType = content.includes('comic_image?: string | File') || content.includes('comic_image: string | File');
  
  console.log(`  ${hasStoryInterface ? '✅' : '❌'} Story interface exists`);
  console.log(`  ${hasComicImageInInterface ? '✅' : '❌'} comic_image in Story interface`);
  console.log(`  ${hasComicImageType ? '✅' : '❌'} comic_image type (string | File)`);
  
  return hasStoryInterface && hasComicImageInInterface && hasComicImageType;
}

// Test 3: Story Creation Form
function testStoryCreationForm() {
  console.log(`${colors.yellow}3️⃣ Testing Story Creation Form...${colors.reset}`);
  
  const storyCreatePath = 'src/pages/StoryCreate.tsx';
  const wizardPath = 'src/components/StoryCreationWizard.tsx';
  const content1 = getCachedFileContent(storyCreatePath);
  const content2 = getCachedFileContent(wizardPath);
  const content = content1 + content2;
  
  // Check for cover image upload in story creation
  const hasFileInput = content.includes('type="file"') || content.includes('accept="image/*"');
  const hasComicImageInput = content.includes('comic_image') && (content.includes('onChange') || content.includes('File'));
  const hasFormData = content.includes('FormData') || content.includes('formData');
  const hasImagePreview = content.includes('preview') || content.includes('URL.createObjectURL');
  
  console.log(`  ${hasFileInput ? '✅' : '❌'} File input element`);
  console.log(`  ${hasComicImageInput ? '✅' : '❌'} comic_image input handling`);
  console.log(`  ${hasFormData ? '✅' : '❌'} FormData usage`);
  console.log(`  ${hasImagePreview ? '✅' : '❌'} Image preview functionality`);
  
  return hasFileInput && hasComicImageInput && hasFormData;
}

// Test 4: Story Edit Form
function testStoryEditForm() {
  console.log(`${colors.yellow}4️⃣ Testing Story Edit Form...${colors.reset}`);
  
  const storyEditPath = 'src/pages/StoryEdit.tsx';
  const content = getCachedFileContent(storyEditPath);
  
  // Check for cover image upload in story edit
  const hasComicImageField = content.includes('comic_image') && content.includes('onChange');
  const hasFileUpload = content.includes('File') && content.includes('comic_image');
  const hasImageDisplay = content.includes('comic_image') && (content.includes('src=') || content.includes('img'));
  const hasUpdateStoryCall = content.includes('updateStory') || content.includes('update.*story');
  
  console.log(`  ${hasComicImageField ? '✅' : '❌'} comic_image field in edit form`);
  console.log(`  ${hasFileUpload ? '✅' : '❌'} File upload handling`);
  console.log(`  ${hasImageDisplay ? '✅' : '❌'} Image display`);
  console.log(`  ${hasUpdateStoryCall ? '✅' : '❌'} updateStory API call`);
  
  return hasComicImageField && hasFileUpload && hasUpdateStoryCall;
}

// Test 5: API Service File Upload
function testAPIServiceUpload() {
  console.log(`${colors.yellow}5️⃣ Testing API Service File Upload...${colors.reset}`);
  
  const apiServicePath = 'src/services/api.ts';
  const content = getCachedFileContent(apiServicePath);
  
  // Check for file upload handling in API service
  const hasFormDataCheck = content.includes('FormData') || content.includes('instanceof File');
  const hasMultipartFormData = content.includes('multipart/form-data') || content.includes('Content-Type');
  const hasFileAppend = content.includes('append') && content.includes('comic_image');
  const hasUpdateStoryMethod = content.includes('updateStory') || content.includes('async updateStory');
  
  console.log(`  ${hasFormDataCheck ? '✅' : '❌'} FormData check`);
  console.log(`  ${hasMultipartFormData ? '✅' : '❌'} multipart/form-data header`);
  console.log(`  ${hasFileAppend ? '✅' : '❌'} File append to FormData`);
  console.log(`  ${hasUpdateStoryMethod ? '✅' : '❌'} updateStory method`);
  
  return hasFormDataCheck && hasFileAppend && hasUpdateStoryMethod;
}

// Test 6: Story Display with Cover Image
function testStoryDisplay() {
  console.log(`${colors.yellow}6️⃣ Testing Story Display with Cover Image...${colors.reset}`);
  
  const storiesPath = 'src/pages/Stories.tsx';
  const myStudioPath = 'src/pages/MyStudio.tsx';
  const content1 = getCachedFileContent(storiesPath);
  const content2 = getCachedFileContent(myStudioPath);
  const content = content1 + content2;
  
  // Check for cover image display
  const hasComicImageDisplay = content.includes('comic_image') && (content.includes('src=') || content.includes('img'));
  const hasImageFallback = content.includes('comic_image') && (content.includes('||') || content.includes('default'));
  const hasImageStyling = content.includes('comic_image') && (content.includes('style=') || content.includes('className'));
  
  console.log(`  ${hasComicImageDisplay ? '✅' : '❌'} Cover image display`);
  console.log(`  ${hasImageFallback ? '✅' : '❌'} Image fallback handling`);
  console.log(`  ${hasImageStyling ? '✅' : '❌'} Image styling`);
  
  return hasComicImageDisplay;
}

// Run all tests
function runAllTests() {
  console.log(`${colors.cyan}${colors.bright}📊 CONSOLIDATED COVER IMAGE TEST RESULTS${colors.reset}\n`);
  
  const tests = [
    { name: 'Backend API Serializer', fn: testBackendSerializer },
    { name: 'Frontend Story Interface', fn: testFrontendStoryInterface },
    { name: 'Story Creation Form', fn: testStoryCreationForm },
    { name: 'Story Edit Form', fn: testStoryEditForm },
    { name: 'API Service File Upload', fn: testAPIServiceUpload },
    { name: 'Story Display with Cover Image', fn: testStoryDisplay }
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
    console.log(`\n${colors.green}${colors.bright}🎉 ALL COVER IMAGE TESTS PASSED!${colors.reset}`);
    console.log(`${colors.blue}Consolidated test successfully replaces 2 individual test files${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}⚠️ Some cover image tests failed${colors.reset}`);
    console.log(`${colors.yellow}Review the failed tests above${colors.reset}`);
  }
  
  return passed === total;
}

// Execute tests
runAllTests();

