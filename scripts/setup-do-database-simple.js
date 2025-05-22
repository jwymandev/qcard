#!/usr/bin/env node

/**
 * Simple Digital Ocean Database Setup Script
 * 
 * This script handles Digital Ocean database environment variables without
 * trying to be too clever, avoiding issues with template literals and
 * environment variable resolution.
 */

function setupDatabaseUrl() {
  // Check if we're in build mode - use a placeholder
  if (process.env.NEXT_BUILD_SKIP_DB === 'true') {
    console.log('Build mode detected, using placeholder DATABASE_URL');
    process.env.DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
    return process.env.DATABASE_URL;
  }

  // If DATABASE_URL is already set properly, use it
  if (process.env.DATABASE_URL && 
     (process.env.DATABASE_URL.startsWith('postgresql://') || 
      process.env.DATABASE_URL.startsWith('postgres://'))) {
    console.log('Using existing DATABASE_URL');
    return process.env.DATABASE_URL;
  }

  // Check for placeholder values that haven't been resolved
  if (process.env.DATABASE_HOST && process.env.DATABASE_HOST.includes('${')) {
    console.log('Warning: DATABASE_HOST contains placeholder values:', process.env.DATABASE_HOST);
    console.log('Using fallback DATABASE_URL for build');
    process.env.DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
    return process.env.DATABASE_URL;
  }

  // If we have separate connection parameters, use them
  if (process.env.DATABASE_HOST) {
    console.log('Constructing DATABASE_URL from separate parameters');
    
    // Extract values safely
    const host = process.env.DATABASE_HOST || 'localhost';
    const port = process.env.DATABASE_PORT || '5432';
    const username = process.env.DATABASE_USERNAME || 'postgres';
    const password = process.env.DATABASE_PASSWORD || '';
    const dbname = process.env.DATABASE_NAME || 'postgres';
    
    // Construct URL with encoding
    const encodedPassword = encodeURIComponent(password);
    const url = `postgresql://${username}:${encodedPassword}@${host}:${port}/${dbname}?sslmode=require`;
    
    // Set and return
    process.env.DATABASE_URL = url;
    console.log(`Database URL constructed using host: ${host}, port: ${port}`);
    return url;
  }

  // Fallback to default local database URL
  console.log('No database parameters found, using local development DATABASE_URL');
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
  return process.env.DATABASE_URL;
}

// Run the setup
const url = setupDatabaseUrl();

// Export for use in other modules
module.exports = {
  databaseUrl: url
};

// If run directly, output the result
if (require.main === module) {
  console.log('Database URL setup complete');
}