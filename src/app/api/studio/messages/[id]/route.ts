import { prisma } from '@/lib/db';
import { authPrisma } from '@/lib/secure-db-connection';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';

// Validation schema for updating a message
const messageUpdateSchema = z.object({
  isRead: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

// Helper function to check if a studio has access to a message
async function canAccessMessage(userId: string, messageId: string) {
  const user = await authPrisma.user.findUnique({
    where: { id: userId },
    include: { Tenant: true },
  });
  
  if (!user?.Tenant || user.Tenant.type !== "STUDIO") {
    return false;
  }
  
  const studio = await authPrisma.studio.findFirst({
    where: { tenantId: user.Tenant.id },
  });
  
  if (!studio) {
    return false;
  }
  
  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      OR: [
        { studioSenderId: studio.id },
        { studioReceiverId: studio.id },
      ],
    },
  });
  
  return !!message;
}

// GET /api/studio/messages/[id] - Get a specific message
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { id } = params;
    
    if (!await canAccessMessage(session.user.id, id)) {
      return NextResponse.json({ error: "Unauthorized to access this message" }, { status: 403 });
    }
    
    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        Studio_Message_studioSenderIdToStudio: {
          include: {
            Tenant: true
          }
        },
        Studio_Message_studioReceiverIdToStudio: {
          include: {
            Tenant: true
          }
        },
        Profile_Message_talentSenderIdToProfile: {
          include: {
            User: true
          }
        },
        Profile_Message_talentReceiverIdToProfile: {
          include: {
            User: true
          }
        }
      },
    });
    
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    
    // If this is an incoming message to studio and it's not read, mark as read
    if (message.studioReceiverId && !message.isRead) {
      await prisma.message.update({
        where: { id },
        data: { isRead: true },
      });
    }
    
    return NextResponse.json(message);
  } catch (error) {
    console.error("Error fetching message:", error);
    return NextResponse.json({ 
      error: "Failed to fetch message",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// PATCH /api/studio/messages/[id] - Update a message (mark as read, archive, etc.)
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { id } = params;
    const body = await request.json();
    
    if (!await canAccessMessage(session.user.id, id)) {
      return NextResponse.json({ error: "Unauthorized to access this message" }, { status: 403 });
    }
    
    // Validate input data
    const result = messageUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input data", details: result.error.format() },
        { status: 400 }
      );
    }
    
    const validatedData = result.data;
    
    // Update the message
    const updatedMessage = await prisma.message.update({
      where: { id },
      data: validatedData,
    });
    
    return NextResponse.json(updatedMessage);
  } catch (error) {
    console.error("Error updating message:", error);
    return NextResponse.json({ 
      error: "Failed to update message",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// DELETE /api/studio/messages/[id] - Delete a message
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { id } = params;
    
    if (!await canAccessMessage(session.user.id, id)) {
      return NextResponse.json({ error: "Unauthorized to access this message" }, { status: 403 });
    }
    
    // Delete the message
    await prisma.message.delete({
      where: { id },
    });
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting message:", error);
    return NextResponse.json({ 
      error: "Failed to delete message",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}