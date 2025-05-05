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
    process.env.NODE_ENV = 'production';
    
    execSync('next build', {
      stdio: 'inherit',
      env: process.env
    });
    
    console.log('✅ Next.js build completed successfully');
  } catch (error) {
    console.error('❌ Error building Next.js application:', error.message);
    process.exit(1);
  }
  
  // Create note about runtime initialization
  console.log('\nBuild completed successfully!');
  console.log('NOTE: Actual database migrations will run when the application starts.');
  console.log('      This is handled by the production-start.js script that runs on startup.');
  
  console.log('=== DIGITAL OCEAN DEPLOYMENT COMPLETED ===');
}

// Run the main function
main().catch(error => {
  console.error('Fatal error during deployment:', error);
  process.exit(1);
});