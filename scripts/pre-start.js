#!/usr/bin/env node

/**
 * Pre-Start Script for QCard
 * 
 * This script runs before the application starts to ensure:
 * 1. Database connection string is properly configured
 * 2. Required environment variables are set
 * 3. Proper error messages are displayed for missing configuration
 */

// Import required modules
const fs = require('fs');
const path = require('path');

// Log start
console.log('📊 Running pre-start checks...');

// Load database setup helper
const setupDatabase = require('./setup-do-database');

// Setup database connection string
console.log('Checking database connection string...');
const databaseUrl = setupDatabase.databaseUrl;

if (!databaseUrl) {
  console.error('❌ No database connection string available!');
  console.error('Please set DATABASE_URL or the individual components:');
  console.error('- DATABASE_HOST');
  console.error('- DATABASE_PORT');
  console.error('- DATABASE_USERNAME');
  console.error('- DATABASE_PASSWORD');
  console.error('- DATABASE_NAME');
  process.exit(1);
}

// Check for critical environment variables
const requiredVars = [
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`- ${varName}`);
  });
  console.error('\nPlease set these variables in your environment or .env file');
  // Continue anyway - the app will handle these errors gracefully
}

// All checks passed
console.log('✅ Pre-start checks completed');

// Export any values that might be needed by other scripts
module.exports = {
  databaseUrl
};