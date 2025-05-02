import { PrismaClient } from '@prisma/client';

// Use PrismaClient as a singleton to prevent too many connections in development
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;