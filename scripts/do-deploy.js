#!/usr/bin/env node

/**
 * Digital Ocean Deployment Script
 * 
 * This script handles proper deployment in Digital Ocean App Platform by:
 * 1. Setting a placeholder DATABASE_URL for build time
 * 2. Generating Prisma client without database connection
 * 3. Building the Next.js application properly
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Main function
async function main() {
  console.log('=== DIGITAL OCEAN DEPLOYMENT ===');
  
  // Step 1: Set placeholder DATABASE_URL for build
  console.log('Setting placeholder DATABASE_URL for build...');
  process.env.DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
  process.env.NEXT_BUILD_SKIP_DB = 'true';
  console.log('✅ DATABASE_URL configured for build');
  
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
  
  // Step 2.5: Install needed dependencies for build
  console.log('Installing build dependencies...');
  try {
    execSync('node scripts/install-build-deps.js', {
      stdio: 'inherit'
    });
    console.log('✅ Build dependencies installed successfully');
  } catch (error) {
    console.error('❌ Error installing build dependencies:', error.message);
    process.exit(1);
  }
  
  // Step 2.6: Fix bcrypt imports
  console.log('Fixing bcrypt imports...');
  try {
    execSync('node scripts/bcrypt-fixer.js', {
      stdio: 'inherit'
    });
    console.log('✅ bcrypt imports fixed successfully');
  } catch (error) {
    console.error('❌ Error fixing bcrypt imports:', error.message);
    process.exit(1);
  }
  
  // Step 3: Build Next.js application
  console.log('Building Next.js application...');
  try {
    // Set environment variables for build
    process.env.NODE_ENV = 'production';
    
    // Use the Digital Ocean specific Next.js config
    console.log('Using Digital Ocean specific Next.js config...');
    
    // Check if next.config.js exists and copy it to next.config.js.bak
    if (fs.existsSync('next.config.js')) {
      fs.copyFileSync('next.config.js', 'next.config.js.bak');
    }
    
    // Try different config files in order of preference
    const configOptions = ['next.config.minimal.js', 'next.config.simple.js', 'next.config.do.js'];
    let configFound = false;
    
    for (const configFile of configOptions) {
      if (fs.existsSync(configFile)) {
        fs.copyFileSync(configFile, 'next.config.js');
        console.log(`✅ Using ${configFile} for Digital Ocean build`);
        configFound = true;
        break;
      }
    }
    
    if (!configFound) {
      console.log('⚠️ No specialized config found, using original config');
    }
    
    // Build with extended timeout and special flags to avoid SSG issues
    execSync('npm run build:do', {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        NEXT_PRIVATE_STANDALONE: '1',
        NEXT_PUBLIC_SKIP_API_ROUTES: '1',
        NEXT_BUILD_SKIP_DB: 'true',
        NEXT_TELEMETRY_DISABLED: '1',
        NEXT_SKIP_API_ROUTES: '1',
        DATABASE_URL: 'postgresql://placeholder:placeholder@localhost:5432/placeholder'
      },
      timeout: 600000 // 10 minute timeout for build
    });
    
    console.log('✅ Next.js build completed successfully');
  } catch (error) {
    console.error('❌ Error building Next.js application:', error.message);
    // Continue to provide useful error diagnostics
    console.log('\n🔍 Build Error Diagnostics:');
    console.log('- Check if DATABASE_URL is properly formatted');
    console.log('- Ensure all required environment variables are set');
    process.exit(1);
  }
  
  // Restore original next.config.js if it was backed up
  if (fs.existsSync('next.config.js.bak')) {
    console.log('Restoring original Next.js config...');
    fs.copyFileSync('next.config.js.bak', 'next.config.js');
    fs.unlinkSync('next.config.js.bak');
    console.log('✅ Original Next.js config restored');
  }
  
  console.log('=== DIGITAL OCEAN DEPLOYMENT COMPLETED ===');
}

// Run the main function
main().catch(error => {
  console.error('Fatal error during deployment:', error);
  process.exit(1);
});