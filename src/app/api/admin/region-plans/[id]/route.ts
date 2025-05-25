import { prisma } from '@/lib/db';
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

// GET /api/admin/region-plans/[id] - Get a specific region plan
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
    
    // Fetch the region plan with the given ID - use authPrisma for reliable database access
    console.log(`Fetching region plan ${id} using authPrisma`);
    const regionPlan = await authPrisma.regionSubscriptionPlan.findUnique({
      where: { id },
      include: {
        region: true
      }
    });
    
    if (!regionPlan) {
      return NextResponse.json({ error: "Region plan not found" }, { status: 404 });
    }
    
    return NextResponse.json(regionPlan);
  } catch (error) {
    console.error("Error fetching region plan:", error);
    return NextResponse.json({ error: "Failed to fetch region plan" }, { status: 500 });
  }
}

// PUT /api/admin/region-plans/[id] - Update a region plan
export async function PUT(
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
    const data = await request.json();
    
    // Check if the region plan exists - use authPrisma for reliable database access
    console.log(`Checking if region plan ${id} exists using authPrisma`);
    const existingPlan = await authPrisma.regionSubscriptionPlan.findUnique({
      where: { id }
    });
    
    if (!existingPlan) {
      return NextResponse.json({ error: "Region plan not found" }, { status: 404 });
    }
    
    // Prepare update data
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = parseFloat(data.price);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.stripePriceId !== undefined) updateData.stripePriceId = data.stripePriceId;
    
    // Add updated timestamp
    updateData.updatedAt = new Date();
    
    // Update the region plan - use authPrisma for reliable database access
    console.log(`Updating region plan ${id} using authPrisma`);
    const updatedPlan = await authPrisma.regionSubscriptionPlan.update({
      where: { id },
      data: updateData,
      include: {
        region: true
      }
    });
    
    return NextResponse.json(updatedPlan);
  } catch (error) {
    console.error("Error updating region plan:", error);
    return NextResponse.json({ error: "Failed to update region plan" }, { status: 500 });
  }
}

// DELETE /api/admin/region-plans/[id] - Delete a region plan
export async function DELETE(
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
    
    // Check if the region plan exists - use authPrisma for reliable database access
    console.log(`Checking if region plan ${id} exists using authPrisma`);
    const existingPlan = await authPrisma.regionSubscriptionPlan.findUnique({
      where: { id }
    });
    
    if (!existingPlan) {
      return NextResponse.json({ error: "Region plan not found" }, { status: 404 });
    }
    
    // Check if the plan has active subscriptions - use authPrisma for reliable database access
    console.log(`Checking for active subscriptions for plan ${id} using authPrisma`);
    const activeSubscriptions = await authPrisma.userRegionSubscription.findMany({
      where: {
        regionPlanId: id,
        status: 'ACTIVE'
      }
    });
    
    if (activeSubscriptions.length > 0) {
      return NextResponse.json({ 
        error: "Cannot delete a plan with active subscriptions",
        activeSubscriptionsCount: activeSubscriptions.length
      }, { status: 400 });
    }
    
    // Delete the region plan - use authPrisma for reliable database access
    console.log(`Deleting region plan ${id} using authPrisma`);
    await authPrisma.regionSubscriptionPlan.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true, message: "Region plan deleted successfully" });
  } catch (error) {
    console.error("Error deleting region plan:", error);
    return NextResponse.json({ error: "Failed to delete region plan" }, { status: 500 });
  }
}