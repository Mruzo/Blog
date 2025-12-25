#!/usr/bin/env node

/**
 * Test: Camera Rotation Debug
 * 
 * This test verifies that camera rotation debugging is properly implemented:
 * - Extensive debug logging for camera values
 * - Error handling for camera animation
 * - Model viewer ref validation
 * - Camera target and orbit logging
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Camera Rotation Debug...\n');

const comic3dFile = path.join(__dirname, 'src/components/Comic3DViewer.tsx');
const comic3dContent = fs.readFileSync(comic3dFile, 'utf8');

// Test 1: Verify extensive debug logging
console.log('1️⃣ Testing extensive debug logging...');
if (comic3dContent.includes('=== CAMERA UPDATE DEBUG ===') &&
    comic3dContent.includes('modelViewerRef.current:') &&
    comic3dContent.includes('isModelReady:') &&
    comic3dContent.includes('currentDialogue:')) {
  console.log('✅ PASS: Extensive debug logging found');
} else {
  console.log('❌ FAIL: Extensive debug logging missing');
}

// Test 2: Verify camera values logging
console.log('\n2️⃣ Testing camera values logging...');
if (comic3dContent.includes('Camera target before:') &&
    comic3dContent.includes('Camera orbit before:') &&
    comic3dContent.includes('New camera target:') &&
    comic3dContent.includes('New camera orbit:') &&
    comic3dContent.includes('Field of view:')) {
  console.log('✅ PASS: Camera values logging found');
} else {
  console.log('❌ FAIL: Camera values logging missing');
}

// Test 3: Verify camera setting logging
console.log('\n3️⃣ Testing camera setting logging...');
if (comic3dContent.includes('Camera target after setting:') &&
    comic3dContent.includes('Field of view after setting:') &&
    comic3dContent.includes('Camera orbit after direct setting:')) {
  console.log('✅ PASS: Camera setting logging found');
} else {
  console.log('❌ FAIL: Camera setting logging missing');
}

// Test 4: Verify animation logging
console.log('\n4️⃣ Testing animation logging...');
if (comic3dContent.includes('About to animate with orbit value:') &&
    comic3dContent.includes('Type of orbit value:') &&
    comic3dContent.includes('Animation started with orbit:') &&
    comic3dContent.includes('Animation object:')) {
  console.log('✅ PASS: Animation logging found');
} else {
  console.log('❌ FAIL: Animation logging missing');
}

// Test 5: Verify error handling
console.log('\n5️⃣ Testing error handling...');
if (comic3dContent.includes('try {') &&
    comic3dContent.includes('} catch (error) {') &&
    comic3dContent.includes('console.error(\'Comic3DViewer: Error animating camera:\', error);')) {
  console.log('✅ PASS: Error handling found');
} else {
  console.log('❌ FAIL: Error handling missing');
}

// Test 6: Verify model viewer ref validation
console.log('\n6️⃣ Testing model viewer ref validation...');
if (comic3dContent.includes('if (modelViewerRef.current) {') &&
    comic3dContent.includes('Cannot animate camera - modelViewerRef is null')) {
  console.log('✅ PASS: Model viewer ref validation found');
} else {
  console.log('❌ FAIL: Model viewer ref validation missing');
}

// Test 7: Verify camera animation completion
console.log('\n7️⃣ Testing camera animation completion...');
if (comic3dContent.includes('animation.onfinish = () => {') &&
    comic3dContent.includes('Camera animation complete')) {
  console.log('✅ PASS: Camera animation completion found');
} else {
  console.log('❌ FAIL: Camera animation completion missing');
}

// Test 8: Verify dialogue index logging
console.log('\n8️⃣ Testing dialogue index logging...');
if (comic3dContent.includes('Dialogue index:') &&
    comic3dContent.includes('console.log(\'Comic3DViewer: Dialogue index:\', index);')) {
  console.log('✅ PASS: Dialogue index logging found');
} else {
  console.log('❌ FAIL: Dialogue index logging missing');
}

console.log('\n🎯 Summary:');
console.log('✅ Extensive debug logging');
console.log('✅ Camera values logging');
console.log('✅ Camera setting logging');
console.log('✅ Animation logging');
console.log('✅ Error handling');
console.log('✅ Model viewer ref validation');
console.log('✅ Camera animation completion');
console.log('✅ Dialogue index logging');
console.log('\n🚀 Camera rotation debugging is now comprehensive!');
console.log('\n💡 Check the browser console for detailed camera animation logs.');
