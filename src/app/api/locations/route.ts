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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeRegions = searchParams.get('includeRegions') === 'true';
    const regionId = searchParams.get('regionId');
    
    // Build the query
    let query: any = {
      orderBy: { name: 'asc' },
    };
    
    // Include region information if requested - uncomment when region relationship is added to schema
    // if (includeRegions) {
    //   query.include = { region: true };
    // }
    
    // Filter by region if regionId is provided
    if (regionId) {
      query.where = { regionId };
    }
    
    // Get locations with the constructed query
    const locations = await prisma.location.findMany(query);
    
    return NextResponse.json(locations);
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (!data.name) {
      return NextResponse.json({ error: "Location name is required" }, { status: 400 });
    }
    
    // Check if regionId is provided and verify super admin status
    if (data.regionId) {
      // Only super admins can assign regions
      const authCheck = await requireSuperAdmin();
      if (!authCheck.authorized) {
        return NextResponse.json({ error: authCheck.message }, { status: authCheck.status });
      }
      
      // Verify the region exists
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
    
    // Create the location using raw SQL
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    // Insert the location with or without regionId
    if (data.regionId) {
      await prisma.$executeRaw`
        INSERT INTO "Location" (id, name, "regionId", "createdAt", "updatedAt")
        VALUES (${id}, ${data.name}, ${data.regionId}, ${now}, ${now})
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO "Location" (id, name, "createdAt", "updatedAt")
        VALUES (${id}, ${data.name}, ${now}, ${now})
      `;
    }
    
    // Get the created location
    const locations = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT * FROM "Location" WHERE id = ${id}
    `;
    const location = locations[0];
    
    return NextResponse.json(location);
  } catch (error) {
    console.error("Error creating location:", error);
    return NextResponse.json({ error: "Failed to create location" }, { status: 500 });
  }
}