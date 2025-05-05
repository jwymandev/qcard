import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import crypto from 'crypto';

// Validation schema for creating a casting call (updated to include regionId)
const castingCallSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  requirements: z.string().optional(),
  compensation: z.string().optional(),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  locationId: z.string().optional(),
  regionId: z.string().optional(), // New field for region
  projectId: z.string().optional(),
  skillIds: z.array(z.string()).optional(),
});

// GET /api/studio/casting-calls - Get all casting calls for the authenticated studio
export async function GET() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // Find the user and their tenant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user?.Tenant || user.Tenant.type !== "STUDIO") {
      return NextResponse.json({ error: "Only studio accounts can access this endpoint" }, { status: 403 });
    }
    
    // Find the studio associated with this tenant
    const studio = await prisma.studio.findFirst({
      where: { tenantId: user.Tenant.id },
    });
    
    if (!studio) {
      return NextResponse.json({ error: "Studio not found" }, { status: 404 });
    }
    
    // Get all casting calls for this studio
    const castingCalls = await prisma.castingCall.findMany({
      where: { studioId: studio.id },
      include: {
        Location: {
          include: {
            region: true
          }
        },
        region: true, // Include the region information
        Skill: true,
        Application: {
          include: {
            Profile: {
              include: {
                User: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  }
                }
              }
            }
          }
        },
        Project: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Map fields for frontend compatibility
    const formattedCastingCalls = castingCalls.map(call => ({
      ...call,
      location: call.Location,
      region: call.region,
      skillsRequired: call.Skill,
      applications: call.Application,
      project: call.Project
    }));
    
    return NextResponse.json(formattedCastingCalls);
  } catch (error) {
    console.error("Error fetching casting calls:", error);
    return NextResponse.json({ 
      error: "Failed to fetch casting calls",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// POST /api/studio/casting-calls - Create a new casting call
export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    
    // Validate input data
    const result = castingCallSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input data", details: result.error.format() },
        { status: 400 }
      );
    }
    
    const validatedData = result.data;
    
    // Find the user and their tenant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user?.Tenant || user.Tenant.type !== "STUDIO") {
      return NextResponse.json({ error: "Only studio accounts can create casting calls" }, { status: 403 });
    }
    
    // Find the studio associated with this tenant
    const studio = await prisma.studio.findFirst({
      where: { tenantId: user.Tenant.id },
    });
    
    if (!studio) {
      return NextResponse.json({ error: "Studio not found" }, { status: 404 });
    }
    
    // If location is provided but no region, try to get the region from the location
    let regionId = validatedData.regionId;
    if (!regionId && validatedData.locationId) {
      const location = await prisma.location.findUnique({
        where: { id: validatedData.locationId },
        select: { regionId: true }
      });
      
      if (location?.regionId) {
        regionId = location.regionId;
      }
    }
    
    // Generate a unique ID for the casting call
    const castingCallId = crypto.randomUUID();
    
    // Create the casting call
    const castingCall = await prisma.castingCall.create({
      data: {
        id: castingCallId,
        title: validatedData.title,
        description: validatedData.description,
        requirements: validatedData.requirements,
        compensation: validatedData.compensation,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        studioId: studio.id,
        locationId: validatedData.locationId,
        regionId: regionId, // Add region ID to the data
        projectId: validatedData.projectId,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Connect existing skills if skillIds are provided
        ...(validatedData.skillIds && validatedData.skillIds.length > 0
          ? {
              Skill: {
                connect: validatedData.skillIds.map(id => ({ id })),
              },
            }
          : {}),
      },
      include: {
        Location: {
          include: {
            region: true
          }
        },
        region: true,
        Skill: true,
        Project: true,
      },
    });
    
    // Return the casting call with properly mapped fields for frontend compatibility
    return NextResponse.json({
      ...castingCall,
      location: castingCall.Location,
      region: castingCall.region,
      skillsRequired: castingCall.Skill,
      project: castingCall.Project
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating casting call:", error);
    return NextResponse.json({ 
      error: "Failed to create casting call",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}