#!/usr/bin/env node

/**
 * Production Start Script for QCard
 * Handles database URL configuration and proper process startup
 * Also fixes Prisma engine issues at runtime
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Try to run the Prisma runtime fix at startup
try {
  console.log('Running Prisma runtime fix at startup...');
  const fixPrismaPath = path.join(__dirname, 'scripts', 'fix-prisma-runtime.js');
  
  if (fs.existsSync(fixPrismaPath)) {
    require(fixPrismaPath);
  } else {
    console.warn('Prisma runtime fix script not found at', fixPrismaPath);
  }
} catch (error) {
  console.error('Error running Prisma runtime fix:', error);
  // Continue with startup even if the fix fails
}

// Configure database connection using our dedicated setup script
// Function to find Prisma engine files
function findPrismaEngines() {
  const fs = require('fs');
  const path = require('path');
  
  const enginePaths = [
    // Standard locations
    path.join(process.cwd(), 'node_modules', '.prisma', 'client'),
    path.join(process.cwd(), '.prisma', 'client'),
    
    // Next.js standalone locations
    path.join(process.cwd(), '.next', 'server'),
    path.join(process.cwd(), '.next', 'standalone', 'node_modules', '.prisma', 'client'),
    path.join(process.cwd(), '.next', 'standalone', '.prisma', 'client'),
    
    // DigitalOcean workspace locations
    '/workspace/node_modules/.prisma/client',
    '/workspace/.next/standalone/.prisma/client',
    '/workspace/.next/standalone/node_modules/.prisma/client',
    
    // Additional locations
    '/tmp/prisma-engines'
  ];
  
  const engines = [];
  
  for (const enginePath of enginePaths) {
    try {
      if (fs.existsSync(enginePath)) {
        const files = fs.readdirSync(enginePath);
        const engineFiles = files.filter(file => 
          file.includes('libquery_engine-') || 
          file.includes('query-engine') ||
          file.includes('query_engine')
        );
        
        for (const engineFile of engineFiles) {
          engines.push(path.join(enginePath, engineFile));
        }
      }
    } catch (error) {
      console.error(`[qcard] Error checking ${enginePath}:`, error.message);
    }
  }
  
  return engines;
}

// Function to create required directories
function createRequiredDirectories() {
  const fs = require('fs');
  const path = require('path');
  
  const directories = [
    '/tmp/prisma-engines',
    path.join(process.cwd(), 'node_modules', '.prisma', 'client'),
    path.join(process.cwd(), '.prisma', 'client'),
    '/workspace/node_modules/.prisma/client',
    '/workspace/.next/standalone/.prisma/client'
  ];
  
  for (const dir of directories) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`[qcard] Created directory: ${dir}`);
      }
    } catch (error) {
      console.error(`[qcard] Error creating directory ${dir}:`, error.message);
    }
  }
}

// Function to copy engines to required locations
function copyEnginesToRequiredLocations(engines) {
  const fs = require('fs');
  const path = require('path');
  
  if (engines.length === 0) {
    console.error('[qcard] No Prisma engines found to copy!');
    return;
  }
  
  const targetDirs = [
    '/tmp/prisma-engines',
    path.join(process.cwd(), 'node_modules', '.prisma', 'client'),
    path.join(process.cwd(), '.prisma', 'client'),
    '/workspace/node_modules/.prisma/client',
    '/workspace/.next/standalone/.prisma/client'
  ];
  
  let successCount = 0;
  
  for (const engine of engines) {
    const fileName = path.basename(engine);
    
    for (const targetDir of targetDirs) {
      try {
        // Skip if the target already exists
        const targetPath = path.join(targetDir, fileName);
        if (fs.existsSync(targetPath)) continue;
        
        // Skip if directory doesn't exist
        if (!fs.existsSync(targetDir)) continue;
        
        fs.copyFileSync(engine, targetPath);
        try {
          fs.chmodSync(targetPath, 0o755); // Make executable
        } catch (chmodError) {
          console.warn(`[qcard] Warning: Could not make ${targetPath} executable:`, chmodError.message);
        }
        successCount++;
        console.log(`[qcard] Copied ${fileName} to ${targetDir}`);
      } catch (error) {
        console.error(`[qcard] Error copying ${engine} to ${targetDir}:`, error.message);
      }
    }
  }
  
  console.log(`[qcard] Copied ${successCount} engine files`);
}

// Function to set environment variables for Prisma
function setPrismaEnvironment(engines) {
  if (engines.length > 0) {
    // Find debian engine as it's likely what we need on DigitalOcean
    const debianEngine = engines.find(engine => engine.includes('debian-openssl-3.0.x'));
    
    if (debianEngine) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = debianEngine;
      console.log(`[qcard] Set PRISMA_QUERY_ENGINE_LIBRARY to ${debianEngine}`);
    } else {
      // Just use the first engine if no debian one is found
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = engines[0];
      console.log(`[qcard] Set PRISMA_QUERY_ENGINE_LIBRARY to ${engines[0]}`);
    }
  }
  
  // Set Prisma to skip engine resolution
  process.env.PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING = '1';
}

function setupDatabaseConnection() {
  try {
    console.log('[qcard] Setting up Prisma engine paths...');
    
    // Create required directories
    createRequiredDirectories();
    
    // Find Prisma engines
    console.log('[qcard] Looking for Prisma engines...');
    const engines = findPrismaEngines();
    
    if (engines.length > 0) {
      console.log(`[qcard] Found ${engines.length} Prisma engines`);
      
      // Copy engines to required locations
      copyEnginesToRequiredLocations(engines);
      
      // Set environment variables
      setPrismaEnvironment(engines);
    } else {
      console.warn('[qcard] ⚠️ No Prisma engines found! Will try to continue anyway.');
    }
  
    // Now continue with regular database connection setup
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
  } catch (prismaError) {
    console.error('[qcard] Error setting up Prisma engines:', prismaError);
    
    // Continue with regular database connection even if Prisma engine setup fails
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
}

// Start Next.js application
function startApplication() {
  // Get port from environment or use default
  const port = process.env.PORT || 8080;
  console.log(`Starting Next.js on port ${port}...`);
  
    // First check if standalone server file exists
  const fs = require('fs');
  const standaloneServerPath = path.join(process.cwd(), '.next-do/standalone/server.js');
  const fallbackStandaloneServerPath = path.join(process.cwd(), '.next/standalone/server.js');
  
  if (fs.existsSync(standaloneServerPath)) {
    console.log('Detected DigitalOcean standalone output mode, using .next-do/standalone/server.js');
    startStandaloneServer(port, '.next-do');
  } else if (fs.existsSync(fallbackStandaloneServerPath)) {
    console.log('Detected regular standalone output mode, using .next/standalone/server.js');
    startStandaloneServer(port, '.next');
  } else {
    console.log('Using standard Next.js start mode');
    startRegularNext(port);
  }
}

// Start using the standalone server.js file
function startStandaloneServer(port, buildDir = '.next') {
  const standaloneDir = path.join(process.cwd(), buildDir, 'standalone');
  const staticDir = path.join(process.cwd(), buildDir, 'static');
  
  console.log(`Starting standalone server from: ${standaloneDir}`);
  console.log(`Static files should be served from: ${staticDir}`);
  
  // Change working directory to standalone directory for proper static file serving
  process.chdir(standaloneDir);
  
  const nextProcess = spawn('node', ['server.js'], {
    stdio: 'inherit',
    cwd: standaloneDir,
    env: {
      ...process.env,
      PORT: port.toString(),
      // Ensure hostname is set for DigitalOcean
      HOSTNAME: process.env.HOSTNAME || '0.0.0.0',
      // Ensure Next.js can find static files
      NEXT_STATIC_DIR: staticDir
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