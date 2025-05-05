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

// GET /api/regions/[id] - Get a specific region
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('includeStats') === 'true';
    
    if (includeStats) {
      // Use raw SQL to get the region with stats
      const regions = await prisma.$queryRaw<Array<Record<string, any>>>`
        SELECT 
          r.*,
          (SELECT COUNT(*) FROM "Location" WHERE "regionId" = r.id) as location_count,
          (SELECT COUNT(*) FROM "CastingCall" WHERE "regionId" = r.id) as casting_call_count,
          (SELECT COUNT(*) FROM "ProfileRegion" WHERE "regionId" = r.id) as profile_count,
          (SELECT COUNT(*) FROM "StudioRegion" WHERE "regionId" = r.id) as studio_count
        FROM "Region" r
        WHERE r.id = ${params.id}
      `;
      
      if (!regions || regions.length === 0) {
        return NextResponse.json({ error: "Region not found" }, { status: 404 });
      }
      
      const region = regions[0];
      
      // Get associated locations
      const locations = await prisma.$queryRaw<Array<Record<string, any>>>`
        SELECT * FROM "Location" WHERE "regionId" = ${params.id}
      `;
      
      // Format the response to match the original schema
      const formattedRegion = {
        ...region,
        locations,
        _count: {
          locations: Number(region.location_count),
          castingCalls: Number(region.casting_call_count),
          profiles: Number(region.profile_count),
          studios: Number(region.studio_count)
        }
      };
      
      return NextResponse.json(formattedRegion);
    }
    
    // Regular query without stats - use raw SQL
    const regions = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT * FROM "Region" WHERE id = ${params.id}
    `;
    
    if (!regions || regions.length === 0) {
      return NextResponse.json({ error: "Region not found" }, { status: 404 });
    }
    
    const region = regions[0];
    
    // Get associated locations
    const locations = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT * FROM "Location" WHERE "regionId" = ${params.id}
    `;
    
    region.locations = locations;
    
    if (!region) {
      return NextResponse.json({ error: "Region not found" }, { status: 404 });
    }
    
    return NextResponse.json(region);
  } catch (error) {
    console.error(`Error fetching region ${params.id}:`, error);
    return NextResponse.json({ error: "Failed to fetch region" }, { status: 500 });
  }
}

// PATCH /api/regions/[id] - Update a region (super admin only)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authorization
    const auth = await requireSuperAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }
    
    const data = await request.json();
    
    if (!data.name) {
      return NextResponse.json({ error: "Region name is required" }, { status: 400 });
    }
    
    // Update region using raw SQL
    const now = new Date().toISOString();
    
    await prisma.$executeRaw`
      UPDATE "Region"
      SET name = ${data.name}, description = ${data.description}, "updatedAt" = ${now}
      WHERE id = ${params.id}
    `;
    
    // Get the updated region
    const regions = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT * FROM "Region" WHERE id = ${params.id}
    `;
    
    if (!regions || regions.length === 0) {
      return NextResponse.json({ error: "Region not found" }, { status: 404 });
    }
    
    const region = regions[0];
    
    return NextResponse.json(region);
  } catch (error) {
    console.error(`Error updating region ${params.id}:`, error);
    return NextResponse.json({ error: "Failed to update region" }, { status: 500 });
  }
}

// DELETE /api/regions/[id] - Delete a region (super admin only)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authorization
    const auth = await requireSuperAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }
    
    // Check for dependencies before deletion using raw SQL
    const dependenciesQuery = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT
        (SELECT COUNT(*) FROM "Location" WHERE "regionId" = ${params.id}) as location_count,
        (SELECT COUNT(*) FROM "CastingCall" WHERE "regionId" = ${params.id}) as casting_call_count,
        (SELECT COUNT(*) FROM "ProfileRegion" WHERE "regionId" = ${params.id}) as profile_count,
        (SELECT COUNT(*) FROM "StudioRegion" WHERE "regionId" = ${params.id}) as studio_count
    `;
    
    const dependencyCounts = dependenciesQuery[0];
    
    // Prevent deletion if there are dependencies (protect data integrity)
    if (dependencyCounts && (
      Number(dependencyCounts.location_count) > 0 ||
      Number(dependencyCounts.casting_call_count) > 0 ||
      Number(dependencyCounts.profile_count) > 0 ||
      Number(dependencyCounts.studio_count) > 0
    )) {
      return NextResponse.json({ 
        error: "Cannot delete region with dependencies", 
        dependencies: {
          locations: Number(dependencyCounts.location_count),
          castingCalls: Number(dependencyCounts.casting_call_count),
          profiles: Number(dependencyCounts.profile_count),
          studios: Number(dependencyCounts.studio_count)
        }
      }, { status: 400 });
    }
    
    // Delete region if no dependencies using raw SQL
    await prisma.$executeRaw`
      DELETE FROM "Region" WHERE id = ${params.id}
    `;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error deleting region ${params.id}:`, error);
    return NextResponse.json({ error: "Failed to delete region" }, { status: 500 });
  }
}