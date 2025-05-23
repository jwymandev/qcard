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
  
  // Create the real client for runtime
  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
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
}