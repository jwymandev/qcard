import { PrismaClient } from '@prisma/client';
import { getDatabaseUrl } from './db-connection';

// Global type for the PrismaClient
declare global {
  var prisma: PrismaClient | undefined;
  var dbInitialized: boolean | undefined;
}

// Check if we're in build time (where we shouldn't connect to the database)
// This is essential to avoid DB connections during Next.js builds
const isBuildTime = (() => {
  // Explicit signal to use mock - this should be set during build process
  if (process.env.NEXT_BUILD_SKIP_DB === 'true') {
    console.log('Detected NEXT_BUILD_SKIP_DB=true, using mock client');
    return true;
  }
  
  // Next.js environment detection
  const isNextRuntime = process.env.NEXT_RUNTIME === 'nodejs' || 
                       process.env.NEXT_RUNTIME === 'edge';
  
  // For server components that aren't API routes
  const isServerComponent = typeof window === 'undefined';
  const isApiRoute = isServerComponent && isNextRuntime;
  
  // Always use the real client for API routes
  if (isApiRoute) {
    console.log('API route detected, using real database client');
    return false;
  }
  
  // For non-API server components during build time, use mock
  if (isServerComponent && !isApiRoute && process.env.NODE_ENV === 'production') {
    console.log('Server component in production build detected, using mock client');
    return true;
  }
  
  // Detect other build scenarios
  const possibleBuildProcess = 
    process.env.NODE_ENV === 'production' && 
    typeof process.env.NEXT_RUNTIME === 'undefined' && 
    isServerComponent;
  
  if (possibleBuildProcess) {
    console.log('Possible build process detected, using mock client');
    return true;
  }
  
  // Default to real client for all other scenarios
  return false;
})();

// Create a more robust mock PrismaClient for build time
class MockPrismaClient {
  constructor() {
    console.log('⚠️ Using MockPrismaClient - DATABASE ACCESS WILL NOT WORK');
    
    // Create a mock client with all required methods
    const mockClient = {
      // Core Prisma methods
      $connect: () => Promise.resolve(),
      $disconnect: () => Promise.resolve(),
      $queryRaw: () => Promise.resolve([{ result: 1 }]),
      $executeRaw: () => Promise.resolve({ count: 0 }),
      $on: () => {}, // No-op for event listeners
      
      // Transaction support (properly implemented)
      $transaction: (fn: any, options?: any) => {
        console.log('MockPrismaClient: Using mock transaction', options);
        
        // Create a transaction proxy that mimics the real one
        const txClient = new MockPrismaClient();
        
        // Execute the transaction function with our mock client
        try {
          return Promise.resolve(fn(txClient));
        } catch (error) {
          return Promise.reject(error);
        }
      }
    };
    
    // Return a proxy that handles all model and method accesses
    return new Proxy(mockClient, {
      get: (target: any, prop: string | symbol) => {
        // First check if the property exists on our mock client
        if (prop in target) {
          return target[prop];
        }
        
        // For any model access (user, profile, etc.), return a mock model
        return {
          findMany: (args?: any) => Promise.resolve([]),
          findUnique: (args?: any) => Promise.resolve(null),
          findFirst: (args?: any) => Promise.resolve(null),
          create: (args?: any) => {
            const data = args?.data || {};
            return Promise.resolve({ 
              ...data, 
              id: data.id || 'mock-id-' + Date.now()
            });
          },
          update: (args?: any) => {
            const data = args?.data || {};
            return Promise.resolve({ 
              ...data, 
              id: 'mock-id-update'
            });
          },
          delete: (args?: any) => Promise.resolve({}),
          count: (args?: any) => Promise.resolve(0),
          aggregate: (args?: any) => Promise.resolve({ count: 0 }),
          upsert: (args?: any) => {
            const data = args?.create || {};
            return Promise.resolve({ 
              ...data, 
              id: 'mock-id-upsert'
            });
          },
        };
      }
    });
  }
}

// Verify database connectivity with better error handling
async function verifyDatabaseConnection(client: PrismaClient): Promise<boolean> {
  try {
    console.log('Verifying database connection...');
    
    // Simple query to test connection
    const result = await client.$queryRaw`SELECT 1 as connected`;
    
    // Count users as a further test
    const userCount = await client.user.count();
    console.log(`Database connection verified. Found ${userCount} users.`);
    
    return true;
  } catch (error) {
    console.error('❌ DATABASE CONNECTION FAILED:', error);
    console.error(`
    ====================================
    DATABASE CONNECTION ERROR DIAGNOSTIC
    ====================================
    
    The application failed to connect to the database. This is usually caused by:
    
    1. Database server is not running
    2. Database credentials are incorrect
    3. Database name does not exist
    4. Network/firewall issues preventing connection
    
    Please check your .env file and ensure DATABASE_URL is correctly set.
    For local development, make sure your PostgreSQL server is running.
    `);
    
    return false;
  }
}

// Initialize database - ensure tables exist, run migrations if needed
async function initializeDatabase(client: PrismaClient): Promise<boolean> {
  // Skip if already initialized or in a test environment
  if (global.dbInitialized) {
    return true;
  }
  
  try {
    // Verify connection
    const connected = await verifyDatabaseConnection(client);
    if (!connected) {
      return false;
    }
    
    // Check if database has been properly set up by checking for core tables
    const tableExists = await checkIfTablesExist(client);
    if (!tableExists) {
      console.error(`
      ❌ DATABASE TABLES DO NOT EXIST
      
      It appears that your database is not properly initialized. 
      You may need to run migrations or set up the database schema.
      
      For development, try:
      1. npx prisma migrate dev
      2. npx prisma db push
      
      For production, ensure migrations have been applied.
      `);
      return false;
    }
    
    // Mark as initialized
    global.dbInitialized = true;
    console.log('✅ Database initialized successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
}

// Check if core tables exist in the database
async function checkIfTablesExist(client: PrismaClient): Promise<boolean> {
  try {
    // Try to query the User table to verify schema is properly set up
    await client.user.findFirst({ take: 1 });
    return true;
  } catch (error: any) {
    // Check for specific error indicating missing table
    if (error.message && (
      error.message.includes('relation "User" does not exist') ||
      error.message.includes('relation "user" does not exist') ||
      error.message.includes('no such table')
    )) {
      return false;
    }
    
    // For other errors, we assume tables exist but there's another issue
    console.warn('Warning during table check:', error);
    return true;
  }
}

// Create a new PrismaClient instance with proper initialization
function createPrismaClient() {
  // If we're in build time, return a mock client
  if (isBuildTime) {
    console.log('⚠️ Build time detected - using mock PrismaClient');
    return new MockPrismaClient() as unknown as PrismaClient;
  }
  
  try {
    // Get database URL with better error handling
    const databaseUrl = getDatabaseUrl();
    
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
      console.error('⚠️ Prisma Client error:', e.message);
    });
    
    // Setup reconnection on failure
    setupConnectionRecovery(client);
    
    // Initialize database (async)
    initializeDatabase(client).catch(error => {
      console.error('Failed to initialize database:', error);
    });
    
    return client;
  } catch (error) {
    console.error('⚠️ Failed to create Prisma client:', error);
    
    // Fallback to mock client in case of failure
    console.warn('⚠️ Using mock Prisma client as fallback due to initialization failure');
    return new MockPrismaClient() as unknown as PrismaClient;
  }
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
        console.log('✅ Database connection restored');
        isConnected = true;
        reconnectAttempts = 0;
      }
    } catch (error) {
      console.error('❌ Database connection check failed:', error);
      isConnected = false;
      
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`⏳ Attempting to reconnect to database (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`);
        
        try {
          await client.$disconnect();
          await client.$connect();
          console.log('✅ Reconnection successful');
          isConnected = true;
        } catch (reconnectError) {
          console.error('❌ Reconnection failed:', reconnectError);
        }
      } else {
        console.error(`❌ Maximum reconnection attempts (${maxReconnectAttempts}) reached`);
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