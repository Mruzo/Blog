/**
 * Test: Story Edit Cover Image Functionality
 * 
 * Tests the StoryEdit page's ability to update a story's cover image
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_SRC = path.join(__dirname, 'src');

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return '';
  }
}

function searchInFiles(pattern, filePaths) {
  const results = [];
  for (const filePath of filePaths) {
    const content = readFile(filePath);
    if (pattern.test(content)) {
      results.push(filePath);
    }
  }
  return results;
}

function runTest(testName, testFn) {
  try {
    const result = testFn();
    if (result) {
      console.log(`  ✅ ${testName}`);
      return true;
    } else {
      console.log(`  ❌ ${testName}`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ ${testName}`);
    console.error(`     Error: ${error.message}`);
    return false;
  }
}

console.log('🧪 Testing Story Edit Cover Image Functionality\n');

const tests = [];
let passed = 0;
let failed = 0;

// Test 1: StoryEdit component imports ImageUpload
tests.push(runTest(
  'StoryEdit imports ImageUpload component',
  () => {
    const content = readFile(path.join(FRONTEND_SRC, 'pages', 'StoryEdit.tsx'));
    return content.includes('import ImageUpload') && content.includes('from \'../components/ImageUpload\'');
  }
));

// Test 2: FormData includes comic_image field
tests.push(runTest(
  'StoryEdit formData includes comic_image field',
  () => {
    const content = readFile(path.join(FRONTEND_SRC, 'pages', 'StoryEdit.tsx'));
    return /comic_image.*File.*undefined/.test(content) || /comic_image.*undefined.*File/.test(content);
  }
));

// Test 3: handleImageChange function exists
tests.push(runTest(
  'StoryEdit has handleImageChange function',
  () => {
    const content = readFile(path.join(FRONTEND_SRC, 'pages', 'StoryEdit.tsx'));
    return /handleImageChange|handleImageChange\s*=\s*\(/.test(content);
  }
));

// Test 4: ImageUpload component is rendered in form
tests.push(runTest(
  'StoryEdit renders ImageUpload component',
  () => {
    const content = readFile(path.join(FRONTEND_SRC, 'pages', 'StoryEdit.tsx'));
    return content.includes('<ImageUpload') && content.includes('value={formData.comic_image}');
  }
));

// Test 5: Current cover image is displayed
tests.push(runTest(
  'StoryEdit displays current cover image if exists',
  () => {
    const content = readFile(path.join(FRONTEND_SRC, 'pages', 'StoryEdit.tsx'));
    return content.includes('story?.comic_image') && content.includes('typeof story.comic_image === \'string\'');
  }
));

// Test 6: updateStory API method handles FormData correctly
tests.push(runTest(
  'updateStory API method handles file uploads with FormData',
  () => {
    const content = readFile(path.join(FRONTEND_SRC, 'services', 'api.ts'));
    // Check that it uses FormData when comic_image is a File
    return /comic_image.*File/.test(content) && 
           /FormData/.test(content) && 
           /formData\.append.*comic_image/.test(content);
  }
));

// Test 7: updateStory uses PATCH method
tests.push(runTest(
  'updateStory uses PATCH method for updates',
  () => {
    const content = readFile(path.join(FRONTEND_SRC, 'services', 'api.ts'));
    return /api\.patch.*stories/.test(content);
  }
));

// Test 8: Content-Type header is removed for FormData
tests.push(runTest(
  'API interceptor removes Content-Type for FormData',
  () => {
    const content = readFile(path.join(FRONTEND_SRC, 'services', 'api.ts'));
    return /config\.data.*FormData/.test(content) && 
           (/delete.*Content-Type/.test(content) || /remove.*Content-Type/.test(content));
  }
));

// Test 9: updateStory includes all fields when file is present
tests.push(runTest(
  'updateStory includes all text fields when file is uploaded',
  () => {
    const content = readFile(path.join(FRONTEND_SRC, 'services', 'api.ts'));
    return /formData\.append.*title/.test(content) && 
           /formData\.append.*description/.test(content) && 
           /formData\.append.*is_public/.test(content);
  }
));

// Test 10: Error handling shows comic_image errors
tests.push(runTest(
  'StoryEdit error handling includes comic_image field errors',
  () => {
    const content = readFile(path.join(FRONTEND_SRC, 'pages', 'StoryEdit.tsx'));
    return /err\.response\.data/.test(content) && /Object\.entries/.test(content);
  }
));

// Count results
tests.forEach(result => {
  if (result) passed++;
  else failed++;
});

console.log(`\n📊 Test Summary`);
console.log(`Total Tests: ${tests.length}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Pass Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 ALL TESTS PASSED!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the implementation.');
  process.exit(1);
}
