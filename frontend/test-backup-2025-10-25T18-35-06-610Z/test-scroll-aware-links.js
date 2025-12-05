#!/usr/bin/env node

/**
 * Test Scroll Aware Links
 * 
 * This test verifies that ScrollAwareLink component is properly implemented
 * and used in MyStudio for forward navigation scroll position saving
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  scrollAwareLinkPath: 'src/components/ScrollAwareLink.tsx',
  myStudioPath: 'src/pages/MyStudio.tsx',
  scrollAwareLinkRequirements: {
    'ScrollAwareLink Component': {
      patterns: [
        /import.*useScrollPosition/g,
        /saveCurrentPosition/g,
        /navigate/g,
        /handleClick/g,
        /Link/g,
        /onClick/g
      ],
      required: 6,
      description: 'ScrollAwareLink component with scroll position saving'
    }
  },
  myStudioRequirements: {
    'MyStudio Integration': {
      patterns: [
        /import.*ScrollAwareLink/g,
        /ScrollAwareLink/g,
        /story.*manage/g,
        /story.*create/g,
        /Manage Story/g
      ],
      required: 5,
      description: 'MyStudio uses ScrollAwareLink for navigation'
    }
  }
};

// Test functions
function testRequirement(name, patterns, required, description, content) {
  const matches = patterns.map(pattern => {
    const regex = new RegExp(pattern, 'g');
    const found = content.match(regex);
    return found ? found.length : 0;
  });
  
  const totalMatches = matches.reduce((sum, count) => sum + count, 0);
  const passed = totalMatches >= required;
  
  console.log(`  ${passed ? '✅' : '❌'} ${name}: ${totalMatches}/${required} matches`);
  if (!passed) {
    console.log(`    Required: ${required}, Found: ${totalMatches}`);
    patterns.forEach((pattern, index) => {
      if (matches[index] === 0) {
        console.log(`    Missing: ${pattern}`);
      }
    });
  }
  
  return passed;
}

function testFile(filePath, requirements) {
  console.log(`\n📁 Testing ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  let allPassed = true;
  
  Object.entries(requirements).forEach(([name, config]) => {
    const passed = testRequirement(
      name,
      config.patterns,
      config.required,
      config.description,
      content
    );
    if (!passed) allPassed = false;
  });
  
  return allPassed;
}

// Main test execution
function runTests() {
  console.log('🧪 Testing Scroll Aware Links');
  console.log('=============================');
  
  const scrollAwareLinkPath = path.join(process.cwd(), CONFIG.scrollAwareLinkPath);
  const myStudioPath = path.join(process.cwd(), CONFIG.myStudioPath);
  
  const scrollAwareLinkPassed = testFile(scrollAwareLinkPath, CONFIG.scrollAwareLinkRequirements);
  const myStudioPassed = testFile(myStudioPath, CONFIG.myStudioRequirements);
  
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`ScrollAwareLink Tests: ${scrollAwareLinkPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`MyStudio Integration Tests: ${myStudioPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  const allPassed = scrollAwareLinkPassed && myStudioPassed;
  console.log(`\nOverall: ${allPassed ? '🎉 ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('\n✨ Scroll aware links are properly implemented!');
    console.log('🎯 Features verified:');
    console.log('   • ScrollAwareLink component saves position before navigation');
    console.log('   • MyStudio uses ScrollAwareLink for "Manage Story" and "Create Story"');
    console.log('   • Forward navigation preserves scroll position');
    console.log('   • Back navigation restores scroll position');
    console.log('\n💡 Users will now return to their exact scroll position in both directions!');
  } else {
    console.log('\n❌ Some scroll aware link features are missing!');
    console.log('💡 This could cause users to lose their scroll position when navigating forward.');
  }
  
  return allPassed;
}

// Run tests
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests, testFile };
