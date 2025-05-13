import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// GET /api/talent/messages - Get all messages organized as conversations
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(request.url);
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

    // Query both sent and received messages to build conversations
    const query = {
      where: {
        ...baseConditions,
        OR: [
          { talentSenderId: profileId }, // Sent messages
          { talentReceiverId: profileId }, // Received messages
        ]
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
    
    // Group messages into conversations
    const conversations = new Map(); // Map of conversation IDs to message arrays
    const messageToConversation = new Map(); // Map of message IDs to conversation IDs

    // First, group messages by conversation
    messages.forEach(message => {
      // Normalize subject (remove Re: prefixes)
      const normalizedSubject = message.subject.replace(/^(Re:\s*)+/i, '').trim();

      // Create a unique conversation key using normalized subject and studio ID
      const studioId = message.studioSenderId || message.studioReceiverId;
      const conversationKey = `${normalizedSubject}__${studioId}`;

      // Store mapping of this message to its conversation
      messageToConversation.set(message.id, conversationKey);

      // Add message to the conversation
      if (!conversations.has(conversationKey)) {
        conversations.set(conversationKey, []);
      }
      conversations.get(conversationKey).push(message);
    });

    // Now build the conversations to return
    // Define a type for our conversation objects
    type ConversationThread = {
      id: string;
      subject: string;
      preview: string;
      latestMessageId: string;
      latestMessageDate: string;
      messageCount: number;
      unreadCount: number;
      hasUnread: boolean;
      studio: {
        id: string;
        name: string;
        description?: string;
      } | null;
      relatedToProject: any;
      relatedToCastingCall: any;
    };

    const conversationThreads: ConversationThread[] = [];

    // Process each conversation - using Array.from to avoid TS iterator issues
    Array.from(conversations.entries()).forEach(([conversationKey, conversationMessages]) => {
      // Sort messages in this conversation by date (newest first)
      conversationMessages.sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // The latest message is the first one after sorting
      const latestMessage = conversationMessages[0];

      // Get the studio involved in this conversation
      const studioId = latestMessage.studioSenderId || latestMessage.studioReceiverId;
      const studioInfo = latestMessage.studioSenderId
        ? latestMessage.Studio_Message_studioSenderIdToStudio
        : latestMessage.Studio_Message_studioReceiverIdToStudio;

      // Count unread messages in this conversation
      const unreadCount = conversationMessages.filter(
        (msg: any) => msg.talentReceiverId === profileId && !msg.isRead
      ).length;

      // Create the conversation object
      conversationThreads.push({
        id: conversationKey, // Use the conversation key as the ID
        subject: latestMessage.subject.replace(/^(Re:\s*)+/i, '').trim(), // Use normalized subject
        preview: latestMessage.content.substring(0, 100) + (latestMessage.content.length > 100 ? '...' : ''),
        latestMessageId: latestMessage.id,
        latestMessageDate: latestMessage.createdAt,
        messageCount: conversationMessages.length,
        unreadCount: unreadCount,
        hasUnread: unreadCount > 0,
        studio: studioInfo ? {
          id: studioInfo.id,
          name: studioInfo.name,
          description: studioInfo.description,
        } : null,
        relatedToProject: latestMessage.relatedToProjectId ? projectMap.get(latestMessage.relatedToProjectId) || null : null,
        relatedToCastingCall: latestMessage.relatedToCastingCallId ? castingCallMap.get(latestMessage.relatedToCastingCallId) || null : null,
      });
    });

    // Sort conversations by the date of their latest message
    conversationThreads.sort((a: any, b: any) =>
      new Date(b.latestMessageDate).getTime() - new Date(a.latestMessageDate).getTime()
    );
    
    return NextResponse.json(conversationThreads);
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