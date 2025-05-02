import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import crypto from 'crypto';

// Validation schema for creating a scene
const sceneSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  description: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  shootDate: z.string().optional().nullable(),
  duration: z.number().int().positive().optional().nullable(), // Duration in minutes
  talentNeeded: z.number().int().nonnegative().optional().nullable(),
  status: z.string().default("PLANNING"),
});

// Helper function to check if a studio has access to a project
async function canAccessProject(userId: string, projectId: string) {
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
  
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      studioId: studio.id,
    },
  });
  
  return !!project;
}

// GET /api/studio/projects/[id]/scenes - Get all scenes for a project
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { id: projectId } = params;
    
    if (!await canAccessProject(session.user.id, projectId)) {
      return NextResponse.json({ error: "Unauthorized to access this project" }, { status: 403 });
    }
    
    const scenes = await prisma.scene.findMany({
      where: { projectId },
      include: {
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
              }
            }
          }
        },
        Location: true,
        _count: {
          select: {
            SceneTalent: true,
          }
        }
      },
      orderBy: [
        { shootDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });
    
    // Map capitalized fields to lowercase for frontend compatibility
    const formattedScenes = scenes.map(scene => ({
      ...scene,
      location: scene.Location,
      talents: scene.SceneTalent?.map(talent => ({
        ...talent,
        profile: {
          ...talent.Profile,
          user: talent.Profile?.User
        }
      })),
      _count: {
        talents: scene._count.SceneTalent
      }
    }));

    return NextResponse.json(formattedScenes);
  } catch (error) {
    console.error("Error fetching scenes:", error);
    return NextResponse.json({ error: "Failed to fetch scenes" }, { status: 500 });
  }
}

// POST /api/studio/projects/[id]/scenes - Create a new scene
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { id: projectId } = params;
    const body = await request.json();
    
    if (!await canAccessProject(session.user.id, projectId)) {
      return NextResponse.json({ error: "Unauthorized to access this project" }, { status: 403 });
    }
    
    // Validate input data
    const result = sceneSchema.safeParse(body);
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
    
    // Generate a unique ID for the scene
    const sceneId = crypto.randomUUID();
    
    // Create the scene
    const scene = await prisma.scene.create({
      data: {
        id: sceneId,
        title: validatedData.title,
        description: validatedData.description,
        locationId: validatedData.locationId,
        shootDate,
        duration: validatedData.duration,
        talentNeeded: validatedData.talentNeeded,
        status: validatedData.status,
        projectId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        Location: true,
        _count: {
          select: {
            SceneTalent: true, 
          }
        }
      },
    });
    
    // Format the response for frontend compatibility
    const formattedScene = {
      ...scene,
      location: scene.Location,
      _count: {
        talents: scene._count.SceneTalent
      }
    };
    
    return NextResponse.json(formattedScene, { status: 201 });
  } catch (error) {
    console.error("Error creating scene:", error);
    return NextResponse.json({ error: "Failed to create scene" }, { status: 500 });
  }
}