#!/usr/bin/env node

/**
 * Script to set up PostgreSQL database from scratch
 * Use this when migrating from SQLite to PostgreSQL
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Setting up PostgreSQL database from scratch...');

// Verify DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  console.error('Please set a valid PostgreSQL connection string');
  process.exit(1);
}

// Verify PostgreSQL URL
if (!process.env.DATABASE_URL.startsWith('postgresql://') && !process.env.DATABASE_URL.startsWith('postgres://')) {
  console.error('ERROR: DATABASE_URL must start with postgresql:// or postgres://');
  process.exit(1);
}

// Function to run commands
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

// Main process
async function main() {
  try {
    // Backup the schema
    const schemaPath = path.join(__dirname, 'schema.prisma');
    fs.copyFileSync(schemaPath, `${schemaPath}.backup`);
    
    console.log('1. Generating Prisma client...');
    runCommand('npx prisma generate');
    
    console.log('2. Creating initial migration for PostgreSQL...');
    // Reset any existing migrations to start fresh with PostgreSQL
    const migrationsDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      console.log('   Backing up existing migrations...');
      fs.renameSync(migrationsDir, `${migrationsDir}_backup_${Date.now()}`);
    }
    
    // Create a fresh migration
    runCommand('npx prisma migrate dev --name init_postgres --create-only');
    
    console.log('3. Deploying migration to PostgreSQL...');
    runCommand('npx prisma migrate deploy');
    
    console.log('✅ PostgreSQL setup completed successfully');
    console.log('You can now deploy your application to DigitalOcean');
  } catch (error) {
    console.error('Failed to set up PostgreSQL:', error);
    process.exit(1);
  }
}

main();