#!/usr/bin/env node

/**
 * Production Start Script for QCard
 * Handles database URL configuration and proper process startup
 */

const { spawn } = require('child_process');
const path = require('path');

// Configure database connection using our dedicated setup script
function setupDatabaseConnection() {
  try {
    // Use the pre-start script to set up the database connection
    const setupResult = require('./scripts/pre-start');
    
    if (setupResult.databaseUrl) {
      console.log('✅ Database connection string configured successfully');
      return true;
    } else {
      console.error('❌ Failed to configure database connection string');
      return false;
    }
  } catch (error) {
    console.error('❌ Error in database setup:', error.message);
    
    // Fallback to original method if pre-start script fails
    console.log('Falling back to direct environment variable check...');
    
    if (process.env.DATABASE_URL &&
        (process.env.DATABASE_URL.startsWith('postgresql://') || 
         process.env.DATABASE_URL.startsWith('postgres://'))) {
      console.log('✅ Using existing DATABASE_URL');
      return true;
    }
    
    console.error('❌ No valid database connection string available');
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
    console.log('Running database initialization and startup fixes...');
    
    // Run the comprehensive database initialization script
    const { spawnSync } = require('child_process');
    const initResult = spawnSync('node', ['scripts/db-initialize-auto.js'], {
      stdio: 'inherit',
      env: process.env
    });
    
    if (initResult.status === 0) {
      console.log('✅ Database initialization completed successfully');
      return true;
    } else {
      console.error('⚠️ Database initialization encountered issues');
      
      // Try running the legacy startup fix as a fallback
      console.log('Attempting legacy studio initialization as fallback...');
      const legacyFixResult = spawnSync('node', ['scripts/startup-fix.js'], {
        stdio: 'inherit',
        env: process.env
      });
      
      if (legacyFixResult.status === 0) {
        console.log('✅ Legacy studio initialization completed successfully');
        return true;
      } else {
        console.error('⚠️ Legacy studio initialization also failed');
        
        // As a last resort, try to verify the project table directly
        console.log('Attempting direct project table verification as last resort...');
        try {
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
      }
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