import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';

// Schema for validation
const castingCodeSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  description: z.string().optional(),
  projectId: z.string().uuid().optional(),
  expiresAt: z.string().datetime().optional(),
});

// Helper function to generate a unique code
const generateUniqueCode = async (): Promise<string> => {
  // Generate a random 6-character alphanumeric code
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  
  // Keep trying until we find a unique code
  while (true) {
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    code = result;
    
    // Check if this code already exists
    const existingCode = await prisma.castingCode.findUnique({
      where: { code }
    });
    
    if (!existingCode) {
      break;
    }
  }
  
  return code;
};

// GET - List all casting codes for studio
export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get studio ID from user's tenant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user?.Tenant || user.Tenant.type !== 'STUDIO') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    
    const studio = await prisma.studio.findUnique({
      where: { tenantId: user.tenantId! },
    });
    
    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }
    
    // Add filtering options
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const isActive = searchParams.get('isActive');
    
    // Build query
    const query: any = {
      studioId: studio.id,
    };
    
    if (projectId) {
      query.projectId = projectId;
    }
    
    if (isActive !== null) {
      query.isActive = isActive === 'true';
    }
    
    // Get all casting codes for this studio
    const castingCodes = await prisma.castingCode.findMany({
      where: query,
      include: {
        project: {
          select: {
            title: true,
          },
        },
        submissions: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json(castingCodes);
  } catch (error) {
    console.error('Error fetching casting codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch casting codes' },
      { status: 500 }
    );
  }
}

// POST - Create a new casting code
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get studio ID from user's tenant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user?.Tenant || user.Tenant.type !== 'STUDIO') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    
    const studio = await prisma.studio.findUnique({
      where: { tenantId: user.tenantId! },
    });
    
    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = castingCodeSchema.parse(body);
    
    // Check if projectId is valid if provided
    if (validatedData.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: validatedData.projectId,
          studioId: studio.id,
        },
      });
      
      if (!project) {
        return NextResponse.json(
          { error: 'Project not found or not owned by this studio' },
          { status: 404 }
        );
      }
    }
    
    // Generate a unique code
    const code = await generateUniqueCode();
    
    // Create the casting code
    const castingCode = await prisma.castingCode.create({
      data: {
        code,
        name: validatedData.name,
        description: validatedData.description,
        studioId: studio.id,
        projectId: validatedData.projectId,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
        updatedAt: new Date(),
      },
    });
    
    return NextResponse.json(castingCode);
  } catch (error) {
    console.error('Error creating casting code:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.format() },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create casting code' },
      { status: 500 }
    );
  }
}