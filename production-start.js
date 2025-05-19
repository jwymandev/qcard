#!/usr/bin/env node

/**
 * Production Start Script for QCard
 * Handles database URL configuration and proper process startup
 */

const { spawn } = require('child_process');
const path = require('path');

// Configure database connection if needed
function setupDatabaseConnection() {
  // First try to use Digital Ocean style individual environment variables
  // This is the RECOMMENDED approach for DigitalOcean deployments
  if (process.env.DATABASE_HOST) {
    console.log('Constructing DATABASE_URL from Digital Ocean environment variables...');
    
    // Extract raw values from environment
    const hostRaw = process.env.DATABASE_HOST || '';
    const portRaw = process.env.DATABASE_PORT || '25060';
    const usernameRaw = process.env.DATABASE_USERNAME || 'doadmin';
    const passwordRaw = process.env.DATABASE_PASSWORD || '';
    const dbNameRaw = process.env.DATABASE_NAME || 'defaultdb';
    
    // Check for Digital Ocean placeholders that haven't been resolved yet
    if (hostRaw.includes('${') || portRaw.includes('${') || 
        usernameRaw.includes('${') || passwordRaw.includes('${') || 
        dbNameRaw.includes('${')) {
      console.error('❌ DATABASE environment variables contain unresolved placeholders');
      console.error('This usually means the Digital Ocean App Platform is misconfigured.');
      console.error('Please check your environment variables in Digital Ocean App Platform.');
      
      // Log the raw values for debugging
      console.log('Raw Environment Variables:');
      console.log(`- DATABASE_HOST: ${hostRaw}`);
      console.log(`- DATABASE_PORT: ${portRaw}`);
      console.log(`- DATABASE_USERNAME: ${usernameRaw}`);
      console.log(`- DATABASE_NAME: ${dbNameRaw}`);
      
      return false;
    }
    
    // Use actual values from environment
    const host = hostRaw;
    const port = portRaw;
    const username = usernameRaw;
    const password = passwordRaw;
    const dbName = dbNameRaw;
    
    // Log the host and database for debugging
    console.log(`Database connection info:`);
    console.log(`- Host: ${host}`);
    console.log(`- Port: ${port}`);
    console.log(`- Database: ${dbName}`);
    
    // Encode password for URL
    const encodedPassword = encodeURIComponent(password);
    
    // Construct PostgreSQL URL with SSL required for DigitalOcean
    const url = `postgresql://${username}:${encodedPassword}@${host}:${port}/${dbName}?sslmode=require`;
    
    // Set environment variable for Prisma and other tools
    process.env.DATABASE_URL = url;
    console.log(`✅ Set DATABASE_URL to PostgreSQL connection (host: ${host})`);
    return true;
  } 
  // Fallback to direct DATABASE_URL if provided
  else if (process.env.DATABASE_URL) {
    if (!process.env.DATABASE_URL.startsWith('postgresql://') && 
        !process.env.DATABASE_URL.startsWith('postgres://')) {
      console.log('⚠️ DATABASE_URL does not appear to be a valid PostgreSQL URL');
      console.log('Format should be: postgresql://username:password@host:port/database?sslmode=require');
      return false;
    } else {
      console.log('✅ Using provided DATABASE_URL');
      return true;
    }
  } 
  // No database connection parameters found
  else {
    console.log('⚠️ No database connection parameters found!');
    console.log('Missing both DATABASE_URL and DATABASE_HOST environment variables.');
    console.log('Application will fail to connect to database.');
    return false;
  }
}

// Start Next.js application
function startApplication() {
  // Get port from environment or use default
  const port = process.env.PORT || 8080;
  console.log(`Starting Next.js on port ${port}...`);
  
    // First check if standalone server file exists
  const fs = require('fs');
  const standaloneServerPath = path.join(process.cwd(), '.next/standalone/server.js');
  
  if (fs.existsSync(standaloneServerPath)) {
    console.log('Detected standalone output mode, using standalone server.js');
    startStandaloneServer(port);
  } else {
    console.log('Using standard Next.js start mode');
    startRegularNext(port);
  }
}

// Start using the standalone server.js file
function startStandaloneServer(port) {
  const standaloneServerPath = path.join(process.cwd(), '.next/standalone/server.js');
  
  const nextProcess = spawn('node', [standaloneServerPath], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: port.toString()
    }
  });
  
  handleProcessEvents(nextProcess);
}

// Start using the regular next start command
function startRegularNext(port) {
  // Path to next binary
  const nextBin = path.join(process.cwd(), 'node_modules', '.bin', 'next');
  
  // Start the process
  const nextProcess = spawn(nextBin, ['start', '-p', port.toString()], {
    stdio: 'inherit',
    env: process.env
  });
  
  handleProcessEvents(nextProcess);
}

// Handle process events for all Next.js server processes
function handleProcessEvents(nextProcess) {
  // Handle Next.js process errors
  nextProcess.on('error', (err) => {
    console.error('Failed to start Next.js:', err);
    process.exit(1);
  });
  
  // Handle Next.js process exit
  nextProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`Next.js exited with code ${code}`);
      process.exit(code);
    }
  });
  
  // Handle signals for clean shutdown
  ['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, () => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      nextProcess.kill(signal);
    });
  });
}

// Check and run migrations if needed
async function setupDatabaseSchema() {
  console.log('🔍 Checking database schema and migrations...');
  
  try {
    const { spawnSync } = require('child_process');
    
    // Step 1: Check if migrations need to be applied
    console.log('Checking for pending migrations...');
    const migrationStatus = spawnSync('npx', ['prisma', 'migrate', 'status'], {
      stdio: ['ignore', 'pipe', 'inherit'],
      env: process.env,
      encoding: 'utf-8'
    });
    
    const hasPendingMigrations = migrationStatus.stdout && 
                                migrationStatus.stdout.includes('have not been applied');
    
    // Step 2: Apply migrations if needed
    if (hasPendingMigrations) {
      console.log('🚀 Pending migrations detected, applying migrations...');
      const migrateResult = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
        stdio: 'inherit',
        env: process.env
      });
      
      if (migrateResult.status === 0) {
        console.log('✅ Migrations applied successfully');
      } else {
        console.error('⚠️ Migration apply failed, trying schema push as fallback...');
      }
    } else {
      console.log('✅ No pending migrations detected');
    }
    
    // Step 3: Verify schema and push changes if needed
    console.log('Verifying database schema matches Prisma schema...');
    const prismaResult = spawnSync('npx', ['prisma', 'db', 'push', '--accept-data-loss'], {
      stdio: 'inherit',
      env: process.env
    });
    
    if (prismaResult.status === 0) {
      console.log('✅ Database schema verified/updated successfully');
      return true;
    } else {
      console.error('❌ Failed to verify database schema');
      // Continue anyway since the app might still work with existing schema
      return false;
    }
  } catch (error) {
    console.error('❌ Error setting up database schema:', error.message);
    console.log('Continuing startup despite schema check failure');
    return false;
  }
}

// Function to run startup fixes
async function runStartupFixes() {
  try {
    console.log('Running startup fixes...');
    
    // Run the studio initialization fix script
    const { spawnSync } = require('child_process');
    const fixResult = spawnSync('node', ['scripts/startup-fix.js'], {
      stdio: 'inherit',
      env: process.env
    });
    
    if (fixResult.status === 0) {
      console.log('✅ Studio initialization fixes completed successfully');
    } else {
      console.error('⚠️ Studio initialization fixes encountered issues');
    }
    
    // Check for project table issues
    console.log('Checking database for project table issues...');
    try {
      // Use Prisma to check project table
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      // Verify project table exists by counting projects
      const projectCount = await prisma.project.count();
      console.log(`✅ Project table verified. Found ${projectCount} projects.`);
      
      // Close Prisma client
      await prisma.$disconnect();
      return true;
    } catch (error) {
      console.error('⚠️ Error checking project table:', error.message);
      console.log('This might indicate database schema issues.');
      console.log('Try running: npx prisma db push');
      return false;
    }
  } catch (error) {
    console.error('❌ Error running startup fixes:', error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('Starting QCard in production mode...');
  
  // Set NODE_ENV to production if not already set
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  
  // Set up database connection
  setupDatabaseConnection();
  
  // Set up database schema
  await setupDatabaseSchema();
  
  // Run startup fixes
  await runStartupFixes();
  
  // Start the application
  startApplication();
}

// Run the main function
main();