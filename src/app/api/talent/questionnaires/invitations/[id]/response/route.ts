import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

// GET /api/talent/questionnaires/invitations/[id]/response
// Retrieves the response for a specific questionnaire invitation
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
    
    // Get the invitation with associated questionnaire, questions, and response
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
        response: {
          include: {
            answers: true
          }
        }
      }
    });
    
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }
    
    if (!invitation.response) {
      return NextResponse.json(
        { error: 'No response found for this invitation' },
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
      })),
      response: {
        id: invitation.response.id,
        status: invitation.response.status,
        submittedAt: invitation.response.submittedAt,
        reviewedAt: invitation.response.reviewedAt,
        reviewNotes: invitation.response.reviewNotes,
        answers: invitation.response.answers.map(answer => ({
          questionId: answer.questionId,
          textValue: answer.textValue,
          choiceValues: answer.choiceValues ? JSON.parse(answer.choiceValues as string) : null,
          fileUrl: answer.fileUrl
        }))
      }
    };
    
    return NextResponse.json(formattedResponse);
  } catch (error) {
    console.error('Error getting questionnaire response:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve questionnaire response data' },
      { status: 500 }
    );
  }
}