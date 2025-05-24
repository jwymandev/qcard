import { PrismaClient } from '@prisma/client';
import { getDatabaseUrl } from './db-connection';

/**
 * This module provides a secure, dedicated database connection for authentication
 * that always uses the real database, regardless of environment settings.
 * 
 * It's used for critical operations like user registration and authentication
 * where we absolutely need real database access, not mocks.
 */

// Global type for the auth database client
declare global {
  var authPrisma: PrismaClient | undefined;
}

/**
 * Creates a dedicated Prisma client for authentication that always
 * connects to the real database, ignoring NEXT_BUILD_SKIP_DB
 */
function createAuthPrismaClient(): PrismaClient {
  console.log('Creating dedicated authentication database client');
  
  try {
    // Get database URL with better error handling
    const databaseUrl = getDatabaseUrl();
    
    // Create the real client for authentication
    const client = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: ['error', 'warn'],
      errorFormat: 'pretty',
    });

    // Add error listener
    client.$on('error', (e) => {
      console.error('⚠️ Auth database client error:', e.message);
    });
    
    // Verify connection
    client.$connect().then(() => {
      console.log('✅ Auth database connection established');
      
      // Test query
      return client.user.count();
    }).then((count) => {
      console.log(`Auth database connected, found ${count} users`);
    }).catch((error) => {
      console.error('❌ Auth database connection failed:', error);
    });
    
    return client;
  } catch (error) {
    console.error('⚠️ Failed to create auth database client:', error);
    throw error; // Rethrow to indicate failure
  }
}

// Create or reuse the Auth PrismaClient instance
export const authPrisma = global.authPrisma || createAuthPrismaClient();

// In development, preserve client between hot reloads
if (process.env.NODE_ENV !== 'production') {
  global.authPrisma = authPrisma;
}