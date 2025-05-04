#!/usr/bin/env node

/**
 * DIGITALOCEAN DATABASE RESET SCRIPT
 * 
 * This script performs a complete reset of the PostgreSQL database on DigitalOcean.
 * It drops all tables and recreates them according to the Prisma schema.
 * 
 * WARNING: THIS WILL DELETE ALL DATA IN YOUR DATABASE!
 */

const { execSync } = require('child_process');
const { Client } = require('pg');
const readline = require('readline');

// Function to get user confirmation
function getUserConfirmation() {
  console.log('⚠️  WARNING: THIS WILL DELETE ALL DATA IN YOUR DATABASE! ⚠️');
  console.log('This script will:');
  console.log('  1. Drop all existing tables');
  console.log('  2. Recreate all tables using your Prisma schema');
  console.log('  3. Verify all essential tables exist');
  console.log('');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question('Type "RESET" to confirm this action: ', (answer) => {
      rl.close();
      resolve(answer === 'RESET');
    });
  });
}

// Simple function to connect to database
async function main() {
  try {
    // Get user confirmation
    const confirmed = await getUserConfirmation();
    if (!confirmed) {
      console.log('Operation cancelled. Your database remains unchanged.');
      process.exit(0);
    }

    // Check for DATABASE_URL or individual connection params
    if (!process.env.DATABASE_URL && !process.env.DATABASE_HOST) {
      console.error('ERROR: Neither DATABASE_URL nor DATABASE_HOST is set');
      console.error('Please set database connection parameters before running this script');
      process.exit(1);
    }

    // Prepare database connection
    let dbUrl = process.env.DATABASE_URL;
    
    // If individual params are provided instead of URL, construct the URL
    if (!dbUrl || !dbUrl.startsWith('postgresql://')) {
      const host = process.env.DATABASE_HOST || 'localhost';
      const port = process.env.DATABASE_PORT || '25060';
      const username = process.env.DATABASE_USERNAME || 'doadmin';
      const password = process.env.DATABASE_PASSWORD || '';
      const dbName = process.env.DATABASE_NAME || 'defaultdb';
      
      // Encode password for URL
      const encodedPassword = encodeURIComponent(password);
      
      // Construct URL for PostgreSQL with SSL enabled
      dbUrl = `postgresql://${username}:${encodedPassword}@${host}:${port}/${dbName}?sslmode=require`;
      console.log(`Constructed database URL from parameters (host: ${host})`);
    } else {
      console.log('Using provided DATABASE_URL');
    }
    
    // Set for child processes
    process.env.DATABASE_URL = dbUrl;
    
    // Extract host info for display (without credentials)
    try {
      const url = new URL(dbUrl);
      console.log(`Connected to database: ${url.hostname}:${url.port}${url.pathname}`);
    } catch (e) {
      console.error('ERROR: Invalid database URL');
      process.exit(1);
    }
    
    // Connect to PostgreSQL
    console.log('\nConnecting to PostgreSQL database...');
    const client = new Client({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false // Required for DigitalOcean
      }
    });
    
    await client.connect();
    console.log('Connected successfully');
    
    // Drop all tables
    console.log('\nDropping all existing tables...');
    await client.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS "' || r.tablename || '" CASCADE';
        END LOOP;
      END $$;
    `);
    
    await client.end();
    console.log('All tables dropped successfully');
    
    // Create tables using Prisma
    console.log('\nRecreating database schema using Prisma...');
    try {
      execSync('npx prisma db push --force-reset', {
        stdio: 'inherit',
        env: { ...process.env }
      });
      console.log('Database schema created successfully');
    } catch (error) {
      console.error(`Failed to create database schema: ${error.message}`);
      process.exit(1);
    }
    
    // Check that tables exist
    console.log('\nVerifying tables were created...');
    const checkClient = new Client({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    await checkClient.connect();
    const tablesResult = await checkClient.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `);
    
    if (tablesResult.rowCount === 0) {
      console.error('ERROR: No tables were created');
      process.exit(1);
    }
    
    console.log(`Tables found: ${tablesResult.rowCount}`);
    tablesResult.rows.forEach(row => {
      console.log(`- ${row.tablename}`);
    });
    
    await checkClient.end();
    
    console.log('\nDatabase reset and recreation successful');
    
  } catch (error) {
    console.error(`\nERROR: ${error.message}`);
    process.exit(1);
  }
}

main();