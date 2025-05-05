import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';
import { getStudioIdFromSession } from '@/lib/auth-helpers';

const prisma = new PrismaClient();

// Define the schema for question options
const optionSchema = z.object({
  label: z.string().min(1, "Option text is required"),
  value: z.string(),
});

// Validation schema for creating a question
const createQuestionSchema = z.object({
  text: z.string().min(3).max(200),
  description: z.string().max(500).optional().nullable(),
  type: z.enum([
    'SHORT_TEXT', 'LONG_TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 
    'RATING', 'DATE', 'FILE_UPLOAD', 'YES_NO'
  ]),
  isRequired: z.boolean().default(false),
  order: z.number().int().nonnegative(),
  options: z.array(optionSchema).optional(),
  metadata: z.record(z.any()).optional(),
  questionnaireId: z.string().uuid(),
});

export async function POST(
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
    const questionnaire = await prisma.questionnaire.findFirst({
      where: {
        id: params.id,
        studioId,
      },
    });
    
    if (!questionnaire) {
      return NextResponse.json({ error: 'Questionnaire not found' }, { status: 404 });
    }
    
    // Parse and validate the request body
    const body = await request.json();
    
    // Make sure the questionnaireId in the body matches the one in the URL
    if (body.questionnaireId !== params.id) {
      return NextResponse.json(
        { error: 'Questionnaire ID mismatch' },
        { status: 400 }
      );
    }
    
    const validationResult = createQuestionSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const {
      text,
      description,
      type,
      isRequired,
      order,
      options,
      metadata,
      questionnaireId,
    } = validationResult.data;
    
    // For choice questions, options are required
    if ((type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE') && (!options || options.length < 2)) {
      return NextResponse.json(
        { error: 'Choice questions must have at least 2 options' },
        { status: 400 }
      );
    }
    
    // Create the question
    const question = await prisma.questionnaireQuestion.create({
      data: {
        text,
        description,
        type,
        isRequired,
        order,
        options: options ? options : undefined,
        metadata: metadata || {},
        questionnaireId,
      },
    });
    
    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json(
      { error: 'Failed to create question' },
      { status: 500 }
    );
  }
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
    
    // Check if questionnaire exists and belongs to this studio
    const questionnaire = await prisma.questionnaire.findFirst({
      where: {
        id: params.id,
        studioId,
      },
    });
    
    if (!questionnaire) {
      return NextResponse.json({ error: 'Questionnaire not found' }, { status: 404 });
    }
    
    // Get all questions for this questionnaire
    const questions = await prisma.questionnaireQuestion.findMany({
      where: {
        questionnaireId: params.id,
      },
      orderBy: {
        order: 'asc',
      },
    });
    
    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}