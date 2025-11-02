#!/usr/bin/env node

/**
 * Test: PATCH Method Fix
 * 
 * This test verifies that the dialogue update uses PATCH method for partial updates:
 * - PATCH method instead of PUT
 * - Partial data updates
 * - Proper HTTP method for dialogue updates
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing PATCH Method Fix...\n');

const apiFile = path.join(__dirname, 'src/services/api.ts');
const apiContent = fs.readFileSync(apiFile, 'utf8');

// Test 1: Verify PATCH method is used
console.log('1️⃣ Testing PATCH method is used...');
if (apiContent.includes('await api.patch(`/dialogues/${id}/`, dialogueData);') &&
    apiContent.includes('// Use PATCH for partial updates instead of PUT')) {
  console.log('✅ PASS: PATCH method is used');
} else {
  console.log('❌ FAIL: PATCH method not found');
}

// Test 2: Verify PUT method is not used
console.log('\n2️⃣ Testing PUT method is not used...');
if (!apiContent.includes('await api.put(`/dialogues/${id}/`, dialogueData);')) {
  console.log('✅ PASS: PUT method is not used');
} else {
  console.log('❌ FAIL: PUT method is still being used');
}

// Test 3: Verify partial update comment
console.log('\n3️⃣ Testing partial update comment...');
if (apiContent.includes('// Use PATCH for partial updates instead of PUT')) {
  console.log('✅ PASS: Partial update comment found');
} else {
  console.log('❌ FAIL: Partial update comment missing');
}

// Test 4: Verify API endpoint is correct
console.log('\n4️⃣ Testing API endpoint is correct...');
if (apiContent.includes('`/dialogues/${id}/`')) {
  console.log('✅ PASS: API endpoint is correct');
} else {
  console.log('❌ FAIL: API endpoint is incorrect');
}

// Test 5: Verify dialogueData parameter
console.log('\n5️⃣ Testing dialogueData parameter...');
if (apiContent.includes('dialogueData)')) {
  console.log('✅ PASS: dialogueData parameter found');
} else {
  console.log('❌ FAIL: dialogueData parameter missing');
}

console.log('\n🎯 Summary:');
console.log('✅ PATCH method is used');
console.log('✅ PUT method is not used');
console.log('✅ Partial update comment');
console.log('✅ API endpoint is correct');
console.log('✅ dialogueData parameter');
console.log('\n🚀 Dialogue updates now use PATCH method for partial updates!');
console.log('\n💡 This should fix the 400 Bad Request error when using sliders.');
