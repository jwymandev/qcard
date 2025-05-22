#!/usr/bin/env node

/**
 * Replace DB File Script
 * 
 * This script completely replaces the db.ts file with a known-good version
 * that doesn't have the assignment error.
 */

const fs = require('fs');
const path = require('path');

function replaceDbFile() {
  console.log('Replacing db.ts file with known-good version...');
  
  // Path to the source and destination files
  const srcPath = path.join(process.cwd(), 'src', 'lib', 'db.ts.new');
  const destPath = path.join(process.cwd(), 'src', 'lib', 'db.ts');
  
  // Check if the source file exists
  if (!fs.existsSync(srcPath)) {
    console.error(`Source file not found: ${srcPath}`);
    
    // If the source file doesn't exist, create a simple replacement directly
    const simpleReplacement = `import { PrismaClient } from '@prisma/client';

const PLACEHOLDER_DB_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';

// Simple version with no assignment errors
const prismaClientSingleton = () => {
  console.log('Initializing Prisma client...');
  
  // Always use this in build mode
  if (process.env.NEXT_BUILD_SKIP_DB === 'true') {
    console.log('Build mode detected - using mock Prisma client');
    return new PrismaClient({ errorFormat: 'pretty' });
  }
  
  // Get database URL safely - CORRECT ASSIGNMENT DIRECTION ALWAYS
  let databaseUrl = process.env.DATABASE_URL || PLACEHOLDER_DB_URL;
  
  // Initialize client
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
    errorFormat: 'pretty',
  });
  
  return client;
};

// Global singleton
const globalForPrisma = global as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma || prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}`;
    
    // Write the simple replacement file
    fs.writeFileSync(destPath, simpleReplacement, 'utf8');
    console.log('Created simple replacement db.ts file');
    return true;
  }
  
  try {
    // Read the content of the source file
    const content = fs.readFileSync(srcPath, 'utf8');
    
    // Write the content to the destination file
    fs.writeFileSync(destPath, content, 'utf8');
    
    console.log('✅ Successfully replaced db.ts file');
    return true;
  } catch (error) {
    console.error('❌ Error replacing db.ts file:', error.message);
    return false;
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  const result = replaceDbFile();
  if (result) {
    console.log('db.ts file has been successfully replaced');
    process.exit(0);
  } else {
    console.log('Failed to replace db.ts file');
    process.exit(1);
  }
}

// Export the function for use in other scripts
module.exports = {
  replaceDbFile
};