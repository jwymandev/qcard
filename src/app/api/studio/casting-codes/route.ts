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
  surveyFields: z.any().optional(),
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
    console.log("POST /api/studio/casting-codes: Received request");
    const session = await auth();

    if (!session || !session.user) {
      console.log("POST /api/studio/casting-codes: Unauthorized - no session or user");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("POST /api/studio/casting-codes: Authenticated as user ID:", session.user.id);

    // Get studio ID from user's tenant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });

    console.log("POST /api/studio/casting-codes: Found user:", user?.id, "with tenant type:", user?.Tenant?.type);

    if (!user?.Tenant || user.Tenant.type !== 'STUDIO') {
      console.log("POST /api/studio/casting-codes: Not authorized - not a studio user");
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const studio = await prisma.studio.findUnique({
      where: { tenantId: user.tenantId! },
    });

    if (!studio) {
      console.log("POST /api/studio/casting-codes: Studio not found for tenant ID:", user.tenantId);
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }

    console.log("POST /api/studio/casting-codes: Found studio ID:", studio.id);

    // Parse and validate request body
    const body = await request.json();
    console.log("POST /api/studio/casting-codes: Request body:", body);

    try {
      const validatedData = castingCodeSchema.parse(body);
      console.log("POST /api/studio/casting-codes: Validated data:", validatedData);

      // Check if projectId is valid if provided
      if (validatedData.projectId) {
        console.log("POST /api/studio/casting-codes: Checking project ID:", validatedData.projectId);
        const project = await prisma.project.findFirst({
          where: {
            id: validatedData.projectId,
            studioId: studio.id,
          },
        });

        if (!project) {
          console.log("POST /api/studio/casting-codes: Project not found or not owned by this studio");
          return NextResponse.json(
            { error: 'Project not found or not owned by this studio' },
            { status: 404 }
          );
        }

        console.log("POST /api/studio/casting-codes: Project verified:", project.id);
      }

      // Generate a unique code
      console.log("POST /api/studio/casting-codes: Generating unique code");
      const code = await generateUniqueCode();
      console.log("POST /api/studio/casting-codes: Generated code:", code);

      // Create the casting code
      console.log("POST /api/studio/casting-codes: Creating casting code in database");
      const newCastingCode = {
        code,
        name: validatedData.name,
        description: validatedData.description || null,
        studioId: studio.id,
        projectId: validatedData.projectId || null,
        // Make sure we always have a default empty survey structure
        surveyFields: body.surveyFields || { fields: [] },
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
        updatedAt: new Date(),
        isActive: true,
      };

      console.log("POST /api/studio/casting-codes: New casting code data:", newCastingCode);

      const castingCode = await prisma.castingCode.create({
        data: newCastingCode,
      });

      console.log("POST /api/studio/casting-codes: Successfully created casting code:", castingCode.id);
      return NextResponse.json(castingCode);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.log("POST /api/studio/casting-codes: Validation error:", validationError.format());
        return NextResponse.json(
          { error: 'Validation error', details: validationError.format() },
          { status: 400 }
        );
      }
      throw validationError;
    }
  } catch (error) {
    console.error('Error creating casting code:', error);

    return NextResponse.json(
      { error: 'Failed to create casting code', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}