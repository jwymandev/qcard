import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

// GET /api/messages/unread-count - Get count of unread messages for either talent or studio
export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Find the user and determine their type
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        Tenant: true,
        Profile: true
      },
    });
    
    if (!user?.Tenant) {
      return NextResponse.json({ error: "User tenant not found" }, { status: 404 });
    }
    
    let unreadCount = 0;
    
    if (user.Tenant.type === "TALENT" && user.Profile) {
      // Count unread messages for talent
      unreadCount = await prisma.message.count({
        where: {
          talentReceiverId: user.Profile.id,
          isRead: false,
          isArchived: false,
        },
      });
    } else if (user.Tenant.type === "STUDIO") {
      // Find the studio
      const studio = await prisma.studio.findFirst({
        where: { tenantId: user.Tenant.id },
      });
      
      if (studio) {
        // Count unread messages for studio
        unreadCount = await prisma.message.count({
          where: {
            studioReceiverId: studio.id,
            isRead: false,
            isArchived: false,
          },
        });
      }
    }
    
    return NextResponse.json({ unreadCount });
  } catch (error) {
    console.error("Error counting unread messages:", error);
    return NextResponse.json({ 
      error: "Failed to count unread messages",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}