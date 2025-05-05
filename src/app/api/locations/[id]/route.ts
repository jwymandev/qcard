import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
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

// GET /api/locations/[id] - Get a specific location
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const location = await prisma.location.findUnique({
      where: { id: params.id },
    });
    
    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }
    
    return NextResponse.json(location);
  } catch (error) {
    console.error(`Error fetching location ${params.id}:`, error);
    return NextResponse.json({ error: "Failed to fetch location" }, { status: 500 });
  }
}

// PATCH /api/locations/[id] - Update a location (super admin only for region assignment)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    
    // Check if this update includes a region change
    if (data.regionId !== undefined) {
      // Only super admins can change region assignments
      const authCheck = await requireSuperAdmin();
      if (!authCheck.authorized) {
        return NextResponse.json({ error: authCheck.message }, { status: authCheck.status });
      }
      
      // Validate that the region exists if not null
      if (data.regionId) {
        try {
          // Execute a simple count query to validate if region exists
          const regionCount = await prisma.$queryRaw`
            SELECT COUNT(*) as count FROM "Region" WHERE id = ${data.regionId}
          `;
          
          if (Array.isArray(regionCount) && regionCount.length > 0 && regionCount[0].count === 0) {
            return NextResponse.json({ error: "Region not found" }, { status: 404 });
          }
        } catch (err) {
          console.error('Error validating region:', err);
          return NextResponse.json({ error: "Failed to validate region" }, { status: 500 });
        }
      }
    }
    
    // Update location using raw SQL 
    const now = new Date().toISOString();
    
    // Use raw SQL to update both name and regionId
    if (data.regionId !== undefined) {
      await prisma.$executeRaw`
        UPDATE "Location" 
        SET name = ${data.name}, "regionId" = ${data.regionId}, "updatedAt" = ${now}
        WHERE id = ${params.id}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE "Location" 
        SET name = ${data.name}, "updatedAt" = ${now}
        WHERE id = ${params.id}
      `;
    }
    
    // Fetch the updated location
    const locations = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT * FROM "Location" WHERE id = ${params.id}
    `;
    const location = locations[0];
    
    return NextResponse.json(location);
  } catch (error) {
    console.error(`Error updating location ${params.id}:`, error);
    return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
  }
}

// DELETE /api/locations/[id] - Delete a location (super admin only)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authorization
    const authCheck = await requireSuperAdmin();
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.message }, { status: authCheck.status });
    }
    
    // Check for dependencies before deletion
    const dependencyCounts = await prisma.location.findUnique({
      where: { id: params.id },
      select: {
        _count: {
          select: {
            CastingCall: true,
            Scene: true,
            Profile: true,
            Studio: true,
          }
        }
      }
    });
    
    // Prevent deletion if there are dependencies
    if (dependencyCounts && (
      dependencyCounts._count.CastingCall > 0 ||
      dependencyCounts._count.Scene > 0 ||
      dependencyCounts._count.Profile > 0 ||
      dependencyCounts._count.Studio > 0
    )) {
      return NextResponse.json({ 
        error: "Cannot delete location with dependencies", 
        dependencies: dependencyCounts._count
      }, { status: 400 });
    }
    
    // Delete location if no dependencies
    await prisma.location.delete({
      where: { id: params.id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error deleting location ${params.id}:`, error);
    return NextResponse.json({ error: "Failed to delete location" }, { status: 500 });
  }
}