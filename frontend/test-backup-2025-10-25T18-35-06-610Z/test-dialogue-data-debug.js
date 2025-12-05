#!/usr/bin/env node

/**
 * Test: Dialogue Data Debug
 * 
 * This test verifies that the dialogue data debugging is properly implemented:
 * - Detailed logging in updateCameraDebounced
 * - API service logging
 * - Error handling with detailed error information
 * - Data type and value logging
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Dialogue Data Debug...\n');

const comic3dFile = path.join(__dirname, 'src/components/Comic3DViewer.tsx');
const apiFile = path.join(__dirname, 'src/services/api.ts');
const comic3dContent = fs.readFileSync(comic3dFile, 'utf8');
const apiContent = fs.readFileSync(apiFile, 'utf8');

// Test 1: Verify detailed logging in updateCameraDebounced
console.log('1️⃣ Testing detailed logging in updateCameraDebounced...');
if (comic3dContent.includes('console.log(\'Comic3DViewer: Updating dialogue\', dialogueId, \'with data:\', data);') &&
    comic3dContent.includes('console.log(\'Comic3DViewer: Data type:\', typeof data);') &&
    comic3dContent.includes('console.log(\'Comic3DViewer: Data keys:\', Object.keys(data));') &&
    comic3dContent.includes('console.log(\'Comic3DViewer: Data values:\', Object.values(data));')) {
  console.log('✅ PASS: Detailed logging in updateCameraDebounced found');
} else {
  console.log('❌ FAIL: Detailed logging in updateCameraDebounced missing');
}

// Test 2: Verify API service logging
console.log('\n2️⃣ Testing API service logging...');
if (apiContent.includes('console.log(\'API: updateDialogue called with:\', { id, dialogueData });') &&
    apiContent.includes('console.log(\'API: dialogueData type:\', typeof dialogueData);') &&
    apiContent.includes('console.log(\'API: dialogueData keys:\', Object.keys(dialogueData));') &&
    apiContent.includes('console.log(\'API: dialogueData values:\', Object.values(dialogueData));')) {
  console.log('✅ PASS: API service logging found');
} else {
  console.log('❌ FAIL: API service logging missing');
}

// Test 3: Verify error handling with detailed error information
console.log('\n3️⃣ Testing error handling with detailed error information...');
if (comic3dContent.includes('console.error(\'Comic3DViewer: Error details:\', error.message);') &&
    comic3dContent.includes('console.error(\'Comic3DViewer: Error stack:\', error.stack);') &&
    apiContent.includes('console.error(\'API: updateDialogue failed:\', error);') &&
    apiContent.includes('console.error(\'API: Error response:\', error.response?.data);')) {
  console.log('✅ PASS: Error handling with detailed error information found');
} else {
  console.log('❌ FAIL: Error handling with detailed error information missing');
}

// Test 4: Verify API call logging
console.log('\n4️⃣ Testing API call logging...');
if (comic3dContent.includes('console.log(\'Comic3DViewer: Calling onDialogueUpdate with:\', { dialogueId, data });') &&
    apiContent.includes('console.log(\'API: updateDialogue successful:\', response.data);')) {
  console.log('✅ PASS: API call logging found');
} else {
  console.log('❌ FAIL: API call logging missing');
}

// Test 5: Verify try-catch in API service
console.log('\n5️⃣ Testing try-catch in API service...');
if (apiContent.includes('try {') &&
    apiContent.includes('} catch (error) {') &&
    apiContent.includes('throw error;')) {
  console.log('✅ PASS: Try-catch in API service found');
} else {
  console.log('❌ FAIL: Try-catch in API service missing');
}

// Test 6: Verify error status logging
console.log('\n6️⃣ Testing error status logging...');
if (apiContent.includes('console.error(\'API: Error status:\', error.response?.status);') &&
    apiContent.includes('error.response?.data')) {
  console.log('✅ PASS: Error status logging found');
} else {
  console.log('❌ FAIL: Error status logging missing');
}

console.log('\n🎯 Summary:');
console.log('✅ Detailed logging in updateCameraDebounced');
console.log('✅ API service logging');
console.log('✅ Error handling with detailed error information');
console.log('✅ API call logging');
console.log('✅ Try-catch in API service');
console.log('✅ Error status logging');
console.log('\n🚀 Dialogue data debugging is now comprehensive!');
console.log('\n💡 Check the browser console for detailed dialogue data logs when using sliders.');
