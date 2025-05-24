import { PrismaClient } from '@prisma/client';
import { getDatabaseUrl } from './db-connection';

// Global type for the PrismaClient
declare global {
  var prisma: PrismaClient | undefined;
}

// Check if we're in build time (where we shouldn't connect to the database)
const isBuildTime = process.env.NEXT_BUILD_SKIP_DB === 'true';

// Create a mock PrismaClient for build time
class MockPrismaClient {
  constructor() {
    return new Proxy({}, {
      get: (target, prop) => {
        // Return a no-op function that returns a mock value
        if (prop === '$connect' || prop === '$disconnect') {
          return () => Promise.resolve();
        }
        
        // For table operations, return a mock object with common operations
        return {
          findMany: () => Promise.resolve([]),
          findUnique: () => Promise.resolve(null),
          findFirst: () => Promise.resolve(null),
          create: (data: any) => Promise.resolve(data.data),
          update: (data: any) => Promise.resolve(data.data),
          delete: () => Promise.resolve({}),
          count: () => Promise.resolve(0),
          aggregate: () => Promise.resolve({ count: 0 }),
        };
      }
    });
  }
}

// Create a new PrismaClient instance
function createPrismaClient() {
  // If we're in build time, return a mock client
  if (isBuildTime) {
    console.log('Using mock PrismaClient during build time');
    return new MockPrismaClient() as unknown as PrismaClient;
  }
  
  // Use database URL from our connection helper
  const databaseUrl = getDatabaseUrl();
  console.log(`Connecting to database at ${databaseUrl.split('@')[1]}`); // Log just the host part for security
  
  // Create the real client for runtime with enhanced connection handling
  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: ['error', 'warn'],
    errorFormat: 'pretty',
  });

  // Add connection management
  client.$on('beforeExit', async () => {
    console.log('Prisma Client shutting down');
  });

  // Add error listeners
  client.$on('query', (e) => {
    // Log slow queries for debugging (over 1 second)
    if (e.duration > 1000) {
      console.warn(`Slow query (${e.duration}ms): ${e.query}`);
    }
  });

  client.$on('error', (e) => {
    console.error('Prisma Client error:', e.message);
  });
  
  // Setup reconnection on failure
  setupConnectionRecovery(client);
  
  return client;
}

// Add reconnection capabilities
function setupConnectionRecovery(client: PrismaClient) {
  let isConnected = false;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  
  // Check connection and reconnect if needed
  const checkConnection = async () => {
    try {
      // Simple query to test connection
      await client.$queryRaw`SELECT 1`;
      
      if (!isConnected) {
        console.log('Database connection restored');
        isConnected = true;
        reconnectAttempts = 0;
      }
    } catch (error) {
      console.error('Database connection check failed:', error);
      isConnected = false;
      
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`Attempting to reconnect to database (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`);
        
        try {
          await client.$disconnect();
          await client.$connect();
          console.log('Reconnection successful');
          isConnected = true;
        } catch (reconnectError) {
          console.error('Reconnection failed:', reconnectError);
        }
      } else {
        console.error(`Maximum reconnection attempts (${maxReconnectAttempts}) reached`);
      }
    }
  };
  
  // Initial connection check
  checkConnection();
  
  // Check connection every 5 minutes
  const intervalId = setInterval(checkConnection, 5 * 60 * 1000);
  
  // Clean up interval on process exit
  process.on('beforeExit', () => {
    clearInterval(intervalId);
  });
}

// Create or reuse the PrismaClient instance
export const prisma = global.prisma || createPrismaClient();

// In development, preserve client between hot reloads
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}