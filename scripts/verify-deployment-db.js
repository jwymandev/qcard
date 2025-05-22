/**
 * Script to verify database connectivity after deployment
 * This script is designed to be run after the deployment process
 * to ensure the database connection is properly configured
 */

// Import required modules
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

// Constants
const MAX_RETRIES = 5;
const RETRY_DELAY = 3000; // 3 seconds

/**
 * Get database URL from environment or from database utility
 */
function getDatabaseUrl() {
  // First check environment variable
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // If not available, try to load from the database utilities
  try {
    // Try to import the database utility
    const dbUtils = require('../src/lib/database-utils');
    if (typeof dbUtils.getDatabaseUrl === 'function') {
      return dbUtils.getDatabaseUrl();
    }
  } catch (error) {
    console.error('Could not import database utilities:', error.message);
  }
  
  return null;
}

/**
 * Verify database connection with retries
 */
async function verifyDatabaseConnection() {
  const databaseUrl = getDatabaseUrl();
  
  if (!databaseUrl) {
    console.error('❌ No DATABASE_URL found in environment or from utilities');
    return false;
  }
  
  // Check if the URL contains placeholders
  if (databaseUrl.includes('${')) {
    console.error('❌ DATABASE_URL contains unresolved placeholders:', databaseUrl);
    return false;
  }

  console.log(`🔍 Attempting to connect to database...`);
  
  let prisma = null;
  try {
    // Create new PrismaClient with the database URL
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl
        }
      }
    });
    
    // Try to connect with retries
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 Connection attempt ${attempt}/${MAX_RETRIES}...`);
        
        // Run a simple query to check connection
        const result = await prisma.$queryRaw`SELECT 1 as check`;
        
        if (result && result[0] && result[0].check === 1) {
          console.log('✅ Database connection successful!');
          
          // Write success marker file
          fs.writeFileSync('.db-connection-verified', new Date().toISOString());
          return true;
        }
      } catch (error) {
        console.error(`❌ Connection attempt ${attempt} failed:`, error.message);
        
        if (attempt < MAX_RETRIES) {
          console.log(`⏱️ Waiting ${RETRY_DELAY/1000} seconds before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }
    
    console.error('❌ All connection attempts failed');
    return false;
  } catch (error) {
    console.error('❌ Failed to initialize Prisma client:', error.message);
    return false;
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting database connectivity verification...');
  
  try {
    const connected = await verifyDatabaseConnection();
    
    if (connected) {
      console.log('✅ Database verification completed successfully');
      process.exit(0);
    } else {
      console.error('❌ Database verification failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Unexpected error during verification:', error);
    process.exit(1);
  }
}

// Run the main function
main();