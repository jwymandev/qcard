import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

// GET /api/talent/project-invitations - Get all project invitations for the current talent
export async function GET(request: Request) {
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
      return NextResponse.json({ error: "Only talent accounts can access their invitations" }, { status: 403 });
    }
    
    const profileId = user.Profile.id;
    
    // Parse query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    
    // Define query conditions
    const whereConditions = {
      profileId,
      ...(status ? { status } : {}),
    };
    
    // Get all project invitations for this talent
    const invitations = await prisma.projectInvitation.findMany({
      where: whereConditions,
      include: {
        project: {
          select: {
            id: true,
            title: true,
            description: true,
            startDate: true,
            endDate: true,
            status: true,
            Studio: {
              select: {
                id: true,
                name: true,
                description: true,
              }
            }
          }
        }
      },
      orderBy: { sentAt: 'desc' },
    });
    
    return NextResponse.json(invitations);
  } catch (error) {
    console.error("Error fetching project invitations:", error);
    return NextResponse.json({ 
      error: "Failed to fetch project invitations",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}