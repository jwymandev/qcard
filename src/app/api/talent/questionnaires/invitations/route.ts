import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient();

// Helper to get the talent's profile ID from the session
async function getProfileIdFromSession(session: any) {
  if (!session?.user?.id) return null;
  
  const profile = await prisma.profile.findUnique({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
    },
  });
  
  return profile?.id || null;
}

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const profileId = await getProfileIdFromSession(session);
    
    if (!profileId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    // Fetch all questionnaire invitations for the talent
    const invitations = await prisma.questionnaireInvitation.findMany({
      where: {
        profileId,
      },
      include: {
        questionnaire: {
          select: {
            id: true,
            title: true,
            description: true,
            studioId: true,
            Studio: {
              select: {
                name: true,
              },
            },
            _count: {
              select: {
                questions: true,
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
          status: 'asc', // PENDING first, then others
        },
        {
          sentAt: 'desc', // Most recent first
        },
      ],
    });
    
    return NextResponse.json(invitations);
  } catch (error) {
    console.error('Error fetching questionnaire invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questionnaire invitations' },
      { status: 500 }
    );
  }
}