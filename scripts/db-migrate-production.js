#!/usr/bin/env node

/**
 * This script handles database migration for production deployments.
 * It ensures the PostgreSQL database is properly migrated before the application starts.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('Starting database migration for production...');

function runCommand(command) {
  console.log(`Running: ${command}`);
  try {
    const output = execSync(command, { 
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..')
    });
    return output;
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.toString());
    process.exit(1);
  }
}

// Function to construct DB URL from individual parameters
function getDatabaseUrl() {
  // If DATABASE_URL is already provided, use it
  if (process.env.DATABASE_URL) {
    // Check if the URL is a PostgreSQL URL
    if (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://')) {
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
  const host = process.env.DATABASE_HOST || 'localhost';
  const port = process.env.DATABASE_PORT || '5432';
  const name = process.env.DATABASE_NAME || 'defaultdb';
  const username = process.env.DATABASE_USERNAME || 'postgres';
  const password = process.env.DATABASE_PASSWORD || '';
  
  // Construct the URL with proper URL encoding for the password
  const encodedPassword = encodeURIComponent(password);
  
  // Add sslmode=require for DigitalOcean managed databases
  return `postgresql://${username}:${encodedPassword}@${host}:${port}/${name}?sslmode=require`;
}

// Get database URL (either from DATABASE_URL env var or constructed)
const dbUrl = getDatabaseUrl();

// Check if we have a valid database URL
if (!dbUrl) {
  console.error('ERROR: Could not determine database connection information');
  console.error('Please set either DATABASE_URL or individual connection parameters');
  console.error('(DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USERNAME, DATABASE_PASSWORD)');
  process.exit(1);
}

// Verify PostgreSQL URL for migration
if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
  console.error('ERROR: The database URL must start with postgresql:// or postgres://');
  console.error('Current value does not appear to be a PostgreSQL connection string');
  console.error('Please update your environment variables in DigitalOcean App settings');
  process.exit(1);
}

// Set DATABASE_URL environment variable to use for Prisma commands
process.env.DATABASE_URL = dbUrl;

// Verify database connection
try {
  console.log('Verifying database connection...');
  // First check if we can connect to the database at all
  try {
    runCommand('npx prisma db pull --force');
    console.log('✅ Database connection successful');
  } catch (initialError) {
    console.log('Initial database pull failed, trying to create the database...');
    // Try running a migration to create the database
    try {
      runCommand('npx prisma migrate deploy --create-only');
      console.log('✅ Created database schema');
    } catch (migrationError) {
      console.error('❌ Could not connect to or create database');
      console.error('Please check your DATABASE_URL and database permissions');
      process.exit(1);
    }
  }
} catch (error) {
  console.error('❌ Could not connect to database. Please check your DATABASE_URL');
  process.exit(1);
}

// Generate Prisma client
console.log('Generating Prisma client...');
runCommand('npx prisma generate');

// Run migrations
console.log('Running database migrations...');
runCommand('npx prisma migrate deploy');

// Seed database if needed
if (process.env.SEED_DATABASE === 'true') {
  console.log('Seeding database...');
  runCommand('npx prisma db seed');
}

console.log('✅ Database migration completed successfully');