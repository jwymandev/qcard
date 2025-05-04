#!/usr/bin/env node

/**
 * Database connection script that runs before app startup
 * This script ensures DATABASE_URL is properly set for PostgreSQL 
 * when running in DigitalOcean environment
 */

// Check and fix DATABASE_URL before app startup
function fixDatabaseUrl() {
  // If we're using PostgreSQL but DATABASE_URL is in SQLite format
  if (process.env.DATABASE_URL?.startsWith('file:') || 
      (!process.env.DATABASE_URL?.startsWith('postgresql://') && 
       !process.env.DATABASE_URL?.startsWith('postgres://'))) {
    
    console.log('⚠️ Non-PostgreSQL DATABASE_URL detected, checking for DO parameters...');
    
    // Check if we have the DO database parameters available
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
      
      console.log(`✅ Fixed DATABASE_URL: Using PostgreSQL connection to ${host}:${port}/${dbName}`);
      return true;
    } else {
      // No DO parameters, likely local development with SQLite
      console.log('ℹ️ No DigitalOcean DB parameters found, using existing DATABASE_URL');
      return false;
    }
  } else if (process.env.DATABASE_URL?.startsWith('postgresql://') || 
             process.env.DATABASE_URL?.startsWith('postgres://')) {
    // Already a PostgreSQL URL
    console.log('✅ Valid PostgreSQL DATABASE_URL detected');
    return true;
  } else {
    console.error('❌ No valid DATABASE_URL found and no parameters to construct one');
    return false;
  }
}

// Export for use in the app
module.exports = { fixDatabaseUrl };

// If run directly, execute the function
if (require.main === module) {
  fixDatabaseUrl();
}