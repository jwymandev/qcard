#!/usr/bin/env node

/**
 * DigitalOcean Build-Only Script
 * 
 * This script is a fallback for when the database is not available during build.
 * It only builds the Next.js application without attempting database operations.
 */

// Set environment variables for successful build
process.env.NODE_ENV = 'production';
process.env.SKIP_ENV_VALIDATION = 'true';
process.env.DATABASE_URL = 'postgresql://dummy:dummy@dummy:5432/dummy?schema=public';

// Run the build
const { execSync } = require('child_process');

console.log('=== DIGITAL OCEAN EMERGENCY BUILD ===');
console.log('Running Next.js build with dummy database URL');

try {
  execSync('npx next build', {
    stdio: 'inherit',
    env: process.env
  });
  
  console.log('✅ Next.js build completed successfully');
  process.exit(0);
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}