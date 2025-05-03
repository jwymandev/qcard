import { PrismaClient } from '@prisma/client';

// Enhanced PrismaClient with connection handling
const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: ['error', 'warn'],
    errorFormat: 'pretty',
  });

  // Setup connection handling for more resilience
  client.$connect()
    .then(() => {
      console.log('Database connection established');
    })
    .catch((e) => {
      console.error('Failed to connect to database:', e);
    });

  return client;
};

// Use PrismaClient as a singleton to prevent too many connections
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || prismaClientSingleton();

// In development, use a global variable to avoid creating multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}