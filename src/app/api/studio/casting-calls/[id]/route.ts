import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';

// Validation schema for updating a casting call
const updateCastingCallSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }).optional(),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }).optional(),
  requirements: z.string().optional(),
  compensation: z.string().optional(),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  status: z.enum(["OPEN", "CLOSED", "FILLED"]).optional(),
  locationId: z.string().optional(),
  projectId: z.string().optional(),
  skillIds: z.array(z.string()).optional(),
});

// Helper function to check if a studio has access to a casting call
async function canAccessCastingCall(userId: string, castingCallId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { Tenant: true },
  });
  
  if (!user?.Tenant || user.Tenant.type !== "STUDIO") {
    return false;
  }
  
  const studio = await prisma.studio.findFirst({
    where: { tenantId: user.Tenant.id },
  });
  
  if (!studio) {
    return false;
  }
  
  const castingCall = await prisma.castingCall.findUnique({
    where: { id: castingCallId },
  });
  
  return castingCall && castingCall.studioId === studio.id;
}

// GET /api/studio/casting-calls/[id] - Get a specific casting call
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const id = params.id;
    
    if (!await canAccessCastingCall(session.user.id, id)) {
      return NextResponse.json({ error: "Unauthorized to access this casting call" }, { status: 403 });
    }
    
    const castingCall = await prisma.castingCall.findUnique({
      where: { id },
      include: {
        Location: true,
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
        Studio: true,
      },
    });
    
    if (!castingCall) {
      return NextResponse.json({ error: "Casting call not found" }, { status: 404 });
    }
    
    return NextResponse.json(castingCall);
  } catch (error) {
    console.error("Error fetching casting call:", error);
    return NextResponse.json({ 
      error: "Failed to fetch casting call",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// PATCH /api/studio/casting-calls/[id] - Update a casting call
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const id = params.id;
    const body = await request.json();
    
    if (!await canAccessCastingCall(session.user.id, id)) {
      return NextResponse.json({ error: "Unauthorized to modify this casting call" }, { status: 403 });
    }
    
    // Validate input data
    const result = updateCastingCallSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input data", details: result.error.format() },
        { status: 400 }
      );
    }
    
    const validatedData = result.data;
    
    // Prepare update data
    const updateData: any = {
      ...validatedData,
    };
    
    // Handle skill updates if provided
    if (validatedData.skillIds) {
      // Get current skills
      const currentCastingCall = await prisma.castingCall.findUnique({
        where: { id },
        include: { Skill: true },
      });
      
      if (currentCastingCall) {
        // Disconnect all current skills
        updateData.Skill = {
          disconnect: currentCastingCall.Skill.map(skill => ({ id: skill.id })),
        };
        
        // Connect new skills
        if (validatedData.skillIds.length > 0) {
          updateData.Skill = {
            ...updateData.Skill,
            connect: validatedData.skillIds.map(id => ({ id })),
          };
        }
      }
    }
    
    // Remove skillIds from the update data as we've processed it separately
    delete updateData.skillIds;
    
    // Update the casting call
    const updatedCastingCall = await prisma.castingCall.update({
      where: { id },
      data: updateData,
      include: {
        Location: true,
        Skill: true,
        Application: true,
        Project: true,
      },
    });
    
    return NextResponse.json(updatedCastingCall);
  } catch (error) {
    console.error("Error updating casting call:", error);
    return NextResponse.json({ 
      error: "Failed to update casting call",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// DELETE /api/studio/casting-calls/[id] - Delete a casting call
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const id = params.id;
    
    if (!await canAccessCastingCall(session.user.id, id)) {
      return NextResponse.json({ error: "Unauthorized to delete this casting call" }, { status: 403 });
    }
    
    // Delete the casting call
    await prisma.castingCall.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting casting call:", error);
    return NextResponse.json({ 
      error: "Failed to delete casting call",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}