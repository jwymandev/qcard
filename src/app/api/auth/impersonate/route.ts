import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// GET /api/auth/impersonate
export async function GET(request: Request) {
  try {
    // Get the current session
    const session = await auth();
    if (!session || !session.user || session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Get user ID from query params
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const adminId = url.searchParams.get('adminId');

    // Validate parameters
    if (!userId || !adminId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verify the admin ID matches the current user
    if (session.user.id !== adminId) {
      return NextResponse.json(
        { error: 'Admin ID mismatch - session may have expired' },
        { status: 403 }
      );
    }

    // Get the user to impersonate
    const userToImpersonate = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        Tenant: true
      }
    });

    if (!userToImpersonate) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Record this impersonation for audit purposes
    try {
      // Try to log to an audit table if it exists
      await prisma.$executeRaw`
        INSERT INTO "audit_log" ("action", "admin_id", "target_id", "details", "created_at")
        VALUES ('IMPERSONATE_LOGIN', ${adminId}, ${userId}, ${{adminEmail: session.user.email, targetEmail: userToImpersonate.email}}, NOW())
      `;
    } catch (err: unknown) {
      // If table doesn't exist, just log the error but continue
      console.warn('Could not log admin impersonation login:', err);
    }

    // Set cookie or session for impersonation
    // This would integrate with your NextAuth setup
    
    // Determine where to redirect the user based on their role
    let redirectUrl = '/role-redirect';
    
    // Redirect to appropriate dashboard
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error('Error in impersonation endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Impersonation failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}