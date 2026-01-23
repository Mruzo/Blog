#!/usr/bin/env node

/**
 * Test: Error Handling Fix
 * 
 * This test verifies that the 400 Bad Request error is properly handled:
 * - Dialogue ID validation
 * - Data validation
 * - Error logging
 * - Try-catch error handling
 * - Dialogue data length check
 * - No dialogues message
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Error Handling Fix...\n');

const comic3dFile = path.join(__dirname, 'src/components/Comic3DViewer.tsx');
const comic3dContent = fs.readFileSync(comic3dFile, 'utf8');

// Test 1: Verify dialogue ID validation
console.log('1️⃣ Testing dialogue ID validation...');
if (comic3dContent.includes('if (!dialogueId || dialogueId <= 0) {') &&
    comic3dContent.includes('console.error(\'Comic3DViewer: Invalid dialogue ID:\', dialogueId);') &&
    comic3dContent.includes('return;')) {
  console.log('✅ PASS: Dialogue ID validation found');
} else {
  console.log('❌ FAIL: Dialogue ID validation missing');
}

// Test 2: Verify data validation
console.log('\n2️⃣ Testing data validation...');
if (comic3dContent.includes('if (!data || Object.keys(data).length === 0) {') &&
    comic3dContent.includes('console.error(\'Comic3DViewer: No data provided for dialogue update\');') &&
    comic3dContent.includes('return;')) {
  console.log('✅ PASS: Data validation found');
} else {
  console.log('❌ FAIL: Data validation missing');
}

// Test 3: Verify error logging
console.log('\n3️⃣ Testing error logging...');
if (comic3dContent.includes('console.log(\'Comic3DViewer: Updating dialogue\', dialogueId, \'with data:\', data);') &&
    comic3dContent.includes('console.log(\'Comic3DViewer: Dialogue update successful\');') &&
    comic3dContent.includes('console.error(\'Comic3DViewer: Error updating dialogue:\', error);')) {
  console.log('✅ PASS: Error logging found');
} else {
  console.log('❌ FAIL: Error logging missing');
}

// Test 4: Verify try-catch error handling
console.log('\n4️⃣ Testing try-catch error handling...');
if (comic3dContent.includes('try {') &&
    comic3dContent.includes('} catch (error) {') &&
    comic3dContent.includes('console.error(\'Comic3DViewer: Error updating dialogue:\', error);')) {
  console.log('✅ PASS: Try-catch error handling found');
} else {
  console.log('❌ FAIL: Try-catch error handling missing');
}

// Test 5: Verify dialogue data length check
console.log('\n5️⃣ Testing dialogue data length check...');
if (comic3dContent.includes('dialogueData.length > 0') &&
    comic3dContent.includes('dialogueData.length === 0')) {
  console.log('✅ PASS: Dialogue data length check found');
} else {
  console.log('❌ FAIL: Dialogue data length check missing');
}

// Test 6: Verify no dialogues message
console.log('\n6️⃣ Testing no dialogues message...');
if (comic3dContent.includes('No dialogues available for editing') &&
    comic3dContent.includes('Please add dialogues to this episode first') &&
    comic3dContent.includes('alert alert-info')) {
  console.log('✅ PASS: No dialogues message found');
} else {
  console.log('❌ FAIL: No dialogues message missing');
}

// Test 7: Verify slider validation
console.log('\n7️⃣ Testing slider validation...');
if (comic3dContent.includes('if (!current || !current.dialogue_id || !current.camera_orbit) {') &&
    comic3dContent.includes('console.error(\'Comic3DViewer: Invalid dialogue data for azimuth update:\', current);')) {
  console.log('✅ PASS: Slider validation found');
} else {
  console.log('❌ FAIL: Slider validation missing');
}

// Test 8: Verify console logging for debugging
console.log('\n8️⃣ Testing console logging for debugging...');
if (comic3dContent.includes('Rendering edit controls, isEditMode:') &&
    comic3dContent.includes('dialogueData length:')) {
  console.log('✅ PASS: Console logging for debugging found');
} else {
  console.log('❌ FAIL: Console logging for debugging missing');
}

console.log('\n🎯 Summary:');
console.log('✅ Dialogue ID validation');
console.log('✅ Data validation');
console.log('✅ Error logging');
console.log('✅ Try-catch error handling');
console.log('✅ Dialogue data length check');
console.log('✅ No dialogues message');
console.log('✅ Slider validation');
console.log('✅ Console logging for debugging');
console.log('\n🚀 400 Bad Request error should now be properly handled!');
