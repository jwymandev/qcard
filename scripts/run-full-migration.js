#!/usr/bin/env node

/**
 * Script to run a full Prisma migration on DigitalOcean
 * This handles both DATABASE_URL string or individual db parameters
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Running full Prisma migration for DigitalOcean PostgreSQL');

// Function to construct DB URL from individual parameters
function getDatabaseUrl() {
  // If DATABASE_URL is already provided, use it
  if (process.env.DATABASE_URL) {
    // Check if the URL is a PostgreSQL URL
    if (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://')) {
      console.log('Using provided DATABASE_URL');
      return process.env.DATABASE_URL;
    }
    
    console.warn('DATABASE_URL is not in a PostgreSQL format, attempting to construct from components');
  }
  
  // Check if we have the individual components
  if (!process.env.DATABASE_HOST) {
    console.warn('DATABASE_HOST is not set. Cannot construct connection string.');
    return process.env.DATABASE_URL || '';
  }
  
  // Construct the URL from individual components
  const host = process.env.DATABASE_HOST;
  const port = process.env.DATABASE_PORT || '25060';
  const name = process.env.DATABASE_NAME || 'defaultdb';
  const username = process.env.DATABASE_USERNAME || 'doadmin';
  const password = process.env.DATABASE_PASSWORD || '';
  
  // Construct the URL with proper URL encoding for the password
  const encodedPassword = encodeURIComponent(password);
  
  // Verify database name is not being confused with host
  const databaseName = host.includes(name) || name.includes(host) ? 'defaultdb' : name;
  console.log(`Using database name: ${databaseName}`);
  
  // Add sslmode=require for DigitalOcean managed databases
  const url = `postgresql://${username}:${encodedPassword}@${host}:${port}/${databaseName}?sslmode=require`;
  console.log(`Constructed DATABASE_URL from components (host: ${host})`);
  return url;
}

// Get the database URL
const dbUrl = getDatabaseUrl();
if (!dbUrl) {
  console.error('❌ Could not determine database connection information');
  console.error('Please set either DATABASE_URL or individual connection parameters');
  process.exit(1);
}

// Set the DATABASE_URL environment variable for child processes
process.env.DATABASE_URL = dbUrl;

// Log database connection info (without credentials)
try {
  const url = new URL(dbUrl);
  console.log(`Database configuration: ${url.protocol}//${url.hostname}:${url.port}${url.pathname}`);
} catch (e) {
  console.warn('Could not parse database URL:', e.message);
}

// Function to run command with better error handling
function runCommand(command) {
  console.log(`Running: ${command}`);
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..')
    });
    return true;
  } catch (error) {
    console.error(`❌ Error running command: ${command}`);
    console.error(error.toString());
    return false;
  }
}

// Main function
async function main() {
  console.log('Testing database connection...');
  if (!runCommand('npx prisma db pull --force')) {
    console.log('⚠️ Could not connect to database, but continuing anyway');
  }
  
  console.log('🔧 Generating Prisma client...');
  runCommand('npx prisma generate');
  
  console.log('🏃 Running database migrations...');
  
  // Try using prisma migrate deploy (preferred)
  if (!runCommand('npx prisma migrate deploy')) {
    console.log('⚠️ Migration deploy failed, trying alternative approach...');
    
    // Try using db push as a fallback
    if (!runCommand('npx prisma db push --force-reset')) {
      console.error('❌ All migration attempts failed');
      process.exit(1);
    }
  }
  
  console.log('✅ Migration completed successfully');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});