#!/usr/bin/env node

/**
 * Production Start Script for QCard
 * Handles database URL configuration and proper process startup
 */

const { spawn } = require('child_process');
const path = require('path');

// Configure database connection if needed
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
  } else if (process.env.DATABASE_URL) {
    if (!process.env.DATABASE_URL.startsWith('postgresql://') && 
        !process.env.DATABASE_URL.startsWith('postgres://')) {
      console.log('⚠️ DATABASE_URL does not appear to be a valid PostgreSQL URL');
    } else {
      console.log('✅ Using provided DATABASE_URL');
    }
  } else {
    console.log('⚠️ No database connection parameters found. Application may fail to connect to database.');
  }
}

// Start Next.js application
function startApplication() {
  // Get port from environment or use default
  const port = process.env.PORT || 8080;
  console.log(`Starting Next.js on port ${port}...`);
  
  // Path to next binary
  const nextBin = path.join(process.cwd(), 'node_modules', '.bin', 'next');
  
  // Start the process
  const nextProcess = spawn(nextBin, ['start', '-p', port.toString()], {
    stdio: 'inherit',
    env: process.env
  });
  
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

// Main function
function main() {
  console.log('Starting QCard in production mode...');
  
  // Set NODE_ENV to production if not already set
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  
  // Set up database connection
  setupDatabaseConnection();
  
  // Start the application
  startApplication();
}

// Run the main function
main();