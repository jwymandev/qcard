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

// GET /api/regions - Get all regions
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('includeStats') === 'true';
    
    // If includeStats is true, include counts of related records
    if (includeStats) {
      console.log('Fetching regions with stats using authPrisma');
      
      // Use Prisma client instead of raw SQL
      // Note: The Prisma field names should match exactly what's in the schema
      const regions = await authPrisma.region.findMany({
        include: {
          _count: {
            select: {
              locations: true,
              castingCalls: true,
              ProfileRegion: true,
              StudioRegion: true
            }
          }
        },
        orderBy: { name: 'asc' }
      });
      
      // Format the response to match the expected schema
      const formattedRegions = regions.map(region => ({
        ...region,
        _count: {
          locations: region._count.locations,
          castingCalls: region._count.castingCalls,
          profiles: region._count.ProfileRegion,
          studios: region._count.StudioRegion
        }
      }));
      
      return NextResponse.json(formattedRegions);
    }
    
    // Regular query without stats
    console.log('Fetching regions using authPrisma');
    const regions = await authPrisma.region.findMany({
      orderBy: { name: 'asc' }
    });
    
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
    const authResult = await requireSuperAdmin();
    console.log('SuperAdmin check result:', { authorized: authResult.authorized, userId: authResult.session?.user?.id });
    
    if (!authResult.authorized) {
      console.log('Not authorized to create region:', authResult.message);
      return NextResponse.json({ error: authResult.message }, { status: authResult.status });
    }
    
    let data;
    try {
      data = await request.json();
      console.log('Received region creation data:', data);
    } catch (parseError) {
      console.error('Error parsing request JSON:', parseError);
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
    }
    
    if (!data || !data.name) {
      console.log('Missing region name in request');
      return NextResponse.json({ error: "Region name is required" }, { status: 400 });
    }
    
    // Create new region using Prisma's create method instead of raw SQL
    const id = crypto.randomUUID();
    const now = new Date(); // Use a Date object, not a string
    
    console.log('Creating new region using authPrisma:', { id, name: data.name });
    try {
      const region = await authPrisma.region.create({
        data: {
          id,
          name: data.name,
          description: data.description || null,
          createdAt: now,
          updatedAt: now
        }
      });
      
      console.log('Region created successfully:', { id: region.id, name: region.name });
      return NextResponse.json(region);
    } catch (dbError) {
      console.error('Database error creating region:', dbError);
      // Check for unique constraint violation
      if (dbError.code === 'P2002') {
        return NextResponse.json({ 
          error: "A region with this name already exists", 
          code: "DUPLICATE_NAME"
        }, { status: 409 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Error creating region:", error);
    return NextResponse.json({ error: "Failed to create region" }, { status: 500 });
  }
}