import { PrismaClient } from '@prisma/client';
import { ensureProperDatabaseUrl } from './database-utils';

// Production-grade PrismaClient singleton with error handling and 
// proper database URL configuration for any environment
const prismaClientSingleton = () => {
  console.log('Initializing Prisma client...');
  
  // Critical step: ensure DATABASE_URL is properly set before Prisma initializes
  // This handles PostgreSQL URL construction in production environments
  const databaseConfigured = ensureProperDatabaseUrl();
  
  if (!databaseConfigured) {
    console.error('⚠️ Database configuration issue detected - app may fail to connect');
  }
  
  // Initialize PrismaClient with production settings
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    errorFormat: 'pretty',
  });

  // Production-grade connection handling with circuit breaker pattern
  const MAX_RETRIES = 5;
  const RETRY_DELAY_MS = 3000;
  let connectionFailed = false;
  
  const connectWithRetry = (retries = 0) => {
    if (connectionFailed) return;
    
    console.log(`Establishing database connection (attempt ${retries + 1}/${MAX_RETRIES})...`);
    
    return client.$connect()
      .then(() => {
        console.log('✅ Database connection established');
      })
      .catch((error) => {
        console.error(`❌ Database connection failed (attempt ${retries + 1}/${MAX_RETRIES}):`, error.message);
        
        if (retries < MAX_RETRIES - 1) {
          console.log(`Retrying in ${RETRY_DELAY_MS/1000} seconds...`);
          setTimeout(() => connectWithRetry(retries + 1), RETRY_DELAY_MS);
        } else {
          connectionFailed = true;
          console.error('❌ Maximum connection attempts reached');
          console.error('Database connectivity issues may affect application functionality');
          
          // In a production app, you might want to:
          // 1. Emit metrics/alerts to a monitoring system
          // 2. Implement a recovery strategy (e.g., restart connection attempts periodically)
          // 3. Set up a health endpoint that reports connection status
        }
      });
  };
  
  // Begin connection process immediately
  connectWithRetry();

  return client;
};

// Use global singleton to prevent connection pool exhaustion
type GlobalWithPrisma = typeof globalThis & {
  prisma?: PrismaClient;
};

// Ensure a single PrismaClient instance is used across the application
const globalForPrisma: GlobalWithPrisma = global as unknown as GlobalWithPrisma;
export const prisma = globalForPrisma.prisma || prismaClientSingleton();

// In development, preserve the client between hot reloads
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}