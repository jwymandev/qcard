#!/usr/bin/env node

/**
 * Digital Ocean Deployment Script
 * 
 * This script handles proper deployment in Digital Ocean App Platform by:
 * 1. Detecting Digital Ocean environment variables and constructing DATABASE_URL
 * 2. Generating Prisma client without database connection (which isn't available at build time)
 * 3. Building the Next.js application properly
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Main function
async function main() {
  console.log('=== DIGITAL OCEAN DEPLOYMENT ===');
  
  // Step 1: Setup for Digital Ocean deployment
  console.log('Setting up for Digital Ocean deployment...');
  
  // Step 1.5: Setup database URL properly
  console.log('Setting up database URL for Digital Ocean...');
  try {
    // Run the database setup script to configure DATABASE_URL properly
    const { databaseUrl } = require('./setup-do-database.js');
    console.log(`✅ DATABASE_URL configured: ${databaseUrl ? 'Valid URL set' : 'No URL available'}`);
  } catch (error) {
    console.error('⚠️ Error setting up database URL:', error.message);
    console.log('Continuing with deployment anyway...');
  }
  
  // Step 2: Generate Prisma client without database connection
  console.log('Generating Prisma client (without database validation)...');
  try {
    execSync('npx prisma generate', {
      stdio: 'inherit',
      env: process.env
    });
    console.log('✅ Prisma client generated successfully');
  } catch (error) {
    console.error('❌ Error generating Prisma client:', error.message);
    process.exit(1);
  }
  
  // Step 3: Build Next.js application
  console.log('Building Next.js application...');
  try {
    // Set environment variables for build
    process.env.NODE_ENV = 'production';
    process.env.NEXT_BUILD_SKIP_DB = 'true';
    
    // Use a placeholder database URL for build
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('${')) {
      console.log('Setting placeholder DATABASE_URL for build...');
      process.env.DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
    }
    
    // Build with extended timeout and skip database connection
    execSync('next build', {
      stdio: 'inherit',
      env: process.env,
      timeout: 300000 // 5 minute timeout for build
    });
    
    console.log('✅ Next.js build completed successfully');
  } catch (error) {
    console.error('❌ Error building Next.js application:', error.message);
    // Continue to provide useful error diagnostics
    console.log('\n🔍 Build Error Diagnostics:');
    console.log('- Check if DATABASE_URL is properly formatted');
    console.log('- Ensure all required environment variables are set');
    console.log('- Consider using NEXT_BUILD_SKIP_DB=true flag');
    process.exit(1);
  }
  
  // Create note about runtime initialization
  console.log('\nBuild completed successfully!');
  console.log('NOTE: Actual database migrations and initialization will run when the application starts.');
  console.log('      This is handled automatically by:');
  console.log('      1. production-start.js startup script');
  console.log('      2. db-initialize-auto.js automatic database initialization');
  console.log('\nFor manual initialization, you can also run:');
  console.log('      npm run db:initialize-deployment [admin-email@example.com]');
  
  // Run database verification after deployment
  console.log('\nRunning database connectivity verification...');
  try {
    require('./verify-deployment-db');
    console.log('Database verification initiated.');
  } catch (error) {
    console.error('Error running database verification:', error);
    console.log('Deployment will continue, but database verification failed.');
  }
  
  console.log('=== DIGITAL OCEAN DEPLOYMENT COMPLETED ===');
}

// Run the main function
main().catch(error => {
  console.error('Fatal error during deployment:', error);
  process.exit(1);
});