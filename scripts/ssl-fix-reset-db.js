#!/usr/bin/env node

/**
 * This script completely resets and recreates the database schema
 * with enhanced SSL certificate handling for PostgreSQL
 * WARNING: This will delete all data in the database!
 * Use only when you need to completely rebuild the database structure
 */

const { execSync } = require('child_process');
const fs = require('fs');
const { Client } = require('pg');
const readline = require('readline');

console.log('🚨 WARNING: This will reset your entire database and recreate all tables from schema.prisma! 🚨');
console.log('All data will be lost!');
console.log('');

// Create readline interface for confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to get confirmation from user
function getConfirmation() {
  return new Promise((resolve) => {
    rl.question('Type "RESET" to confirm this destructive action: ', (answer) => {
      resolve(answer === 'RESET');
      rl.close();
    });
  });
}

// Function to construct DB URL with explicit SSL parameters
function getDatabaseUrl() {
  // If DATABASE_URL is already provided, use it
  if (process.env.DATABASE_URL) {
    // Check if the URL is a PostgreSQL URL
    if (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://')) {
      console.log('Using provided DATABASE_URL');
      
      // Add SSL parameters if not present
      if (!process.env.DATABASE_URL.includes('sslmode=')) {
        const baseUrl = process.env.DATABASE_URL;
        return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}sslmode=require&sslaccept=accept_invalid_certs`;
      }
      
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
  
  // Add enhanced SSL parameters for DigitalOcean managed databases
  const url = `postgresql://${username}:${encodedPassword}@${host}:${port}/${databaseName}?sslmode=require&sslaccept=accept_invalid_certs`;
  console.log(`Constructed DATABASE_URL from components (host: ${host})`);
  return url;
}

// Set the DATABASE_URL environment variable
const dbUrl = getDatabaseUrl();
process.env.DATABASE_URL = dbUrl;

// Create PostgreSQL client with enhanced SSL options
function createClient() {
  return new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false,
      // Additional SSL options for stricter environments
      checkServerIdentity: () => undefined // Skip certificate hostname verification
    }
  });
}

// Main function
async function main() {
  try {
    // Get user confirmation
    const confirmed = await getConfirmation();
    if (!confirmed) {
      console.log('Reset cancelled. Exiting without making changes.');
      process.exit(0);
    }
    
    const client = createClient();
    
    // First check if we can connect to the database
    console.log('Testing database connection...');
    try {
      await client.connect();
      console.log('✅ Connected to PostgreSQL database');
    } catch (error) {
      console.error('❌ Connection error:', error.message);
      console.log('\nTroubleshooting SSL issues:');
      console.log('1. Check if your DATABASE_URL includes SSL parameters');
      console.log('2. Make sure your IP is allowed in database firewall settings');
      console.log('3. Try using a different PostgreSQL client tool to verify connection');
      
      // Try to continue anyway
      console.log('\nAttempting to continue despite connection error...');
    }

    // Drop all existing tables
    try {
      console.log('Dropping all existing tables...');
      await client.query(`
        DO $$ DECLARE
          r RECORD;
        BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
            EXECUTE 'DROP TABLE IF EXISTS "' || r.tablename || '" CASCADE';
            RAISE NOTICE 'Dropped table: %', r.tablename;
          END LOOP;
        END $$;
      `);
      console.log('✅ All tables dropped successfully');
    } catch (error) {
      console.error('Error dropping tables:', error.message);
      console.log('Continuing to recreate tables anyway...');
    } finally {
      try {
        await client.end();
      } catch (e) {
        // Ignore client end errors
      }
    }

    // Create Prisma environment override
    const prismaEnvOverride = {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
      NODE_TLS_REJECT_UNAUTHORIZED: '0' // This allows self-signed certificates
    };

    // Run prisma db push with force reset
    console.log('🔄 Recreating all tables using Prisma schema...');
    try {
      execSync('npx prisma db push --force-reset --accept-data-loss', {
        stdio: 'inherit',
        env: prismaEnvOverride
      });
      console.log('✅ Database reset and recreated successfully');
    } catch (error) {
      console.error('❌ Error with Prisma db push:', error.message);
      
      // Try fallback approach with migration reset
      console.log('Trying alternative approach with migration reset...');
      try {
        execSync('npx prisma migrate reset --force', {
          stdio: 'inherit',
          env: prismaEnvOverride
        });
        console.log('✅ Database reset with migrations completed');
      } catch (migrationError) {
        console.error('❌ Migration reset also failed:', migrationError.message);
        console.log('\nManual fix required:');
        console.log('1. Check your DATABASE_URL configuration');
        console.log('2. Ensure database permissions are correct');
        console.log('3. Try connecting manually using psql or another PostgreSQL client');
        process.exit(1);
      }
    }
    
    // Generate Prisma client
    console.log('Generating Prisma client...');
    execSync('npx prisma generate', {
      stdio: 'inherit'
    });
    
    console.log('\n✅ Database reset complete!');
    console.log('Your database has been reset and all tables recreated from the Prisma schema.');
    console.log('You can now restart your application with: npm run dev');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

main();