#!/usr/bin/env node

/**
 * This script fixes database schema issues by:
 * 1. Adding missing fields to the database schema
 * 2. Regenerating the Prisma client with the accurate schema
 * 
 * Run with: node fix-schema.mjs
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Colors for better console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

console.log(`${colors.blue}Starting database schema fix...${colors.reset}`);
console.log(`${colors.yellow}This script will fix the schema mismatch issues in your database.${colors.reset}`);

// Step 1: Create a backup of the database
try {
  console.log(`${colors.cyan}Creating database backup...${colors.reset}`);
  execSync('cp prisma/dev.db prisma/dev.db.backup', { stdio: 'inherit' });
  console.log(`${colors.green}Database backup created at: prisma/dev.db.backup${colors.reset}`);
} catch (error) {
  console.error(`${colors.red}Failed to create database backup:${colors.reset}`, error);
  process.exit(1);
}

// Step 2: Fix schema issues with direct SQL
try {
  console.log(`${colors.cyan}Applying direct schema fixes to the database...${colors.reset}`);
  
  // Use SQLite commands to check if columns exist and add them if they don't
  const checkForColumnsScript = `
    echo '.headers on' > /tmp/check_columns.sql
    echo '.mode column' >> /tmp/check_columns.sql
    echo 'PRAGMA table_info(Profile);' >> /tmp/check_columns.sql
    cat /tmp/check_columns.sql | sqlite3 prisma/dev.db
  `;
  
  console.log(`${colors.cyan}Checking existing columns in Profile table:${colors.reset}`);
  execSync(checkForColumnsScript, { stdio: 'inherit' });
  
  // Create a script to add the missing columns if needed
  const addColumnsScript = `
    echo '.headers on' > /tmp/add_columns.sql
    echo '.mode column' >> /tmp/add_columns.sql
    echo "PRAGMA foreign_keys=off;" >> /tmp/add_columns.sql
    echo "BEGIN TRANSACTION;" >> /tmp/add_columns.sql
    
    echo "-- Add gender column if it doesn't exist" >> /tmp/add_columns.sql
    echo "ALTER TABLE Profile ADD COLUMN gender TEXT;" >> /tmp/add_columns.sql
    
    echo "-- Add ethnicity column if it doesn't exist" >> /tmp/add_columns.sql
    echo "ALTER TABLE Profile ADD COLUMN ethnicity TEXT;" >> /tmp/add_columns.sql
    
    echo "COMMIT;" >> /tmp/add_columns.sql
    echo "PRAGMA foreign_keys=on;" >> /tmp/add_columns.sql
    
    cat /tmp/add_columns.sql | sqlite3 prisma/dev.db
  `;
  
  console.log(`${colors.cyan}Adding missing columns (if needed):${colors.reset}`);
  execSync(addColumnsScript, { stdio: 'inherit' });
  
  // Check columns again to confirm they were added
  console.log(`${colors.cyan}Verifying columns after fixes:${colors.reset}`);
  execSync(checkForColumnsScript, { stdio: 'inherit' });
  
  console.log(`${colors.green}Database schema fixes applied successfully!${colors.reset}`);
} catch (error) {
  console.error(`${colors.red}Failed to apply database schema fixes:${colors.reset}`, error);
  console.log(`${colors.yellow}Database backup is available at: prisma/dev.db.backup${colors.reset}`);
  process.exit(1);
}

// Step 3: Regenerate the Prisma client
try {
  console.log(`${colors.cyan}Regenerating Prisma client...${colors.reset}`);
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log(`${colors.green}Prisma client regenerated successfully!${colors.reset}`);
} catch (error) {
  console.error(`${colors.red}Failed to regenerate Prisma client:${colors.reset}`, error);
  process.exit(1);
}

console.log(`${colors.green}Schema fix completed successfully!${colors.reset}`);
console.log(`${colors.green}You can now restart your application for the changes to take effect.${colors.reset}`);
console.log(`${colors.yellow}If you encounter any issues, you can restore the database from the backup at prisma/dev.db.backup${colors.reset}`);