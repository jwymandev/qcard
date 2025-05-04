#!/usr/bin/env node

/**
 * This script completely resets and recreates the database schema
 * WARNING: This will delete all data in the database!
 * Use only when you need to completely rebuild the database structure
 */

const { execSync } = require('child_process');
const fs = require('fs');
const { Client } = require('pg');

console.log('🚨 WARNING: This will reset your entire database and recreate all tables from schema.prisma! 🚨');
console.log('All data will be lost!');
console.log('');

// Function to construct DB URL from individual parameters
function getDatabaseUrl() {
  // If DATABASE_URL is already provided, use it
  if (process.env.DATABASE_URL) {
    // Check if the URL is a PostgreSQL URL
    if (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://')) {
      console.log('Using provided DATABASE_URL');
      return process.env.DATABASE_URL;
    }
  }
  
  // Otherwise, construct the URL from individual components
  const host = process.env.DATABASE_HOST || '';
  if (!host) {
    console.error('ERROR: DATABASE_HOST is not set. Cannot construct connection string.');
    process.exit(1);
  }
  
  const port = process.env.DATABASE_PORT || '25060';
  const name = process.env.DATABASE_NAME || 'defaultdb';
  const username = process.env.DATABASE_USERNAME || 'doadmin';
  const password = process.env.DATABASE_PASSWORD || '';
  
  // Construct the URL with proper URL encoding for the password
  const encodedPassword = encodeURIComponent(password);
  
  // Default database name for DigitalOcean
  const databaseName = 'defaultdb';
  
  // Add sslmode=require for DigitalOcean managed databases
  const url = `postgresql://${username}:${encodedPassword}@${host}:${port}/${databaseName}?sslmode=require`;
  console.log(`Constructed DATABASE_URL from components (host: ${host})`);
  return url;
}

// Set the DATABASE_URL environment variable
const dbUrl = getDatabaseUrl();
process.env.DATABASE_URL = dbUrl;

// Create PostgreSQL client to check connection
const client = new Client({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false // Required for DigitalOcean managed databases
  }
});

// Main function
async function main() {
  try {
    // First check if we can connect to the database
    console.log('Testing database connection...');
    await client.connect();
    console.log('✅ Connected to PostgreSQL database');

    // Get the current schema
    console.log('Getting current database schema...');
    try {
      // Drop all existing tables
      console.log('Dropping all existing tables...');
      const dropResult = await client.query(`
        DO $$ DECLARE
          r RECORD;
        BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
            EXECUTE 'DROP TABLE IF EXISTS "' || r.tablename || '" CASCADE';
          END LOOP;
        END $$;
      `);
      console.log('✅ All tables dropped successfully');
    } catch (error) {
      console.error('Error dropping tables:', error.message);
    } finally {
      await client.end();
    }

    // Run prisma db push with force reset
    console.log('🔄 Recreating all tables using Prisma schema...');
    execSync('npx prisma db push --force-reset', {
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    console.log('✅ Database reset and recreated successfully');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();