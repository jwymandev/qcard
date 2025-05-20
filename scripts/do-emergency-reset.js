#!/usr/bin/env node

/**
 * DIGITAL OCEAN EMERGENCY RESET SCRIPT
 * 
 * This script bypasses SSL verification to reset the database on Digital Ocean.
 * It uses a direct SQL connection to drop all tables and recreate the schema.
 */

const { Client } = require('pg');
const { execSync } = require('child_process');
require('dotenv').config();

// Disable SSL verification for the entire Node process
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function resetDatabase() {
  console.log('⚠️  DIGITAL OCEAN EMERGENCY DATABASE RESET ⚠️');
  console.log('This script will completely reset your database!');
  console.log('');
  
  // Get database connection string
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('Error: DATABASE_URL environment variable is not set.');
    console.error('Please set it to your Digital Ocean database connection string.');
    process.exit(1);
  }
  
  try {
    // Extract database info (hide password for display)
    const dbUrlObj = new URL(dbUrl);
    console.log(`Database: ${dbUrlObj.hostname}:${dbUrlObj.port}${dbUrlObj.pathname}`);
    
    // Connect to PostgreSQL with SSL verification disabled
    console.log('\nConnecting to database...');
    const client = new Client({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    await client.connect();
    console.log('Connected successfully!');
    
    // Drop and recreate schema
    console.log('\nDropping all tables...');
    await client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);
    
    console.log('Schema reset successfully!');
    await client.end();
    
    // Push Prisma schema (with SSL verification disabled)
    console.log('\nRecreating database schema using Prisma...');
    try {
      // The environment variable will be inherited by child processes
      execSync('npx prisma db push --force-reset', { 
        stdio: 'inherit',
        env: process.env
      });
      console.log('Schema created successfully!');
    } catch (error) {
      console.error('Failed to create schema with Prisma.');
      console.error(error.message);
      process.exit(1);
    }
    
    console.log('\n✅ DATABASE RESET COMPLETE!');
    console.log('Next steps:');
    console.log('1. Create an admin user: NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/make-do-admin.js');
    console.log('2. Restart your application');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    
    if (error.message.includes('self-signed certificate')) {
      console.error('\nSSL verification error detected!');
      console.error('Make sure NODE_TLS_REJECT_UNAUTHORIZED=0 is set properly.');
      console.error('Try running this command:');
      console.error('export NODE_TLS_REJECT_UNAUTHORIZED=0 && node scripts/do-emergency-reset.js');
    }
    
    process.exit(1);
  }
}

// Start the reset process
resetDatabase();