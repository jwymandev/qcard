#!/usr/bin/env node

/**
 * First Deployment Script
 * 
 * This script is designed to be run during first deployment to ensure
 * the database is properly set up with all required tables.
 * 
 * It performs the following steps:
 * 1. Ensures DATABASE_URL is properly configured
 * 2. Runs a database push to create all tables from the schema
 * 3. Verifies essential tables exist
 */

const { spawnSync, execSync } = require('child_process');
const { Client } = require('pg');

// Configure database connection
function setupDatabaseConnection() {
  if (!process.env.DATABASE_URL && process.env.DATABASE_HOST) {
    console.log('Constructing DATABASE_URL from environment variables...');
    
    const host = process.env.DATABASE_HOST;
    const port = process.env.DATABASE_PORT || '25060';
    const username = process.env.DATABASE_USERNAME || 'doadmin';
    const password = process.env.DATABASE_PASSWORD || '';
    const dbName = process.env.DATABASE_NAME || 'defaultdb';
    
    // Encode password for URL
    const encodedPassword = encodeURIComponent(password);
    
    // Construct PostgreSQL URL with SSL
    const url = `postgresql://${username}:${encodedPassword}@${host}:${port}/${dbName}?sslmode=require`;
    
    // Set environment variable
    process.env.DATABASE_URL = url;
    console.log(`✅ Set DATABASE_URL to PostgreSQL connection (host: ${host})`);
  }
}

// Push database schema
async function pushDatabaseSchema() {
  console.log('Running Prisma DB push to create all tables...');
  
  try {
    // Force push the schema
    execSync('npx prisma db push --force-push', {
      stdio: 'inherit',
      env: process.env
    });
    
    console.log('✅ Database schema pushed successfully');
    return true;
  } catch (error) {
    console.error('❌ Error pushing database schema:', error.message);
    return false;
  }
}

// Verify essential tables exist
async function verifyTables() {
  console.log('Verifying essential tables...');
  
  const essentialTables = [
    'user', 'profile', 'studio', 'session', 'tenant', 
    'location', 'project', 'castingcall', 'message'
  ];
  
  try {
    // Connect to database
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    await client.connect();
    console.log('Connected to database for verification');
    
    // Get all tables
    const tablesResult = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `);
    
    const existingTables = tablesResult.rows.map(row => row.tablename.toLowerCase());
    console.log(`Found ${existingTables.length} tables in database`);
    
    // Check which essential tables exist
    const missingTables = essentialTables.filter(table => 
      !existingTables.includes(table.toLowerCase())
    );
    
    if (missingTables.length > 0) {
      console.error('❌ Missing essential tables:', missingTables.join(', '));
      return false;
    }
    
    console.log('✅ All essential tables exist');
    return true;
  } catch (error) {
    console.error('❌ Error verifying tables:', error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('=== QCard First Deployment Setup ===');
  
  // Set up database connection
  setupDatabaseConnection();
  
  // Make sure schema is pushed
  const schemaPushed = await pushDatabaseSchema();
  if (!schemaPushed) {
    console.error('Failed to push schema to database');
    process.exit(1);
  }
  
  // Verify tables
  const tablesVerified = await verifyTables();
  if (!tablesVerified) {
    console.error('Failed to verify all required tables');
    process.exit(1);
  }
  
  console.log('=== First Deployment Setup Completed Successfully ===');
}

// Run the main function
main().catch(error => {
  console.error('Error during first deployment setup:', error);
  process.exit(1);
});