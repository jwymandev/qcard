#!/usr/bin/env node

/**
 * Auth Configuration Checker
 * 
 * This script checks for common NextAuth.js configuration issues
 * that could cause authentication problems in production.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
console.log('Loading environment variables...');
let envConfig = {};
try {
  // Try to load .env.production first
  if (fs.existsSync(path.resolve(process.cwd(), '.env.production'))) {
    envConfig = dotenv.parse(fs.readFileSync(path.resolve(process.cwd(), '.env.production')));
    console.log('Loaded .env.production');
  }
  // Then load .env as fallback
  else if (fs.existsSync(path.resolve(process.cwd(), '.env'))) {
    envConfig = dotenv.parse(fs.readFileSync(path.resolve(process.cwd(), '.env')));
    console.log('Loaded .env');
  }
} catch (error) {
  console.error('Error loading environment variables:', error);
  process.exit(1);
}

// Check for required NextAuth variables
console.log('\n🔍 Checking NextAuth configuration...');
let issues = 0;

// Check NEXTAUTH_URL
if (!envConfig.NEXTAUTH_URL) {
  console.error('❌ NEXTAUTH_URL is missing');
  issues++;
} else {
  try {
    const url = new URL(envConfig.NEXTAUTH_URL);
    console.log(`✅ NEXTAUTH_URL is set to: ${envConfig.NEXTAUTH_URL}`);
    
    // Check protocol
    if (url.protocol !== 'https:' && !url.hostname.includes('localhost')) {
      console.warn('⚠️ NEXTAUTH_URL should use HTTPS in production');
      issues++;
    }
  } catch (error) {
    console.error(`❌ NEXTAUTH_URL is invalid: ${envConfig.NEXTAUTH_URL}`);
    issues++;
  }
}

// Check NEXTAUTH_SECRET
if (!envConfig.NEXTAUTH_SECRET) {
  console.error('❌ NEXTAUTH_SECRET is missing');
  issues++;
} else if (envConfig.NEXTAUTH_SECRET.length < 32) {
  console.warn('⚠️ NEXTAUTH_SECRET is too short (should be at least 32 characters)');
  issues++;
} else {
  console.log('✅ NEXTAUTH_SECRET is set and has sufficient length');
}

// Check DATABASE_URL
if (!envConfig.DATABASE_URL) {
  console.error('❌ DATABASE_URL is missing');
  issues++;
} else {
  console.log('✅ DATABASE_URL is set');
  
  // Check if using SQLite in production
  if (envConfig.DATABASE_URL.includes('file:./prisma/dev.db') && 
      (process.env.NODE_ENV === 'production' || process.argv.includes('--production'))) {
    console.warn('⚠️ Using SQLite in production is not recommended');
    issues++;
  }
}

// Check auth.ts configuration
console.log('\n🔍 Checking auth.ts configuration...');
try {
  const authPath = path.resolve(process.cwd(), 'src', 'auth.ts');
  if (fs.existsSync(authPath)) {
    const authContent = fs.readFileSync(authPath, 'utf8');
    
    // Check for trustHost setting
    if (!authContent.includes('trustHost:') || !authContent.includes('trustHost: true')) {
      console.warn('⚠️ trustHost setting may be missing in auth.ts');
      issues++;
    } else {
      console.log('✅ trustHost is properly configured');
    }
    
    // Check for secret setting
    if (!authContent.includes('secret:')) {
      console.warn('⚠️ secret setting may be missing in auth.ts');
      issues++;
    } else {
      console.log('✅ secret is configured in auth.ts');
    }
  } else {
    console.error('❌ auth.ts file not found');
    issues++;
  }
} catch (error) {
  console.error('Error checking auth.ts:', error);
}

// Summary
console.log('\n📋 Configuration check summary:');
if (issues === 0) {
  console.log('✅ No authentication configuration issues detected');
} else {
  console.log(`❌ Found ${issues} potential authentication configuration issues`);
  console.log('Please fix these issues to ensure proper authentication in production.');
}

// Provide additional deployment advice
console.log('\n💡 Deployment tips:');
console.log('1. Make sure NEXTAUTH_URL matches your production domain exactly');
console.log('2. Use a strong NEXTAUTH_SECRET in production');
console.log('3. Use PostgreSQL instead of SQLite in production');
console.log('4. Set trustHost: true in your auth.ts configuration');
console.log('5. After deployment, check browser logs for authentication issues');

process.exit(issues > 0 ? 1 : 0);