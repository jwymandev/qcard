import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

// POST /api/talent/questionnaires/invitations/[id]/respond
// Submits a response to a questionnaire
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
    
    // Get the body data
    const body = await request.json();
    const { answers } = body;
    
    if (!Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Invalid answers format' },
        { status: 400 }
      );
    }
    
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
      },
      include: {
        questionnaire: {
          include: {
            questions: true
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
    
    // Check if invitation is in a valid state for responding
    if (invitation.status !== 'PENDING' && invitation.status !== 'ACCEPTED') {
      return NextResponse.json(
        { error: 'This invitation cannot be responded to' },
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
    
    // Validate required questions
    const requiredQuestions = invitation.questionnaire.questions.filter(q => q.isRequired);
    for (const question of requiredQuestions) {
      const answer = answers.find(a => a.questionId === question.id);
      
      if (!answer) {
        return NextResponse.json(
          { error: `Missing required answer for question: ${question.text}` },
          { status: 400 }
        );
      }
      
      // Validate by question type
      switch (question.type) {
        case 'MULTIPLE_CHOICE':
        case 'SINGLE_CHOICE':
          if (!answer.choiceValues || answer.choiceValues.length === 0) {
            return NextResponse.json(
              { error: `Missing selection for required question: ${question.text}` },
              { status: 400 }
            );
          }
          break;
        
        case 'YES_NO':
        case 'SHORT_TEXT':
        case 'LONG_TEXT':
        case 'DATE':
          if (!answer.textValue) {
            return NextResponse.json(
              { error: `Missing text for required question: ${question.text}` },
              { status: 400 }
            );
          }
          break;
          
        case 'RATING':
          if (!answer.textValue) {
            return NextResponse.json(
              { error: `Missing rating for required question: ${question.text}` },
              { status: 400 }
            );
          }
          break;
          
        case 'FILE_UPLOAD':
          if (!answer.fileUrl) {
            return NextResponse.json(
              { error: `Missing file for required question: ${question.text}` },
              { status: 400 }
            );
          }
          break;
      }
    }
    
    // Create or update the response
    let response = invitation.response;
    
    if (!response) {
      // Create a new response
      response = await prisma.questionnaireResponse.create({
        data: {
          invitationId: invitation.id,
          questionnaireId: invitation.questionnaireId,
          profileId: userProfile.id,
          status: invitation.questionnaire.requiresApproval ? 'SUBMITTED' : 'APPROVED',
          submittedAt: new Date()
        }
      });
    } else {
      // Update existing response
      response = await prisma.questionnaireResponse.update({
        where: { id: response.id },
        data: {
          status: invitation.questionnaire.requiresApproval ? 'SUBMITTED' : 'APPROVED',
          submittedAt: new Date()
        }
      });
      
      // Delete existing answers
      await prisma.questionAnswer.deleteMany({
        where: { responseId: response.id }
      });
    }
    
    // Create answers
    const answerPromises = answers.map(answer => {
      const data: any = {
        responseId: response.id,
        questionId: answer.questionId
      };
      
      if (answer.textValue !== undefined) {
        data.textValue = answer.textValue;
      }
      
      if (answer.choiceValues !== undefined) {
        data.choiceValues = Array.isArray(answer.choiceValues) 
          ? JSON.stringify(answer.choiceValues) 
          : JSON.stringify([]);
      }
      
      if (answer.fileUrl !== undefined) {
        data.fileUrl = answer.fileUrl;
      }
      
      return prisma.questionAnswer.create({ data });
    });
    
    await Promise.all(answerPromises);
    
    // Update invitation status to completed
    await prisma.questionnaireInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Questionnaire response submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting questionnaire response:', error);
    return NextResponse.json(
      { error: 'Failed to submit questionnaire response' },
      { status: 500 }
    );
  }
}