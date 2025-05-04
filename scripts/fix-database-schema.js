#!/usr/bin/env node

/**
 * Script to fix database schema issues when deploying to DigitalOcean PostgreSQL
 * This script:
 * 1. Checks and validates the DATABASE_URL for PostgreSQL format
 * 2. Generates PostgreSQL-compatible migrations
 * 3. Deploys them to the database
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🛠️  Starting database schema fix for PostgreSQL...');

// Function to run commands
function runCommand(command, options = {}) {
  console.log(`Running: ${command}`);
  try {
    const output = execSync(command, { 
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: path.resolve(__dirname, '..')
    });
    return output.toString().trim();
  } catch (error) {
    if (options.ignoreError) {
      console.warn(`Command failed but continuing: ${error.message}`);
      return '';
    }
    console.error(`❌ Error executing command: ${command}`);
    console.error(error.toString());
    process.exit(1);
  }
}

// Check DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('Please set a valid PostgreSQL connection string');
  process.exit(1);
}

// Verify PostgreSQL URL format
if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
  console.error('❌ DATABASE_URL must start with postgresql:// or postgres://');
  console.error('Current value:', dbUrl);
  console.error('Please update your environment variable in DigitalOcean App settings');
  process.exit(1);
}

console.log('✅ DATABASE_URL is correctly formatted for PostgreSQL');

// Check if we can connect to the database
try {
  console.log('📊 Testing database connection...');
  runCommand('npx prisma db pull --force', { ignoreError: true });
  
  // Check if schema is initialized
  console.log('🔍 Checking if database tables exist...');
  const tableCheck = runCommand(`
    npx prisma db execute --stdin <<EOF
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
    EOF
  `, { silent: true });
  
  if (tableCheck && tableCheck.includes('User')) {
    console.log('✅ Database already contains tables');
  } else {
    console.log('⚠️ Database tables not found. Initializing database...');
    
    // First, try the basic initialization script
    try {
      runCommand('node scripts/do-db-init.js');
      console.log('✅ Basic database schema initialized');
    } catch (error) {
      console.error('❌ Basic initialization failed:', error);
      console.log('⚠️ Attempting full migration deployment...');
    }
    
    // Deploy migrations
    console.log('🚀 Deploying full database schema...');
    runCommand('npx prisma migrate deploy');
  }
  
  // Generate Prisma client
  console.log('🔧 Generating Prisma client...');
  runCommand('npx prisma generate');
  
  console.log('✅ Database schema fix completed successfully!');
  console.log('You can now continue with your deployment or application start');
  
} catch (error) {
  console.error('❌ Failed to fix database schema:', error);
  process.exit(1);
}