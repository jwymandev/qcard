import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * API route to get available subscription plans
 */
export async function GET() {
  try {
    // Try to fetch subscription plans from the database
    let plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });
    
    // If no plans in the database, return default plans
    if (plans.length === 0) {
      // Return default plans
      return NextResponse.json([
        {
          id: 'basic',
          name: 'Basic',
          description: 'Access to one location',
          price: 19.99,
          features: ['Access to one location', 'Basic messaging']
        },
        {
          id: 'pro',
          name: 'Professional',
          description: 'Access to all locations and premium features',
          price: 39.99,
          features: [
            'Access to all locations', 
            'Unlimited messaging', 
            'Advanced talent search',
            'Custom questionnaires'
          ]
        },
        {
          id: 'business',
          name: 'Business',
          description: 'Everything in Pro plus enterprise features',
          price: 99.99,
          features: [
            'Everything in Professional plan',
            'External actor management',
            'Advanced analytics',
            'Priority support'
          ]
        }
      ]);
    }
    
    // Format the plans for the frontend
    const formattedPlans = plans.map(plan => {
      // Parse features from JSON if needed
      let features = [];
      try {
        if (plan.features) {
          const featuresData = plan.features as any;
          if (typeof featuresData === 'string') {
            features = JSON.parse(featuresData);
          } else if (Array.isArray(featuresData)) {
            features = featuresData;
          }
        }
      } catch (e) {
        features = [];
      }
      
      return {
        id: plan.id,
        name: plan.name,
        description: plan.description || '',
        price: plan.price,
        interval: plan.interval,
        features: features
      };
    });
    
    return NextResponse.json(formattedPlans);
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription plans' },
      { status: 500 }
    );
  }
}