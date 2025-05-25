import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authPrisma } from '@/lib/secure-db-connection';
import { auth } from '@/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Check if the user is authorized (admin only)
    const session = await auth();
    if (!session?.user?.isAdmin && session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Get users with their associated tenant data
    const usersFromAuthPrisma = await authPrisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        tenantId: true,
        Tenant: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    // Also try with normal prisma
    const usersFromPrisma = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        tenantId: true,
        Tenant: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    // Count users in both clients
    const authPrismaCount = await authPrisma.user.count();
    const prismaCount = await prisma.user.count();
    
    return NextResponse.json({
      usersFromAuthPrisma,
      usersFromPrisma,
      counts: {
        authPrisma: authPrismaCount,
        prisma: prismaCount
      },
      clientComparison: {
        sameCount: authPrismaCount === prismaCount,
        authPrismaUsers: authPrismaCount,
        prismaUsers: prismaCount
      }
    });
  } catch (error) {
    console.error('Error in debug users route:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}