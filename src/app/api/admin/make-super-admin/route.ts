import { NextResponse } from 'next/server';
import { authPrisma } from '@/lib/secure-db-connection';
import { auth } from '@/auth';

/**
 * GET /api/admin/make-super-admin
 * Upgrades the current user to SUPER_ADMIN role
 * ⚠️ WARNING: This is a development utility and should be removed in production
 */
export async function GET() {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const userEmail = session.user.email;
    
    console.log(`Attempting to upgrade user to SUPER_ADMIN: ${userEmail} (${userId})`);
    
    // Check if user exists
    const user = await authPrisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true
      }
    });
    
    if (!user) {
      console.error(`User not found: ${userId}`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    if (user.role === 'SUPER_ADMIN') {
      console.log(`User ${userEmail} is already a SUPER_ADMIN`);
      return NextResponse.json({
        message: 'You are already a SUPER_ADMIN',
        role: user.role
      });
    }
    
    // Upgrade user to SUPER_ADMIN
    const updatedUser = await authPrisma.user.update({
      where: { id: userId },
      data: {
        role: 'SUPER_ADMIN'
      }
    });
    
    console.log(`User ${userEmail} upgraded to SUPER_ADMIN successfully`);
    
    return NextResponse.json({
      message: 'You have been upgraded to SUPER_ADMIN successfully',
      previousRole: user.role,
      newRole: updatedUser.role
    });
  } catch (error) {
    console.error('Error upgrading user to SUPER_ADMIN:', error);
    return NextResponse.json(
      { error: 'Failed to upgrade user role' },
      { status: 500 }
    );
  }
}