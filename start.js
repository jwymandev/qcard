#!/usr/bin/env node

/**
 * DigitalOcean custom start script
 * Ensures database connection is properly configured before starting Next.js
 */

// Add database connection initialization
const { existsSync } = require('fs');
const { resolve } = require('path');
const { spawnSync } = require('child_process');

console.log('Initializing QCard production server...');

// Initialize database
function ensureDatabaseConnection() {
  try {
    // Check if DATABASE_URL is properly formatted for PostgreSQL
    if (process.env.DATABASE_URL) {
      if (!process.env.DATABASE_URL.startsWith('postgresql://') && 
          !process.env.DATABASE_URL.startsWith('postgres://')) {
        console.log('⚠️ DATABASE_URL is not in PostgreSQL format, attempting to fix...');
        
        // Check if we have the individual parameters
        if (process.env.DATABASE_HOST) {
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
          console.log(`✅ Fixed DATABASE_URL, now using PostgreSQL connection to ${host}`);
        } else {
          console.warn('⚠️ Cannot fix DATABASE_URL, missing required parameters');
        }
      } else {
        console.log('✅ DATABASE_URL is already in correct PostgreSQL format');
      }
    } else if (process.env.DATABASE_HOST) {
      // Construct from individual parameters
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
      console.log(`✅ Set DATABASE_URL from individual parameters (host: ${host})`);
    } else {
      console.warn('⚠️ No database connection parameters found');
    }
  } catch (error) {
    console.error('❌ Error setting up database connection:', error.message);
  }
}

// Ensure database connection is properly configured
ensureDatabaseConnection();

// Set production port
const port = process.env.PORT || 8080;
console.log(`Using port: ${port}`);

// Start Next.js
console.log('Starting Next.js in production mode...');
const nextBin = './node_modules/.bin/next';
const result = spawnSync(nextBin, ['start', '-p', port.toString()], { 
  stdio: 'inherit',
  env: process.env
});

if (result.status !== 0) {
  console.error(`❌ Failed to start Next.js: ${result.error}`);
  process.exit(result.status);
}