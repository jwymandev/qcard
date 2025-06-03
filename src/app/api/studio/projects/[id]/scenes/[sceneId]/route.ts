import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';

// Validation schema for updating a scene
const sceneUpdateSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }).optional(),
  description: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  shootDate: z.string().optional().nullable(),
  duration: z.number().int().positive().optional().nullable(), // Duration in minutes
  talentNeeded: z.number().int().nonnegative().optional().nullable(),
  status: z.string().optional(),
});

// Helper function to check if a studio has access to a scene
async function canAccessScene(userId: string, sceneId: string) {
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
  
  const scene = await prisma.scene.findFirst({
    where: {
      id: sceneId,
      Project: {
        studioId: studio.id,
      },
    },
  });
  
  return !!scene;
}

// GET /api/studio/projects/[id]/scenes/[sceneId] - Get a specific scene
export async function GET(
  request: Request,
  { params }: { params: { id: string; sceneId: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { sceneId } = params;
    
    if (!await canAccessScene(session.user.id, sceneId)) {
      return NextResponse.json({ error: "Unauthorized to access this scene" }, { status: 403 });
    }
    
    const scene = await prisma.scene.findUnique({
      where: { id: sceneId },
      include: {
        Project: {
          select: {
            id: true,
            title: true,
          }
        },
        Location: true,
        SceneTalent: {
          include: {
            Profile: {
              include: {
                User: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  }
                },
                ProfileImage: {
                  where: {
                    isPrimary: true
                  },
                  take: 1
                },
                Skill: true,
              }
            }
          }
        },
      },
    });
    
    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }
    
    return NextResponse.json(scene);
  } catch (error) {
    console.error("Error fetching scene:", error);
    return NextResponse.json({ error: "Failed to fetch scene" }, { status: 500 });
  }
}

// PATCH /api/studio/projects/[id]/scenes/[sceneId] - Update a specific scene
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; sceneId: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { sceneId } = params;
    const body = await request.json();
    
    if (!await canAccessScene(session.user.id, sceneId)) {
      return NextResponse.json({ error: "Unauthorized to access this scene" }, { status: 403 });
    }
    
    // Validate input data
    const result = sceneUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input data", details: result.error.format() },
        { status: 400 }
      );
    }
    
    const validatedData = result.data;
    
    // Process date if it's a string
    let shootDate = undefined;
    if (validatedData.shootDate) {
      try {
        shootDate = new Date(validatedData.shootDate);
      } catch (e) {
        console.error("Invalid date format:", validatedData.shootDate);
      }
    }
    
    // Update the scene
    const updatedScene = await prisma.scene.update({
      where: { id: sceneId },
      data: {
        ...(validatedData.title && { title: validatedData.title }),
        description: validatedData.description,
        locationId: validatedData.locationId,
        ...(shootDate && { shootDate }),
        duration: validatedData.duration,
        talentNeeded: validatedData.talentNeeded,
        ...(validatedData.status && { status: validatedData.status }),
      },
      include: {
        Location: true,
      },
    });
    
    return NextResponse.json(updatedScene);
  } catch (error) {
    console.error("Error updating scene:", error);
    return NextResponse.json({ error: "Failed to update scene" }, { status: 500 });
  }
}

// DELETE /api/studio/projects/[id]/scenes/[sceneId] - Delete a specific scene
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; sceneId: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { sceneId } = params;
    
    if (!await canAccessScene(session.user.id, sceneId)) {
      return NextResponse.json({ error: "Unauthorized to access this scene" }, { status: 403 });
    }
    
    // Delete the scene (this will cascade delete talents if configured in schema)
    await prisma.scene.delete({
      where: { id: sceneId },
    });
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting scene:", error);
    return NextResponse.json({ error: "Failed to delete scene" }, { status: 500 });
  }
}