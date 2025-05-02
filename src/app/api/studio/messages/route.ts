import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';

// Validation schema for sending a message
const messageSchema = z.object({
  recipientId: z.string().uuid({ message: "Invalid recipient ID format" }),
  subject: z.string().min(1, { message: "Subject is required" }),
  content: z.string().min(1, { message: "Message content is required" }),
  relatedToProjectId: z.string().uuid({ message: "Invalid project ID format" }).optional().nullable(),
  relatedToCastingCallId: z.string().uuid({ message: "Invalid casting call ID format" }).optional().nullable(),
});

// Validation schema for inviting talent to a project
const inviteSchema = z.object({
  talentReceiverId: z.string(),
  subject: z.string().min(1, { message: "Subject is required" }),
  content: z.string().min(1, { message: "Message content is required" }),
  relatedToProjectId: z.string().optional().nullable(),
  relatedToCastingCallId: z.string().optional().nullable(),
});

// GET /api/studio/messages - Get all messages for the authenticated studio
export async function GET(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user?.Tenant || user.Tenant.type !== "STUDIO") {
      return NextResponse.json({ error: "Only studio users can access this endpoint" }, { status: 403 });
    }
    
    const studio = await prisma.studio.findFirst({
      where: { tenantId: user.Tenant.id },
    });
    
    if (!studio) {
      return NextResponse.json({ error: "Studio profile not found" }, { status: 404 });
    }
    
    // Parse URL search params for filtering
    const { searchParams } = new URL(request.url);
    const sent = searchParams.get('sent') === 'true';
    
    let messages;
    
    if (sent) {
      // Get sent messages
      messages = await prisma.message.findMany({
        where: {
          senderId: studio.id,
          senderType: "STUDIO",
        },
        include: {
          recipient: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                }
              }
            }
          },
          relatedToProject: {
            select: {
              id: true,
              title: true,
            }
          },
          relatedToCastingCall: {
            select: {
              id: true,
              title: true,
            }
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Get received messages
      messages = await prisma.message.findMany({
        where: {
          recipientId: studio.id,
          recipientType: "STUDIO",
        },
        include: {
          sender: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                }
              }
            }
          },
          relatedToProject: {
            select: {
              id: true,
              title: true,
            }
          },
          relatedToCastingCall: {
            select: {
              id: true,
              title: true,
            }
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }
    
    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

// POST /api/studio/messages - Send a new message
export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user?.Tenant || user.Tenant.type !== "STUDIO") {
      return NextResponse.json({ error: "Only studio users can access this endpoint" }, { status: 403 });
    }
    
    const studio = await prisma.studio.findFirst({
      where: { tenantId: user.Tenant.id },
    });
    
    if (!studio) {
      return NextResponse.json({ error: "Studio profile not found" }, { status: 404 });
    }
    
    // Check if this is a standard message or a project invitation
    if (body.talentReceiverId) {
      // Handle project invitation
      const inviteResult = inviteSchema.safeParse(body);
      if (!inviteResult.success) {
        return NextResponse.json(
          { error: "Invalid input data", details: inviteResult.error.format() },
          { status: 400 }
        );
      }
      
      const { talentReceiverId, subject, content, relatedToProjectId, relatedToCastingCallId } = inviteResult.data;
      
      // Verify recipient profile exists
      const talentProfile = await prisma.profile.findUnique({
        where: { id: talentReceiverId },
      });
      
      if (!talentProfile) {
        return NextResponse.json({ error: "Talent profile not found" }, { status: 404 });
      }
      
      // If project ID is provided, verify it exists and belongs to this studio
      if (relatedToProjectId) {
        const project = await prisma.project.findUnique({
          where: { 
            id: relatedToProjectId,
            studioId: studio.id
          },
        });
        
        if (!project) {
          return NextResponse.json({ error: "Project not found or does not belong to this studio" }, { status: 404 });
        }
      }
      
      // Create invitation message
      const message = await prisma.message.create({
        data: {
          subject,
          content,
          sender: { connect: { id: studio.id } },
          senderType: "STUDIO",
          recipient: { connect: { id: talentReceiverId } },
          recipientType: "PROFILE",
          isRead: false,
          ...(relatedToProjectId && {
            relatedToProject: { connect: { id: relatedToProjectId } },
          }),
          ...(relatedToCastingCallId && {
            relatedToCastingCall: { connect: { id: relatedToCastingCallId } },
          }),
        },
        include: {
          recipient: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                }
              }
            }
          },
          relatedToProject: {
            select: {
              id: true,
              title: true,
            }
          },
          relatedToCastingCall: {
            select: {
              id: true,
              title: true,
            }
          },
        },
      });
      
      return NextResponse.json(message, { status: 201 });
    } else {
      // Handle regular message
      const result = messageSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "Invalid input data", details: result.error.format() },
          { status: 400 }
        );
      }
      
      const { recipientId, subject, content, relatedToProjectId, relatedToCastingCallId } = result.data;
      
      // Verify recipient exists
      const recipient = await prisma.profile.findUnique({
        where: { id: recipientId },
      });
      
      if (!recipient) {
        return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
      }
      
      // Create the message
      const message = await prisma.message.create({
        data: {
          subject,
          content,
          sender: { connect: { id: studio.id } },
          senderType: "STUDIO",
          recipient: { connect: { id: recipientId } },
          recipientType: "PROFILE",
          isRead: false,
          ...(relatedToProjectId && {
            relatedToProject: { connect: { id: relatedToProjectId } },
          }),
          ...(relatedToCastingCallId && {
            relatedToCastingCall: { connect: { id: relatedToCastingCallId } },
          }),
        },
        include: {
          recipient: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                }
              }
            }
          },
          relatedToProject: {
            select: {
              id: true,
              title: true,
            }
          },
          relatedToCastingCall: {
            select: {
              id: true,
              title: true,
            }
          },
        },
      });
    
      return NextResponse.json(message, { status: 201 });
    }
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}