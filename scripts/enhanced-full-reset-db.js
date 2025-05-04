#!/usr/bin/env node

/**
 * ENHANCED DATABASE RESET AND INITIALIZATION SCRIPT
 * 
 * This script fully resets and rebuilds the PostgreSQL database for QCard.
 * It will:
 * 1. Drop all existing tables
 * 2. Apply Prisma schema to create the database structure
 * 3. Verify all required tables exist
 * 
 * WARNING: THIS WILL DELETE ALL DATA IN YOUR DATABASE
 * Use only when you need to completely rebuild the database structure
 */

const { execSync } = require('child_process');
const { Client } = require('pg');
const readline = require('readline');

// Table names to verify after schema creation
const ESSENTIAL_TABLES = [
  'User', 'Tenant', 'Session', 'Profile', 'Studio', 
  'Location', 'Project', 'CastingCall', 'Message'
];

// ASCII colors for console output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Helper function for colorized console logs
function log(message, color = 'white') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

// Function to get user confirmation
function getUserConfirmation() {
  log('┌───────────────────────────────────────────────────────────────┐', 'red');
  log('│  ⚠️  WARNING: THIS WILL DELETE ALL DATA IN YOUR DATABASE!  ⚠️  │', 'red');
  log('└───────────────────────────────────────────────────────────────┘', 'red');
  log('This script will:', 'yellow');
  log('  1. Drop all existing tables in the database', 'yellow');
  log('  2. Recreate all tables using your Prisma schema', 'yellow');
  log('  3. Verify all essential tables exist', 'yellow');
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

// Function to construct database URL from environment variables
function getDatabaseUrl() {
  // If DATABASE_URL is already provided, validate it
  if (process.env.DATABASE_URL) {
    // Check if the URL is a PostgreSQL URL
    if (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://')) {
      log('Using provided DATABASE_URL', 'green');
      return process.env.DATABASE_URL;
    } else {
      log(`WARNING: DATABASE_URL doesn't start with postgresql:// - got ${process.env.DATABASE_URL.split(':')[0]}`, 'yellow');
      // Continue to try to construct a valid URL from components
    }
  }
  
  // Otherwise, construct the URL from individual components
  log('Constructing DATABASE_URL from individual parameters...', 'blue');
  
  const host = process.env.DATABASE_HOST || '';
  if (!host) {
    log('ERROR: DATABASE_HOST is not set. Cannot construct connection string.', 'red');
    process.exit(1);
  }
  
  const port = process.env.DATABASE_PORT || '25060';
  const username = process.env.DATABASE_USERNAME || 'doadmin';
  const password = process.env.DATABASE_PASSWORD || '';
  
  if (!password) {
    log('WARNING: DATABASE_PASSWORD is not set. Connection might fail.', 'yellow');
  }
  
  // Encode the password to handle special characters
  const encodedPassword = encodeURIComponent(password);
  
  // Default database name for DigitalOcean is "defaultdb"
  const name = process.env.DATABASE_NAME || 'defaultdb';
  
  // Use the database name from env var, but if it looks like it might be confused with host,
  // use "defaultdb" as a safe default for DigitalOcean
  const databaseName = host.includes(name) || name.includes(host) ? 'defaultdb' : name;
  log(`Using database name: ${databaseName}`, 'blue');
  
  // Add sslmode=require for DigitalOcean managed databases
  const url = `postgresql://${username}:${encodedPassword}@${host}:${port}/${databaseName}?sslmode=require`;
  log(`Constructed DATABASE_URL with host: ${host}, port: ${port}`, 'green');
  
  return url;
}

// Main function
async function main() {
  try {
    // Get user confirmation
    const confirmed = await getUserConfirmation();
    if (!confirmed) {
      log('Operation cancelled. Your database remains unchanged.', 'blue');
      process.exit(0);
    }
    
    // Set the DATABASE_URL environment variable
    const dbUrl = getDatabaseUrl();
    process.env.DATABASE_URL = dbUrl;
    
    // Create PostgreSQL client with proper SSL settings
    const client = new Client({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false // Required for DigitalOcean managed databases
      }
    });
    
    // STEP 1: Test database connection
    log('\n📡 Testing database connection...', 'cyan');
    await client.connect();
    log('✅ Connected to PostgreSQL database successfully', 'green');
    
    // STEP 2: Get database information
    const dbInfoResult = await client.query('SELECT current_database(), version();');
    log(`\n📊 Database Info:`, 'cyan');
    log(`  Database: ${dbInfoResult.rows[0].current_database}`, 'white');
    log(`  Version: ${dbInfoResult.rows[0].version.split(' ').slice(0, 2).join(' ')}`, 'white');
    
    // STEP 3: Drop all existing tables
    log('\n🗑️  Dropping all existing tables...', 'magenta');
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
    log('✅ All tables dropped successfully', 'green');
    
    // Close the client connection
    await client.end();
    
    // STEP 4: Run Prisma db push to create tables from schema
    log('\n🔄 Recreating all tables using Prisma schema...', 'cyan');
    try {
      execSync('npx prisma db push --force-reset', {
        stdio: 'inherit',
        env: { ...process.env }
      });
      log('✅ Database schema created successfully', 'green');
    } catch (error) {
      log(`❌ Failed to create database schema: ${error.message}`, 'red');
      process.exit(1);
    }
    
    // STEP 5: Verify all essential tables exist
    log('\n🔍 Verifying essential tables...', 'cyan');
    
    // Reconnect to database to verify tables
    const verifyClient = new Client({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    await verifyClient.connect();
    
    // Get all tables in the database
    const tablesResult = await verifyClient.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
    );
    
    const existingTables = tablesResult.rows.map(row => row.tablename);
    log(`Found ${existingTables.length} tables in database:`, 'white');
    
    // Display existing tables in a clean format
    console.log('');
    for (let i = 0; i < existingTables.length; i += 3) {
      const tableRow = existingTables.slice(i, i + 3).map(t => t.padEnd(20)).join(' ');
      console.log(`  ${tableRow}`);
    }
    console.log('');
    
    // Check for missing essential tables
    const missingTables = ESSENTIAL_TABLES.filter(
      table => !existingTables.some(t => t.toLowerCase() === table.toLowerCase())
    );
    
    if (missingTables.length > 0) {
      log('❌ Some essential tables are missing:', 'red');
      missingTables.forEach(table => log(`  - ${table}`, 'red'));
      log('\nYour database is not fully initialized. Please check your Prisma schema and migrations.', 'yellow');
    } else {
      log('✅ All essential tables exist in the database', 'green');
    }
    
    // Close the verification client
    await verifyClient.end();
    
    // STEP 6: Display success message with next steps
    log('\n✨ Database reset and initialization complete!', 'green');
    log('\nNext steps:', 'cyan');
    log('1. Restart your application: npm run dev', 'white');
    log('2. Check the health endpoint: /api/health', 'white');
    log('3. Create test data or migrate production data as needed', 'white');
    
    process.exit(0);
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    log('\nDebug information:', 'yellow');
    log(`- DATABASE_URL format: ${process.env.DATABASE_URL ? (process.env.DATABASE_URL.startsWith('postgresql://') ? 'Valid PostgreSQL URL' : 'Invalid format') : 'Not set'}`, 'yellow');
    log(`- NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`, 'yellow');
    
    log('\nTroubleshooting tips:', 'cyan');
    log('1. Check database credentials and connection parameters', 'white');
    log('2. Ensure PostgreSQL service is running and accessible', 'white');
    log('3. Verify firewall settings allow connections from your IP', 'white');
    log('4. Check if SSL is required (sslmode=require in connection string)', 'white');
    
    process.exit(1);
  }
}

// Execute main function
main();