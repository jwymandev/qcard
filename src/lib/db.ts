import { PrismaClient } from '@prisma/client';

// Define a placeholder database URL for builds
const PLACEHOLDER_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';

// Global type for the PrismaClient
declare global {
  var prisma: PrismaClient | undefined;
}

/**
 * Create a singleton PrismaClient instance
 */
function createPrismaClient(): PrismaClient {
  // Skip real database connection during build
  if (process.env.NEXT_BUILD_SKIP_DB === 'true') {
    console.log('🛑 Build mode detected - using mock Prisma client');
    return new PrismaClient({
      errorFormat: 'pretty',
    });
  }

  // Get database URL with fallback to placeholder
  let databaseUrl = '';
  
  // Use existing DATABASE_URL if available
  if (process.env.DATABASE_URL) {
    databaseUrl = process.env.DATABASE_URL;
  } 
  // Construct from components if available
  else if (process.env.DATABASE_HOST) {
    const host = process.env.DATABASE_HOST || '';
    const port = process.env.DATABASE_PORT || '5432';
    const username = process.env.DATABASE_USERNAME || 'postgres';
    const password = process.env.DATABASE_PASSWORD || '';
    const dbName = process.env.DATABASE_NAME || 'postgres';
    
    // Encode password for URL
    const encodedPassword = encodeURIComponent(password);
    
    // Construct the URL
    databaseUrl = `postgresql://${username}:${encodedPassword}@${host}:${port}/${dbName}?sslmode=require`;
  } 
  // Fallback to placeholder
  else {
    databaseUrl = PLACEHOLDER_URL;
  }
  
  // Set DATABASE_URL for Prisma to use
  if (typeof process !== 'undefined' && process.env) {
    // IMPORTANT: Correct assignment direction
    process.env.DATABASE_URL = databaseUrl;
  }
  
  // Create the Prisma client
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
    errorFormat: 'pretty',
  });
}

// Create or reuse the PrismaClient instance
export const prisma = global.prisma || createPrismaClient();

// In development, preserve client between hot reloads
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}