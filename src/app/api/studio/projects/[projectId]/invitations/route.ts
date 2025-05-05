import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema for talent invitations
const invitationSchema = z.object({
  talentIds: z.array(z.string()).min(1, "At least one talent must be selected"),
  message: z.string().optional(),
});

// POST /api/studio/projects/[projectId]/invitations
export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Validate projectId
    const { projectId } = params;
    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }
    
    // Get request body
    const body = await request.json();
    
    // Validate request data
    const validationResult = invitationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: "Invalid request data",
        details: validationResult.error.format() 
      }, { status: 400 });
    }
    
    const { talentIds, message } = validationResult.data;
    
    // Find the user's tenant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true }
    });
    
    if (!user?.Tenant || user.Tenant.type !== "STUDIO") {
      return NextResponse.json({ error: "Only studio accounts can send talent invitations" }, { status: 403 });
    }
    
    // Find the studio
    const studio = await prisma.studio.findFirst({
      where: { tenantId: user.Tenant.id }
    });
    
    if (!studio) {
      return NextResponse.json({ error: "Studio not found" }, { status: 404 });
    }
    
    // Verify the project belongs to this studio
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        studioId: studio.id
      }
    });
    
    if (!project) {
      return NextResponse.json({ error: "Project not found or you don't have permission to access it" }, { status: 404 });
    }
    
    // Find all the profiles for the talent IDs
    const talentProfiles = await prisma.profile.findMany({
      where: {
        id: { in: talentIds },
        Tenant: { type: "TALENT" }
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    if (talentProfiles.length === 0) {
      return NextResponse.json({ error: "No valid talent profiles found" }, { status: 400 });
    }
    
    // Create invitations for each talent
    const invitationPromises = talentProfiles.map(profile => 
      prisma.invitation.create({
        data: {
          message: message || null,
          status: "PENDING",
          Studio: { connect: { id: studio.id } },
          Project: { connect: { id: project.id } },
          Profile: { connect: { id: profile.id } },
          type: "PROJECT",
        }
      })
    );
    
    const createdInvitations = await Promise.all(invitationPromises);
    
    // TODO: Send email notifications to talents (not implemented in this version)
    
    return NextResponse.json({
      message: "Invitations sent successfully",
      count: createdInvitations.length,
      invitations: createdInvitations.map(invite => ({
        id: invite.id,
        status: invite.status,
        createdAt: invite.createdAt
      }))
    });
    
  } catch (error) {
    console.error("Error creating project invitations:", error);
    return NextResponse.json({ 
      error: "Failed to send invitations",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}