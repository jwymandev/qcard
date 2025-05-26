import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { authPrisma } from '@/lib/secure-db-connection';

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the talent profile ID from the database
    const user = await authPrisma.user.findUnique({
      where: { id: session.user.id },
      include: { Profile: true },
    });
    
    if (!user || !user.Profile) {
      return NextResponse.json({ error: 'Talent profile not found' }, { status: 404 });
    }
    
    const profileId = user.Profile.id;
    
    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    
    // Get projects where the talent is a member
    const memberProjects = await prisma.project.findMany({
      where: {
        ProjectMember: {
          some: {
            profileId: profileId,
          },
        },
        ...(statusFilter && { status: statusFilter }),
      },
      include: {
        Studio: true,
        ProjectMember: {
          where: {
            profileId: profileId,
          },
        },
        Scene: {
          include: {
            SceneTalent: {
              where: {
                profileId: profileId,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
    });
    
    // Get projects where the talent has invitations
    const invitedProjects = await prisma.project.findMany({
      where: {
        ProjectInvitation: {
          some: {
            profileId: profileId,
          },
        },
      },
      include: {
        Studio: true,
        ProjectInvitation: {
          where: {
            profileId: profileId,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    
    return NextResponse.json({
      memberProjects,
      invitedProjects,
    });
  } catch (error) {
    console.error('Error fetching talent projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}