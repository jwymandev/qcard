import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

// POST /api/talent/questionnaires/invitations/[id]/accept
// Accepts a questionnaire invitation
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const invitationId = params.id;
    
    // Get the profile for the current user
    const userProfile = await prisma.profile.findUnique({
      where: {
        userId: userId,
        type: 'TALENT'
      }
    });
    
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Talent profile not found' },
        { status: 404 }
      );
    }
    
    // Get the invitation and verify it belongs to this user
    const invitation = await prisma.questionnaireInvitation.findUnique({
      where: {
        id: invitationId,
        profileId: userProfile.id
      }
    });
    
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }
    
    // Check if invitation is in a valid state for accepting
    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'This invitation cannot be accepted' },
        { status: 400 }
      );
    }
    
    // Check if invitation has expired
    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      );
    }
    
    // Update invitation status to accepted
    await prisma.questionnaireInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED'
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Questionnaire invitation accepted successfully'
    });
  } catch (error) {
    console.error('Error accepting questionnaire invitation:', error);
    return NextResponse.json(
      { error: 'Failed to accept questionnaire invitation' },
      { status: 500 }
    );
  }
}