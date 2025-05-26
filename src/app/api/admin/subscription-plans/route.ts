import { NextResponse } from 'next/server';
import { authPrisma } from '@/lib/secure-db-connection';
import { requireAdmin } from '@/lib/admin-helpers';

// GET /api/admin/subscription-plans - List all subscription plans
export async function GET() {
  try {
    console.log('GET /api/admin/subscription-plans request received');
    
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
    
    // Get all subscription plans
    const plans = await authPrisma.subscriptionPlan.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`Found ${plans.length} subscription plans`);
    
    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription plans', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST /api/admin/subscription-plans - Create a new subscription plan
export async function POST(request: Request) {
  try {
    console.log('POST /api/admin/subscription-plans request received');
    
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
    const { name, description, price, interval = 'month', features } = body;
    
    if (!name || price === undefined) {
      return NextResponse.json(
        { error: 'Name and price are required' },
        { status: 400 }
      );
    }
    
    // Create new subscription plan
    const plan = await authPrisma.subscriptionPlan.create({
      data: {
        name,
        description: description || `${name} subscription plan`,
        price: parseFloat(price),
        interval,
        features: features || [],
        isActive: true
      }
    });
    
    console.log(`Created subscription plan: ${plan.name} (${plan.id})`);
    
    return NextResponse.json({
      message: 'Subscription plan created successfully',
      plan
    });
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription plan', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}