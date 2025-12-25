#!/usr/bin/env node

/**
 * CONSOLIDATED DIALOGUE TESTING SUITE
 * 
 * This consolidated test replaces 5 individual dialogue test files:
 * - test-dialogue-camera-controls.js
 * - test-dialogue-camera-implementation.js
 * - test-dialogue-card-buttons.js
 * - test-dialogue-data-debug.js
 * - test-dialogue-editing-functionality.js
 * - test-dialogue-editing-workflow.js
 * - test-django-dialogue-pattern.js
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

console.log(`${colors.cyan}${colors.bright}🧪 CONSOLIDATED DIALOGUE TESTING SUITE${colors.reset}`);
console.log(`${colors.blue}Testing all dialogue functionality in one comprehensive test${colors.reset}\n`);

// Test 1: Dialogue Camera Controls
function testDialogueCameraControls() {
  console.log(`${colors.yellow}1️⃣ Testing Dialogue Camera Controls...${colors.reset}`);
  
  const episodeManagePath = 'src/pages/EpisodeManage.tsx';
  const content = fs.readFileSync(episodeManagePath, 'utf8');
  
  // Check for dialogue camera controls
  const hasCameraOrbit = content.includes('camera_orbit');
  const hasCameraTarget = content.includes('camera_target');
  const hasFieldOfView = content.includes('field_of_view');
  const hasZoomSpeed = content.includes('zoom_speed');
  const hasRotation = content.includes('rotation');
  const hasShotType = content.includes('shot_type');
  
  console.log(`  ${hasCameraOrbit ? '✅' : '❌'} Camera orbit field`);
  console.log(`  ${hasCameraTarget ? '✅' : '❌'} Camera target field`);
  console.log(`  ${hasFieldOfView ? '✅' : '❌'} Field of view field`);
  console.log(`  ${hasZoomSpeed ? '✅' : '❌'} Zoom speed field`);
  console.log(`  ${hasRotation ? '✅' : '❌'} Rotation field`);
  console.log(`  ${hasShotType ? '✅' : '❌'} Shot type field`);
  
  return hasCameraOrbit && hasCameraTarget && hasFieldOfView && hasZoomSpeed && hasRotation && hasShotType;
}

// Test 2: Dialogue Card Buttons
function testDialogueCardButtons() {
  console.log(`${colors.yellow}2️⃣ Testing Dialogue Card Buttons...${colors.reset}`);
  
  const dialogueCardPath = 'src/components/DialogueCard.tsx';
  const content = fs.readFileSync(dialogueCardPath, 'utf8');
  
  // Check for dialogue card buttons
  const hasEditButton = content.includes('fa-edit') || content.includes('onEdit');
  const hasDeleteButton = content.includes('fa-trash') || content.includes('onDelete');
  const hasButtonActions = content.includes('showActions');
  const hasEditHandler = content.includes('onClick={() => onEdit(dialogue)}');
  const hasDeleteHandler = content.includes('onClick={() => onDelete(dialogue.id)}');
  const hasButtonStyling = content.includes('btn-outline-primary') || content.includes('btn-outline-danger');
  
  console.log(`  ${hasEditButton ? '✅' : '❌'} Edit button`);
  console.log(`  ${hasDeleteButton ? '✅' : '❌'} Delete button`);
  console.log(`  ${hasButtonActions ? '✅' : '❌'} Button actions display`);
  console.log(`  ${hasEditHandler ? '✅' : '❌'} Edit button handler`);
  console.log(`  ${hasDeleteHandler ? '✅' : '❌'} Delete button handler`);
  console.log(`  ${hasButtonStyling ? '✅' : '❌'} Button styling`);
  
  return hasEditButton && hasDeleteButton && hasButtonActions && hasEditHandler && hasDeleteHandler && hasButtonStyling;
}

// Test 3: Dialogue Data Debug
function testDialogueDataDebug() {
  console.log(`${colors.yellow}3️⃣ Testing Dialogue Data Debug...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for dialogue data debug (refined criteria)
  const hasDebugLogging = content.includes('console.log') && content.includes('Dialogue');
  const hasDataValidation = content.includes('dialogueId') && content.includes('data');
  const hasErrorHandling = content.includes('try {') && content.includes('catch');
  const hasDataLogging = content.includes('dialogueData') || content.includes('dialogue data');
  const hasUpdateLogging = content.includes('updateDialogue') && content.includes('console.log');
  const hasValidationLogging = content.includes('Invalid dialogue ID') || content.includes('No data provided');
  
  console.log(`  ${hasDebugLogging ? '✅' : '❌'} Debug logging`);
  console.log(`  ${hasDataValidation ? '✅' : '❌'} Data validation`);
  console.log(`  ${hasErrorHandling ? '✅' : '❌'} Error handling`);
  console.log(`  ${hasDataLogging ? '✅' : '❌'} Data logging`);
  console.log(`  ${hasUpdateLogging ? '✅' : '❌'} Update logging`);
  console.log(`  ${hasValidationLogging ? '✅' : '❌'} Validation logging`);
  
  return hasDebugLogging && hasDataValidation && hasErrorHandling && hasDataLogging && hasValidationLogging;
}

// Test 4: Dialogue Editing Functionality
function testDialogueEditingFunctionality() {
  console.log(`${colors.yellow}4️⃣ Testing Dialogue Editing Functionality...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for dialogue editing
  const hasEditMode = content.includes('isEditMode');
  const hasEditControls = content.includes('edit controls') || content.includes('Edit Controls');
  const hasSliderControls = content.includes('form-range') || content.includes('slider');
  const hasValueBadges = content.includes('value-badge') || content.includes('ValueBadge');
  const hasRealTimeUpdates = content.includes('Real-time') || content.includes('real-time');
  const hasUpdateCameraDebounced = content.includes('updateCameraDebounced');
  
  console.log(`  ${hasEditMode ? '✅' : '❌'} Edit mode state`);
  console.log(`  ${hasEditControls ? '✅' : '❌'} Edit controls display`);
  console.log(`  ${hasSliderControls ? '✅' : '❌'} Slider controls`);
  console.log(`  ${hasValueBadges ? '✅' : '❌'} Value badges`);
  console.log(`  ${hasRealTimeUpdates ? '✅' : '❌'} Real-time updates`);
  console.log(`  ${hasUpdateCameraDebounced ? '✅' : '❌'} Debounced camera updates`);
  
  return hasEditMode && hasEditControls && hasSliderControls && hasValueBadges && hasRealTimeUpdates && hasUpdateCameraDebounced;
}

// Test 5: Dialogue Django Pattern
function testDialogueDjangoPattern() {
  console.log(`${colors.yellow}5️⃣ Testing Dialogue Django Pattern...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for Django pattern implementation
  const hasLoadDialogue = content.includes('loadDialogue');
  const hasShowDialogue = content.includes('showDialogue');
  const hasCameraAnimation = content.includes('animate(') && content.includes('cameraOrbit');
  const hasCameraTarget = content.includes('cameraTarget');
  const hasFieldOfView = content.includes('fieldOfView');
  const hasDjangoPattern = content.includes('Django pattern') || content.includes('Django implementation');
  
  console.log(`  ${hasLoadDialogue ? '✅' : '❌'} Load dialogue function`);
  console.log(`  ${hasShowDialogue ? '✅' : '❌'} Show dialogue function`);
  console.log(`  ${hasCameraAnimation ? '✅' : '❌'} Camera animation`);
  console.log(`  ${hasCameraTarget ? '✅' : '❌'} Camera target setting`);
  console.log(`  ${hasFieldOfView ? '✅' : '❌'} Field of view setting`);
  console.log(`  ${hasDjangoPattern ? '✅' : '❌'} Django pattern implementation`);
  
  return hasLoadDialogue && hasShowDialogue && hasCameraAnimation && hasCameraTarget && hasFieldOfView && hasDjangoPattern;
}

// Test 6: Dialogue Editing Workflow
function testDialogueEditingWorkflow() {
  console.log(`${colors.yellow}6️⃣ Testing Dialogue Editing Workflow...${colors.reset}`);
  
  const comic3dViewerPath = 'src/components/Comic3DViewer.tsx';
  const content = fs.readFileSync(comic3dViewerPath, 'utf8');
  
  // Check for editing workflow
  const hasEditModeToggle = content.includes('setIsEditMode') || content.includes('toggleEditMode');
  const hasCurrentEditingDialogue = content.includes('currentEditingDialogue');
  const hasDialogueData = content.includes('dialogueData');
  const hasEditModeDisplay = content.includes('isEditMode &&') || content.includes('isEditMode ?');
  const hasEditModeControls = content.includes('Edit Controls') || content.includes('edit controls');
  const hasEditModeValidation = content.includes('dialogueData.length > 0');
  
  console.log(`  ${hasEditModeToggle ? '✅' : '❌'} Edit mode toggle`);
  console.log(`  ${hasCurrentEditingDialogue ? '✅' : '❌'} Current editing dialogue`);
  console.log(`  ${hasDialogueData ? '✅' : '❌'} Dialogue data management`);
  console.log(`  ${hasEditModeDisplay ? '✅' : '❌'} Edit mode display`);
  console.log(`  ${hasEditModeControls ? '✅' : '❌'} Edit mode controls`);
  console.log(`  ${hasEditModeValidation ? '✅' : '❌'} Edit mode validation`);
  
  return hasEditModeToggle && hasCurrentEditingDialogue && hasDialogueData && hasEditModeDisplay && hasEditModeControls && hasEditModeValidation;
}

// Run all tests
function runAllTests() {
  console.log(`${colors.cyan}${colors.bright}📊 CONSOLIDATED DIALOGUE TEST RESULTS${colors.reset}\n`);
  
  const tests = [
    { name: 'Dialogue Camera Controls', fn: testDialogueCameraControls },
    { name: 'Dialogue Card Buttons', fn: testDialogueCardButtons },
    { name: 'Dialogue Data Debug', fn: testDialogueDataDebug },
    { name: 'Dialogue Editing Functionality', fn: testDialogueEditingFunctionality },
    { name: 'Dialogue Django Pattern', fn: testDialogueDjangoPattern },
    { name: 'Dialogue Editing Workflow', fn: testDialogueEditingWorkflow }
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
    console.log(`\n${colors.green}${colors.bright}🎉 ALL DIALOGUE TESTS PASSED!${colors.reset}`);
    console.log(`${colors.blue}Consolidated test successfully replaces 7 individual test files${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}⚠️ Some dialogue tests failed${colors.reset}`);
    console.log(`${colors.yellow}Review the failed tests above${colors.reset}`);
  }
  
  return passed === total;
}

// Execute tests
runAllTests();
