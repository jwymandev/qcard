import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';

// Validation schema for updating a project
const projectUpdateSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }).optional(),
  description: z.string().optional().nullable(),
  startDate: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
  endDate: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
  status: z.string().optional(),
});

// Helper function to check if a studio has access to a project
async function canAccessProject(userId: string, projectId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { Tenant: true },
  });
  
  if (!user?.Tenant || user.Tenant.type !== "STUDIO") {
    return false;
  }
  
  const studio = await prisma.studio.findFirst({
    where: { tenantId: user.Tenant.id },
  });
  
  if (!studio) {
    return false;
  }
  
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      studioId: studio.id,
    },
  });
  
  return !!project;
}

// GET /api/studio/projects/[id] - Get a specific project by ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { id } = params;
    
    if (!await canAccessProject(session.user.id, id)) {
      return NextResponse.json({ error: "Unauthorized to access this project" }, { status: 403 });
    }
    
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        ProjectMember: {
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
              }
            }
          }
        },
        CastingCall: {
          include: {
            Application: {
              include: {
                Profile: {
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
              }
            }
          }
        },
        Studio: true,
      },
    });
    
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
    // Map fields for frontend compatibility
    return NextResponse.json({
      ...project,
      members: project.ProjectMember?.map(member => ({
        ...member,
        profile: {
          ...member.Profile,
          user: member.Profile?.User,
          skills: member.Profile?.Skill
        }
      })),
      castingCalls: project.CastingCall?.map(call => ({
        ...call,
        applications: call.Application?.map(app => ({
          ...app,
          profile: {
            ...app.Profile,
            user: app.Profile?.User
          }
        }))
      })),
      studio: project.Studio
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json({ 
      error: "Failed to fetch project",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// PATCH /api/studio/projects/[id] - Update a specific project
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { id } = params;
    const body = await request.json();
    
    if (!await canAccessProject(session.user.id, id)) {
      return NextResponse.json({ error: "Unauthorized to access this project" }, { status: 403 });
    }
    
    // Validate input data
    const result = projectUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input data", details: result.error.format() },
        { status: 400 }
      );
    }
    
    const validatedData = result.data;
    
    // Update the project
    const updatedProject = await prisma.project.update({
      where: { id },
      data: validatedData,
    });
    
    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json({ 
      error: "Failed to update project",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// DELETE /api/studio/projects/[id] - Delete a specific project
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { id } = params;
    
    if (!await canAccessProject(session.user.id, id)) {
      return NextResponse.json({ error: "Unauthorized to access this project" }, { status: 403 });
    }
    
    // Delete the project (this will cascade delete members if configured in schema)
    await prisma.project.delete({
      where: { id },
    });
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json({ 
      error: "Failed to delete project",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}