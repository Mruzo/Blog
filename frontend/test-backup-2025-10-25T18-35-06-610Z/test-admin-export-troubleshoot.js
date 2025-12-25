#!/usr/bin/env node

/**
 * Test: Django Admin Export Troubleshooting
 * 
 * This test helps troubleshoot why export actions are not showing in Django admin:
 * - Check admin configuration
 * - Verify URL routing
 * - Check for import issues
 * - Provide solutions
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Django Admin Export Troubleshooting...\n');

// Read Django files to check configuration
const djangoAdminFile = '/home/chris/applications/Blog/tilf/admin.py';
const djangoUrlsFile = '/home/chris/applications/Blog/snm/urls.py';

let adminContent = '';
let urlsContent = '';

try {
  adminContent = fs.readFileSync(djangoAdminFile, 'utf8');
  urlsContent = fs.readFileSync(djangoUrlsFile, 'utf8');
} catch (error) {
  console.log('❌ Error reading Django files:', error.message);
  process.exit(1);
}

console.log('🔍 TROUBLESHOOTING DJANGO ADMIN EXPORT ACTIONS\n');

// Test 1: Check if export functions are defined
console.log('1️⃣ Checking Export Function Definitions...');
if (adminContent.includes('def export_comic_stories(') &&
    adminContent.includes('def export_comic_stories_all(') &&
    adminContent.includes('def download_export(')) {
  console.log('✅ PASS: All export functions are defined');
} else {
  console.log('❌ FAIL: Export functions missing');
  if (!adminContent.includes('def export_comic_stories(')) {
    console.log('   - Missing: export_comic_stories function');
  }
  if (!adminContent.includes('def export_comic_stories_all(')) {
    console.log('   - Missing: export_comic_stories_all function');
  }
  if (!adminContent.includes('def download_export(')) {
    console.log('   - Missing: download_export function');
  }
}

// Test 2: Check if actions are properly configured
console.log('\n2️⃣ Checking Admin Actions Configuration...');
if (adminContent.includes('actions = [export_comic_stories, export_comic_stories_all]')) {
  console.log('✅ PASS: Actions are configured in ComicAdmin');
} else {
  console.log('❌ FAIL: Actions not configured in ComicAdmin');
  console.log('   - Expected: actions = [export_comic_stories, export_comic_stories_all]');
}

// Test 3: Check if ComicAdmin is properly registered
console.log('\n3️⃣ Checking ComicAdmin Registration...');
if (adminContent.includes('@admin.register(Comic)') &&
    adminContent.includes('class ComicAdmin(admin.ModelAdmin)')) {
  console.log('✅ PASS: ComicAdmin is properly registered');
} else {
  console.log('❌ FAIL: ComicAdmin not properly registered');
}

// Test 4: Check URL configuration
console.log('\n4️⃣ Checking URL Configuration...');
if (urlsContent.includes('admin/tilf/download-export/') &&
    urlsContent.includes('download_export')) {
  console.log('✅ PASS: Export URL is configured');
} else {
  console.log('❌ FAIL: Export URL not configured');
}

// Test 5: Check admin path configuration
console.log('\n5️⃣ Checking Admin Path Configuration...');
if (urlsContent.includes('uno/') && urlsContent.includes('admin.site.urls')) {
  console.log('✅ PASS: Admin is configured at /uno/ path');
  console.log('   - Admin URL: http://localhost:8000/uno/');
  console.log('   - Comics URL: http://localhost:8000/uno/icvybz/comic/');
} else {
  console.log('❌ FAIL: Admin path not properly configured');
}

console.log('\n🔧 POSSIBLE SOLUTIONS:\n');

console.log('1️⃣ Check Django Server Logs:');
console.log('   - Look for any import errors in Django console');
console.log('   - Check if admin.py is being loaded properly');
console.log('   - Verify no syntax errors in admin.py');

console.log('\n2️⃣ Restart Django Server:');
console.log('   - Stop the Django development server (Ctrl+C)');
console.log('   - Start it again: python manage.py runserver');
console.log('   - Check if actions appear after restart');

console.log('\n3️⃣ Check Admin App Registration:');
console.log('   - Verify tilf app is in INSTALLED_APPS in settings.py');
console.log('   - Check if admin.py is being imported');

console.log('\n4️⃣ Manual Admin Action Test:');
console.log('   - Go to: http://localhost:8000/uno/icvybz/comic/');
console.log('   - Check if "Action" dropdown shows export options');
console.log('   - If not, there might be an import error');

console.log('\n5️⃣ Check for Import Errors:');
console.log('   - Look for errors in Django console when starting server');
console.log('   - Check if all required modules are imported in admin.py');
console.log('   - Verify no circular import issues');

console.log('\n🎯 DEBUGGING STEPS:\n');

console.log('Step 1: Check Django Console Output');
console.log('   - Look for any error messages when starting Django');
console.log('   - Check for import errors related to admin.py');

console.log('\nStep 2: Verify Admin.py Syntax');
console.log('   - Check if there are any syntax errors in admin.py');
console.log('   - Ensure all functions are properly defined');

console.log('\nStep 3: Test Admin Access');
console.log('   - Go to: http://localhost:8000/uno/');
console.log('   - Login with admin credentials');
console.log('   - Navigate to Comics section');

console.log('\nStep 4: Check Action Dropdown');
console.log('   - In Comics list, look for "Action" dropdown');
console.log('   - Should show export options if properly configured');

console.log('\n🚀 QUICK FIX ATTEMPTS:\n');

console.log('1️⃣ Restart Django Server:');
console.log('   - Stop: Ctrl+C');
console.log('   - Start: python manage.py runserver');
console.log('   - Check admin actions again');

console.log('\n2️⃣ Check Django Settings:');
console.log('   - Verify tilf app is in INSTALLED_APPS');
console.log('   - Check if admin.py is being loaded');

console.log('\n3️⃣ Manual Function Test:');
console.log('   - Try accessing: http://localhost:8000/uno/icvybz/download-export/');
console.log('   - Should return JSON or error message');

console.log('\n4️⃣ Check Admin.py Import:');
console.log('   - Verify all imports at top of admin.py are working');
console.log('   - Check for any missing dependencies');

console.log('\n💡 COMMON ISSUES:\n');
console.log('✅ Import errors in admin.py');
console.log('✅ Django server not restarted after changes');
console.log('✅ Admin app not properly registered');
console.log('✅ Syntax errors in admin functions');
console.log('✅ Missing dependencies or imports');

console.log('\n🎯 NEXT STEPS:');
console.log('1. ✅ Check Django console for errors');
console.log('2. ✅ Restart Django server');
console.log('3. ✅ Verify admin.py syntax');
console.log('4. ✅ Check if actions appear in dropdown');
console.log('5. ✅ Test export functionality');
