import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authPrisma } from '@/lib/secure-db-connection';

// Schema for validating POST request body
const createExternalActorSchema = z.object({
  externalActorId: z.string().uuid({ message: "Invalid external actor ID" }),
  role: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional().default("CONFIRMED"),
});

// Schema for validating PATCH request body
const updateExternalActorSchema = z.object({
  role: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
});

// GET: Get all external actors for a scene
export async function GET(
  request: Request,
  { params }: { params: { id: string; sceneId: string } }
) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get studio ID from user's tenant
    const user = await authPrisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user?.Tenant || user.Tenant.type !== 'STUDIO') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    
    // Verify ownership of scene
    const studio = await authPrisma.studio.findUnique({
      where: { tenantId: user.tenantId! },
    });
    
    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }
    
    // Verify the scene belongs to this studio
    const scene = await prisma.scene.findUnique({
      where: {
        id: params.sceneId,
      },
      include: {
        Project: true,
      },
    });
    
    if (!scene || scene.Project.studioId !== studio.id) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    }
    
    // Get external actors assigned to this scene
    const externalActors = await prisma.sceneExternalActor.findMany({
      where: {
        sceneId: params.sceneId,
      },
      include: {
        externalActor: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json(externalActors);
  } catch (error) {
    console.error('Error fetching scene external actors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scene external actors' },
      { status: 500 }
    );
  }
}

// POST: Assign an external actor to a scene
export async function POST(
  request: Request,
  { params }: { params: { id: string; sceneId: string } }
) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get studio ID from user's tenant
    const user = await authPrisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user?.Tenant || user.Tenant.type !== 'STUDIO') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    
    // Validate request body
    const body = await request.json();
    const validatedData = createExternalActorSchema.parse(body);
    
    // Verify ownership of scene and external actor
    const studio = await authPrisma.studio.findUnique({
      where: { tenantId: user.tenantId! },
    });
    
    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }
    
    // Verify the scene belongs to this studio
    const scene = await prisma.scene.findUnique({
      where: {
        id: params.sceneId,
      },
      include: {
        Project: true,
      },
    });
    
    if (!scene || scene.Project.studioId !== studio.id) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    }
    
    // Verify the external actor belongs to this studio
    const externalActor = await prisma.externalActor.findFirst({
      where: {
        id: validatedData.externalActorId,
        studioId: studio.id,
      },
    });
    
    if (!externalActor) {
      return NextResponse.json(
        { error: 'External actor not found' },
        { status: 404 }
      );
    }
    
    // Check if already assigned
    const existingAssignment = await prisma.sceneExternalActor.findFirst({
      where: {
        sceneId: params.sceneId,
        externalActorId: validatedData.externalActorId,
      },
    });
    
    if (existingAssignment) {
      return NextResponse.json(
        { error: 'External actor is already assigned to this scene' },
        { status: 409 }
      );
    }
    
    // Create the scene external actor assignment
    const sceneExternalActor = await prisma.sceneExternalActor.create({
      data: {
        sceneId: params.sceneId,
        externalActorId: validatedData.externalActorId,
        role: validatedData.role,
        notes: validatedData.notes,
        status: validatedData.status,
      },
    });
    
    return NextResponse.json(sceneExternalActor);
  } catch (error) {
    console.error('Error assigning external actor to scene:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.format() },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to assign external actor to scene' },
      { status: 500 }
    );
  }
}