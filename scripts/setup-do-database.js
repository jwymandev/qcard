#!/usr/bin/env node

/**
 * Digital Ocean Database Setup Script
 * 
 * This script properly configures DATABASE_URL from individual 
 * Digital Ocean environment variables, handling special characters
 * and port formatting issues.
 */

function setupDatabaseUrl() {
  console.log('Setting up database connection for Digital Ocean...');
  
  // Check if we need to construct a DATABASE_URL
  if (process.env.DATABASE_URL &&
      (process.env.DATABASE_URL.startsWith('postgresql://') || 
       process.env.DATABASE_URL.startsWith('postgres://'))) {
    console.log('Using existing DATABASE_URL');
    return process.env.DATABASE_URL;
  }
  
  // Check if we have the Digital Ocean components
  if (!process.env.DATABASE_HOST) {
    console.log('No DATABASE_HOST found, skipping DATABASE_URL construction');
    return process.env.DATABASE_URL || '';
  }
  
  console.log('Constructing DATABASE_URL from Digital Ocean environment variables...');
  
  // Extract raw values
  const host = process.env.DATABASE_HOST || '';
  const port = process.env.DATABASE_PORT || '25060';
  const username = process.env.DATABASE_USERNAME || 'doadmin';
  const password = process.env.DATABASE_PASSWORD || '';
  const dbName = process.env.DATABASE_NAME || 'defaultdb';
  
  // Log components (without password)
  console.log(`- Database Host: ${host}`);
  console.log(`- Database Port: ${port}`);
  console.log(`- Database Name: ${dbName}`);
  console.log(`- Database User: ${username}`);
  
  // Encode password for URL
  const encodedPassword = encodeURIComponent(password);
  
  // Construct the URL
  const url = `postgresql://${username}:${encodedPassword}@${host}:${port}/${dbName}?sslmode=require`;
  
  // Set the environment variable
  process.env.DATABASE_URL = url;
  
  console.log(`DATABASE_URL constructed successfully`);
  return url;
}

// Run the setup
const url = setupDatabaseUrl();

// Export the URL for other scripts to use
module.exports = {
  databaseUrl: url
};

// If run directly, print success message
if (require.main === module) {
  console.log('Database URL setup complete.');
}