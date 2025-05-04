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

// Check database URL
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  console.error('Please set a valid PostgreSQL connection string');
  process.exit(1);
}

// Verify PostgreSQL URL
if (!process.env.DATABASE_URL.startsWith('postgresql://') && !process.env.DATABASE_URL.startsWith('postgres://')) {
  console.error('ERROR: The DATABASE_URL must start with postgresql:// or postgres://');
  console.error('Current value does not appear to be a PostgreSQL connection string');
  console.error('Please update your environment variable in DigitalOcean App settings');
  process.exit(1);
}

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