import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import crypto from 'crypto';

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

// GET /api/regions - Get all regions
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('includeStats') === 'true';
    
    // If includeStats is true, include counts of related records
    if (includeStats) {
      // Use raw SQL for query with stats
      const regions = await prisma.$queryRaw<Array<Record<string, any>>>`
        SELECT 
          r.*,
          (SELECT COUNT(*) FROM "Location" WHERE "regionId" = r.id) as location_count,
          (SELECT COUNT(*) FROM "CastingCall" WHERE "regionId" = r.id) as casting_call_count,
          (SELECT COUNT(*) FROM "ProfileRegion" WHERE "regionId" = r.id) as profile_count,
          (SELECT COUNT(*) FROM "StudioRegion" WHERE "regionId" = r.id) as studio_count
        FROM "Region" r
        ORDER BY r.name ASC
      `;
      
      // Format the response to match the original schema
      const formattedRegions = regions.map(region => ({
        ...region,
        _count: {
          locations: Number(region.location_count),
          castingCalls: Number(region.casting_call_count),
          profiles: Number(region.profile_count),
          studios: Number(region.studio_count)
        }
      }));
      
      return NextResponse.json(formattedRegions);
    }
    
    // Regular query without stats - use raw SQL
    const regions = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT * FROM "Region" ORDER BY name ASC
    `;
    
    return NextResponse.json(regions);
  } catch (error) {
    console.error("Error fetching regions:", error);
    return NextResponse.json({ error: "Failed to fetch regions" }, { status: 500 });
  }
}

// POST /api/regions - Create a new region (super admin only)
export async function POST(request: Request) {
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
    
    // Create new region using raw SQL
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await prisma.$executeRaw`
      INSERT INTO "Region" (id, name, description, "createdAt", "updatedAt")
      VALUES (${id}, ${data.name}, ${data.description || null}, ${now}, ${now})
    `;
    
    // Get the created region
    const regions = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT * FROM "Region" WHERE id = ${id}
    `;
    const region = regions[0];
    
    return NextResponse.json(region);
  } catch (error) {
    console.error("Error creating region:", error);
    return NextResponse.json({ error: "Failed to create region" }, { status: 500 });
  }
}