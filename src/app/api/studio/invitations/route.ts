import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Generic invitation handler that can be used for different invitation types
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the user is associated with a studio
    const user = await authPrisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user?.Tenant || user.Tenant.type !== 'STUDIO') {
      return NextResponse.json({ error: 'Only studio accounts can send invitations' }, { status: 403 });
    }
    
    const studio = await authPrisma.studio.findFirst({
      where: { tenantId: user.Tenant.id },
    });
    
    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }
    
    // Parse request body
    const body = await request.json();
    const { 
      invitationType, 
      invitationId, 
      talentIds, 
      message 
    } = body;
    
    // Validate required fields
    if (!invitationType || !invitationId || !Array.isArray(talentIds) || talentIds.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        details: 'invitationType, invitationId, and talentIds are required' 
      }, { status: 400 });
    }
    
    // Process different invitation types
    let invitationResults;
    
    switch (invitationType) {
      case 'questionnaire':
        invitationResults = await handleQuestionnaireInvitations(studio.id, invitationId, talentIds, message);
        break;
      case 'casting-call':
        invitationResults = await handleCastingCallInvitations(studio.id, invitationId, talentIds, message);
        break;
      case 'project':
        invitationResults = await handleProjectInvitations(studio.id, invitationId, talentIds, message);
        break;
      default:
        return NextResponse.json({ 
          error: 'Invalid invitation type', 
          details: 'Supported types: questionnaire, casting-call, project' 
        }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      invitationsCount: invitationResults.count,
      results: invitationResults.details
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error sending invitations:', error);
    return NextResponse.json(
      { error: 'Failed to send invitations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Handle questionnaire invitations
async function handleQuestionnaireInvitations(studioId: string, questionnaireId: string, talentIds: string[], message?: string) {
  // Verify questionnaire exists and belongs to studio
  const questionnaire = await prisma.questionnaire.findFirst({
    where: {
      id: questionnaireId,
      studioId: studioId
    }
  });
  
  if (!questionnaire) {
    throw new Error('Questionnaire not found or does not belong to this studio');
  }
  
  // Create invitations in a transaction
  const invitationTransactions = talentIds.map(talentId => 
    prisma.questionnaireInvitation.create({
      data: {
        id: crypto.randomUUID(),
        questionnaireId,
        profileId: talentId,
        status: 'PENDING',
        message: message || null,
      }
    })
  );
  
  const results = await prisma.$transaction(invitationTransactions);
  
  return {
    count: results.length,
    details: results
  };
}

// Handle casting call invitations
async function handleCastingCallInvitations(studioId: string, castingCallId: string, talentIds: string[], message?: string) {
  // Verify casting call exists and belongs to studio
  const castingCall = await prisma.castingCall.findFirst({
    where: {
      id: castingCallId,
      studioId: studioId
    }
  });
  
  if (!castingCall) {
    throw new Error('Casting call not found or does not belong to this studio');
  }
  
  // For casting calls, we'll send a message to each talent
  const messageTransactions = talentIds.map(talentId => 
    prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        subject: `Invitation to apply for casting call: ${castingCall.title}`,
        content: message || `You've been invited to apply for a casting call: ${castingCall.title}. Please visit your opportunities page to learn more and apply.`,
        studioSenderId: studioId,
        talentReceiverId: talentId,
        relatedToCastingCallId: castingCallId,
        isRead: false,
      }
    })
  );
  
  const results = await prisma.$transaction(messageTransactions);
  
  return {
    count: results.length,
    details: results
  };
}

// Handle project invitations
async function handleProjectInvitations(studioId: string, projectId: string, talentIds: string[], message?: string) {
  // Verify project exists and belongs to studio
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      studioId: studioId
    }
  });
  
  if (!project) {
    throw new Error('Project not found or does not belong to this studio');
  }
  
  // For project invitations, we create both a message and a project invitation entry
  const invitationResults = [];
  
  for (const talentId of talentIds) {
    // First create a message
    const inviteMessage = message || `You've been invited to join the project: ${project.title}. Please visit your projects page to accept or decline this invitation.`;
    
    const newMessage = await prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        subject: `Invitation to join project: ${project.title}`,
        content: inviteMessage,
        studioSenderId: studioId,
        talentReceiverId: talentId,
        relatedToProjectId: projectId,
        isRead: false,
      }
    });
    
    // Then create the project invitation entry
    const invitation = await prisma.projectInvitation.create({
      data: {
        projectId,
        profileId: talentId,
        status: 'PENDING',
        message: inviteMessage,
        role: 'Talent',
        messageId: newMessage.id,
      }
    });
    
    invitationResults.push({
      message: newMessage,
      invitation
    });
  }
  
  return {
    count: invitationResults.length,
    details: invitationResults
  };
}