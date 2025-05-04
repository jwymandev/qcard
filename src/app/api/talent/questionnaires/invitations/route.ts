import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

// GET /api/talent/questionnaires/invitations
// Retrieves all questionnaire invitations for the current talent user
export async function GET(request: NextRequest) {
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
    
    // Get all invitations for this talent profile
    const invitations = await prisma.questionnaireInvitation.findMany({
      where: {
        profileId: userProfile.id
      },
      orderBy: {
        sentAt: 'desc'
      },
      include: {
        questionnaire: {
          include: {
            Studio: {
              select: {
                id: true,
                name: true,
                imageUrl: true
              }
            }
          }
        }
      }
    });
    
    // Format the response
    const formattedInvitations = invitations.map(invitation => ({
      id: invitation.id,
      questionnaireId: invitation.questionnaireId,
      questionnaireTitle: invitation.questionnaire.title,
      studioName: invitation.questionnaire.Studio.name,
      studioImageUrl: invitation.questionnaire.Studio.imageUrl,
      status: invitation.status,
      sentAt: invitation.sentAt,
      expiresAt: invitation.expiresAt,
      completedAt: invitation.completedAt,
      message: invitation.message
    }));
    
    return NextResponse.json(formattedInvitations);
  } catch (error) {
    console.error('Error getting questionnaire invitations:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve questionnaire invitations' },
      { status: 500 }
    );
  }
}