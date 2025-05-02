import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import crypto from 'crypto';

// Validation schema for creating a project
const projectSchema = z.object({
  title: z.string(),
  description: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.string().optional().default("PLANNING"),
});

// GET /api/studio/projects - Get all projects for the authenticated studio
export async function GET(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // Get URL search parameters
    const { searchParams } = new URL(request.url);
    const showArchived = searchParams.get('archived') === 'true';
    
    // Find the user and their tenant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user?.Tenant || user.Tenant.type !== "STUDIO") {
      return NextResponse.json({ error: "Only studio accounts can access this endpoint" }, { status: 403 });
    }
    
    // Find the studio associated with this tenant
    const studio = await prisma.studio.findFirst({
      where: { tenantId: user.Tenant.id },
    });
    
    if (!studio) {
      return NextResponse.json({ error: "Studio not found" }, { status: 404 });
    }
    
    // Build where clause for projects
    const whereClause: any = { 
      studioId: studio.id,
    };
    
    // Note: isArchived filter temporarily disabled until Prisma client is updated
    
    // Get projects for this studio
    const projects = await prisma.project.findMany({
      where: whereClause,
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
                }
              }
            }
          }
        },
        CastingCall: {
          select: {
            id: true,
            title: true,
            status: true,
            _count: {
              select: {
                Application: true,
              }
            }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Map capitalized fields to lowercase for frontend compatibility
    const mappedProjects = projects.map(project => ({
      ...project,
      members: project.ProjectMember?.map(member => ({
        ...member,
        profile: {
          ...member.Profile,
          user: member.Profile?.User
        }
      })),
      castingCalls: project.CastingCall?.map(call => ({
        ...call,
        // Map the count correctly
        _count: {
          applications: call._count.Application
        }
      }))
    }));
    
    return NextResponse.json(mappedProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

// POST /api/studio/projects - Create a new project
export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    
    // Validate input data
    const result = projectSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input data", details: result.error.format() },
        { status: 400 }
      );
    }
    
    const validatedData = result.data;
    
    // Find the user and their tenant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user?.Tenant || user.Tenant.type !== "STUDIO") {
      return NextResponse.json({ error: "Only studio accounts can create projects" }, { status: 403 });
    }
    
    // Find the studio associated with this tenant
    const studio = await prisma.studio.findFirst({
      where: { tenantId: user.Tenant.id },
    });
    
    if (!studio) {
      return NextResponse.json({ error: "Studio not found" }, { status: 404 });
    }
    
    // Prepare the data object
    const projectData = {
      title: validatedData.title,
      studioId: studio.id,
    };
    
    // Only add optional fields if they're not undefined or null
    if (validatedData.description !== undefined && validatedData.description !== null) {
      projectData.description = validatedData.description;
    }
    
    if (validatedData.status !== undefined && validatedData.status !== null) {
      projectData.status = validatedData.status;
    }
    
    // Handle dates - convert strings to Date objects if present
    if (validatedData.startDate) {
      try {
        projectData.startDate = new Date(validatedData.startDate);
      } catch (e) {
        console.error("Invalid start date:", validatedData.startDate, e);
      }
    }
    
    if (validatedData.endDate) {
      try {
        projectData.endDate = new Date(validatedData.endDate);
      } catch (e) {
        console.error("Invalid end date:", validatedData.endDate, e);
      }
    }
    
    // Generate a unique ID for the project
    const projectId = crypto.randomUUID();
    
    console.log("Creating project with data:", {
      ...projectData,
      id: projectId
    });
    
    // Create the project with ID and other data
    const project = await prisma.project.create({
      data: {
        id: projectId,
        ...projectData,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}