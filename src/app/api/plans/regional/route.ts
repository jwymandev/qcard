import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get the URL parameters
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');
    
    // Build the query
    const where = regionId 
      ? { isActive: true, regionId }
      : { isActive: true };
    
    // Query structure with proper types
    const query = {
      where,
      include: {
        region: true
      },
      orderBy: {
        price: 'asc' as const
      }
    };
    
    // Fetch all regional subscription plans
    const plans = await prisma.regionSubscriptionPlan.findMany(query);
    
    // Format the plans for the frontend
    const formattedPlans = plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      region: plan.region,
      features: [
        `Access to ${plan.region.name} casting calls`,
        `Opportunity to work in ${plan.region.name}`,
        'Apply to unlimited casting calls',
        'Access to basic features'
      ]
    }));
    
    return NextResponse.json(formattedPlans);
  } catch (error) {
    console.error("Error fetching regional subscription plans:", error);
    return NextResponse.json({ error: "Failed to fetch subscription plans" }, { status: 500 });
  }
}

/**
 * Get discount information based on number of regions
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { regionCount } = body;
    
    if (!regionCount || typeof regionCount !== 'number') {
      return NextResponse.json({ error: "Invalid region count" }, { status: 400 });
    }
    
    // Find the applicable discount
    const discount = await prisma.multiRegionDiscount.findFirst({
      where: {
        regionCount: {
          lte: regionCount
        },
        active: true
      },
      orderBy: {
        regionCount: 'desc'
      }
    });
    
    // If no discount is found (e.g., for 1 region), return 0%
    if (!discount) {
      return NextResponse.json({
        regionCount,
        discountPercentage: 0,
        discountAmount: 0
      });
    }
    
    return NextResponse.json({
      regionCount,
      discountPercentage: discount.discountPercentage,
      discountAmount: discount.discountPercentage / 100
    });
  } catch (error) {
    console.error("Error calculating discount:", error);
    return NextResponse.json({ error: "Failed to calculate discount" }, { status: 500 });
  }
}