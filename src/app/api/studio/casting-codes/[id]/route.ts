import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema for validation
const updateCastingCodeSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }).optional(),
  description: z.string().optional(),
  projectId: z.string().uuid().optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
  surveyFields: z.any().optional(), // Allow updating survey fields
});

// GET - Get a specific casting code
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    
    // Get the casting code
    const castingCode = await prisma.castingCode.findFirst({
      where: {
        id: params.id,
        studioId: studio.id,
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        submissions: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            status: true,
            createdAt: true,
            externalActorId: true,
            convertedToProfileId: true,
            convertedUserId: true,
            survey: true, // Include survey responses
            externalActor: {
              select: {
                id: true,
                status: true,
                convertedProfileId: true,
                convertedToUserId: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
    
    if (!castingCode) {
      return NextResponse.json({ error: 'Casting code not found' }, { status: 404 });
    }
    
    return NextResponse.json(castingCode);
  } catch (error) {
    console.error('Error fetching casting code:', error);
    return NextResponse.json(
      { error: 'Failed to fetch casting code' },
      { status: 500 }
    );
  }
}

// PATCH - Update a casting code
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    
    // Check if the casting code exists and belongs to this studio
    const existingCode = await prisma.castingCode.findFirst({
      where: {
        id: params.id,
        studioId: studio.id,
      },
    });
    
    if (!existingCode) {
      return NextResponse.json({ error: 'Casting code not found' }, { status: 404 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateCastingCodeSchema.parse(body);
    
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
    
    // Update the casting code
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.projectId !== undefined) updateData.projectId = validatedData.projectId;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;
    if (validatedData.surveyFields !== undefined) updateData.surveyFields = validatedData.surveyFields;
    if (validatedData.expiresAt !== undefined) {
      updateData.expiresAt = validatedData.expiresAt ? new Date(validatedData.expiresAt) : null;
    }
    
    const updatedCode = await prisma.castingCode.update({
      where: {
        id: params.id,
      },
      data: updateData,
    });
    
    return NextResponse.json(updatedCode);
  } catch (error) {
    console.error('Error updating casting code:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.format() },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update casting code' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a casting code
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    
    // Check if the casting code exists and belongs to this studio
    const existingCode = await prisma.castingCode.findFirst({
      where: {
        id: params.id,
        studioId: studio.id,
      },
    });
    
    if (!existingCode) {
      return NextResponse.json({ error: 'Casting code not found' }, { status: 404 });
    }
    
    // Delete the casting code (and related submissions will be deleted via cascade)
    await prisma.castingCode.delete({
      where: {
        id: params.id,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting casting code:', error);
    return NextResponse.json(
      { error: 'Failed to delete casting code' },
      { status: 500 }
    );
  }
}