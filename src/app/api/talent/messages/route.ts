import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// GET /api/talent/messages - Get all messages for the current talent
export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const sent = url.searchParams.get('sent') === 'true';
    const unreadOnly = url.searchParams.get('unread') === 'true';
    
    // Find the user and their profile
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
    
    // Base query conditions
    const baseConditions = {
      isArchived: false,
      ...(unreadOnly ? { isRead: false } : {}),
    };
    
    // Define query based on whether we're getting received or sent messages
    const query = {
      where: {
        ...baseConditions,
        ...(sent
          ? { 
              talentSenderId: profileId, // Sent messages
            }
          : { 
              talentReceiverId: profileId, // Received messages
            }),
      },
      include: {
        // Include details about the studio (sender/receiver)
        Studio_Message_studioSenderIdToStudio: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        Studio_Message_studioReceiverIdToStudio: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc' as const,
      },
    };
    
    const messages = await prisma.message.findMany(query);
    
    // Collect all project and casting call IDs that we need to fetch
    const projectIds = messages
      .filter(m => m.relatedToProjectId)
      .map(m => m.relatedToProjectId as string);
      
    const castingCallIds = messages
      .filter(m => m.relatedToCastingCallId)
      .map(m => m.relatedToCastingCallId as string);
    
    // Fetch related projects
    const projects = projectIds.length > 0 
      ? await prisma.project.findMany({
          where: { id: { in: projectIds } },
          select: { id: true, title: true, description: true }
        })
      : [];
      
    // Fetch related casting calls
    const castingCalls = castingCallIds.length > 0
      ? await prisma.castingCall.findMany({
          where: { id: { in: castingCallIds } },
          select: { id: true, title: true, description: true }
        })
      : [];
    
    // Create maps for easy lookup
    const projectMap = new Map(projects.map(p => [p.id, p]));
    const castingCallMap = new Map(castingCalls.map(c => [c.id, c]));
    
    // Map the result to match the expected format
    const mappedMessages = messages.map(message => ({
      id: message.id,
      subject: message.subject,
      content: message.content,
      isRead: message.isRead,
      isArchived: message.isArchived,
      createdAt: message.createdAt,
      // Set sender or recipient based on whether this is a sent or received message
      sender: sent
        ? null // Talent is the sender
        : message.Studio_Message_studioSenderIdToStudio
          ? {
              id: message.Studio_Message_studioSenderIdToStudio.id,
              name: message.Studio_Message_studioSenderIdToStudio.name,
              description: message.Studio_Message_studioSenderIdToStudio.description,
            }
          : null,
      recipient: sent
        ? message.Studio_Message_studioReceiverIdToStudio
          ? {
              id: message.Studio_Message_studioReceiverIdToStudio.id,
              name: message.Studio_Message_studioReceiverIdToStudio.name,
              description: message.Studio_Message_studioReceiverIdToStudio.description,
            }
          : null
        : null, // Talent is the recipient
      relatedToProject: message.relatedToProjectId ? projectMap.get(message.relatedToProjectId) || null : null,
      relatedToCastingCall: message.relatedToCastingCallId ? castingCallMap.get(message.relatedToCastingCallId) || null : null,
    }));
    
    return NextResponse.json(mappedMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ 
      error: "Failed to fetch messages",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// POST /api/talent/messages - Send a message (only replies are allowed)
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Find the user and their profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        Tenant: true,
        Profile: true
      },
    });
    
    if (!user?.Tenant || user.Tenant.type !== "TALENT" || !user.Profile) {
      return NextResponse.json({ error: "Only talent accounts can send messages" }, { status: 403 });
    }
    
    const profileId = user.Profile.id;
    
    // Parse request body
    const body = await request.json();
    const { recipientId, subject, content, originalMessageId } = body;
    
    // Validate required fields
    if (!recipientId || !subject || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    // Talents can only reply to messages they received, so verify the original message
    if (!originalMessageId) {
      return NextResponse.json({ 
        error: "Talents can only reply to existing messages" 
      }, { status: 403 });
    }
    
    // Check that the original message exists and was sent to this talent
    const originalMessage = await prisma.message.findFirst({
      where: {
        id: originalMessageId,
        talentReceiverId: profileId,
      },
    });
    
    if (!originalMessage) {
      return NextResponse.json({ 
        error: "Original message not found or you don't have permission to reply" 
      }, { status: 404 });
    }
    
    // Verify that the recipient (studio) exists
    const studioRecipient = await prisma.studio.findUnique({
      where: { id: recipientId },
    });
    
    if (!studioRecipient) {
      return NextResponse.json({ 
        error: "Recipient studio not found" 
      }, { status: 404 });
    }
    
    // Get safe values for related fields
    const relatedToProjectId = originalMessage.relatedToProjectId || null;
    const relatedToCastingCallId = originalMessage.relatedToCastingCallId || null;
    
    // Create a reply message
    const newMessage = await prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
        content,
        talentSenderId: profileId,
        studioReceiverId: recipientId,
        isRead: false,
        // Only include related entities if they exist
        ...(relatedToProjectId && { relatedToProjectId }),
        ...(relatedToCastingCallId && { relatedToCastingCallId }),
      },
    });
    
    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
      id: newMessage.id,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ 
      error: "Failed to send message",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}