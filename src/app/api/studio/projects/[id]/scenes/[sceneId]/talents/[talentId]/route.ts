import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';

// Validation schema for updating a scene talent
const updateTalentSchema = z.object({
  role: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.string().optional(),
});

// Helper function to check if a studio has access to a scene talent
async function canAccessSceneTalent(userId: string, sceneTalentId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tenant: true },
  });
  
  if (!user?.tenant || user.tenant.type !== "STUDIO") {
    return false;
  }
  
  const studio = await prisma.studio.findFirst({
    where: { tenantId: user.tenant.id },
  });
  
  if (!studio) {
    return false;
  }
  
  const sceneTalent = await prisma.sceneTalent.findFirst({
    where: {
      id: sceneTalentId,
      scene: {
        project: {
          studioId: studio.id,
        },
      },
    },
  });
  
  return !!sceneTalent;
}

// GET /api/studio/projects/[id]/scenes/[sceneId]/talents/[talentId] - Get a specific talent in a scene
export async function GET(
  request: Request,
  { params }: { params: { id: string; sceneId: string; talentId: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { talentId } = params;
    
    if (!await canAccessSceneTalent(session.user.id, talentId)) {
      return NextResponse.json({ error: "Unauthorized to access this scene talent" }, { status: 403 });
    }
    
    const sceneTalent = await prisma.sceneTalent.findUnique({
      where: { id: talentId },
      include: {
        profile: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              }
            },
            skills: true,
          }
        },
        scene: {
          select: {
            id: true,
            title: true,
            shootDate: true,
            location: true,
            project: {
              select: {
                id: true,
                title: true,
              }
            },
          }
        },
      },
    });
    
    if (!sceneTalent) {
      return NextResponse.json({ error: "Scene talent not found" }, { status: 404 });
    }
    
    return NextResponse.json(sceneTalent);
  } catch (error) {
    console.error("Error fetching scene talent:", error);
    return NextResponse.json({ error: "Failed to fetch scene talent" }, { status: 500 });
  }
}

// PATCH /api/studio/projects/[id]/scenes/[sceneId]/talents/[talentId] - Update a talent in a scene
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; sceneId: string; talentId: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { talentId } = params;
    const body = await request.json();
    
    if (!await canAccessSceneTalent(session.user.id, talentId)) {
      return NextResponse.json({ error: "Unauthorized to access this scene talent" }, { status: 403 });
    }
    
    // Validate input data
    const result = updateTalentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input data", details: result.error.format() },
        { status: 400 }
      );
    }
    
    const validatedData = result.data;
    
    // Update the scene talent
    const updatedSceneTalent = await prisma.sceneTalent.update({
      where: { id: talentId },
      data: validatedData,
      include: {
        profile: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              }
            },
          }
        },
      },
    });
    
    return NextResponse.json(updatedSceneTalent);
  } catch (error) {
    console.error("Error updating scene talent:", error);
    return NextResponse.json({ error: "Failed to update scene talent" }, { status: 500 });
  }
}

// DELETE /api/studio/projects/[id]/scenes/[sceneId]/talents/[talentId] - Remove a talent from a scene
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; sceneId: string; talentId: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { talentId } = params;
    
    if (!await canAccessSceneTalent(session.user.id, talentId)) {
      return NextResponse.json({ error: "Unauthorized to access this scene talent" }, { status: 403 });
    }
    
    // Delete the scene talent
    await prisma.sceneTalent.delete({
      where: { id: talentId },
    });
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error removing talent from scene:", error);
    return NextResponse.json({ error: "Failed to remove talent from scene" }, { status: 500 });
  }
}