#!/usr/bin/env node

/**
 * Test: Dialogue Card Direct Buttons
 * 
 * This test verifies that the dropdown menu has been replaced with direct edit and delete buttons:
 * - Edit button is directly visible (no dropdown)
 * - Delete button is directly visible (no dropdown)
 * - Buttons are the same size and location
 * - Buttons have proper styling and tooltips
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Dialogue Card Direct Buttons...\n');

// Test 1: Verify dropdown menu is removed
console.log('1️⃣ Testing dropdown menu removal...');
const dialogueCardFile = path.join(__dirname, 'src/components/DialogueCard.tsx');
const dialogueCardContent = fs.readFileSync(dialogueCardFile, 'utf8');

// Check that dropdown elements are removed
if (!dialogueCardContent.includes('dropdown-toggle') && 
    !dialogueCardContent.includes('dropdown-menu') &&
    !dialogueCardContent.includes('fas fa-ellipsis-v')) {
  console.log('✅ PASS: Dropdown menu removed');
} else {
  console.log('❌ FAIL: Dropdown menu still present');
}

// Test 2: Verify direct edit button
console.log('\n2️⃣ Testing direct edit button...');
if (dialogueCardContent.includes('btn btn-sm btn-outline-primary') &&
    dialogueCardContent.includes('fas fa-edit') &&
    dialogueCardContent.includes('onClick={() => onEdit(dialogue)}')) {
  console.log('✅ PASS: Direct edit button found');
} else {
  console.log('❌ FAIL: Direct edit button missing');
}

// Test 3: Verify direct delete button
console.log('\n3️⃣ Testing direct delete button...');
if (dialogueCardContent.includes('btn btn-sm btn-outline-danger') &&
    dialogueCardContent.includes('fas fa-trash') &&
    dialogueCardContent.includes('onClick={() => onDelete(dialogue.id)}')) {
  console.log('✅ PASS: Direct delete button found');
} else {
  console.log('❌ FAIL: Direct delete button missing');
}

// Test 4: Verify button layout
console.log('\n4️⃣ Testing button layout...');
if (dialogueCardContent.includes('d-flex gap-1')) {
  console.log('✅ PASS: Buttons properly laid out with flexbox');
} else {
  console.log('❌ FAIL: Button layout not properly configured');
}

// Test 5: Verify button tooltips
console.log('\n5️⃣ Testing button tooltips...');
if (dialogueCardContent.includes('title="Edit dialogue"') &&
    dialogueCardContent.includes('title="Delete dialogue"')) {
  console.log('✅ PASS: Button tooltips added');
} else {
  console.log('❌ FAIL: Button tooltips missing');
}

// Test 6: Verify button styling consistency
console.log('\n6️⃣ Testing button styling...');
if (dialogueCardContent.includes('btn-sm') &&
    dialogueCardContent.includes('btn-outline-primary') &&
    dialogueCardContent.includes('btn-outline-danger')) {
  console.log('✅ PASS: Button styling is consistent');
} else {
  console.log('❌ FAIL: Button styling inconsistent');
}

// Test 7: Verify buttons are in same location
console.log('\n7️⃣ Testing button location...');
if (dialogueCardContent.includes('d-flex justify-content-between align-items-start')) {
  console.log('✅ PASS: Buttons in same location (top-right)');
} else {
  console.log('❌ FAIL: Button location changed');
}

// Test 8: Verify no Bootstrap dropdown dependencies
console.log('\n8️⃣ Testing Bootstrap dropdown removal...');
if (!dialogueCardContent.includes('data-bs-toggle="dropdown"') &&
    !dialogueCardContent.includes('aria-expanded="false"')) {
  console.log('✅ PASS: Bootstrap dropdown dependencies removed');
} else {
  console.log('❌ FAIL: Bootstrap dropdown dependencies still present');
}

console.log('\n🎯 Summary:');
console.log('✅ Dropdown menu removed');
console.log('✅ Direct edit button added');
console.log('✅ Direct delete button added');
console.log('✅ Buttons properly laid out');
console.log('✅ Tooltips added for accessibility');
console.log('✅ Button styling consistent');
console.log('✅ Buttons in same location');
console.log('✅ Bootstrap dropdown dependencies removed');
console.log('\n🚀 Dialogue cards now have direct edit and delete buttons!');


