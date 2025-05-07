import { prisma } from '@/lib/db';
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

// GET /api/admin/discounts/[id] - Get a specific discount tier
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
    
    // Fetch the discount tier with the given ID
    const discount = await prisma.multiRegionDiscount.findUnique({
      where: { id }
    });
    
    if (!discount) {
      return NextResponse.json({ error: "Discount tier not found" }, { status: 404 });
    }
    
    return NextResponse.json(discount);
  } catch (error) {
    console.error("Error fetching discount tier:", error);
    return NextResponse.json({ error: "Failed to fetch discount tier" }, { status: 500 });
  }
}

// PUT /api/admin/discounts/[id] - Update a discount tier
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
    
    // Check if the discount tier exists
    const existingDiscount = await prisma.multiRegionDiscount.findUnique({
      where: { id }
    });
    
    if (!existingDiscount) {
      return NextResponse.json({ error: "Discount tier not found" }, { status: 404 });
    }
    
    // Validate discount percentage is between 0 and 100 if provided
    if (data.discountPercentage !== undefined) {
      if (data.discountPercentage < 0 || data.discountPercentage > 100) {
        return NextResponse.json({ 
          error: "Discount percentage must be between 0 and 100" 
        }, { status: 400 });
      }
    }
    
    // Prepare update data
    const updateData: any = {};
    
    if (data.discountPercentage !== undefined) {
      updateData.discountPercentage = parseFloat(data.discountPercentage);
    }
    
    if (data.active !== undefined) {
      updateData.active = data.active;
    }
    
    // Update the discount tier
    const updatedDiscount = await prisma.multiRegionDiscount.update({
      where: { id },
      data: updateData
    });
    
    return NextResponse.json(updatedDiscount);
  } catch (error) {
    console.error("Error updating discount tier:", error);
    return NextResponse.json({ error: "Failed to update discount tier" }, { status: 500 });
  }
}

// DELETE /api/admin/discounts/[id] - Delete a discount tier
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
    
    // Check if the discount tier exists
    const existingDiscount = await prisma.multiRegionDiscount.findUnique({
      where: { id }
    });
    
    if (!existingDiscount) {
      return NextResponse.json({ error: "Discount tier not found" }, { status: 404 });
    }
    
    // Delete the discount tier
    await prisma.multiRegionDiscount.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true, message: "Discount tier deleted successfully" });
  } catch (error) {
    console.error("Error deleting discount tier:", error);
    return NextResponse.json({ error: "Failed to delete discount tier" }, { status: 500 });
  }
}