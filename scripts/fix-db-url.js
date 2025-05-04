#!/usr/bin/env node

/**
 * Database URL Check and Fix Script
 * 
 * This script verifies if the DATABASE_URL environment variable is correctly
 * formatted for PostgreSQL and fixes it if necessary.
 */

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkAndFixDatabaseUrl() {
  log('🔍 Checking DATABASE_URL format...', 'blue');
  
  const currentUrl = process.env.DATABASE_URL;
  
  if (!currentUrl) {
    log('❌ DATABASE_URL is not set!', 'red');
    log('Please set DATABASE_URL environment variable with PostgreSQL connection string:', 'yellow');
    log('Example: postgresql://username:password@host:port/database?sslmode=require', 'yellow');
    return null;
  }
  
  // Check if it's a PostgreSQL URL
  if (currentUrl.startsWith('postgresql://') || currentUrl.startsWith('postgres://')) {
    log('✅ DATABASE_URL is correctly formatted as PostgreSQL URL', 'green');
    
    // Check if it has sslmode=require for DigitalOcean
    if (!currentUrl.includes('sslmode=require') && currentUrl.includes('.db.ondigitalocean.com')) {
      const newUrl = currentUrl.includes('?') 
        ? `${currentUrl}&sslmode=require` 
        : `${currentUrl}?sslmode=require`;
      log('⚠️  Adding sslmode=require for DigitalOcean database', 'yellow');
      return newUrl;
    }
    
    return currentUrl;
  }
  
  // Check if it's SQLite
  if (currentUrl.startsWith('file:') || currentUrl.includes('.db')) {
    log('⚠️  DATABASE_URL appears to be a SQLite connection string!', 'yellow');
    log('Your schema is set for PostgreSQL but the connection string is for SQLite.', 'yellow');
    
    // Check if we have individual database parameters to construct PostgreSQL URL
    const host = process.env.DATABASE_HOST;
    const port = process.env.DATABASE_PORT || '25060';
    const username = process.env.DATABASE_USERNAME;
    const password = process.env.DATABASE_PASSWORD;
    const dbName = process.env.DATABASE_NAME || 'defaultdb';
    
    if (host && username && password) {
      const encodedPassword = encodeURIComponent(password);
      const newUrl = `postgresql://${username}:${encodedPassword}@${host}:${port}/${dbName}?sslmode=require`;
      log(`✅ Constructed new PostgreSQL URL using environment variables`, 'green');
      return newUrl;
    } else {
      log('❌ Cannot construct PostgreSQL URL - missing required environment variables', 'red');
      log('Please set the following environment variables:', 'yellow');
      log('  DATABASE_HOST     - Your database host address', 'yellow');
      log('  DATABASE_USERNAME - Your database username', 'yellow');
      log('  DATABASE_PASSWORD - Your database password', 'yellow');
      log('  DATABASE_PORT     - Your database port (default: 25060)', 'yellow');
      log('  DATABASE_NAME     - Your database name (default: defaultdb)', 'yellow');
      return null;
    }
  }
  
  // Unknown format
  log(`❌ DATABASE_URL has unknown format: ${currentUrl}`, 'red');
  log('It should start with postgresql:// or postgres://', 'yellow');
  return null;
}

// Main function
function main() {
  const fixedUrl = checkAndFixDatabaseUrl();
  
  if (fixedUrl) {
    if (fixedUrl !== process.env.DATABASE_URL) {
      log('\n📝 Updating DATABASE_URL:', 'blue');
      log(`Old value: ${process.env.DATABASE_URL}`, 'yellow');
      log(`New value: ${fixedUrl}`, 'green');
      
      process.env.DATABASE_URL = fixedUrl;
      log('\nℹ️  The environment variable has been updated in the current process.', 'blue');
      log('To make this change permanent, you need to:', 'blue');
      log('1. For local development: Update your .env file', 'reset');
      log('2. For DigitalOcean: Update the environment variable in App Platform settings', 'reset');
      
      // Export for shell script usage
      console.log(`\nexport DATABASE_URL="${fixedUrl}"`);
    } else {
      log('✅ DATABASE_URL is correctly formatted. No changes needed.', 'green');
    }
  }
}

// Run the main function
main();