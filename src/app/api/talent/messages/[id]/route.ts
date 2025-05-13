import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

// GET /api/talent/messages/[id] - Get a specific message
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        Tenant: true,
        Profile: true
      },
    });
    
    if (!user?.Tenant || user.Tenant.type !== "TALENT" || !user.Profile) {
      return NextResponse.json({ error: "Only talent accounts can access their messages" }, { status: 403 });
    }
    
    const profileId = user.Profile.id;
    const messageId = params.id;
    
    // Get the message with all related data
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        OR: [
          { talentSenderId: profileId }, // Messages sent by this talent
          { talentReceiverId: profileId }, // Messages received by this talent
        ],
      },
      include: {
        // Include studio details
        Studio_Message_studioSenderIdToStudio: {
          select: {
            id: true,
            name: true,
            description: true,
            contactEmail: true,
          },
        },
        Studio_Message_studioReceiverIdToStudio: {
          select: {
            id: true,
            name: true,
            description: true,
            contactEmail: true,
          },
        },
      },
    });
    
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    
    // If this is a received message and it's not yet read, mark it as read
    if (message.talentReceiverId === profileId && !message.isRead) {
      await prisma.message.update({
        where: { id: messageId },
        data: { isRead: true },
      });
    }
    
    // Fetch related project if applicable
    let relatedProject = null;
    if (message.relatedToProjectId) {
      const project = await prisma.project.findUnique({
        where: { id: message.relatedToProjectId },
        select: {
          id: true,
          title: true,
          description: true,
        },
      });
      relatedProject = project;
    }
    
    // Fetch related casting call if applicable
    let relatedCastingCall = null;
    if (message.relatedToCastingCallId) {
      const castingCall = await prisma.castingCall.findUnique({
        where: { id: message.relatedToCastingCallId },
        select: {
          id: true,
          title: true,
          description: true,
        },
      });
      relatedCastingCall = castingCall;
    }
    
    // Find all related messages in the same thread
    // Messages are in the same thread if they have the same subject (excluding Re: prefix)
    // and involve the same talent and studio
    const baseSubject = message.subject.replace(/^(Re:\s*)+/i, '').trim();
    const studioId = message.studioSenderId || message.studioReceiverId;

    // Find all messages that match this thread (more precise matching)
    const threadMessages = await prisma.message.findMany({
      where: {
        OR: [
          // Messages where the talent is either sender or recipient
          {
            talentSenderId: profileId,
            studioReceiverId: studioId,
            // Use more precise subject matching to avoid false positives
            OR: [
              { subject: { equals: baseSubject, mode: 'insensitive' } },
              { subject: { startsWith: `Re: ${baseSubject}`, mode: 'insensitive' } },
              { subject: { equals: `Re: ${baseSubject}`, mode: 'insensitive' } }
            ]
          },
          {
            talentReceiverId: profileId,
            studioSenderId: studioId,
            // Same precise matching for received messages
            OR: [
              { subject: { equals: baseSubject, mode: 'insensitive' } },
              { subject: { startsWith: `Re: ${baseSubject}`, mode: 'insensitive' } },
              { subject: { equals: `Re: ${baseSubject}`, mode: 'insensitive' } }
            ]
          },
        ],
        // Exclude the current message from being included twice
        NOT: {
          id: messageId
        }
      },
      include: {
        Studio_Message_studioSenderIdToStudio: {
          select: {
            id: true,
            name: true,
            description: true,
            contactEmail: true,
          },
        },
        Studio_Message_studioReceiverIdToStudio: {
          select: {
            id: true,
            name: true,
            description: true,
            contactEmail: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Add the current message at the appropriate position based on timestamp
    const allThreadMessages = [...threadMessages];
    const currentMessage = {
      ...message,
      isCurrentMessage: true as unknown as boolean // Type casting to avoid TypeScript error
    };

    // Find the correct position for the current message
    let inserted = false;
    for (let i = 0; i < allThreadMessages.length; i++) {
      if (new Date(message.createdAt) < new Date(allThreadMessages[i].createdAt)) {
        allThreadMessages.splice(i, 0, currentMessage);
        inserted = true;
        break;
      }
    }

    // If the current message is newer than all others, add it at the end
    if (!inserted) {
      allThreadMessages.push(currentMessage);
    }

    // Format thread messages
    const formattedThreadMessages = allThreadMessages.map(threadMsg => ({
      id: threadMsg.id,
      subject: threadMsg.subject,
      content: threadMsg.content,
      isRead: threadMsg.isRead,
      isArchived: threadMsg.isArchived,
      createdAt: threadMsg.createdAt,
      isSent: threadMsg.talentSenderId === profileId,
      isCurrentMessage: ('isCurrentMessage' in threadMsg ? threadMsg.isCurrentMessage : false) || threadMsg.id === messageId,
      sender: threadMsg.talentSenderId === profileId
        ? null // This talent is the sender
        : {
            id: threadMsg.Studio_Message_studioSenderIdToStudio?.id,
            name: threadMsg.Studio_Message_studioSenderIdToStudio?.name,
            description: threadMsg.Studio_Message_studioSenderIdToStudio?.description,
            email: threadMsg.Studio_Message_studioSenderIdToStudio?.contactEmail,
          },
      recipient: threadMsg.talentReceiverId === profileId
        ? null // This talent is the recipient
        : {
            id: threadMsg.Studio_Message_studioReceiverIdToStudio?.id,
            name: threadMsg.Studio_Message_studioReceiverIdToStudio?.name,
            description: threadMsg.Studio_Message_studioReceiverIdToStudio?.description,
            email: threadMsg.Studio_Message_studioReceiverIdToStudio?.contactEmail,
          },
    }));

    // Map message to a friendly response format
    const formattedMessage = {
      id: message.id,
      subject: message.subject,
      content: message.content,
      isRead: message.isRead,
      isArchived: message.isArchived,
      createdAt: message.createdAt,
      isSent: message.talentSenderId === profileId,
      sender: message.talentSenderId === profileId
        ? null // This talent is the sender
        : {
            id: message.Studio_Message_studioSenderIdToStudio?.id,
            name: message.Studio_Message_studioSenderIdToStudio?.name,
            description: message.Studio_Message_studioSenderIdToStudio?.description,
            email: message.Studio_Message_studioSenderIdToStudio?.contactEmail,
          },
      recipient: message.talentReceiverId === profileId
        ? null // This talent is the recipient
        : {
            id: message.Studio_Message_studioReceiverIdToStudio?.id,
            name: message.Studio_Message_studioReceiverIdToStudio?.name,
            description: message.Studio_Message_studioReceiverIdToStudio?.description,
            email: message.Studio_Message_studioReceiverIdToStudio?.contactEmail,
          },
      relatedToProject: relatedProject,
      relatedToCastingCall: relatedCastingCall,
      // Include thread messages
      thread: formattedThreadMessages,
      // Include base subject for thread
      baseSubject: baseSubject,
    };

    return NextResponse.json(formattedMessage);
  } catch (error) {
    console.error("Error fetching message:", error);
    return NextResponse.json({ 
      error: "Failed to fetch message",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// PATCH /api/talent/messages/[id] - Update a message (mark as read/unread or archived)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        Tenant: true,
        Profile: true
      },
    });
    
    if (!user?.Tenant || user.Tenant.type !== "TALENT" || !user.Profile) {
      return NextResponse.json({ error: "Only talent accounts can update their messages" }, { status: 403 });
    }
    
    const profileId = user.Profile.id;
    const messageId = params.id;
    
    // Verify the message belongs to this talent
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        OR: [
          { talentSenderId: profileId },
          { talentReceiverId: profileId },
        ],
      },
    });
    
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    
    // Parse request body
    const body = await request.json();
    const { isRead, isArchived } = body;
    
    // Update the message
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        ...(isRead !== undefined ? { isRead } : {}),
        ...(isArchived !== undefined ? { isArchived } : {}),
      },
    });
    
    return NextResponse.json({
      success: true,
      message: "Message updated successfully",
      id: updatedMessage.id,
      isRead: updatedMessage.isRead,
      isArchived: updatedMessage.isArchived,
    });
  } catch (error) {
    console.error("Error updating message:", error);
    return NextResponse.json({ 
      error: "Failed to update message",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// DELETE /api/talent/messages/[id] - Delete a message
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        Tenant: true,
        Profile: true
      },
    });
    
    if (!user?.Tenant || user.Tenant.type !== "TALENT" || !user.Profile) {
      return NextResponse.json({ error: "Only talent accounts can delete their messages" }, { status: 403 });
    }
    
    const profileId = user.Profile.id;
    const messageId = params.id;
    
    // Verify the message belongs to this talent
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        OR: [
          { talentSenderId: profileId },
          { talentReceiverId: profileId },
        ],
      },
    });
    
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    
    // Delete the message
    await prisma.message.delete({
      where: { id: messageId },
    });
    
    return NextResponse.json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    return NextResponse.json({ 
      error: "Failed to delete message",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}