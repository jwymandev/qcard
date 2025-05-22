#!/usr/bin/env node

/**
 * Global Database Fix Script
 * 
 * This script creates a completely minimal database client
 * to be used across the entire application.
 */

const fs = require('fs');
const path = require('path');

console.log('Creating global minimal database client...');

// Minimal database client with no assignments
const minimalDbTs = `import { PrismaClient } from '@prisma/client';

// Global type for the PrismaClient
declare global {
  var prisma: PrismaClient | undefined;
}

// Create a new PrismaClient instance
function createPrismaClient() {
  // Use simple configuration to avoid any assignment issues
  const client = new PrismaClient({
    log: ['error'],
    errorFormat: 'pretty',
  });
  
  return client;
}

// Create or reuse the PrismaClient instance
export const prisma = global.prisma || createPrismaClient();

// In development, preserve client between hot reloads
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}`;

// Path to the db.ts file
const dbTsPath = path.join(process.cwd(), 'src', 'lib', 'db.ts');

// Write the minimal database client
try {
  fs.writeFileSync(dbTsPath, minimalDbTs, 'utf8');
  console.log(`✅ Created minimal database client at ${dbTsPath}`);
} catch (error) {
  console.error(`❌ Error creating minimal database client: ${error.message}`);
}

console.log('Minimal database client created successfully!');
console.log('To deploy, commit this file and push to your repository.');