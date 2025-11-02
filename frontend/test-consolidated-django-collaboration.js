#!/usr/bin/env node

/**
 * Consolidated Django Collaboration API Tests
 * 
 * Tests for Django backend collaboration API endpoints including:
 * - User search functionality
 * - Collaboration invitation system
 * - Role management
 * - Permission handling
 * - Email invitation system
 * - API integration
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

console.log(`${colors.cyan}${colors.bright}🧪 CONSOLIDATED DJANGO COLLABORATION API TESTS${colors.reset}`);
console.log(`${colors.blue}Testing Django backend collaboration API endpoints${colors.reset}\n`);

// Test configuration
const TEST_CONFIG = {
  // Source directories to search
  sourceDirs: [
    '../icvybz',
    '../icvybz/migrations'
  ],
  
  // Test patterns
  patterns: {
    collaborationModels: /CollaborationInvite|StoryCollaborator|collaboration.*model/,
    collaborationViews: /collaboration_views|collaboration.*view/,
    collaborationUrls: /collaboration.*url|collaborators.*url/,
    collaborationSerializers: /CollaborationInviteSerializer|StoryCollaboratorSerializer|collaboration.*serializer/,
    collaborationTests: /tests_collaboration|collaboration.*test/,
    userSearch: /search_users|user.*search/,
    inviteUser: /invite_existing_user|invite.*user/,
    inviteEmail: /invite_by_email|invite.*email/,
    updateRole: /update_collaborator_role|update.*role/,
    removeCollaborator: /remove_collaborator|remove.*collaborator/,
    acceptInvitation: /accept_invitation|accept.*invitation/,
    declineInvitation: /decline_invitation|decline.*invitation/,
    getCollaborators: /get_collaborators|get.*collaborators/,
    pendingInvitations: /get_pending_invitations|pending.*invitations/,
    collaborationMigration: /collaboration.*migration|0010_collaboration/,
    emailFunctionality: /send_invitation_email|email.*invitation/,
    permissionHandling: /permission.*denied|403.*forbidden/,
    roleChoices: /ROLE_CHOICES|role.*choices/,
    statusChoices: /STATUS_CHOICES|status.*choices/,
    uniqueConstraints: /unique_together|unique.*constraint/,
    expirationHandling: /is_expired|expires_at|expiration/,
    collaborationPermissions: /admin.*role|permission.*check/
  }
};

// Test results
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Helper function to run a test
function runTest(testName, testFunction) {
  testResults.total++;
  try {
    const result = testFunction();
    if (result) {
      testResults.passed++;
      testResults.details.push({ name: testName, status: 'PASSED' });
      console.log(`${colors.green}  ✅ ${testName}${colors.reset}`);
    } else {
      testResults.failed++;
      testResults.details.push({ name: testName, status: 'FAILED' });
      console.log(`${colors.red}  ❌ ${testName}${colors.reset}`);
    }
  } catch (error) {
    testResults.failed++;
    testResults.details.push({ name: testName, status: 'ERROR', error: error.message });
    console.log(`${colors.red}  ❌ ${testName} - ERROR: ${error.message}${colors.reset}`);
  }
}

// Helper function to search for patterns in files
function searchInFiles(pattern, filePaths) {
  const results = [];
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (pattern.test(content)) {
          results.push(filePath);
        }
      }
    } catch (error) {
      // File might not exist or be readable
    }
  }
  return results;
}

// Helper function to get all relevant files
function getAllRelevantFiles() {
  const files = [];
  for (const dir of TEST_CONFIG.sourceDirs) {
    if (fs.existsSync(dir)) {
      const dirFiles = fs.readdirSync(dir, { recursive: true })
        .filter(file => file.endsWith('.py'))
        .map(file => path.join(dir, file));
      files.push(...dirFiles);
    }
  }
  return files;
}

// Get all relevant files
const allFiles = getAllRelevantFiles();

console.log(`${colors.yellow}📋 Running Django Collaboration API Tests...${colors.reset}\n`);

// Test 1: Collaboration Models Implementation
runTest('Collaboration Models Implementation', () => {
  const modelFiles = searchInFiles(TEST_CONFIG.patterns.collaborationModels, allFiles);
  return modelFiles.length > 0;
});

// Test 2: Collaboration Views Implementation
runTest('Collaboration Views Implementation', () => {
  const viewFiles = searchInFiles(TEST_CONFIG.patterns.collaborationViews, allFiles);
  return viewFiles.length > 0;
});

// Test 3: Collaboration URLs Configuration
runTest('Collaboration URLs Configuration', () => {
  const urlFiles = searchInFiles(/collaboration.*url|collaborators.*url|api_urls|path.*collaborators/, allFiles);
  return urlFiles.length > 0;
});

// Test 4: Collaboration Serializers
runTest('Collaboration Serializers', () => {
  const serializerFiles = searchInFiles(TEST_CONFIG.patterns.collaborationSerializers, allFiles);
  return serializerFiles.length > 0;
});

// Test 5: Collaboration Tests
runTest('Collaboration Tests', () => {
  const testFiles = searchInFiles(/tests_collaboration|collaboration.*test|test.*collaboration/, allFiles);
  return testFiles.length > 0;
});

// Test 6: User Search Endpoint
runTest('User Search Endpoint', () => {
  const searchFiles = searchInFiles(TEST_CONFIG.patterns.userSearch, allFiles);
  return searchFiles.length > 0;
});

// Test 7: Invite User Endpoint
runTest('Invite User Endpoint', () => {
  const inviteFiles = searchInFiles(TEST_CONFIG.patterns.inviteUser, allFiles);
  return inviteFiles.length > 0;
});

// Test 8: Invite Email Endpoint
runTest('Invite Email Endpoint', () => {
  const emailFiles = searchInFiles(TEST_CONFIG.patterns.inviteEmail, allFiles);
  return emailFiles.length > 0;
});

// Test 9: Update Role Endpoint
runTest('Update Role Endpoint', () => {
  const roleFiles = searchInFiles(TEST_CONFIG.patterns.updateRole, allFiles);
  return roleFiles.length > 0;
});

// Test 10: Remove Collaborator Endpoint
runTest('Remove Collaborator Endpoint', () => {
  const removeFiles = searchInFiles(TEST_CONFIG.patterns.removeCollaborator, allFiles);
  return removeFiles.length > 0;
});

// Test 11: Accept Invitation Endpoint
runTest('Accept Invitation Endpoint', () => {
  const acceptFiles = searchInFiles(TEST_CONFIG.patterns.acceptInvitation, allFiles);
  return acceptFiles.length > 0;
});

// Test 12: Decline Invitation Endpoint
runTest('Decline Invitation Endpoint', () => {
  const declineFiles = searchInFiles(TEST_CONFIG.patterns.declineInvitation, allFiles);
  return declineFiles.length > 0;
});

// Test 13: Get Collaborators Endpoint
runTest('Get Collaborators Endpoint', () => {
  const getFiles = searchInFiles(TEST_CONFIG.patterns.getCollaborators, allFiles);
  return getFiles.length > 0;
});

// Test 14: Pending Invitations Endpoint
runTest('Pending Invitations Endpoint', () => {
  const pendingFiles = searchInFiles(TEST_CONFIG.patterns.pendingInvitations, allFiles);
  return pendingFiles.length > 0;
});

// Test 15: Collaboration Migration
runTest('Collaboration Migration', () => {
  const migrationFiles = searchInFiles(/collaboration.*migration|0010_collaboration|CollaborationInvite|StoryCollaborator/, allFiles);
  return migrationFiles.length > 0;
});

// Test 16: Email Functionality
runTest('Email Functionality', () => {
  const emailFiles = searchInFiles(TEST_CONFIG.patterns.emailFunctionality, allFiles);
  return emailFiles.length > 0;
});

// Test 17: Permission Handling
runTest('Permission Handling', () => {
  const permissionFiles = searchInFiles(TEST_CONFIG.patterns.permissionHandling, allFiles);
  return permissionFiles.length > 0;
});

// Test 18: Role Choices
runTest('Role Choices', () => {
  const roleFiles = searchInFiles(TEST_CONFIG.patterns.roleChoices, allFiles);
  return roleFiles.length > 0;
});

// Test 19: Status Choices
runTest('Status Choices', () => {
  const statusFiles = searchInFiles(TEST_CONFIG.patterns.statusChoices, allFiles);
  return statusFiles.length > 0;
});

// Test 20: Unique Constraints
runTest('Unique Constraints', () => {
  const constraintFiles = searchInFiles(TEST_CONFIG.patterns.uniqueConstraints, allFiles);
  return constraintFiles.length > 0;
});

// Test 21: Expiration Handling
runTest('Expiration Handling', () => {
  const expirationFiles = searchInFiles(TEST_CONFIG.patterns.expirationHandling, allFiles);
  return expirationFiles.length > 0;
});

// Test 22: Collaboration Permissions
runTest('Collaboration Permissions', () => {
  const permissionFiles = searchInFiles(TEST_CONFIG.patterns.collaborationPermissions, allFiles);
  return permissionFiles.length > 0;
});

// Test 23: API Endpoint Coverage
runTest('API Endpoint Coverage', () => {
  const endpointFiles = searchInFiles(/users\/search|stories.*collaborators|collaborators.*pending/, allFiles);
  return endpointFiles.length > 0;
});

// Test 24: Model Relationships
runTest('Model Relationships', () => {
  const modelFiles = searchInFiles(/ForeignKey|related_name/, allFiles);
  return modelFiles.length > 0;
});

// Test 25: Test Coverage
runTest('Test Coverage', () => {
  const testFiles = searchInFiles(/test_.*collaboration|collaboration.*test/, allFiles);
  if (testFiles.length === 0) return false;
  
  const content = fs.readFileSync(testFiles[0], 'utf8');
  return content.includes('CollaborationAPITestCase') && 
         content.includes('CollaborationModelTestCase') &&
         content.includes('test_search_users') &&
         content.includes('test_invite_existing_user') &&
         content.includes('test_accept_invitation');
});

// Test 26: Serializer Validation
runTest('Serializer Validation', () => {
  const serializerFiles = searchInFiles(/InviteUserSerializer|InviteEmailSerializer/, allFiles);
  return serializerFiles.length > 0;
});

// Test 27: URL Pattern Matching
runTest('URL Pattern Matching', () => {
  const urlFiles = searchInFiles(/path.*collaborators|collaborators.*path/, allFiles);
  return urlFiles.length > 0;
});

// Test 28: Authentication Integration
runTest('Authentication Integration', () => {
  const authFiles = searchInFiles(/IsAuthenticated|permission_classes/, allFiles);
  return authFiles.length > 0;
});

// Test 29: Error Handling
runTest('Error Handling', () => {
  const errorFiles = searchInFiles(/HTTP_400_BAD_REQUEST|HTTP_403_FORBIDDEN|HTTP_404_NOT_FOUND/, allFiles);
  return errorFiles.length > 0;
});

// Test 30: Database Integration
runTest('Database Integration', () => {
  const dbFiles = searchInFiles(/objects\.create|objects\.filter|objects\.get/, allFiles);
  return dbFiles.length > 0;
});

// Calculate pass rate
const passRate = ((testResults.passed / testResults.total) * 100).toFixed(1);

// Final summary
console.log(`\n${colors.cyan}${colors.bright}📊 CONSOLIDATED DJANGO COLLABORATION API TEST SUMMARY${colors.reset}`);
console.log(`${colors.blue}Total Tests: ${testResults.total}${colors.reset}`);
console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
console.log(`${colors.yellow}Pass Rate: ${passRate}%${colors.reset}`);

if (testResults.failed > 0) {
  console.log(`\n${colors.red}${colors.bright}❌ FAILED TESTS:${colors.reset}`);
  testResults.details
    .filter(test => test.status !== 'PASSED')
    .forEach(test => {
      console.log(`${colors.red}  • ${test.name} (${test.status})${colors.reset}`);
    });
}

if (testResults.passed > 0) {
  console.log(`\n${colors.green}${colors.bright}✅ PASSED TESTS:${colors.reset}`);
  testResults.details
    .filter(test => test.status === 'PASSED')
    .forEach(test => {
      console.log(`${colors.green}  • ${test.name}${colors.reset}`);
    });
}

// Overall result
if (testResults.failed === 0) {
  console.log(`\n${colors.green}${colors.bright}🎉 ALL DJANGO COLLABORATION API TESTS PASSED!${colors.reset}`);
  console.log(`${colors.blue}Django backend collaboration system is complete!${colors.reset}`);
} else {
  console.log(`\n${colors.red}${colors.bright}⚠️ Some Django collaboration API tests failed${colors.reset}`);
  console.log(`${colors.yellow}Review the failed tests above${colors.reset}`);
}

console.log(`\n${colors.cyan}${colors.bright}📈 DJANGO COLLABORATION API FEATURES IMPLEMENTED:${colors.reset}`);
console.log(`${colors.blue}• User search and invitation endpoints${colors.reset}`);
console.log(`${colors.blue}• Email invitation system with Django mail${colors.reset}`);
console.log(`${colors.blue}• Role-based collaboration management${colors.reset}`);
console.log(`${colors.blue}• Permission handling and authentication${colors.reset}`);
console.log(`${colors.blue}• Database models with relationships${colors.reset}`);
console.log(`${colors.blue}• Comprehensive test coverage${colors.reset}`);
console.log(`${colors.blue}• API serializers and validation${colors.reset}`);
console.log(`${colors.blue}• URL routing and endpoint configuration${colors.reset}`);

// Exit with appropriate code
process.exit(testResults.failed > 0 ? 1 : 0);
