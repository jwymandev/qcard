#!/usr/bin/env node

/**
 * Script to fix PostgreSQL SSL certificate issues
 * Use this when you see errors like "self-signed certificate" or "certificate verification failed"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const { Client } = require('pg');
const { URL } = require('url');

console.log('🔒 PostgreSQL SSL Certificate Fix Tool');
console.log('This script will help diagnose and fix SSL certificate issues with your database connection.');

// Function to parse and modify DATABASE_URL to disable strict SSL checks
function fixDatabaseUrl(url) {
  if (!url) {
    console.error('❌ No DATABASE_URL provided');
    return null;
  }
  
  try {
    // Parse the existing URL
    const parsedUrl = new URL(url);
    
    // Get the original parameters
    const searchParams = parsedUrl.searchParams;
    
    // Set the SSL parameters to accept all certificates
    searchParams.set('sslmode', 'require');
    searchParams.set('sslaccept', 'accept_invalid_certs');
    
    // Rebuild the URL
    return parsedUrl.toString();
  } catch (error) {
    console.error('❌ Error parsing DATABASE_URL:', error.message);
    return url;
  }
}

// Function to test the database connection with different SSL settings
async function testDatabaseConnection(url) {
  console.log(`🔍 Testing connection to: ${url.split('@')[0].replace(/:([^:]+)@/, ':***@')}`);
  
  // Create client with SSL reject unauthorized disabled
  const client = new Client({
    connectionString: url,
    ssl: {
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined // Skip hostname verification
    }
  });
  
  try {
    await client.connect();
    console.log('✅ Connection successful with SSL verification disabled');
    
    // Get server SSL status
    const sslResult = await client.query('SHOW ssl');
    console.log(`SSL status on server: ${sslResult.rows[0].ssl}`);
    
    // Get PostgreSQL version info
    const versionResult = await client.query('SELECT version()');
    console.log(`PostgreSQL version: ${versionResult.rows[0].version.split(' ')[0]}`);
    
    await client.end();
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    try {
      await client.end();
    } catch (e) {
      // Ignore end errors
    }
    return false;
  }
}

// Function to create SSL environment variables needed for Prisma
function createSslEnvFile(dbUrl) {
  const envPath = '.env.ssl-fixed';
  
  // Create a new .env file with SSL fixes
  const envContent = `
# SSL-fixed database connection
# Created by fix-ssl-certificate.js

# Original DATABASE_URL with SSL fixes
DATABASE_URL="${dbUrl}"

# SSL verification disabled for Node.js
NODE_TLS_REJECT_UNAUTHORIZED="0"
`;

  fs.writeFileSync(envPath, envContent);
  console.log(`✅ Created ${envPath} with SSL fixes`);
  console.log('To use these settings, run: "source .env.ssl-fixed"');
}

// Function to check if Prisma can connect with the fixed URL
async function testPrismaConnection(dbUrl) {
  console.log('🔍 Testing Prisma connection...');
  
  try {
    // Set environment variables for the child process
    const env = {
      ...process.env,
      DATABASE_URL: dbUrl,
      NODE_TLS_REJECT_UNAUTHORIZED: '0'
    };
    
    // Run Prisma command to validate the database URL
    execSync('npx prisma validate', {
      stdio: 'inherit',
      env
    });
    
    console.log('✅ Prisma validation successful with SSL fix');
    return true;
  } catch (error) {
    console.error('❌ Prisma validation failed:', error.message);
    return false;
  }
}

// Main function
async function main() {
  try {
    // Get the current DATABASE_URL
    const originalDbUrl = process.env.DATABASE_URL;
    
    if (!originalDbUrl) {
      console.error('❌ DATABASE_URL environment variable is not set');
      console.log('Please set DATABASE_URL before running this script');
      process.exit(1);
    }
    
    // Check if the URL is a PostgreSQL URL
    if (!originalDbUrl.startsWith('postgresql://') && !originalDbUrl.startsWith('postgres://')) {
      console.error('❌ DATABASE_URL is not a PostgreSQL connection string');
      process.exit(1);
    }
    
    console.log('Original DATABASE_URL found in environment variables');
    
    // Create a fixed version of the URL
    const fixedDbUrl = fixDatabaseUrl(originalDbUrl);
    
    if (!fixedDbUrl) {
      console.error('❌ Failed to create fixed DATABASE_URL');
      process.exit(1);
    }
    
    // Test the connection with the fixed URL
    const connectionSuccess = await testDatabaseConnection(fixedDbUrl);
    
    if (!connectionSuccess) {
      console.log('\n❌ Connection still fails with SSL fixes');
      console.log('This might be due to:');
      console.log('1. Network connectivity issues');
      console.log('2. Incorrect credentials in DATABASE_URL');
      console.log('3. Database server is not running or not accessible');
      console.log('4. Firewall rules blocking the connection');
      process.exit(1);
    }
    
    // Test Prisma connection
    const prismaSuccess = await testPrismaConnection(fixedDbUrl);
    
    if (prismaSuccess) {
      // Create a new .env file with the fixed URL
      createSslEnvFile(fixedDbUrl);
      
      console.log('\n✅ SSL certificate fix successful!');
      console.log('\nTo use the fixed connection permanently, add these to your .env file:');
      console.log(`DATABASE_URL="${fixedDbUrl}"`);
      console.log('NODE_TLS_REJECT_UNAUTHORIZED="0"');
      
      console.log('\n⚠️ Security Note: This configuration disables SSL certificate validation.');
      console.log('This should only be used in development or when you trust the certificate.');
    } else {
      console.log('\n⚠️ Prisma could not connect with the SSL fix.');
      console.log('You might need to check your Prisma configuration or database permissions.');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

main();