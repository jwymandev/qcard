import { NextResponse } from 'next/server';
import { authPrisma } from '@/lib/secure-db-connection';
import { requireAdmin } from '@/lib/admin-helpers';

// POST /api/admin/users/[id]/grant-lifetime - Grant lifetime access to user
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`POST /api/admin/users/${params.id}/grant-lifetime request received`);
    
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
    
    // Find the user
    const user = await authPrisma.user.findUnique({
      where: { id: params.id },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' }
        }
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if user already has an active subscription
    if (user.subscriptions.length > 0) {
      // Update existing subscription to lifetime
      const existingSubscription = user.subscriptions[0];
      
      const updatedSubscription = await authPrisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          currentPeriodEnd: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000), // 100 years
          cancelAtPeriodEnd: false,
          status: 'ACTIVE'
        },
        include: {
          plan: true
        }
      });
      
      console.log(`Updated existing subscription to lifetime for user ${params.id}`);
      
      return NextResponse.json({
        message: 'User granted lifetime access (updated existing subscription)',
        subscription: updatedSubscription
      });
    } else {
      // Create new lifetime subscription
      
      // Find or create lifetime plan
      let lifetimePlan = await authPrisma.subscriptionPlan.findFirst({
        where: {
          OR: [
            { name: { contains: 'Lifetime', mode: 'insensitive' } },
            { interval: 'lifetime' }
          ]
        }
      });
      
      if (!lifetimePlan) {
        // Create lifetime plan if it doesn't exist
        lifetimePlan = await authPrisma.subscriptionPlan.create({
          data: {
            name: 'Lifetime Access',
            description: 'Lifetime access to all features - Admin granted',
            price: 0,
            interval: 'lifetime',
            features: ['all_features', 'priority_support', 'advanced_analytics', 'lifetime_access'],
            isActive: true
          }
        });
        console.log(`Created lifetime plan: ${lifetimePlan.id}`);
      }
      
      // Create lifetime subscription
      const subscription = await authPrisma.subscription.create({
        data: {
          userId: user.id,
          planId: lifetimePlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000), // 100 years
          cancelAtPeriodEnd: false
        },
        include: {
          plan: true
        }
      });
      
      console.log(`Created lifetime subscription for user ${params.id}:`, subscription);
      
      return NextResponse.json({
        message: 'User granted lifetime access',
        subscription
      });
    }
    
  } catch (error) {
    console.error(`Error granting lifetime access to user ${params.id}:`, error);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { 
        error: 'Failed to grant lifetime access', 
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}