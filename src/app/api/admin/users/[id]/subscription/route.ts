import { NextResponse } from 'next/server';
import { authPrisma } from '@/lib/secure-db-connection';
import { requireAdmin } from '@/lib/admin-helpers';
import { z } from 'zod';

// Validation schema for subscription updates
const updateSubscriptionSchema = z.object({
  status: z.enum(['ACTIVE', 'CANCELED', 'PAST_DUE', 'UNPAID', 'INCOMPLETE']).optional(),
  planId: z.string().optional(),
  currentPeriodEnd: z.string().datetime().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

const createSubscriptionSchema = z.object({
  planId: z.string().optional(), // Made optional since lifetime doesn't need a specific plan
  status: z.enum(['ACTIVE', 'CANCELED', 'PAST_DUE', 'UNPAID', 'INCOMPLETE']).optional(),
  isLifetime: z.boolean().optional(),
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
    
    // Find the user and their subscriptions
    const user = await authPrisma.user.findUnique({
      where: { id: params.id },
      include: {
        subscriptions: {
          include: {
            plan: true
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
    
    // Get the most recent active subscription
    const activeSubscription = user.subscriptions.find(sub => sub.status === 'ACTIVE') || user.subscriptions[0];
    
    if (!activeSubscription) {
      return NextResponse.json(
        { error: 'User has no subscription to update' },
        { status: 404 }
      );
    }
    
    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
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
    
    // Update subscription
    const subscription = await authPrisma.subscription.update({
      where: { id: activeSubscription.id },
      data: updateData,
      include: {
        plan: true
      }
    });
    
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
    
    // Validate input data
    const result = createSubscriptionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: result.error.format() },
        { status: 400 }
      );
    }
    
    const { planId, status = 'ACTIVE', isLifetime = false } = result.data;
    
    // Find the user
    const user = await authPrisma.user.findUnique({
      where: { id: params.id },
      include: {
        subscriptions: true
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if user already has an active subscription
    const activeSubscription = user.subscriptions.find(sub => sub.status === 'ACTIVE');
    if (activeSubscription) {
      return NextResponse.json(
        { error: 'User already has an active subscription' },
        { status: 409 }
      );
    }
    
    let finalPlanId = planId;
    
    // For lifetime subscriptions, find or create the best plan
    if (isLifetime) {
      // First try to find a lifetime plan
      let lifetimePlan = await authPrisma.subscriptionPlan.findFirst({
        where: {
          OR: [
            { name: { contains: 'Lifetime', mode: 'insensitive' } },
            { interval: 'lifetime' }
          ]
        }
      });
      
      // If no lifetime plan exists, find the highest-priced plan (premium)
      if (!lifetimePlan) {
        lifetimePlan = await authPrisma.subscriptionPlan.findFirst({
          where: { isActive: true },
          orderBy: { price: 'desc' }
        });
      }
      
      // If still no plan, create a default lifetime plan
      if (!lifetimePlan) {
        lifetimePlan = await authPrisma.subscriptionPlan.create({
          data: {
            name: 'Lifetime Access',
            description: 'Lifetime access to all features',
            price: 0, // Free for admin-granted lifetime access
            interval: 'lifetime',
            features: ['all_features', 'priority_support', 'advanced_analytics', 'lifetime_access'],
            isActive: true
          }
        });
        console.log(`Created lifetime plan: ${lifetimePlan.id}`);
      }
      
      finalPlanId = lifetimePlan.id;
    } else if (planId) {
      // Verify the specified plan exists
      const plan = await authPrisma.subscriptionPlan.findUnique({
        where: { id: planId }
      });
      
      if (!plan) {
        return NextResponse.json(
          { error: 'Subscription plan not found' },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Either planId or isLifetime must be specified' },
        { status: 400 }
      );
    }
    
    // Create new subscription
    const subscription = await authPrisma.subscription.create({
      data: {
        userId: user.id,
        planId: finalPlanId,
        status,
        currentPeriodStart: new Date(),
        currentPeriodEnd: isLifetime ? 
          new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000) : // 100 years for lifetime
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        cancelAtPeriodEnd: false
      },
      include: {
        plan: true
      }
    });
    
    console.log(`Created subscription for user ${params.id}:`, subscription);
    
    return NextResponse.json({
      message: 'Subscription created successfully',
      subscription
    });
  } catch (error) {
    console.error(`Error creating subscription for user ${params.id}:`, error);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { 
        error: 'Failed to create subscription', 
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
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
    
    // Find the user and their subscriptions
    const user = await authPrisma.user.findUnique({
      where: { id: params.id },
      include: {
        subscriptions: true
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const activeSubscription = user.subscriptions.find(sub => sub.status === 'ACTIVE');
    
    if (!activeSubscription) {
      return NextResponse.json(
        { error: 'User has no active subscription to remove' },
        { status: 404 }
      );
    }
    
    // Cancel the subscription (don't delete, just cancel)
    await authPrisma.subscription.update({
      where: { id: activeSubscription.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        cancelAtPeriodEnd: true
      }
    });
    
    console.log(`Canceled subscription for user ${params.id}`);
    
    return NextResponse.json({
      message: 'Subscription canceled successfully'
    });
  } catch (error) {
    console.error(`Error removing subscription for user ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to remove subscription', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}