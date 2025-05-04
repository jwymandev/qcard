import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

// GET /api/talent/questionnaires/invitations/[id]
// Retrieves a specific questionnaire invitation with full questionnaire data
export async function GET(
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
    
    // Get the invitation with associated questionnaire and questions
    const invitation = await prisma.questionnaireInvitation.findUnique({
      where: {
        id: invitationId,
        profileId: userProfile.id // Ensure the invitation belongs to this user
      },
      include: {
        questionnaire: {
          include: {
            questions: {
              orderBy: { order: 'asc' }
            },
            Studio: {
              select: {
                id: true,
                name: true,
                imageUrl: true
              }
            }
          }
        },
        response: true
      }
    });
    
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }
    
    // Format the response
    const formattedResponse = {
      id: invitation.questionnaire.id,
      title: invitation.questionnaire.title,
      description: invitation.questionnaire.description,
      invitation: {
        id: invitation.id,
        questionnaireId: invitation.questionnaireId,
        questionnaireTitle: invitation.questionnaire.title,
        studioName: invitation.questionnaire.Studio.name,
        studioImageUrl: invitation.questionnaire.Studio.imageUrl,
        status: invitation.status,
        sentAt: invitation.sentAt,
        expiresAt: invitation.expiresAt,
        message: invitation.message,
        completedAt: invitation.completedAt
      },
      questions: invitation.questionnaire.questions.map(question => ({
        id: question.id,
        text: question.text,
        description: question.description,
        type: question.type,
        isRequired: question.isRequired,
        order: question.order,
        options: question.options ? JSON.parse(question.options as string) : null,
        metadata: question.metadata
      }))
    };
    
    return NextResponse.json(formattedResponse);
  } catch (error) {
    console.error('Error getting questionnaire invitation:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve questionnaire data' },
      { status: 500 }
    );
  }
}