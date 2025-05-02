import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';

// Validation schema for updating a project member
const updateMemberSchema = z.object({
  role: z.string().optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

// Helper function to check if a studio has access to a project
async function canAccessProjectMember(userId: string, projectId: string, memberId: string) {
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
  
  const projectMember = await prisma.projectMember.findFirst({
    where: {
      id: memberId,
      project: {
        id: projectId,
        studioId: studio.id,
      },
    },
  });
  
  return !!projectMember;
}

// GET /api/studio/projects/[id]/members/[memberId] - Get a specific project member
export async function GET(
  request: Request,
  { params }: { params: { id: string; memberId: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { id: projectId, memberId } = params;
    
    if (!await canAccessProjectMember(session.user.id, projectId, memberId)) {
      return NextResponse.json({ error: "Unauthorized to access this project member" }, { status: 403 });
    }
    
    const member = await prisma.projectMember.findUnique({
      where: { id: memberId },
      include: {
        profile: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              }
            },
            skills: true,
          }
        },
        project: true,
      },
    });
    
    if (!member) {
      return NextResponse.json({ error: "Project member not found" }, { status: 404 });
    }
    
    return NextResponse.json(member);
  } catch (error) {
    console.error("Error fetching project member:", error);
    return NextResponse.json({ error: "Failed to fetch project member" }, { status: 500 });
  }
}

// PATCH /api/studio/projects/[id]/members/[memberId] - Update a specific project member
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; memberId: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { id: projectId, memberId } = params;
    const body = await request.json();
    
    if (!await canAccessProjectMember(session.user.id, projectId, memberId)) {
      return NextResponse.json({ error: "Unauthorized to access this project member" }, { status: 403 });
    }
    
    // Validate input data
    const result = updateMemberSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input data", details: result.error.format() },
        { status: 400 }
      );
    }
    
    const validatedData = result.data;
    
    // Update the project member
    const updatedMember = await prisma.projectMember.update({
      where: { id: memberId },
      data: validatedData,
      include: {
        profile: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              }
            },
          }
        },
      },
    });
    
    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error("Error updating project member:", error);
    return NextResponse.json({ error: "Failed to update project member" }, { status: 500 });
  }
}

// DELETE /api/studio/projects/[id]/members/[memberId] - Remove a member from a project
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; memberId: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { id: projectId, memberId } = params;
    
    if (!await canAccessProjectMember(session.user.id, projectId, memberId)) {
      return NextResponse.json({ error: "Unauthorized to access this project member" }, { status: 403 });
    }
    
    // Delete the project member
    await prisma.projectMember.delete({
      where: { id: memberId },
    });
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error removing project member:", error);
    return NextResponse.json({ error: "Failed to remove project member" }, { status: 500 });
  }
}