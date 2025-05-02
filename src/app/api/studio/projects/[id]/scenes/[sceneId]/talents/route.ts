import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';

// Validation schema for adding a talent to a scene
const addTalentSchema = z.object({
  profileId: z.string().min(1, { message: "Profile ID is required" }),
  role: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.string().default("CONFIRMED"),
});

// Helper function to check if a studio has access to a scene
async function canAccessScene(userId: string, sceneId: string) {
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
  
  const scene = await prisma.scene.findFirst({
    where: {
      id: sceneId,
      project: {
        studioId: studio.id,
      },
    },
  });
  
  return !!scene;
}

// GET /api/studio/projects/[id]/scenes/[sceneId]/talents - Get all talents assigned to a scene
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
    
    const sceneTalents = await prisma.sceneTalent.findMany({
      where: { sceneId },
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
            images: {
              where: { isPrimary: true },
              take: 1,
            },
            skills: true,
          }
        },
      },
    });
    
    return NextResponse.json(sceneTalents);
  } catch (error) {
    console.error("Error fetching scene talents:", error);
    return NextResponse.json({ error: "Failed to fetch scene talents" }, { status: 500 });
  }
}

// POST /api/studio/projects/[id]/scenes/[sceneId]/talents - Add a talent to a scene
export async function POST(
  request: Request,
  { params }: { params: { id: string; sceneId: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { id: projectId, sceneId } = params;
    const body = await request.json();
    
    if (!await canAccessScene(session.user.id, sceneId)) {
      return NextResponse.json({ error: "Unauthorized to access this scene" }, { status: 403 });
    }
    
    // Validate input data
    const result = addTalentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input data", details: result.error.format() },
        { status: 400 }
      );
    }
    
    const { profileId, role, notes, status } = result.data;
    
    // Check if profile exists
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
    });
    
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    
    // Check if talent is already assigned to this scene
    const existingTalent = await prisma.sceneTalent.findFirst({
      where: {
        sceneId,
        profileId,
      },
    });
    
    if (existingTalent) {
      return NextResponse.json(
        { error: "This talent is already assigned to the scene" },
        { status: 400 }
      );
    }
    
    // Add talent to the scene
    const sceneTalent = await prisma.sceneTalent.create({
      data: {
        scene: { connect: { id: sceneId } },
        profile: { connect: { id: profileId } },
        role,
        notes,
        status,
      },
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
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          }
        },
      },
    });
    
    // Also make sure the talent is a member of the project
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId,
        profileId,
      },
    });
    
    if (!projectMember) {
      // Add the talent to the project members if not already a member
      await prisma.projectMember.create({
        data: {
          project: { connect: { id: projectId } },
          profile: { connect: { id: profileId } },
          role: role || "Cast Member",
        },
      });
    }
    
    return NextResponse.json(sceneTalent, { status: 201 });
  } catch (error) {
    console.error("Error adding talent to scene:", error);
    return NextResponse.json({ error: "Failed to add talent to scene" }, { status: 500 });
  }
}