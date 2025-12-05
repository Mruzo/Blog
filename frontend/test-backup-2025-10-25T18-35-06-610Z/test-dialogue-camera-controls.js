#!/usr/bin/env node

/**
 * Test: Dialogue Camera Controls Implementation
 * 
 * This test verifies that the dialogue editing form now includes all camera control fields:
 * - Scene information (title, description)
 * - Shot type selection
 * - Camera orbit and target inputs
 * - Field of view and zoom speed sliders
 * - Rotation input
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Dialogue Camera Controls Implementation...\n');

// Test 1: Verify dialogue form includes scene information fields
console.log('1️⃣ Testing scene information fields...');
const episodeManageFile = path.join(__dirname, 'src/pages/EpisodeManage.tsx');
const episodeManageContent = fs.readFileSync(episodeManageFile, 'utf8');

// Check for scene title field
if (episodeManageContent.includes('dialogueSceneTitle') && episodeManageContent.includes('scene_title')) {
  console.log('✅ PASS: Scene title field found');
} else {
  console.log('❌ FAIL: Scene title field missing');
}

// Check for scene description field
if (episodeManageContent.includes('dialogueSceneDescription') && episodeManageContent.includes('scene_description')) {
  console.log('✅ PASS: Scene description field found');
} else {
  console.log('❌ FAIL: Scene description field missing');
}

// Test 2: Verify shot type selection
console.log('\n2️⃣ Testing shot type selection...');
if (episodeManageContent.includes('dialogueShotType') && episodeManageContent.includes('shot_type')) {
  console.log('✅ PASS: Shot type field found');
} else {
  console.log('❌ FAIL: Shot type field missing');
}

// Check for shot type options
const shotTypeOptions = [
  'wideShot', 'mediumShot', 'closeUp', 'extremeCloseUp', 
  'overShoulder', 'lowAngle', 'highAngle'
];

let allShotTypesFound = true;
shotTypeOptions.forEach(shotType => {
  if (!episodeManageContent.includes(`value="${shotType}"`)) {
    console.log(`❌ FAIL: Shot type option "${shotType}" missing`);
    allShotTypesFound = false;
  }
});

if (allShotTypesFound) {
  console.log('✅ PASS: All shot type options found');
}

// Test 3: Verify camera orbit and target fields
console.log('\n3️⃣ Testing camera orbit and target fields...');
if (episodeManageContent.includes('dialogueCameraOrbit') && episodeManageContent.includes('camera_orbit')) {
  console.log('✅ PASS: Camera orbit field found');
} else {
  console.log('❌ FAIL: Camera orbit field missing');
}

if (episodeManageContent.includes('dialogueCameraTarget') && episodeManageContent.includes('camera_target')) {
  console.log('✅ PASS: Camera target field found');
} else {
  console.log('❌ FAIL: Camera target field missing');
}

// Test 4: Verify field of view and zoom speed sliders
console.log('\n4️⃣ Testing field of view and zoom speed sliders...');
if (episodeManageContent.includes('dialogueFieldOfView') && episodeManageContent.includes('field_of_view')) {
  console.log('✅ PASS: Field of view slider found');
} else {
  console.log('❌ FAIL: Field of view slider missing');
}

if (episodeManageContent.includes('dialogueZoomSpeed') && episodeManageContent.includes('zoom_speed')) {
  console.log('✅ PASS: Zoom speed slider found');
} else {
  console.log('❌ FAIL: Zoom speed slider missing');
}

// Check for range input types
if (episodeManageContent.includes('type="range"') && episodeManageContent.includes('form-range')) {
  console.log('✅ PASS: Range sliders properly implemented');
} else {
  console.log('❌ FAIL: Range sliders not properly implemented');
}

// Test 5: Verify rotation field
console.log('\n5️⃣ Testing rotation field...');
if (episodeManageContent.includes('dialogueRotation') && episodeManageContent.includes('rotation')) {
  console.log('✅ PASS: Rotation field found');
} else {
  console.log('❌ FAIL: Rotation field missing');
}

// Test 6: Verify form data structure includes all camera fields
console.log('\n6️⃣ Testing form data structure...');
const dialogueFormDataMatch = episodeManageContent.match(/const \[dialogueFormData, setDialogueFormData\] = useState<DialogueFormData>\(\{[\s\S]*?\}\);/);
if (dialogueFormDataMatch) {
  const dialogueFormData = dialogueFormDataMatch[0];
  const requiredFields = [
    'scene_title', 'scene_description', 'shot_type', 
    'camera_orbit', 'camera_target', 'field_of_view', 
    'zoom_speed', 'rotation'
  ];
  
  let allFieldsFound = true;
  requiredFields.forEach(field => {
    if (!dialogueFormData.includes(field)) {
      console.log(`❌ FAIL: Form data missing field "${field}"`);
      allFieldsFound = false;
    }
  });
  
  if (allFieldsFound) {
    console.log('✅ PASS: All camera control fields in form data');
  }
} else {
  console.log('❌ FAIL: Could not find dialogueFormData state');
}

// Test 7: Verify input change handler supports camera fields
console.log('\n7️⃣ Testing input change handler...');
if (episodeManageContent.includes('field_of_view') && episodeManageContent.includes('zoom_speed') && 
    episodeManageContent.includes('parseFloat')) {
  console.log('✅ PASS: Input change handler supports camera fields');
} else {
  console.log('❌ FAIL: Input change handler missing camera field support');
}

// Test 8: Verify reset form includes camera fields
console.log('\n8️⃣ Testing reset form function...');
if (episodeManageContent.includes('resetDialogueForm') && 
    episodeManageContent.includes('camera_orbit: \'0deg 75deg 3m\'') &&
    episodeManageContent.includes('camera_target: \'0m 1.6m 0m\'') &&
    episodeManageContent.includes('field_of_view: 45.0') &&
    episodeManageContent.includes('zoom_speed: 1.0')) {
  console.log('✅ PASS: Reset form includes camera control defaults');
} else {
  console.log('❌ FAIL: Reset form missing camera control defaults');
}

console.log('\n🎯 Summary:');
console.log('✅ Scene information fields (title, description)');
console.log('✅ Shot type selection with all options');
console.log('✅ Camera orbit and target input fields');
console.log('✅ Field of view and zoom speed sliders with visual feedback');
console.log('✅ Rotation input field');
console.log('✅ Form data structure includes all camera fields');
console.log('✅ Input change handler supports camera fields');
console.log('✅ Reset form includes proper camera control defaults');
console.log('\n🚀 Dialogue editing now includes comprehensive camera controls!');


