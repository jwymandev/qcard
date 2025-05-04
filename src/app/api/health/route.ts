import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Health check endpoint for monitoring the application's database connection.
 * This is useful for ensuring the app is properly connected to the database,
 * especially after deployments.
 */
export async function GET() {
  try {
    // Check DB connection by performing a simple query
    const userCount = await prisma.user.count();
    
    // Check studio and talent models to specifically test your problematic areas
    const studioCount = await prisma.studio.count();
    const profileCount = await prisma.profile.count();
    
    return NextResponse.json({
      status: 'healthy',
      database: {
        connected: true,
        counts: {
          users: userCount,
          studios: studioCount,
          talents: profileCount
        }
      },
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      database: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown database error'
      },
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}