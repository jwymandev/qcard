/**
 * Test script to verify the database verification functionality
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Main test function
async function runTest() {
  console.log('=== Testing Database Verification ===');
  
  try {
    // 1. Test the verify-deployment-db script directly
    console.log('\n1. Testing verify-deployment-db script directly:');
    try {
      execSync('node scripts/verify-deployment-db.js', { stdio: 'inherit' });
      console.log('✅ Direct verification test completed');
    } catch (error) {
      console.error('❌ Direct verification test failed:', error.message);
    }
    
    // 2. Test with the db:verify-deployment npm script
    console.log('\n2. Testing db:verify-deployment npm script:');
    try {
      execSync('npm run db:verify-deployment', { stdio: 'inherit' });
      console.log('✅ NPM script verification test completed');
    } catch (error) {
      console.error('❌ NPM script verification test failed:', error.message);
    }
    
    // 3. Check if verification marker file was created
    console.log('\n3. Checking for verification marker file:');
    if (fs.existsSync('.db-connection-verified')) {
      const fileContent = fs.readFileSync('.db-connection-verified', 'utf8');
      console.log(`✅ Verification marker found, created at: ${fileContent}`);
    } else {
      console.log('❌ No verification marker file found');
    }
    
    // 4. Test database URL detection with different configurations
    console.log('\n4. Testing database URL detection with different configurations:');
    
    // Save current DATABASE_URL
    const originalDbUrl = process.env.DATABASE_URL;
    
    // Test with placeholder URL
    process.env.DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
    console.log('Set DATABASE_URL to placeholder value');
    try {
      execSync('node -e "const verify = require(\'./scripts/verify-deployment-db\'); console.log(\'Module loaded\')"', 
        { stdio: 'inherit' });
      console.log('✅ Script loads with placeholder DATABASE_URL');
    } catch (error) {
      console.error('❌ Script failed to load with placeholder DATABASE_URL:', error.message);
    }
    
    // Test with unresolved placeholder
    process.env.DATABASE_URL = 'postgresql://user:pass@${db-hostname}:5432/dbname';
    console.log('Set DATABASE_URL to value with unresolved placeholder');
    try {
      execSync('node -e "const verify = require(\'./scripts/verify-deployment-db\'); console.log(\'Module loaded\')"', 
        { stdio: 'inherit' });
      console.log('✅ Script loads with unresolved placeholder in DATABASE_URL');
    } catch (error) {
      console.error('❌ Script failed to load with unresolved placeholder in DATABASE_URL:', error.message);
    }
    
    // Restore original DATABASE_URL
    if (originalDbUrl) {
      process.env.DATABASE_URL = originalDbUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
    
    console.log('\n=== Database Verification Test Completed ===');
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
runTest();