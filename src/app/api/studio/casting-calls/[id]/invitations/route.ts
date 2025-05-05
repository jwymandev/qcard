import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';
import crypto from 'crypto';

const prisma = new PrismaClient();

// GET /api/studio/casting-calls/[id]/invitations - Get all invitations for a casting call
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Find the user and their tenant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user?.Tenant || user.Tenant.type !== "STUDIO") {
      return NextResponse.json({ error: "Only studio accounts can access invitations" }, { status: 403 });
    }
    
    // Find the studio associated with this tenant
    const studio = await prisma.studio.findFirst({
      where: { tenantId: user.Tenant.id },
    });
    
    if (!studio) {
      return NextResponse.json({ error: "Studio not found" }, { status: 404 });
    }
    
    const castingCallId = params.id;
    
    // Check if the casting call belongs to this studio
    const castingCall = await prisma.castingCall.findUnique({
      where: { 
        id: castingCallId,
        studioId: studio.id
      },
    });
    
    if (!castingCall) {
      return NextResponse.json({ error: "Casting call not found or unauthorized" }, { status: 403 });
    }
    
    // For casting calls, invitations are tracked through messages
    const invitations = await prisma.message.findMany({
      where: {
        relatedToCastingCallId: castingCallId,
        studioSenderId: studio.id,
      },
      include: {
        Profile_Message_talentReceiverIdToProfile: {
          include: {
            User: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Also get information about profiles that have applied to track response
    const applications = await prisma.application.findMany({
      where: {
        castingCallId: castingCallId,
        Profile: {
          id: {
            in: invitations.map(inv => inv.talentReceiverId).filter(Boolean) as string[]
          }
        }
      },
      select: {
        profileId: true,
        status: true,
        createdAt: true,
      }
    });
    
    // Combine invitation data with application status
    const invitationsWithStatus = invitations.map(invitation => {
      const application = applications.find(
        app => app.profileId === invitation.talentReceiverId
      );
      
      return {
        ...invitation,
        hasResponded: !!application,
        responseStatus: application?.status || null,
        responseDate: application?.createdAt || null,
      };
    });
    
    return NextResponse.json(invitationsWithStatus);
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json({ 
      error: "Failed to fetch invitations",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// POST /api/studio/casting-calls/[id]/invitations - Send invitations for a casting call
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Find the user and their tenant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user?.Tenant || user.Tenant.type !== "STUDIO") {
      return NextResponse.json({ error: "Only studio accounts can send invitations" }, { status: 403 });
    }
    
    // Find the studio associated with this tenant
    const studio = await prisma.studio.findFirst({
      where: { tenantId: user.Tenant.id },
    });
    
    if (!studio) {
      return NextResponse.json({ error: "Studio not found" }, { status: 404 });
    }
    
    const castingCallId = params.id;
    
    // Check if the casting call belongs to this studio
    const castingCall = await prisma.castingCall.findUnique({
      where: { 
        id: castingCallId,
        studioId: studio.id
      },
    });
    
    if (!castingCall) {
      return NextResponse.json({ error: "Casting call not found or unauthorized" }, { status: 403 });
    }
    
    // Parse the request body
    const body = await request.json();
    const { talentIds, message } = body;
    
    if (!Array.isArray(talentIds) || talentIds.length === 0) {
      return NextResponse.json({ error: "talentIds must be a non-empty array" }, { status: 400 });
    }
    
    // Create a personalized invite message for each talent
    const inviteMessage = message || `You've been invited to apply for a casting call: ${castingCall.title}. Please visit your opportunities page to learn more and apply.`;
    
    // Create a message for each talent
    const messageTransactions = talentIds.map(talentId => 
      prisma.message.create({
        data: {
          id: crypto.randomUUID(),
          subject: `Invitation to apply for casting call: ${castingCall.title}`,
          content: inviteMessage,
          studioSenderId: studio.id,
          talentReceiverId: talentId,
          relatedToCastingCallId: castingCallId,
          isRead: false,
        }
      })
    );
    
    const results = await prisma.$transaction(messageTransactions);
    
    return NextResponse.json({
      success: true,
      invitationsSent: results.length,
      message: `Successfully sent ${results.length} invitations for casting call: ${castingCall.title}`
    }, { status: 201 });
  } catch (error) {
    console.error("Error sending invitations:", error);
    return NextResponse.json({ 
      error: "Failed to send invitations",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}