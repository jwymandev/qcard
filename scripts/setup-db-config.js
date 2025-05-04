#!/usr/bin/env node

/**
 * Database configuration setup script for DigitalOcean
 * This script sets up DATABASE_URL from individual environment variables if needed
 * 
 * Run this before any database operations to ensure proper configuration
 */

console.log('Setting up database configuration...');

// Function to construct DB URL from individual parameters
function getDatabaseUrl() {
  // If DATABASE_URL is already provided, use it
  if (process.env.DATABASE_URL) {
    // Check if the URL is a PostgreSQL URL
    if (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://')) {
      console.log('Using provided DATABASE_URL');
      return process.env.DATABASE_URL;
    }
    
    // If it's a SQLite URL (for local development), return it as is
    if (process.env.DATABASE_URL.startsWith('file:')) {
      console.log('Using SQLite DATABASE_URL for local development');
      return process.env.DATABASE_URL;
    }
    
    console.warn('DATABASE_URL is not in a recognized format, attempting to construct from components');
  }
  
  // Check if we have the individual components
  if (!process.env.DATABASE_HOST) {
    console.warn('DATABASE_HOST is not set. Cannot construct PostgreSQL connection string.');
    
    // If no DATABASE_URL and no DATABASE_HOST, default to SQLite for local development
    if (!process.env.DATABASE_URL) {
      console.log('Defaulting to SQLite for local development');
      return "file:./prisma/dev.db";
    }
    
    return process.env.DATABASE_URL;
  }
  
  // Construct the URL from individual components
  const host = process.env.DATABASE_HOST;
  const port = process.env.DATABASE_PORT || '25060';
  const name = process.env.DATABASE_NAME || 'defaultdb';
  const username = process.env.DATABASE_USERNAME || 'doadmin';
  const password = process.env.DATABASE_PASSWORD || '';
  
  // Construct the URL with proper URL encoding for the password
  const encodedPassword = encodeURIComponent(password);
  
  // Add sslmode=require for DigitalOcean managed databases
  const url = `postgresql://${username}:${encodedPassword}@${host}:${port}/${name}?sslmode=require`;
  console.log(`Constructed DATABASE_URL from components (host: ${host})`);
  return url;
}

// Get the database URL
const dbUrl = getDatabaseUrl();

// Check if we have a valid database URL
if (!dbUrl) {
  console.error('ERROR: Could not determine database connection information');
  console.error('Please set either DATABASE_URL or individual connection parameters');
  process.exit(1);
}

// Set the DATABASE_URL environment variable for child processes
process.env.DATABASE_URL = dbUrl;

// Log database type without revealing credentials
try {
  const url = new URL(dbUrl);
  const protocol = url.protocol;
  const host = url.hostname;
  const port = url.port;
  const path = url.pathname;
  
  console.log(`Database configuration: ${protocol}//${host}:${port}${path}`);
  
  if (protocol === 'postgresql:' || protocol === 'postgres:') {
    console.log('Using PostgreSQL database');
  } else if (protocol === 'file:') {
    console.log('Using SQLite database');
  } else {
    console.log(`Using database with protocol: ${protocol}`);
  }
} catch (e) {
  console.warn('Could not parse database URL:', e.message);
}

console.log('Database configuration completed');

// Export the database URL for use in other scripts
module.exports = {
  getDatabaseUrl,
  databaseUrl: dbUrl
};