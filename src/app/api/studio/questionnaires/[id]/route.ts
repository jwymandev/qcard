import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';
import { getStudioIdFromSession } from '@/lib/auth-helpers';

const prisma = new PrismaClient();

// Validation schema for updating a questionnaire
const updateQuestionnaireSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
});

async function getQuestionnaire(id: string, studioId: string) {
  return prisma.questionnaire.findFirst({
    where: {
      id,
      studioId,
    },
    include: {
      questions: {
        orderBy: {
          order: 'asc',
        },
      },
      _count: {
        select: {
          invitations: true,
          responses: true,
        },
      },
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const studioId = await getStudioIdFromSession(session);
    
    if (!studioId) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }
    
    const questionnaire = await getQuestionnaire(params.id, studioId);
    
    if (!questionnaire) {
      return NextResponse.json({ error: 'Questionnaire not found' }, { status: 404 });
    }
    
    return NextResponse.json(questionnaire);
  } catch (error) {
    console.error('Error fetching questionnaire:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questionnaire' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const studioId = await getStudioIdFromSession(session);
    
    if (!studioId) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }
    
    // Check if questionnaire exists and belongs to this studio
    const existingQuestionnaire = await prisma.questionnaire.findFirst({
      where: {
        id: params.id,
        studioId,
      },
    });
    
    if (!existingQuestionnaire) {
      return NextResponse.json({ error: 'Questionnaire not found' }, { status: 404 });
    }
    
    // Parse and validate the request body
    const body = await request.json();
    const validationResult = updateQuestionnaireSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    // Update the questionnaire
    const updatedQuestionnaire = await prisma.questionnaire.update({
      where: {
        id: params.id,
      },
      data: validationResult.data,
      include: {
        questions: {
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            invitations: true,
            responses: true,
          },
        },
      },
    });
    
    return NextResponse.json(updatedQuestionnaire);
  } catch (error) {
    console.error('Error updating questionnaire:', error);
    return NextResponse.json(
      { error: 'Failed to update questionnaire' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const studioId = await getStudioIdFromSession(session);
    
    if (!studioId) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }
    
    // Check if questionnaire exists and belongs to this studio
    const existingQuestionnaire = await prisma.questionnaire.findFirst({
      where: {
        id: params.id,
        studioId,
      },
    });
    
    if (!existingQuestionnaire) {
      return NextResponse.json({ error: 'Questionnaire not found' }, { status: 404 });
    }
    
    // Delete the questionnaire (this will cascade to delete questions, invitations, and responses)
    await prisma.questionnaire.delete({
      where: {
        id: params.id,
      },
    });
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting questionnaire:', error);
    return NextResponse.json(
      { error: 'Failed to delete questionnaire' },
      { status: 500 }
    );
  }
}