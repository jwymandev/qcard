#!/usr/bin/env node

/**
 * Database Synchronization Verification Script
 * 
 * This script verifies that the database is properly in sync by:
 * 1. Creating a test user and immediately trying to retrieve it
 * 2. Checking for any replication lag or connection pool issues
 * 3. Verifying database writes are visible to subsequent reads
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

// Create a unique ID for this test run
const testId = crypto.randomUUID().substring(0, 8);
const testEmail = `test-user-${testId}@example.com`;

// Function to fix DATABASE_URL if needed
function setupDatabaseConnection() {
  // If we have the DO database parameters available
  if (process.env.DATABASE_HOST) {
    // Get database connection parameters
    const host = process.env.DATABASE_HOST;
    const port = process.env.DATABASE_PORT || '25060';
    const username = process.env.DATABASE_USERNAME || 'doadmin';
    const password = process.env.DATABASE_PASSWORD || '';
    const dbName = process.env.DATABASE_NAME || 'defaultdb';
    
    // Encode password for URL
    const encodedPassword = encodeURIComponent(password);
    
    // Construct PostgreSQL URL
    const postgresUrl = `postgresql://${username}:${encodedPassword}@${host}:${port}/${dbName}?sslmode=require`;
    
    // Set the environment variable
    process.env.DATABASE_URL = postgresUrl;
    
    console.log(`Using PostgreSQL connection to ${host}:${port}/${dbName}`);
    return postgresUrl;
  } else if (process.env.DATABASE_URL) {
    console.log('Using existing DATABASE_URL');
    return process.env.DATABASE_URL;
  } else {
    console.error('No database connection information found');
    process.exit(1);
  }
}

async function main() {
  console.log('🔍 Starting database synchronization test');
  console.log(`Test ID: ${testId}`);
  console.log(`Test email: ${testEmail}`);
  
  // Setup database connection
  setupDatabaseConnection();
  
  // Create test clients to simulate different connections
  // This helps identify connection pool or replication lag issues
  const writeClient = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
  
  const readClient = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
  
  try {
    // Step 1: Count existing users
    console.log('\nChecking existing users...');
    const initialCount = await readClient.user.count();
    console.log(`Initial user count: ${initialCount}`);
    
    // Step 2: Create a new test user
    console.log('\nCreating test user...');
    
    // First create a tenant
    const tenant = await writeClient.tenant.create({
      data: {
        id: crypto.randomUUID(),
        name: `Test Tenant ${testId}`,
        type: 'TALENT',
        updatedAt: new Date()
      }
    });
    console.log(`Created test tenant with ID: ${tenant.id}`);
    
    // Then create the user
    const testUser = await writeClient.user.create({
      data: {
        id: crypto.randomUUID(),
        email: testEmail,
        firstName: 'Test',
        lastName: `User ${testId}`,
        password: 'testpassword123',
        tenantId: tenant.id,
        updatedAt: new Date()
      }
    });
    console.log(`Created test user with ID: ${testUser.id}`);
    
    // Step 3: Immediately try to retrieve the user with the read client
    console.log('\nAttempting to retrieve user immediately...');
    const immediateUser = await readClient.user.findUnique({
      where: { email: testEmail }
    });
    
    if (immediateUser) {
      console.log('✅ User found immediately! No synchronization issues detected.');
    } else {
      console.log('❌ User NOT found immediately. This indicates a replication lag or connection issue.');
      
      // Step 4: Wait and retry a few times
      console.log('\nWaiting and retrying...');
      let userFound = false;
      
      for (let i = 1; i <= 5; i++) {
        console.log(`Attempt ${i}: Waiting 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const delayedUser = await readClient.user.findUnique({
          where: { email: testEmail }
        });
        
        if (delayedUser) {
          console.log(`✅ User found after ${i} second(s). Replication lag detected.`);
          userFound = true;
          break;
        }
      }
      
      if (!userFound) {
        console.log('❌ User still not found after multiple attempts. Severe synchronization issue detected.');
      }
    }
    
    // Step 5: Try retrieving all users to check counts
    console.log('\nChecking total user count...');
    const finalCount = await readClient.user.count();
    console.log(`Final user count: ${finalCount}`);
    
    if (finalCount > initialCount) {
      console.log('✅ User count increased, indicating writes are visible to count operations.');
    } else {
      console.log('❌ User count did not increase, suggesting inconsistent database state.');
    }
    
    // Step 6: Try a direct connection with a new client
    console.log('\nTrying with a fresh connection...');
    const freshClient = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });
    
    const freshCheck = await freshClient.user.findUnique({
      where: { email: testEmail }
    });
    
    if (freshCheck) {
      console.log('✅ User found with a fresh connection.');
    } else {
      console.log('❌ User NOT found with a fresh connection. This suggests database-level issues.');
    }
    
    await freshClient.$disconnect();
    
    // Cleanup
    console.log('\nCleaning up test data...');
    try {
      await writeClient.user.delete({
        where: { id: testUser.id }
      });
      
      await writeClient.tenant.delete({
        where: { id: tenant.id }
      });
      
      console.log('✅ Test data cleaned up successfully.');
    } catch (cleanupError) {
      console.log(`❌ Error during cleanup: ${cleanupError.message}`);
    }
    
    console.log('\n🔍 Database synchronization test complete');
    
    // Conclusions and recommendations
    console.log('\n📊 Results:');
    if (immediateUser) {
      console.log('✅ DATABASE SYNC: No synchronization issues detected.');
      console.log('The database appears to be working correctly with reads seeing writes immediately.');
    } else {
      console.log('❌ DATABASE SYNC ISSUE DETECTED:');
      console.log('- Writes are not immediately visible to reads');
      console.log('- This can cause login failures after registration');
      console.log('- The issue is likely related to database replication or connection pooling');
      
      console.log('\nRecommended actions:');
      console.log('1. Check if your database has read replicas that may have replication lag');
      console.log('2. Verify connection pooling settings in your database provider');
      console.log('3. Consider using a single connection for critical read-after-write operations');
      console.log('4. For Digital Ocean: Check the database cluster configuration for replication settings');
      console.log('5. As a temporary workaround, add a small delay between registration and redirect to login');
    }
    
  } catch (error) {
    console.error(`\n❌ Error during test: ${error.message}`);
    console.error(error.stack);
  } finally {
    // Disconnect clients
    await writeClient.$disconnect();
    await readClient.$disconnect();
  }
}

main();