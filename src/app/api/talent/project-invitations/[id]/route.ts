import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import crypto from 'crypto';

// GET /api/talent/project-invitations/[id] - Get a specific project invitation
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const invitationId = params.id;
    
    // Get the invitation with related project details
    const invitation = await prisma.projectInvitation.findFirst({
      where: {
        id: invitationId,
        profileId: profileId
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            description: true,
            startDate: true,
            endDate: true,
            status: true,
            studioId: true,
            Studio: {
              select: {
                id: true,
                name: true,
                description: true,
              }
            }
          }
        }
      }
    });
    
    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }
    
    return NextResponse.json(invitation);
  } catch (error) {
    console.error("Error fetching project invitation:", error);
    return NextResponse.json({ 
      error: "Failed to fetch project invitation",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// PATCH /api/talent/project-invitations/[id] - Update invitation status (accept or decline)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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
      return NextResponse.json({ error: "Only talent accounts can respond to invitations" }, { status: 403 });
    }
    
    const profileId = user.Profile.id;
    const invitationId = params.id;
    
    // Get the request body
    const body = await request.json();
    const { status } = body;
    
    // Validate status
    if (!status || !['ACCEPTED', 'DECLINED'].includes(status)) {
      return NextResponse.json({ 
        error: "Invalid status. Must be 'ACCEPTED' or 'DECLINED'." 
      }, { status: 400 });
    }
    
    // Find the invitation
    const invitation = await prisma.projectInvitation.findFirst({
      where: {
        id: invitationId,
        profileId: profileId
      },
      include: {
        project: true
      }
    });
    
    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }
    
    // Check if the invitation is still pending
    if (invitation.status !== 'PENDING') {
      return NextResponse.json({ 
        error: "This invitation has already been responded to" 
      }, { status: 400 });
    }
    
    // Update the invitation status
    const updatedInvitation = await prisma.projectInvitation.update({
      where: { id: invitationId },
      data: {
        status,
        respondedAt: new Date()
      }
    });
    
    // If accepted, create a ProjectMember entry
    if (status === 'ACCEPTED') {
      await prisma.projectMember.create({
        data: {
          id: crypto.randomUUID(),
          projectId: invitation.projectId,
          profileId: profileId,
          role: invitation.role || 'Talent',
          notes: `Added via project invitation ${invitationId}`,
          updatedAt: new Date(),
        }
      });
    }
    
    // Send notification message back to studio
    await prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        subject: `Response to project invitation: ${invitation.project.title}`,
        content: status === 'ACCEPTED' 
          ? `I've accepted your invitation to join the project: ${invitation.project.title}.` 
          : `I've declined your invitation to join the project: ${invitation.project.title}.`,
        talentSenderId: profileId,
        studioReceiverId: invitation.project.studioId,
        relatedToProjectId: invitation.projectId,
        isRead: false
      }
    });
    
    return NextResponse.json({
      success: true,
      message: `Invitation ${status.toLowerCase()} successfully`,
      invitation: updatedInvitation
    });
  } catch (error) {
    console.error("Error updating project invitation:", error);
    return NextResponse.json({ 
      error: "Failed to update project invitation",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}