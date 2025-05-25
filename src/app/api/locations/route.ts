import { prisma } from '@/lib/db';
import { authPrisma } from '@/lib/secure-db-connection';
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
    
    // Get locations with the constructed query - use authPrisma for reliable database access
    console.log('Fetching locations with authPrisma');
    const locations = await authPrisma.location.findMany(query);
    
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
        // Execute a simple count query to validate if region exists - use authPrisma for reliable database access
        console.log('Validating region existence with authPrisma');
        const regionCount = await authPrisma.$queryRaw`
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
    
    // Create the location using Prisma's create method instead of raw SQL
    const id = crypto.randomUUID();
    const now = new Date(); // Use a Date object, not a string
    
    // Insert the location with or without regionId
    console.log('Creating location with authPrisma:', { id, name: data.name, regionId: data.regionId });
    
    const location = await authPrisma.location.create({
      data: {
        id,
        name: data.name,
        regionId: data.regionId || null,
        createdAt: now,
        updatedAt: now
      }
    });
    
    return NextResponse.json(location);
  } catch (error) {
    console.error("Error creating location:", error);
    return NextResponse.json({ error: "Failed to create location" }, { status: 500 });
  }
}