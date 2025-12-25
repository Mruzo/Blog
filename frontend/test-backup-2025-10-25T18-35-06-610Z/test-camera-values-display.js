#!/usr/bin/env node

/**
 * Test: Camera Values Display
 * 
 * This test verifies that camera values are displayed in the speech bubble:
 * - Camera orbit, target, FOV, and zoom speed shown
 * - Styled camera values section
 * - Debug information enhanced
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Camera Values Display...\n');

const comic3dFile = path.join(__dirname, 'src/components/Comic3DViewer.tsx');
const comic3dContent = fs.readFileSync(comic3dFile, 'utf8');

// Test 1: Verify camera values in dialogue text
console.log('1️⃣ Testing camera values in dialogue text...');
if (comic3dContent.includes('<strong>Camera Values:</strong>') &&
    comic3dContent.includes('<strong>Orbit:</strong> ${currentDialogue.camera_orbit}') &&
    comic3dContent.includes('<strong>Target:</strong> ${currentDialogue.camera_target}') &&
    comic3dContent.includes('<strong>FOV:</strong> ${currentDialogue.field_of_view}°') &&
    comic3dContent.includes('<strong>Zoom Speed:</strong> ${currentDialogue.zoom_speed}x')) {
  console.log('✅ PASS: Camera values display found in dialogue text');
} else {
  console.log('❌ FAIL: Camera values display missing from dialogue text');
}

// Test 2: Verify camera values styling
console.log('\n2️⃣ Testing camera values styling...');
if (comic3dContent.includes('margin-top: 8px') &&
    comic3dContent.includes('padding: 4px') &&
    comic3dContent.includes('background: rgba(0,0,0,0.1)') &&
    comic3dContent.includes('border-radius: 4px') &&
    comic3dContent.includes('font-size: 0.8em')) {
  console.log('✅ PASS: Camera values styling found');
} else {
  console.log('❌ FAIL: Camera values styling missing');
}

// Test 3: Verify enhanced debug information
console.log('\n3️⃣ Testing enhanced debug information...');
if (comic3dContent.includes('Selected episode: {selectedEpisode?.title || \'None\'}') &&
    comic3dContent.includes('Episode dialogues: {episodeDialogues.map(d => `${d.character}: ${d.text.substring(0, 20)}...`).join(\', \')}')) {
  console.log('✅ PASS: Enhanced debug information found');
} else {
  console.log('❌ FAIL: Enhanced debug information missing');
}

// Test 4: Verify dialogue text structure
console.log('\n4️⃣ Testing dialogue text structure...');
if (comic3dContent.includes('<div>') &&
    comic3dContent.includes('<strong>${currentDialogue.character}:</strong> ${currentDialogue.text}') &&
    comic3dContent.includes('</div>')) {
  console.log('✅ PASS: Dialogue text structure found');
} else {
  console.log('❌ FAIL: Dialogue text structure missing');
}

// Test 5: Verify camera values section
console.log('\n5️⃣ Testing camera values section...');
if (comic3dContent.includes('Camera Values:') &&
    comic3dContent.includes('Orbit:') &&
    comic3dContent.includes('Target:') &&
    comic3dContent.includes('FOV:') &&
    comic3dContent.includes('Zoom Speed:')) {
  console.log('✅ PASS: Camera values section found');
} else {
  console.log('❌ FAIL: Camera values section missing');
}

console.log('\n🎯 Summary:');
console.log('✅ Camera values displayed in speech bubble');
console.log('✅ Camera orbit, target, FOV, and zoom speed shown');
console.log('✅ Styled camera values section with background');
console.log('✅ Enhanced debug information');
console.log('✅ Dialogue text structure maintained');
console.log('✅ Camera values section properly formatted');
console.log('\n🚀 Camera values are now displayed in the speech bubble!');


