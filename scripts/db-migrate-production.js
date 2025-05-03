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

// Verify database connection
try {
  console.log('Verifying database connection...');
  runCommand('npx prisma db pull --force');
  console.log('✅ Database connection successful');
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