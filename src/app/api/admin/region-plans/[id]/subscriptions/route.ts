import { authPrisma } from '@/lib/secure-db-connection';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// Helper function to check if user is an admin
async function requireAdmin() {
  const session = await auth();
  
  if (!session || !session.user) {
    return { authorized: false, status: 401, message: "Unauthorized" };
  }
  
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
    return { authorized: false, status: 403, message: "Forbidden - Admin access required" };
  }
  
  return { authorized: true, session };
}

// GET /api/admin/region-plans/[id]/subscriptions - Get all subscriptions for a region plan
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authorization
    const auth = await requireAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }
    
    const id = params.id;
    
    // Check if the region plan exists
    console.log(`Checking if region plan ${id} exists using authPrisma`);
    const regionPlan = await authPrisma.regionSubscriptionPlan.findUnique({
      where: { id }
    });
    
    if (!regionPlan) {
      return NextResponse.json({ error: "Region plan not found" }, { status: 404 });
    }
    
    // Get all subscriptions for this region plan
    console.log(`Fetching subscriptions for region plan ${id} using authPrisma`);
    const subscriptions = await authPrisma.userRegionSubscription.findMany({
      where: {
        regionPlanId: id
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error(`Error fetching subscriptions for region plan ${params.id}:`, error);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}