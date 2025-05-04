import { PrismaClient } from '@prisma/client';
import { getDatabaseUrl } from './db-connection';

// Enhanced PrismaClient with connection handling and retries
const prismaClientSingleton = () => {
  console.log('Initializing PrismaClient...');
  
  // Get the database URL from environment or construct it from components
  const databaseUrl = getDatabaseUrl();
  
  // Try parsing DATABASE_URL to log host info (without exposing credentials)
  try {
    const url = new URL(databaseUrl);
    console.log(`Database host: ${url.hostname}, DB name: ${url.pathname.replace('/', '')}`);
  } catch (e) {
    console.warn('Could not parse database URL:', e instanceof Error ? e.message : String(e));
  }
  
  const client = new PrismaClient({
    log: ['error', 'warn', 'query', 'info'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });

  // Setup connection handling with retries
  const MAX_RETRIES = 5;
  const RETRY_DELAY_MS = 3000;
  
  const connectWithRetry = (retries = 0) => {
    console.log(`Attempting database connection (attempt ${retries + 1}/${MAX_RETRIES})...`);
    
    return client.$connect()
      .then(() => {
        console.log('✅ Database connection successfully established');
      })
      .catch((e) => {
        console.error(`❌ Failed to connect to database (attempt ${retries + 1}/${MAX_RETRIES}):`, e);
        
        if (retries < MAX_RETRIES - 1) {
          console.log(`Retrying in ${RETRY_DELAY_MS/1000} seconds...`);
          setTimeout(() => connectWithRetry(retries + 1), RETRY_DELAY_MS);
        } else {
          console.error('❌ Maximum connection attempts reached. Using PrismaClient anyway and hoping for the best.');
        }
      });
  };
  
  // Start the connection process
  connectWithRetry();

  return client;
};

// Use PrismaClient as a singleton to prevent too many connections
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || prismaClientSingleton();

// In development, use a global variable to avoid creating multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}