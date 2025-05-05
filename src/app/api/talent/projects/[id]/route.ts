import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the talent profile ID from the database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Profile: true },
    });
    
    if (!user || !user.Profile) {
      return NextResponse.json({ error: 'Talent profile not found' }, { status: 404 });
    }
    
    const profileId = user.Profile.id;
    
    const projectId = params.id;
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    // Check if the talent is a member of the project or has an invitation
    const memberCheck = await prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        profileId: profileId,
      },
    });
    
    const invitationCheck = await prisma.projectInvitation.findFirst({
      where: {
        projectId: projectId,
        profileId: profileId,
      },
    });
    
    // If the talent is neither a member nor invited, deny access
    if (!memberCheck && !invitationCheck) {
      return NextResponse.json({ error: 'Access denied to this project' }, { status: 403 });
    }
    
    // Get the project details
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        Studio: true,
        ProjectMember: {
          include: {
            Profile: true,
          },
        },
        Scene: {
          include: {
            SceneTalent: {
              include: {
                Profile: true,
              },
            },
          },
        },
        ProjectInvitation: {
          where: {
            profileId: profileId,
          },
        },
      },
    });
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      project,
      memberStatus: memberCheck ? 'MEMBER' : 'INVITED',
      invitation: invitationCheck,
    });
  } catch (error) {
    console.error('Error fetching project details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project details' },
      { status: 500 }
    );
  }
}