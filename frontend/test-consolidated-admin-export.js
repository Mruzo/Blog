#!/usr/bin/env node

/**
 * CONSOLIDATED ADMIN EXPORT TESTING SUITE
 * 
 * This consolidated test replaces 4 individual admin export test files:
 * - test-admin-debug-simple.js
 * - test-admin-export-fix.js
 * - test-admin-export-location.js
 * - test-admin-export-troubleshoot.js
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

console.log(`${colors.cyan}${colors.bright}🧪 CONSOLIDATED ADMIN EXPORT TESTING SUITE${colors.reset}`);
console.log(`${colors.blue}Testing all admin export functionality in one comprehensive test${colors.reset}\n`);

// Test 1: Admin Export Actions
function testAdminExportActions() {
  console.log(`${colors.yellow}1️⃣ Testing Admin Export Actions...${colors.reset}`);
  
  const adminPath = '/home/chris/applications/Blog/tilf/admin.py';
  if (!fs.existsSync(adminPath)) {
    console.log(`${colors.red}❌ Django admin.py not found${colors.reset}`);
    return false;
  }
  
  const content = fs.readFileSync(adminPath, 'utf8');
  
  // Check for export actions
  const hasExportComicStories = content.includes('export_comic_stories');
  const hasExportComicStoriesAll = content.includes('export_comic_stories_all');
  const hasExportActions = content.includes('actions = [export_comic_stories, export_comic_stories_all]');
  const hasShortDescription = content.includes('short_description');
  
  console.log(`  ${hasExportComicStories ? '✅' : '❌'} Export comic stories action`);
  console.log(`  ${hasExportComicStoriesAll ? '✅' : '❌'} Export all comic stories action`);
  console.log(`  ${hasExportActions ? '✅' : '❌'} Export actions registered`);
  console.log(`  ${hasShortDescription ? '✅' : '❌'} Action descriptions defined`);
  
  return hasExportComicStories && hasExportComicStoriesAll && hasExportActions && hasShortDescription;
}

// Test 2: Export URL Routing
function testExportURLRouting() {
  console.log(`${colors.yellow}2️⃣ Testing Export URL Routing...${colors.reset}`);
  
  const urlsPath = '/home/chris/applications/Blog/snm/urls.py';
  if (!fs.existsSync(urlsPath)) {
    console.log(`${colors.red}❌ Django urls.py not found${colors.reset}`);
    return false;
  }
  
  const content = fs.readFileSync(urlsPath, 'utf8');
  
  // Check for export URL routing
  const hasDownloadExport = content.includes('download_export');
  const hasAdminTilfPath = content.includes('admin/tilf/download-export/');
  const hasPathImport = content.includes('from django.urls import path');
  
  console.log(`  ${hasDownloadExport ? '✅' : '❌'} Download export view referenced`);
  console.log(`  ${hasAdminTilfPath ? '✅' : '❌'} Admin tilf download path configured`);
  console.log(`  ${hasPathImport ? '✅' : '❌'} Django path import present`);
  
  return hasDownloadExport && hasAdminTilfPath && hasPathImport;
}

// Test 3: Export Data Structure
function testExportDataStructure() {
  console.log(`${colors.yellow}3️⃣ Testing Export Data Structure...${colors.reset}`);
  
  const adminPath = '/home/chris/applications/Blog/tilf/admin.py';
  const content = fs.readFileSync(adminPath, 'utf8');
  
  // Check for export data structure
  const hasExportInfo = content.includes('export_info');
  const hasComicsData = content.includes('comics');
  const hasSeasonsData = content.includes('seasons');
  const hasEpisodesData = content.includes('episodes');
  const hasDialoguesData = content.includes('dialogues');
  const hasJsonResponse = content.includes('JsonResponse') || content.includes('HttpResponse');
  
  console.log(`  ${hasExportInfo ? '✅' : '❌'} Export info metadata`);
  console.log(`  ${hasComicsData ? '✅' : '❌'} Comics data structure`);
  console.log(`  ${hasSeasonsData ? '✅' : '❌'} Seasons data structure`);
  console.log(`  ${hasEpisodesData ? '✅' : '❌'} Episodes data structure`);
  console.log(`  ${hasDialoguesData ? '✅' : '❌'} Dialogues data structure`);
  console.log(`  ${hasJsonResponse ? '✅' : '❌'} JSON response handling`);
  
  return hasExportInfo && hasComicsData && hasSeasonsData && hasEpisodesData && hasDialoguesData && hasJsonResponse;
}

// Test 4: Export File Download
function testExportFileDownload() {
  console.log(`${colors.yellow}4️⃣ Testing Export File Download...${colors.reset}`);
  
  const adminPath = '/home/chris/applications/Blog/tilf/admin.py';
  const content = fs.readFileSync(adminPath, 'utf8');
  
  // Check for file download functionality
  const hasContentDisposition = content.includes('Content-Disposition');
  const hasAttachment = content.includes('attachment');
  const hasFilename = content.includes('filename');
  const hasContentType = content.includes('Content-Type');
  const hasApplicationJson = content.includes('application/json');
  
  console.log(`  ${hasContentDisposition ? '✅' : '❌'} Content-Disposition header`);
  console.log(`  ${hasAttachment ? '✅' : '❌'} Attachment disposition`);
  console.log(`  ${hasFilename ? '✅' : '❌'} Filename specification`);
  console.log(`  ${hasContentType ? '✅' : '❌'} Content-Type header`);
  console.log(`  ${hasApplicationJson ? '✅' : '❌'} JSON content type`);
  
  return hasContentDisposition && hasAttachment && hasFilename && hasContentType && hasApplicationJson;
}

// Test 5: Export Parameters
function testExportParameters() {
  console.log(`${colors.yellow}5️⃣ Testing Export Parameters...${colors.reset}`);
  
  const adminPath = '/home/chris/applications/Blog/tilf/admin.py';
  const content = fs.readFileSync(adminPath, 'utf8');
  
  // Check for export parameters
  const hasTypeParameter = content.includes('type') || content.includes('comic');
  const hasComicIds = content.includes('comic_ids') || content.includes('comic_ids');
  const hasIncludeUnpublished = content.includes('include_unpublished');
  const hasRequestGet = content.includes('request.GET');
  
  console.log(`  ${hasTypeParameter ? '✅' : '❌'} Type parameter handling`);
  console.log(`  ${hasComicIds ? '✅' : '❌'} Comic IDs parameter`);
  console.log(`  ${hasIncludeUnpublished ? '✅' : '❌'} Include unpublished parameter`);
  console.log(`  ${hasRequestGet ? '✅' : '❌'} Request GET parameters`);
  
  return hasTypeParameter && hasComicIds && hasIncludeUnpublished && hasRequestGet;
}

// Run all tests
function runAllTests() {
  console.log(`${colors.cyan}${colors.bright}📊 CONSOLIDATED ADMIN EXPORT TEST RESULTS${colors.reset}\n`);
  
  const tests = [
    { name: 'Admin Export Actions', fn: testAdminExportActions },
    { name: 'Export URL Routing', fn: testExportURLRouting },
    { name: 'Export Data Structure', fn: testExportDataStructure },
    { name: 'Export File Download', fn: testExportFileDownload },
    { name: 'Export Parameters', fn: testExportParameters }
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
    console.log(`\n${colors.green}${colors.bright}🎉 ALL ADMIN EXPORT TESTS PASSED!${colors.reset}`);
    console.log(`${colors.blue}Consolidated test successfully replaces 4 individual test files${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}⚠️ Some admin export tests failed${colors.reset}`);
    console.log(`${colors.yellow}Review the failed tests above${colors.reset}`);
  }
  
  return passed === total;
}

// Execute tests
runAllTests();
