import { prisma } from '@/lib/db';
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tenant: true },
  });
  
  if (!user?.tenant || user.tenant.type !== "STUDIO") {
    return false;
  }
  
  const studio = await prisma.studio.findFirst({
    where: { tenantId: user.tenant.id },
  });
  
  if (!studio) {
    return false;
  }
  
  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      OR: [
        { senderId: studio.id, senderType: "STUDIO" },
        { recipientId: studio.id, recipientType: "STUDIO" },
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
            status: true,
          }
        },
        relatedToCastingCall: {
          select: {
            id: true,
            title: true,
            status: true,
          }
        },
      },
    });
    
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    
    // If this is an incoming message and it's not read, mark as read
    if (message.recipientType === "STUDIO" && !message.isRead) {
      await prisma.message.update({
        where: { id },
        data: { isRead: true },
      });
    }
    
    return NextResponse.json(message);
  } catch (error) {
    console.error("Error fetching message:", error);
    return NextResponse.json({ error: "Failed to fetch message" }, { status: 500 });
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
    return NextResponse.json({ error: "Failed to update message" }, { status: 500 });
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
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}