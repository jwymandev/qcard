import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authPrisma } from '@/lib/secure-db-connection';
import { requireAdmin } from '@/lib/admin-helpers';
import { z } from 'zod';
import bcrypt from 'bcrypt';

// Validation schema for user updates
const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

// GET /api/admin/users/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`GET /api/admin/users/${params.id} request received`);
    
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
    
    // Check if user exists - use authPrisma for reliable database access
    const user = await authPrisma.user.findUnique({
      where: { id: params.id },
      include: {
        Tenant: {
          include: {
            subscription: true
          }
        }
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Format and return user data (excluding password)
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenantType: user.Tenant?.type,
      tenantName: user.Tenant?.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      subscription: user.Tenant?.subscription ? {
        id: user.Tenant.subscription.id,
        status: user.Tenant.subscription.status,
        planId: user.Tenant.subscription.planId,
        currentPeriodStart: user.Tenant.subscription.currentPeriodStart,
        currentPeriodEnd: user.Tenant.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: user.Tenant.subscription.cancelAtPeriodEnd,
        isLifetime: user.Tenant.subscription.isLifetime
      } : null
    };
    
    return NextResponse.json(userData);
  } catch (error) {
    console.error(`Error fetching user ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/[id]
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`PUT /api/admin/users/${params.id} request received`);
    
    // Check admin access
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
    
    // Check if user exists - use authPrisma for reliable database access
    const existingUser = await authPrisma.user.findUnique({
      where: { id: params.id },
      include: { Tenant: true }
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateUserSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid user data', 
          details: validationResult.error.flatten() 
        },
        { status: 400 }
      );
    }
    
    const { email, firstName, lastName, role, password } = validationResult.data;
    
    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };
    
    // Only update provided fields
    if (email !== undefined) updateData.email = email;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (role !== undefined) updateData.role = role;
    
    // If password is provided, hash it
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    // Update user - use authPrisma for reliable database access
    const updatedUser = await authPrisma.user.update({
      where: { id: params.id },
      data: updateData,
      include: { Tenant: true }
    });
    
    // Format and return user data (excluding password)
    const userData = {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      name: `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim() || updatedUser.email,
      role: updatedUser.role,
      tenantId: updatedUser.tenantId,
      tenantType: updatedUser.Tenant?.type,
      tenantName: updatedUser.Tenant?.name,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    };
    
    return NextResponse.json(userData);
  } catch (error) {
    console.error(`Error updating user ${params.id}:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to update user',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`DELETE /api/admin/users/${params.id} request received`);
    
    // Check admin access
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
    
    // Check if user exists - use authPrisma for reliable database access
    const existingUser = await authPrisma.user.findUnique({
      where: { id: params.id }
    });
    
    if (!existingUser) {
      console.log(`User not found with ID: ${params.id}`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Prevent deleting your own account
    if (session.user.id === params.id) {
      console.log(`Admin attempted to delete their own account: ${params.id}`);
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }
    
    console.log(`Deleting user: ${existingUser.email} (${existingUser.id})`);
    
    // Delete user - use authPrisma for reliable database access
    await authPrisma.user.delete({
      where: { id: params.id }
    });
    
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error(`Error deleting user ${params.id}:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to delete user',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}