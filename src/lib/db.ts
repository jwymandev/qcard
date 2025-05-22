import { PrismaClient } from '@prisma/client';

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
}