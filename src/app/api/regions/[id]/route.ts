import { NextResponse } from 'next/server';
import { authPrisma } from '@/lib/secure-db-connection';
import { auth } from '@/auth';

// Helper function to check if user is a super admin
async function requireSuperAdmin() {
  const session = await auth();
  
  if (!session || !session.user) {
    return { authorized: false, status: 401, message: "Unauthorized" };
  }
  
  if (session.user.role !== 'SUPER_ADMIN') {
    return { authorized: false, status: 403, message: "Forbidden - Super Admin access required" };
  }
  
  return { authorized: true, session };
}

// GET /api/regions/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    console.log(`GET /api/regions/${id} request received`);
    
    // Use Prisma's findUnique instead of raw SQL
    // Note: The Prisma field names should match exactly what's in the schema
    const region = await authPrisma.region.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            locations: true,
            castingCalls: true,
            ProfileRegion: true,
            StudioRegion: true
          }
        }
      }
    });
    
    if (!region) {
      return NextResponse.json({ error: "Region not found" }, { status: 404 });
    }
    
    // Format response to match the expected structure
    const formattedRegion = {
      ...region,
      _count: {
        locations: region._count.locations,
        castingCalls: region._count.castingCalls,
        profiles: region._count.ProfileRegion,
        studios: region._count.StudioRegion
      }
    };
    
    return NextResponse.json(formattedRegion);
  } catch (error) {
    console.error(`Error fetching region ${params.id}:`, error);
    return NextResponse.json({ error: "Failed to fetch region" }, { status: 500 });
  }
}

// PUT /api/regions/[id]
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    console.log(`PUT /api/regions/${id} request received`);
    
    // Check authorization
    const auth = await requireSuperAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }
    
    // Parse and validate data
    const data = await request.json();
    
    if (!data.name) {
      return NextResponse.json({ error: "Region name is required" }, { status: 400 });
    }
    
    // Check if region exists
    const existingRegion = await authPrisma.region.findUnique({
      where: { id }
    });
    
    if (!existingRegion) {
      return NextResponse.json({ error: "Region not found" }, { status: 404 });
    }
    
    // Update region using Prisma's update method
    console.log('Updating region using authPrisma:', { id, name: data.name });
    const updatedRegion = await authPrisma.region.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description || null,
        updatedAt: new Date()
      }
    });
    
    return NextResponse.json(updatedRegion);
  } catch (error) {
    console.error(`Error updating region ${params.id}:`, error);
    return NextResponse.json({ error: "Failed to update region" }, { status: 500 });
  }
}

// DELETE /api/regions/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    console.log(`DELETE /api/regions/${id} request received`);
    
    // Check authorization
    const authResult = await requireSuperAdmin();
    console.log('SuperAdmin check result:', { authorized: authResult.authorized, userId: authResult.session?.user?.id });
    
    if (!authResult.authorized) {
      console.log('Not authorized to delete region:', authResult.message);
      return NextResponse.json({ error: authResult.message }, { status: authResult.status });
    }
    
    // Check if region exists
    console.log(`Checking if region ${id} exists`);
    const existingRegion = await authPrisma.region.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            locations: true,
            castingCalls: true,
            ProfileRegion: true,
            StudioRegion: true
          }
        }
      }
    });
    
    if (!existingRegion) {
      console.log(`Region with ID ${id} not found`);
      return NextResponse.json({ error: "Region not found" }, { status: 404 });
    }
    
    console.log(`Found region: ${existingRegion.name} (${existingRegion.id})`);
    
    // Check for dependencies
    const totalDependencies = 
      existingRegion._count.locations + 
      existingRegion._count.castingCalls + 
      existingRegion._count.ProfileRegion + 
      existingRegion._count.StudioRegion;
    
    console.log(`Region dependencies:`, {
      locations: existingRegion._count.locations,
      castingCalls: existingRegion._count.castingCalls,
      profiles: existingRegion._count.ProfileRegion,
      studios: existingRegion._count.StudioRegion,
      total: totalDependencies
    });
    
    if (totalDependencies > 0) {
      console.log(`Cannot delete region ${id} due to dependencies`);
      return NextResponse.json({
        error: "Cannot delete region with existing dependencies",
        dependencies: {
          locations: existingRegion._count.locations,
          castingCalls: existingRegion._count.castingCalls,
          profiles: existingRegion._count.ProfileRegion,
          studios: existingRegion._count.StudioRegion
        }
      }, { status: 400 });
    }
    
    // Delete region
    console.log('Deleting region using authPrisma:', { id });
    try {
      await authPrisma.region.delete({
        where: { id }
      });
      console.log(`Region ${id} deleted successfully`);
      return NextResponse.json({ success: true });
    } catch (dbError) {
      console.error('Database error deleting region:', dbError);
      // If the error is not a "not found" error, rethrow it
      if (dbError.code !== 'P2025') {
        throw dbError;
      }
      return NextResponse.json({ error: "Region not found" }, { status: 404 });
    }
  } catch (error) {
    console.error(`Error deleting region ${params.id}:`, error);
    return NextResponse.json({ 
      error: "Failed to delete region",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}