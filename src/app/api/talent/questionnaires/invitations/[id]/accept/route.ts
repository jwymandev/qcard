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

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const profileId = await getProfileIdFromSession(session);
    
    if (!profileId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    // Check if invitation exists and belongs to this talent
    const invitation = await prisma.questionnaireInvitation.findFirst({
      where: {
        id: params.id,
        profileId,
      },
      include: {
        questionnaire: true,
      },
    });
    
    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }
    
    // Only pending invitations can be accepted
    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Invitation is already ${invitation.status.toLowerCase()}` },
        { status: 400 }
      );
    }
    
    // Check if invitation is expired
    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }
    
    // Update invitation status to ACCEPTED
    const updatedInvitation = await prisma.questionnaireInvitation.update({
      where: {
        id: params.id,
      },
      data: {
        status: 'ACCEPTED',
      },
    });
    
    return NextResponse.json(updatedInvitation);
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}