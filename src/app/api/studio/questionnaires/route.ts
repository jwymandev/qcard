import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';
import { getStudioIdFromSession } from '@/lib/auth-helpers';

const prisma = new PrismaClient();

// Validation schema for creating a questionnaire
const createQuestionnaireSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
  requiresApproval: z.boolean().default(false),
});

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const studioId = await getStudioIdFromSession(session);
    
    if (!studioId) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }
    
    // Fetch all questionnaires for the studio
    const questionnaires = await prisma.questionnaire.findMany({
      where: {
        studioId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        _count: {
          select: {
            questions: true,
            invitations: true,
            responses: true,
          },
        },
      },
    });
    
    return NextResponse.json(questionnaires);
  } catch (error) {
    console.error('Error fetching questionnaires:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questionnaires' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const studioId = await getStudioIdFromSession(session);
    
    if (!studioId) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }
    
    // Parse and validate the request body
    const body = await request.json();
    const validationResult = createQuestionnaireSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { title, description, isActive, requiresApproval } = validationResult.data;
    
    // Create the questionnaire
    const questionnaire = await prisma.questionnaire.create({
      data: {
        title,
        description,
        isActive,
        requiresApproval,
        studioId,
      },
    });
    
    return NextResponse.json(questionnaire, { status: 201 });
  } catch (error) {
    console.error('Error creating questionnaire:', error);
    return NextResponse.json(
      { error: 'Failed to create questionnaire' },
      { status: 500 }
    );
  }
}