import { NextResponse } from 'next/server';
import { authPrisma } from '@/lib/secure-db-connection';
import { requireAdmin } from '@/lib/admin-helpers';

// POST /api/admin/setup-default-plans - Create default subscription plans
export async function POST() {
  try {
    console.log('POST /api/admin/setup-default-plans request received');
    
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
    
    // Check if plans already exist
    const existingPlans = await authPrisma.subscriptionPlan.findMany();
    if (existingPlans.length > 0) {
      return NextResponse.json({
        message: 'Default subscription plans already exist',
        plans: existingPlans
      });
    }
    
    // Create default subscription plans
    const defaultPlans = [
      {
        name: 'Basic',
        description: 'Basic subscription plan',
        price: 9.99,
        interval: 'month',
        features: ['basic_features', 'standard_support'],
        isActive: true
      },
      {
        name: 'Pro',
        description: 'Professional subscription plan',
        price: 19.99,
        interval: 'month',
        features: ['all_features', 'priority_support', 'advanced_analytics'],
        isActive: true
      },
      {
        name: 'Lifetime',
        description: 'Lifetime subscription plan',
        price: 499.99,
        interval: 'lifetime',
        features: ['all_features', 'priority_support', 'advanced_analytics', 'lifetime_access'],
        isActive: true
      }
    ];
    
    const createdPlans = [];
    for (const planData of defaultPlans) {
      const plan = await authPrisma.subscriptionPlan.create({
        data: planData
      });
      createdPlans.push(plan);
      console.log(`Created subscription plan: ${plan.name} (${plan.id})`);
    }
    
    return NextResponse.json({
      message: 'Default subscription plans created successfully',
      plans: createdPlans
    });
  } catch (error) {
    console.error('Error creating default subscription plans:', error);
    return NextResponse.json(
      { error: 'Failed to create default subscription plans', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}