/**
 * Secure database connection utility
 * This module properly handles database credentials from environment variables
 * with fallbacks and proper error handling
 */

import { PrismaClient } from '@prisma/client';

// Determine database configuration from environment variables
function getDatabaseConfig() {
  // If full DATABASE_URL is provided, use it
  if (process.env.DATABASE_URL) {
    return { url: process.env.DATABASE_URL };
  }
  
  // Otherwise, construct from individual parameters
  if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME) {
    const port = process.env.DB_PORT || '5432';
    const sslMode = process.env.DB_SSL?.toLowerCase() === 'true' ? '?sslmode=require' : '';
    
    return {
      url: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${port}/${process.env.DB_NAME}${sslMode}`
    };
  }
  
  // For development, use SQLite as fallback
  if (process.env.NODE_ENV === 'development') {
    return { url: 'file:./prisma/dev.db' };
  }
  
  // If no configuration, throw an error
  throw new Error('Database configuration missing. Please set DATABASE_URL or individual DB_* environment variables.');
}

// Create and configure Prisma client
function createPrismaClient() {
  try {
    // Get database configuration
    const dbConfig = getDatabaseConfig();
    
    // Initialize client with configuration
    const prisma = new PrismaClient({
      datasources: {
        db: dbConfig,
      },
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
    
    // Log connection type
    console.log(`Database configured: ${dbConfig.url.startsWith('file:') ? 'file' : 'connection string'}`);
    
    return prisma;
  } catch (error) {
    console.error('Failed to initialize database client:', error);
    throw error;
  }
}

// Initialize client
let prisma: PrismaClient;

// Handle connection in a way that works with Next.js hot reloading
if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient();
} else {
  // For development, prevent multiple client instances during hot reloading
  if (!global.prisma) {
    global.prisma = createPrismaClient();
  }
  prisma = global.prisma;
}

// Function to test database connection
export async function testDatabaseConnection() {
  try {
    console.log('Establishing database connection (attempt 1/5)...');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Export as default and named export
export { prisma as default, prisma };

// Add TypeScript definition for global prisma instance
declare global {
  var prisma: PrismaClient | undefined;
}