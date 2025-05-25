import { prisma } from '@/lib/db';
import { authPrisma } from '@/lib/secure-db-connection';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import crypto from 'crypto';

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

// GET /api/admin/region-plans - Get all region plans
export async function GET(request: Request) {
  try {
    // Check admin authorization
    const auth = await requireAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');
    
    let query: any = {
      include: {
        region: true
      },
      orderBy: {
        region: {
          name: 'asc'
        }
      }
    };
    
    // Filter by region if specified
    if (regionId) {
      query.where = {
        regionId
      };
    }
    
    // Fetch all region plans using authPrisma for reliable database access
    console.log('Fetching region plans using authPrisma');
    const regionPlans = await authPrisma.regionSubscriptionPlan.findMany(query);
    
    return NextResponse.json(regionPlans);
  } catch (error) {
    console.error("Error fetching region plans:", error);
    return NextResponse.json({ error: "Failed to fetch region plans" }, { status: 500 });
  }
}

// POST /api/admin/region-plans - Create a new region plan
export async function POST(request: Request) {
  try {
    // Check admin authorization
    const auth = await requireAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }
    
    const data = await request.json();
    
    // Validate required fields
    if (!data.regionId || !data.name || data.price === undefined) {
      return NextResponse.json({ 
        error: "Missing required fields: regionId, name, price" 
      }, { status: 400 });
    }
    
    // Check if the region exists - use authPrisma for reliable database access
    console.log('Checking if region exists using authPrisma');
    const region = await authPrisma.region.findUnique({
      where: { id: data.regionId }
    });
    
    if (!region) {
      return NextResponse.json({ error: "Region not found" }, { status: 404 });
    }
    
    // Create the new region plan - use authPrisma for reliable database access
    console.log('Creating new region plan using authPrisma');
    const newPlan = await authPrisma.regionSubscriptionPlan.create({
      data: {
        id: crypto.randomUUID(),
        regionId: data.regionId,
        name: data.name,
        description: data.description || null,
        price: parseFloat(data.price),
        isActive: data.isActive !== undefined ? data.isActive : true,
        stripePriceId: data.stripePriceId || null,
      },
      include: {
        region: true
      }
    });
    
    return NextResponse.json(newPlan);
  } catch (error) {
    console.error("Error creating region plan:", error);
    return NextResponse.json({ error: "Failed to create region plan" }, { status: 500 });
  }
}