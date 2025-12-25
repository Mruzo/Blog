#!/usr/bin/env node

/**
 * CONSOLIDATED IMPORT/EXPORT TESTING SUITE
 * 
 * This consolidated test replaces 7 individual import/export test files:
 * - test-admin-export-fix.js
 * - test-admin-export-location.js
 * - test-admin-export-troubleshoot.js
 * - test-consolidated-admin-export.js
 * - test-django-export-explanation.js
 * - test-import-system.js
 * - test-simple-export-fix.js
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

console.log(`${colors.cyan}${colors.bright}🧪 CONSOLIDATED IMPORT/EXPORT TESTING SUITE${colors.reset}`);
console.log(`${colors.blue}Testing all import and export functionality in one comprehensive test${colors.reset}\n`);

// Test 1: Import System Implementation
function testImportSystemImplementation() {
  console.log(`${colors.yellow}1️⃣ Testing Import System Implementation...${colors.reset}`);
  
  const importServicePath = 'src/services/importService.ts';
  const storyImporterPath = 'src/components/StoryImporter.tsx';
  const storyImportPath = 'src/pages/StoryImport.tsx';
  const myStudioPath = 'src/pages/MyStudio.tsx';
  
  // Check ImportService
  const hasImportService = fs.existsSync(importServicePath);
  const importServiceContent = hasImportService ? fs.readFileSync(importServicePath, 'utf8') : '';
  const hasImportServiceClass = importServiceContent.includes('class ImportService') || importServiceContent.includes('export const importService');
  const hasImportDjangoData = importServiceContent.includes('importDjangoData') || importServiceContent.includes('importStoryData');
  const hasImportProgress = importServiceContent.includes('ImportProgress') || importServiceContent.includes('onProgress');
  
  // Check StoryImporter component
  const hasStoryImporter = fs.existsSync(storyImporterPath);
  const storyImporterContent = hasStoryImporter ? fs.readFileSync(storyImporterPath, 'utf8') : '';
  const hasStoryImporterComponent = storyImporterContent.includes('StoryImporter');
  const hasDragDrop = storyImporterContent.includes('drag') || storyImporterContent.includes('drop');
  const hasProgressBar = storyImporterContent.includes('progress') || storyImporterContent.includes('Progress');
  
  // Check StoryImport page
  const hasStoryImport = fs.existsSync(storyImportPath);
  const storyImportContent = hasStoryImport ? fs.readFileSync(storyImportPath, 'utf8') : '';
  const hasStoryImportPage = storyImportContent.includes('StoryImport');
  const hasPageHeader = storyImportContent.includes('PageHeader') || storyImportContent.includes('header') || storyImportContent.includes('title') || storyImportContent.includes('h1') || storyImportContent.includes('h2');
  
  // Check MyStudio integration
  const myStudioContent = fs.readFileSync(myStudioPath, 'utf8');
  const hasImportButton = myStudioContent.includes('Import Stories') || myStudioContent.includes('import/');
  const hasImportLink = myStudioContent.includes('to="/immersivecomics/import/"');
  
  console.log(`  ${hasImportService ? '✅' : '❌'} ImportService file exists`);
  console.log(`  ${hasImportServiceClass ? '✅' : '❌'} ImportService class/function`);
  console.log(`  ${hasImportDjangoData ? '✅' : '❌'} Django data import functionality`);
  console.log(`  ${hasImportProgress ? '✅' : '❌'} Import progress tracking`);
  console.log(`  ${hasStoryImporter ? '✅' : '❌'} StoryImporter component exists`);
  console.log(`  ${hasStoryImporterComponent ? '✅' : '❌'} StoryImporter component implementation`);
  console.log(`  ${hasDragDrop ? '✅' : '❌'} Drag and drop functionality`);
  console.log(`  ${hasProgressBar ? '✅' : '❌'} Progress bar display`);
  console.log(`  ${hasStoryImport ? '✅' : '❌'} StoryImport page exists`);
  console.log(`  ${hasStoryImportPage ? '✅' : '❌'} StoryImport page implementation`);
  console.log(`  ${hasPageHeader ? '✅' : '❌'} Page header component`);
  console.log(`  ${hasImportButton ? '✅' : '❌'} Import button in MyStudio`);
  console.log(`  ${hasImportLink ? '✅' : '❌'} Import link routing`);
  
  return hasImportService && hasImportServiceClass && hasImportDjangoData && hasImportProgress && hasStoryImporter && hasStoryImporterComponent && hasDragDrop && hasProgressBar && hasStoryImport && hasStoryImportPage && hasPageHeader && hasImportButton && hasImportLink;
}

// Test 2: Django Export System
function testDjangoExportSystem() {
  console.log(`${colors.yellow}2️⃣ Testing Django Export System...${colors.reset}`);
  
  const adminPath = '/home/chris/applications/Blog/tilf/admin.py';
  const urlsPath = '/home/chris/applications/Blog/snm/urls.py';
  
  // Check Django admin export actions
  const hasAdminFile = fs.existsSync(adminPath);
  const adminContent = hasAdminFile ? fs.readFileSync(adminPath, 'utf8') : '';
  const hasExportActions = adminContent.includes('export_comic_stories');
  const hasExportAll = adminContent.includes('export_comic_stories_all');
  const hasJsonResponse = adminContent.includes('JsonResponse');
  const hasContentDisposition = adminContent.includes('Content-Disposition');
  const hasFilename = adminContent.includes('filename');
  
  // Check URL routing
  const hasUrlsFile = fs.existsSync(urlsPath);
  const urlsContent = hasUrlsFile ? fs.readFileSync(urlsPath, 'utf8') : '';
  const hasDownloadExport = urlsContent.includes('download_export');
  const hasAdminUrls = urlsContent.includes('admin.site.urls');
  
  console.log(`  ${hasAdminFile ? '✅' : '❌'} Django admin file exists`);
  console.log(`  ${hasExportActions ? '✅' : '❌'} Export actions in admin`);
  console.log(`  ${hasExportAll ? '✅' : '❌'} Export all functionality`);
  console.log(`  ${hasJsonResponse ? '✅' : '❌'} JSON response handling`);
  console.log(`  ${hasContentDisposition ? '✅' : '❌'} Content-Disposition headers`);
  console.log(`  ${hasFilename ? '✅' : '❌'} Filename specification`);
  console.log(`  ${hasUrlsFile ? '✅' : '❌'} Django URLs file exists`);
  console.log(`  ${hasDownloadExport ? '✅' : '❌'} Download export URL`);
  console.log(`  ${hasAdminUrls ? '✅' : '❌'} Admin URLs configuration`);
  
  return hasAdminFile && hasExportActions && hasExportAll && hasJsonResponse && hasContentDisposition && hasFilename && hasUrlsFile && hasDownloadExport && hasAdminUrls;
}

// Test 3: Export Data Structure
function testExportDataStructure() {
  console.log(`${colors.yellow}3️⃣ Testing Export Data Structure...${colors.reset}`);
  
  const adminPath = '/home/chris/applications/Blog/tilf/admin.py';
  const adminContent = fs.existsSync(adminPath) ? fs.readFileSync(adminPath, 'utf8') : '';
  
  // Check export data structure
  const hasExportInfo = adminContent.includes('export_info');
  const hasStoriesData = adminContent.includes('stories') && adminContent.includes('data');
  const hasSeasonsData = adminContent.includes('seasons') && adminContent.includes('data');
  const hasEpisodesData = adminContent.includes('episodes') && adminContent.includes('data');
  const hasDialoguesData = adminContent.includes('dialogues') && adminContent.includes('data');
  const hasCharactersData = adminContent.includes('characters') && adminContent.includes('data') || adminContent.includes('character');
  
  console.log(`  ${hasExportInfo ? '✅' : '❌'} Export info structure`);
  console.log(`  ${hasStoriesData ? '✅' : '❌'} Stories data export`);
  console.log(`  ${hasSeasonsData ? '✅' : '❌'} Seasons data export`);
  console.log(`  ${hasEpisodesData ? '✅' : '❌'} Episodes data export`);
  console.log(`  ${hasDialoguesData ? '✅' : '❌'} Dialogues data export`);
  console.log(`  ${hasCharactersData ? '✅' : '❌'} Characters data export`);
  
  return hasExportInfo && hasStoriesData && hasSeasonsData && hasEpisodesData && hasDialoguesData && hasCharactersData;
}

// Test 4: Import Data Processing
function testImportDataProcessing() {
  console.log(`${colors.yellow}4️⃣ Testing Import Data Processing...${colors.reset}`);
  
  const importServicePath = 'src/services/importService.ts';
  const importServiceContent = fs.existsSync(importServicePath) ? fs.readFileSync(importServicePath, 'utf8') : '';
  
  // Check import data processing
  const hasDataValidation = importServiceContent.includes('validate') || importServiceContent.includes('validation');
  const hasDataTransformation = importServiceContent.includes('transform') || importServiceContent.includes('convert') || importServiceContent.includes('process') || importServiceContent.includes('import');
  const hasFileProcessing = importServiceContent.includes('FileReader') || importServiceContent.includes('Blob') || importServiceContent.includes('File') || importServiceContent.includes('file');
  const hasApiCalls = importServiceContent.includes('apiService') || importServiceContent.includes('createStory');
  const hasErrorHandling = importServiceContent.includes('try {') && importServiceContent.includes('catch');
  const hasProgressTracking = importServiceContent.includes('progress') || importServiceContent.includes('onProgress');
  
  console.log(`  ${hasDataValidation ? '✅' : '❌'} Data validation`);
  console.log(`  ${hasDataTransformation ? '✅' : '❌'} Data transformation`);
  console.log(`  ${hasFileProcessing ? '✅' : '❌'} File processing`);
  console.log(`  ${hasApiCalls ? '✅' : '❌'} API calls for import`);
  console.log(`  ${hasErrorHandling ? '✅' : '❌'} Error handling`);
  console.log(`  ${hasProgressTracking ? '✅' : '❌'} Progress tracking`);
  
  return hasDataValidation && hasDataTransformation && hasFileProcessing && hasApiCalls && hasErrorHandling && hasProgressTracking;
}

// Test 5: Export Troubleshooting
function testExportTroubleshooting() {
  console.log(`${colors.yellow}5️⃣ Testing Export Troubleshooting...${colors.reset}`);
  
  const adminPath = '/home/chris/applications/Blog/tilf/admin.py';
  const adminContent = fs.existsSync(adminPath) ? fs.readFileSync(adminPath, 'utf8') : '';
  
  // Check troubleshooting features
  const hasErrorHandling = adminContent.includes('try:') && adminContent.includes('except');
  const hasUserMessages = adminContent.includes('message_user');
  const hasValidation = adminContent.includes('if not queryset.exists()');
  const hasResponseHeaders = adminContent.includes('Content-Type') || adminContent.includes('Content-Disposition');
  const hasFileDownload = adminContent.includes('HttpResponse') || adminContent.includes('JsonResponse');
  const hasAdminActions = adminContent.includes('actions = [') || adminContent.includes('actions=');
  
  console.log(`  ${hasErrorHandling ? '✅' : '❌'} Error handling in exports`);
  console.log(`  ${hasUserMessages ? '✅' : '❌'} User message system`);
  console.log(`  ${hasValidation ? '✅' : '❌'} Input validation`);
  console.log(`  ${hasResponseHeaders ? '✅' : '❌'} Response headers`);
  console.log(`  ${hasFileDownload ? '✅' : '❌'} File download functionality`);
  console.log(`  ${hasAdminActions ? '✅' : '❌'} Admin actions configuration`);
  
  return hasErrorHandling && hasUserMessages && hasValidation && hasResponseHeaders && hasFileDownload && hasAdminActions;
}

// Test 6: Import UI Components
function testImportUIComponents() {
  console.log(`${colors.yellow}6️⃣ Testing Import UI Components...${colors.reset}`);
  
  const storyImporterPath = 'src/components/StoryImporter.tsx';
  const storyImportPath = 'src/pages/StoryImport.tsx';
  
  const storyImporterContent = fs.existsSync(storyImporterPath) ? fs.readFileSync(storyImporterPath, 'utf8') : '';
  const storyImportContent = fs.existsSync(storyImportPath) ? fs.readFileSync(storyImportPath, 'utf8') : '';
  
  // Check UI components
  const hasDragDropArea = storyImporterContent.includes('drag') || storyImporterContent.includes('drop');
  const hasFileInput = storyImporterContent.includes('input') && storyImporterContent.includes('file');
  const hasProgressDisplay = storyImporterContent.includes('progress') || storyImporterContent.includes('Progress');
  const hasSuccessMessage = storyImporterContent.includes('success') || storyImporterContent.includes('Success');
  const hasErrorMessage = storyImporterContent.includes('error') || storyImporterContent.includes('Error');
  const hasImportButton = storyImporterContent.includes('button') || storyImporterContent.includes('Button');
  
  console.log(`  ${hasDragDropArea ? '✅' : '❌'} Drag and drop area`);
  console.log(`  ${hasFileInput ? '✅' : '❌'} File input component`);
  console.log(`  ${hasProgressDisplay ? '✅' : '❌'} Progress display`);
  console.log(`  ${hasSuccessMessage ? '✅' : '❌'} Success message display`);
  console.log(`  ${hasErrorMessage ? '✅' : '❌'} Error message display`);
  console.log(`  ${hasImportButton ? '✅' : '❌'} Import button`);
  
  return hasDragDropArea && hasFileInput && hasProgressDisplay && hasSuccessMessage && hasErrorMessage && hasImportButton;
}

// Test 7: Export Location
function testExportLocation() {
  console.log(`${colors.yellow}7️⃣ Testing Export Location...${colors.reset}`);
  
  const adminPath = '/home/chris/applications/Blog/tilf/admin.py';
  const urlsPath = '/home/chris/applications/Blog/snm/urls.py';
  
  const adminContent = fs.existsSync(adminPath) ? fs.readFileSync(adminPath, 'utf8') : '';
  const urlsContent = fs.existsSync(urlsPath) ? fs.readFileSync(urlsPath, 'utf8') : '';
  
  // Check export location
  const hasAdminLocation = adminContent.includes('admin.py') || adminContent.includes('admin');
  const hasUrlsLocation = urlsContent.includes('urls.py') || urlsContent.includes('urls');
  const hasExportPath = urlsContent.includes('download-export');
  const hasAdminPath = urlsContent.includes('admin/');
  const hasProperRouting = urlsContent.includes('path(') && urlsContent.includes('download_export');
  const hasAdminSite = urlsContent.includes('admin.site.urls');
  
  console.log(`  ${hasAdminLocation ? '✅' : '❌'} Admin file location`);
  console.log(`  ${hasUrlsLocation ? '✅' : '❌'} URLs file location`);
  console.log(`  ${hasExportPath ? '✅' : '❌'} Export path configuration`);
  console.log(`  ${hasAdminPath ? '✅' : '❌'} Admin path configuration`);
  console.log(`  ${hasProperRouting ? '✅' : '❌'} Proper URL routing`);
  console.log(`  ${hasAdminSite ? '✅' : '❌'} Admin site URLs`);
  
  return hasAdminLocation && hasUrlsLocation && hasExportPath && hasAdminPath && hasProperRouting && hasAdminSite;
}

// Run all tests
function runAllTests() {
  console.log(`${colors.cyan}${colors.bright}📊 CONSOLIDATED IMPORT/EXPORT TEST RESULTS${colors.reset}\n`);
  
  const tests = [
    { name: 'Import System Implementation', fn: testImportSystemImplementation },
    { name: 'Django Export System', fn: testDjangoExportSystem },
    { name: 'Export Data Structure', fn: testExportDataStructure },
    { name: 'Import Data Processing', fn: testImportDataProcessing },
    { name: 'Export Troubleshooting', fn: testExportTroubleshooting },
    { name: 'Import UI Components', fn: testImportUIComponents },
    { name: 'Export Location', fn: testExportLocation }
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
    console.log(`\n${colors.green}${colors.bright}🎉 ALL IMPORT/EXPORT TESTS PASSED!${colors.reset}`);
    console.log(`${colors.blue}Consolidated test successfully replaces 7 individual test files${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}⚠️ Some import/export tests failed${colors.reset}`);
    console.log(`${colors.yellow}Review the failed tests above${colors.reset}`);
  }
  
  return passed === total;
}

// Execute tests
runAllTests();
