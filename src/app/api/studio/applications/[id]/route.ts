import { prisma } from '@/lib/db';
import { authPrisma } from '@/lib/secure-db-connection';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import crypto from 'crypto';

// Validation schema for updating an application
const updateApplicationSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  message: z.string().optional(),
  addToProject: z.boolean().optional(),
  projectRole: z.string().optional(),
});

// Helper function to check if a studio has access to an application
async function canAccessApplication(userId: string, applicationId: string) {
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
  
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { CastingCall: true },
  });
  
  return application && application.CastingCall.studioId === studio.id;
}

// GET /api/studio/applications/[id] - Get a specific application
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const id = params.id;
    
    if (!await canAccessApplication(session.user.id, id)) {
      return NextResponse.json({ error: "Unauthorized to access this application" }, { status: 403 });
    }
    
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        Profile: {
          include: {
            User: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              }
            },
            Skill: true,
            Location: true,
          }
        },
        CastingCall: {
          include: {
            Project: true,
          }
        }
      },
    });
    
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    
    return NextResponse.json(application);
  } catch (error) {
    console.error("Error fetching application:", error);
    return NextResponse.json({ 
      error: "Failed to fetch application",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// PATCH /api/studio/applications/[id] - Update an application
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const id = params.id;
    const body = await request.json();
    
    if (!await canAccessApplication(session.user.id, id)) {
      return NextResponse.json({ error: "Unauthorized to modify this application" }, { status: 403 });
    }
    
    // Validate input data
    const result = updateApplicationSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input data", details: result.error.format() },
        { status: 400 }
      );
    }
    
    const validatedData = result.data;
    
    // Start a transaction to handle both application update and possibly adding to project
    const updatedApplication = await prisma.$transaction(async (tx) => {
      // Update the application status
      const application = await tx.application.update({
        where: { id },
        data: {
          status: validatedData.status,
          message: validatedData.message,
        },
        include: {
          Profile: true,
          CastingCall: {
            include: {
              Project: true,
            }
          }
        },
      });
      
      // If approved and we should add to project
      if (
        validatedData.status === "APPROVED" && 
        validatedData.addToProject === true && 
        application.CastingCall.projectId
      ) {
        // Check if already a project member
        const existingMember = await tx.projectMember.findFirst({
          where: {
            projectId: application.CastingCall.projectId,
            profileId: application.profileId,
          },
        });
        
        // If not already a member, add them to the project
        if (!existingMember) {
          await tx.projectMember.create({
            data: {
              id: crypto.randomUUID(),
              projectId: application.CastingCall.projectId,
              profileId: application.profileId,
              role: validatedData.projectRole || `Talent for ${application.CastingCall.title}`,
              updatedAt: new Date()
            },
          });
        }
      }
      
      return application;
    });
    
    return NextResponse.json(updatedApplication);
  } catch (error) {
    console.error("Error updating application:", error);
    return NextResponse.json({ 
      error: "Failed to update application",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}