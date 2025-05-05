import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';
import { getStudioIdFromSession } from '@/lib/auth-helpers';

const prisma = new PrismaClient();

// Validation schema for creating invitations
const createInvitationsSchema = z.object({
  message: z.string().max(500).optional(),
  expiresAt: z.date().optional().nullable(),
  profileIds: z.array(z.string().uuid()).min(1),
});

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
    
    // Fetch all invitations for this questionnaire
    const invitations = await prisma.questionnaireInvitation.findMany({
      where: {
        questionnaireId: params.id,
      },
      include: {
        profile: {
          select: {
            id: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        response: {
          select: {
            id: true,
            status: true,
            submittedAt: true,
          },
        },
      },
      orderBy: [
        {
          status: 'asc',
        },
        {
          sentAt: 'desc',
        },
      ],
    });
    
    return NextResponse.json(invitations);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}

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
    const validationResult = createInvitationsSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { message, expiresAt, profileIds } = validationResult.data;
    
    // Check if profiles exist
    const profiles = await prisma.profile.findMany({
      where: {
        id: {
          in: profileIds,
        },
      },
      select: {
        id: true,
      },
    });
    
    if (profiles.length !== profileIds.length) {
      return NextResponse.json(
        { error: 'One or more profiles not found' },
        { status: 404 }
      );
    }
    
    // Check for existing invitations to avoid duplicates
    const existingInvitations = await prisma.questionnaireInvitation.findMany({
      where: {
        questionnaireId: params.id,
        profileId: {
          in: profileIds,
        },
      },
      select: {
        profileId: true,
      },
    });
    
    const existingProfileIds = existingInvitations.map(inv => inv.profileId);
    const newProfileIds = profileIds.filter(id => !existingProfileIds.includes(id));
    
    if (newProfileIds.length === 0) {
      return NextResponse.json(
        { error: 'All selected talents have already been invited to this questionnaire' },
        { status: 400 }
      );
    }
    
    // Create invitations
    const invitations = await Promise.all(
      newProfileIds.map(profileId =>
        prisma.questionnaireInvitation.create({
          data: {
            questionnaireId: params.id,
            profileId,
            message,
            expiresAt,
            status: 'PENDING',
          },
        })
      )
    );
    
    return NextResponse.json({
      message: `Sent ${invitations.length} invitation(s)`,
      invitations,
      skipped: existingProfileIds.length,
    }, { status: 201 });
  } catch (error) {
    console.error('Error sending invitations:', error);
    return NextResponse.json(
      { error: 'Failed to send invitations' },
      { status: 500 }
    );
  }
}