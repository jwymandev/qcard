#!/usr/bin/env node
/**
 * This script generates new random secrets and updates environment files
 * Run with: node scripts/rotate-secrets.js
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { execSync } = require('child_process');

// Function to generate a random secret
function generateRandomSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Function to update .env files
function updateEnvFiles() {
  const newSecret = generateRandomSecret();
  console.log('\n🔑 Generated new NextAuth secret');
  
  // List of env files to check and update
  const envFiles = [
    '.env',
    '.env.production',
    '.env.do',
  ];
  
  let updated = 0;
  
  envFiles.forEach(filename => {
    const filePath = path.join(process.cwd(), filename);
    
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Update the NEXTAUTH_SECRET
      if (content.includes('NEXTAUTH_SECRET=')) {
        content = content.replace(
          /NEXTAUTH_SECRET=.*/,
          `NEXTAUTH_SECRET=${newSecret}`
        );
        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated ${filename} with new NextAuth secret`);
        updated++;
      }
    }
  });
  
  if (updated === 0) {
    console.log('⚠️ No environment files were updated');
  }
  
  return updated > 0;
}

// Function to clean up sensitive information from exposed files
function cleanupSensitiveInfo() {
  // Check .env.do for sensitive credentials
  const doEnvPath = path.join(process.cwd(), '.env.do');
  
  if (fs.existsSync(doEnvPath)) {
    let content = fs.readFileSync(doEnvPath, 'utf8');
    
    // Replace any real database URL with placeholder
    if (content.includes('DATABASE_URL=') && content.includes('db.ondigitalocean.com')) {
      content = content.replace(
        /DATABASE_URL=.*db\.ondigitalocean\.com.*/,
        'DATABASE_URL="postgresql://username:password@hostname:port/database?sslmode=require"'
      );
      fs.writeFileSync(doEnvPath, content);
      console.log('✅ Replaced DigitalOcean database credentials in .env.do with placeholders');
      return true;
    }
  }
  
  return false;
}

// Main execution
console.log('🛡️  Starting secret rotation and cleanup...');

try {
  // Update NextAuth secret in env files
  const secretsUpdated = updateEnvFiles();
  
  // Clean up sensitive information
  const sensitiveInfoCleaned = cleanupSensitiveInfo();
  
  if (!secretsUpdated && !sensitiveInfoCleaned) {
    console.log('ℹ️  No changes were made');
  } else {
    console.log('\n✅ Security improvements completed successfully');
    console.log('\n⚠️  IMPORTANT NEXT STEPS:');
    console.log('1. Update your DigitalOcean environment variables with the new secrets');
    console.log('2. Make sure all .env files are properly git-ignored');
    console.log('3. Consider using a secret manager for production credentials');
    console.log('4. Run `git rm --cached .env.do .env.production .env-e` to remove sensitive files from git history');
  }
} catch (error) {
  console.error('❌ Error during security operations:', error);
  process.exit(1);
}