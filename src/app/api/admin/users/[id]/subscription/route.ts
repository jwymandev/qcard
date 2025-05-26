import { NextResponse } from 'next/server';
import { authPrisma } from '@/lib/secure-db-connection';
import { requireAdmin } from '@/lib/admin-helpers';
import { z } from 'zod';

// Validation schema for subscription updates
const updateSubscriptionSchema = z.object({
  status: z.enum(['ACTIVE', 'CANCELED', 'PAST_DUE', 'UNPAID']).optional(),
  isLifetime: z.boolean().optional(),
  planId: z.string().optional(),
  currentPeriodEnd: z.string().datetime().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

// PUT /api/admin/users/[id]/subscription - Update user subscription
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`PUT /api/admin/users/${params.id}/subscription request received`);
    
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
    
    const body = await request.json();
    
    // Validate input data
    const result = updateSubscriptionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: result.error.format() },
        { status: 400 }
      );
    }
    
    const validatedData = result.data;
    
    // Find the user and their tenant
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
    
    if (!user.Tenant) {
      return NextResponse.json(
        { error: 'User has no tenant' },
        { status: 400 }
      );
    }
    
    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
    }
    
    if (validatedData.isLifetime !== undefined) {
      updateData.isLifetime = validatedData.isLifetime;
      // If setting to lifetime, ensure status is active and extend period
      if (validatedData.isLifetime) {
        updateData.status = 'ACTIVE';
        updateData.currentPeriodEnd = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000); // 100 years
        updateData.cancelAtPeriodEnd = false;
      }
    }
    
    if (validatedData.planId !== undefined) {
      updateData.planId = validatedData.planId;
    }
    
    if (validatedData.currentPeriodEnd !== undefined) {
      updateData.currentPeriodEnd = new Date(validatedData.currentPeriodEnd);
    }
    
    if (validatedData.cancelAtPeriodEnd !== undefined) {
      updateData.cancelAtPeriodEnd = validatedData.cancelAtPeriodEnd;
    }
    
    let subscription;
    
    if (user.Tenant.subscription) {
      // Update existing subscription
      subscription = await authPrisma.subscription.update({
        where: { id: user.Tenant.subscription.id },
        data: updateData
      });
    } else {
      // Create new subscription
      subscription = await authPrisma.subscription.create({
        data: {
          tenantId: user.Tenant.id,
          status: validatedData.status || 'ACTIVE',
          isLifetime: validatedData.isLifetime || false,
          planId: validatedData.planId || 'basic',
          currentPeriodStart: new Date(),
          currentPeriodEnd: validatedData.currentPeriodEnd ? 
            new Date(validatedData.currentPeriodEnd) : 
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          cancelAtPeriodEnd: validatedData.cancelAtPeriodEnd || false,
          ...updateData
        }
      });
    }
    
    console.log(`Updated subscription for user ${params.id}:`, subscription);
    
    return NextResponse.json({
      message: 'Subscription updated successfully',
      subscription
    });
  } catch (error) {
    console.error(`Error updating subscription for user ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to update subscription', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST /api/admin/users/[id]/subscription - Create subscription for user
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`POST /api/admin/users/${params.id}/subscription request received`);
    
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
    
    const body = await request.json();
    const { isLifetime = false, planId = 'basic', status = 'ACTIVE' } = body;
    
    // Find the user and their tenant
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
    
    if (!user.Tenant) {
      return NextResponse.json(
        { error: 'User has no tenant' },
        { status: 400 }
      );
    }
    
    if (user.Tenant.subscription) {
      return NextResponse.json(
        { error: 'User already has a subscription' },
        { status: 409 }
      );
    }
    
    // Create new subscription
    const subscription = await authPrisma.subscription.create({
      data: {
        tenantId: user.Tenant.id,
        status,
        isLifetime,
        planId,
        currentPeriodStart: new Date(),
        currentPeriodEnd: isLifetime ? 
          new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000) : // 100 years for lifetime
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        cancelAtPeriodEnd: false
      }
    });
    
    console.log(`Created subscription for user ${params.id}:`, subscription);
    
    return NextResponse.json({
      message: 'Subscription created successfully',
      subscription
    });
  } catch (error) {
    console.error(`Error creating subscription for user ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to create subscription', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id]/subscription - Remove user subscription
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`DELETE /api/admin/users/${params.id}/subscription request received`);
    
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
    
    // Find the user and their tenant
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
    
    if (!user.Tenant?.subscription) {
      return NextResponse.json(
        { error: 'User has no subscription to remove' },
        { status: 404 }
      );
    }
    
    // Delete the subscription
    await authPrisma.subscription.delete({
      where: { id: user.Tenant.subscription.id }
    });
    
    console.log(`Deleted subscription for user ${params.id}`);
    
    return NextResponse.json({
      message: 'Subscription removed successfully'
    });
  } catch (error) {
    console.error(`Error removing subscription for user ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to remove subscription', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}