import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log("DB Debug: Testing database connection...");
    
    // Test basic database connectivity
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log("DB Debug: Basic connectivity test result:", result);
    
    // Count users (a simple query that should work)
    const userCount = await prisma.user.count();
    console.log(`DB Debug: Found ${userCount} users in database`);
    
    // Sample user info (without exposing sensitive data)
    const users = await prisma.user.findMany({
      take: 3,
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
        Tenant: {
          select: {
            id: true,
            type: true
          }
        }
      }
    });
    
    // Sanitize the data before returning
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      emailDomain: user.email.split('@')[1],
      hasEmail: !!user.email,
      role: user.role,
      hasTenant: !!user.tenantId,
      tenantType: user.Tenant?.type || 'none'
    }));
    
    return NextResponse.json({
      connected: true,
      databaseUrl: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'),
      userCount,
      sampleUsers: sanitizedUsers,
      env: {
        nodeEnv: process.env.NODE_ENV,
        platform: process.platform,
      }
    });
  } catch (error) {
    console.error("DB Debug: Error connecting to database:", error);
    return NextResponse.json({ 
      connected: false,
      error: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      databaseUrl: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'),
    }, { status: 500 });
  }
}