import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';

// Validation schema for updating a studio profile
const studioProfileSchema = z.object({
  name: z.string().min(1, "Studio name is required"),
  description: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  website: z.string().url().optional().nullable(),
  locationIds: z.array(z.string()).optional(),
});

// GET /api/studio/profile - Get the authenticated studio's profile
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
    
    if (!user) {
      return NextResponse.json({ 
        error: "User not found, session may be corrupted", 
        sessionUserId: session.user.id
      }, { status: 404 });
    }
    
    if (!user.Tenant) {
      return NextResponse.json({ 
        error: "User has no tenant associated, session may need refresh", 
        userId: user.id
      }, { status: 404 });
    }
    
    if (user.Tenant.type !== "STUDIO") {
      return NextResponse.json({ 
        error: "Only studio accounts can access this endpoint",
        tenantType: user.Tenant.type 
      }, { status: 403 });
    }
    
    // Find the studio associated with this tenant
    const studio = await prisma.studio.findFirst({
      where: { tenantId: user.Tenant.id },
      include: { Location: true }
    });
    
    if (!studio) {
      return NextResponse.json({ 
        error: "Studio profile not found, needs initialization",
        userId: user.id
      }, { status: 404 });
    }
    
    // Return the studio profile, mapping Location to lowercase for frontend compatibility
    return NextResponse.json({
      ...studio,
      locations: studio.Location,
    });
  } catch (error) {
    console.error("Error fetching studio profile:", error);
    return NextResponse.json({ error: "Failed to fetch studio profile" }, { status: 500 });
  }
}

// PATCH /api/studio/profile - Update the authenticated studio's profile
export async function PATCH(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    
    // Validate input data
    const result = studioProfileSchema.safeParse(body);
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
      return NextResponse.json({ error: "Only studio accounts can update studio profiles" }, { status: 403 });
    }
    
    // Find the studio associated with this tenant
    let studio = await prisma.studio.findFirst({
      where: { tenantId: user.Tenant.id },
    });
    
    if (!studio) {
      return NextResponse.json({ error: "Studio profile not found" }, { status: 404 });
    }
    
    // Extract relation IDs
    const { locationIds, ...studioData } = validatedData;
    
    // Update basic studio data
    await prisma.studio.update({
      where: { id: studio.id },
      data: studioData,
    });
    
    // Update location relations if provided
    if (locationIds) {
      await prisma.studio.update({
        where: { id: studio.id },
        data: {
          Location: {
            set: locationIds.map(id => ({ id })),
          },
        },
      });
    }
    
    // Get the updated studio with all relations
    const updatedStudio = await prisma.studio.findUnique({
      where: { id: studio.id },
      include: {
        Location: true,
      },
    });
    
    // Return the updated studio profile
    if (updatedStudio) {
      return NextResponse.json({
        ...updatedStudio,
        locations: updatedStudio.Location,
      });
    } else {
      return NextResponse.json({ error: "Failed to retrieve updated studio" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error updating studio profile:", error);
    return NextResponse.json({ 
      error: "Failed to update studio profile",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}