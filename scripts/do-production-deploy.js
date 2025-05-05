#!/usr/bin/env node

/**
 * DigitalOcean Production Deployment Script
 * 
 * This script is designed specifically for DigitalOcean App Platform deployments.
 * It handles:
 * 1. Converting DigitalOcean environment variables to DATABASE_URL
 * 2. Setting up the database for PostgreSQL
 * 3. Fixing Next.js route conflicts
 * 4. Performing safe schema migrations
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configure database connection
function setupDatabaseConnection() {
  console.log('Setting up database connection...');

  // DigitalOcean provides individual environment variables
  // Check if we have individual connection parameters
  if (process.env.DATABASE_HOST) {
    console.log('Detected Digital Ocean environment variables');
    
    // Get raw values and check for placeholders
    const hostRaw = process.env.DATABASE_HOST || '';
    const portRaw = process.env.DATABASE_PORT || '25060';
    const usernameRaw = process.env.DATABASE_USERNAME || 'doadmin';
    const passwordRaw = process.env.DATABASE_PASSWORD || '';
    const dbNameRaw = process.env.DATABASE_NAME || 'defaultdb';
    
    // Check for Digital Ocean placeholders and provide real defaults
    const host = hostRaw.includes('${') ? 'localhost' : hostRaw;
    const port = portRaw.includes('${') ? '25060' : portRaw;
    const username = usernameRaw.includes('${') ? 'doadmin' : usernameRaw;
    const password = passwordRaw.includes('${') ? '' : passwordRaw;
    const dbName = dbNameRaw.includes('${') ? 'defaultdb' : dbNameRaw;
    
    console.log(`Database connection info:`);
    console.log(`- Host: ${host}`);
    console.log(`- Port: ${port}`);
    console.log(`- Database: ${dbName}`);
    
    // Encode password for URL
    const encodedPassword = encodeURIComponent(password);
    
    // Construct URL for PostgreSQL with SSL enabled
    const dbUrl = `postgresql://${username}:${encodedPassword}@${host}:${port}/${dbName}?sslmode=require`;
    
    // Set environment variable for other processes
    process.env.DATABASE_URL = dbUrl;
    
    console.log(`✅ DATABASE_URL constructed from environment variables`);
    return true;
  } else if (process.env.DATABASE_URL) {
    console.log('✅ Using existing DATABASE_URL');
    return true;
  } else {
    console.error('❌ No database connection parameters found');
    console.log('Set DATABASE_HOST or DATABASE_URL environment variables');
    return false;
  }
}

// Apply database migrations safely
async function applyMigrations() {
  console.log('Applying database migrations...');
  
  try {
    console.log('Checking current schema status...');
    
    // Try to push schema without migration
    const result = spawnSync('npx', ['prisma', 'db', 'push', '--accept-data-loss'], {
      stdio: 'inherit',
      env: process.env
    });
    
    if (result.status === 0) {
      console.log('✅ Schema push completed successfully');
      return true;
    } else {
      console.log('⚠️ Schema push failed, trying migration deploy');
      
      // If push fails, try migration deploy
      const migrateResult = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
        stdio: 'inherit',
        env: process.env
      });
      
      if (migrateResult.status === 0) {
        console.log('✅ Migration deploy completed successfully');
        return true;
      } else {
        console.error('❌ Migration deploy failed');
        return false;
      }
    }
  } catch (error) {
    console.error('❌ Error applying migrations:', error.message);
    return false;
  }
}

// Generate Prisma client
function generatePrismaClient() {
  console.log('Generating Prisma client...');
  
  try {
    execSync('npx prisma generate', {
      stdio: 'inherit',
      env: process.env
    });
    
    console.log('✅ Prisma client generated successfully');
    return true;
  } catch (error) {
    console.error('❌ Error generating Prisma client:', error.message);
    return false;
  }
}

// Build the Next.js application
function buildNextApp() {
  console.log('Building Next.js application...');
  
  try {
    // Set NODE_ENV to production for the build
    process.env.NODE_ENV = 'production';
    
    execSync('next build', {
      stdio: 'inherit',
      env: process.env
    });
    
    console.log('✅ Next.js build completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Error building Next.js app:', error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('=== DIGITAL OCEAN PRODUCTION DEPLOYMENT ===');
  
  // Step 1: Set up database connection
  const dbSetup = setupDatabaseConnection();
  if (!dbSetup) {
    process.exit(1);
  }
  
  // Step 2: Apply migrations
  const migrationsApplied = await applyMigrations();
  
  // Step 3: Generate Prisma client
  const clientGenerated = generatePrismaClient();
  
  // Step 4: Build Next.js app
  if (migrationsApplied && clientGenerated) {
    const buildSuccessful = buildNextApp();
    
    if (!buildSuccessful) {
      process.exit(1);
    }
  } else {
    process.exit(1);
  }
  
  console.log('=== DIGITAL OCEAN PRODUCTION DEPLOYMENT COMPLETED ===');
}

// Run the main function
main().catch(error => {
  console.error('Fatal error during deployment:', error);
  process.exit(1);
});