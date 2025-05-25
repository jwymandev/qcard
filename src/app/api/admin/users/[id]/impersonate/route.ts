import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authPrisma } from '@/lib/secure-db-connection';
import { requireAdmin } from '@/lib/admin-helpers';
import { signOut } from '@/auth';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// POST /api/admin/users/[id]/impersonate
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`POST /api/admin/users/${params.id}/impersonate request received`);
    
    // Check admin access with API-friendly options
    const session = await requireAdmin({ 
      redirectOnFailure: false, 
      throwOnFailure: true 
    });
    
    if (!session) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    // Remember admin user ID (would be stored in a session or token)
    const adminId = session.user.id;
    
    // Check if user to impersonate exists - use authPrisma for reliable database access
    const userToImpersonate = await authPrisma.user.findUnique({
      where: { id: params.id },
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
    
    // Create an impersonation record to track this action for security
    try {
      // Try to log to an audit table if it exists - use authPrisma for reliable database access
      await authPrisma.$executeRaw`
        INSERT INTO "audit_log" ("action", "admin_id", "target_id", "details", "created_at")
        VALUES ('IMPERSONATE', ${adminId}, ${params.id}, ${{adminEmail: session.user.email, targetEmail: userToImpersonate.email}}, NOW())
      `;
    } catch (err: unknown) {
      // If this table doesn't exist, just log the error but continue
      console.warn('Could not log admin impersonation action:', err);
    }
    
    // In a real implementation, you'd create a special impersonation session
    // For this demo, we'll return the user details to impersonate
    
    // Generate an impersonation token (in a real app, this would be a JWT)
    const impersonationToken = Buffer.from(JSON.stringify({
      userId: userToImpersonate.id,
      adminId: adminId,
      isImpersonating: true,
      exp: Date.now() + 3600000 // 1 hour expiration
    })).toString('base64');
    
    return NextResponse.json({
      success: true,
      message: 'Impersonation started',
      user: {
        id: userToImpersonate.id,
        email: userToImpersonate.email,
        firstName: userToImpersonate.firstName,
        lastName: userToImpersonate.lastName,
        role: userToImpersonate.role,
        tenantType: userToImpersonate.Tenant?.type,
      },
      impersonationToken,
      redirectUrl: `/api/auth/impersonate?userId=${userToImpersonate.id}&adminId=${adminId}` // Link to the auth impersonation handler
    });
  } catch (error) {
    console.error(`Error impersonating user ${params.id}:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to impersonate user',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}