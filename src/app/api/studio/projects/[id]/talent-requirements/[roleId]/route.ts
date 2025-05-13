import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// GET /api/studio/projects/[id]/talent-requirements/[roleId] - Get a specific talent requirement
export async function GET(
  request: Request,
  { params }: { params: { id: string, roleId: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { id: projectId, roleId } = params;
    
    // Find the user's role (can be studio or talent)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user?.Tenant) {
      return NextResponse.json({ error: "User not associated with a tenant" }, { status: 403 });
    }
    
    // If studio, check if the project belongs to this studio
    if (user.Tenant.type === "STUDIO") {
      const studio = await prisma.studio.findFirst({
        where: { tenantId: user.Tenant.id },
      });
      
      if (!studio) {
        return NextResponse.json({ error: "Studio not found" }, { status: 404 });
      }
      
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });
      
      if (!project || project.studioId !== studio.id) {
        return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 });
      }
    }
    
    // Get the specific talent requirement
    const talentRequirement = await prisma.talentRequirement.findUnique({
      where: { id: roleId },
    });
    
    if (!talentRequirement || talentRequirement.projectId !== projectId) {
      return NextResponse.json({ error: "Talent requirement not found" }, { status: 404 });
    }
    
    return NextResponse.json(talentRequirement);
  } catch (error) {
    console.error("Error fetching talent requirement:", error);
    return NextResponse.json({ 
      error: "Failed to fetch talent requirement",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// PATCH /api/studio/projects/[id]/talent-requirements/[roleId] - Update a talent requirement
export async function PATCH(
  request: Request,
  { params }: { params: { id: string, roleId: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { id: projectId, roleId } = params;
    const data = await request.json();
    
    // Find the user and their tenant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user?.Tenant || user.Tenant.type !== "STUDIO") {
      return NextResponse.json({ error: "Only studio accounts can manage talent requirements" }, { status: 403 });
    }
    
    // Find the studio associated with this tenant
    const studio = await prisma.studio.findFirst({
      where: { tenantId: user.Tenant.id },
    });
    
    if (!studio) {
      return NextResponse.json({ error: "Studio not found" }, { status: 404 });
    }
    
    // Check if the project belongs to this studio
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    
    if (!project || project.studioId !== studio.id) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 });
    }
    
    // Find the talent requirement
    const existingRequirement = await prisma.talentRequirement.findUnique({
      where: { id: roleId },
    });
    
    if (!existingRequirement || existingRequirement.projectId !== projectId) {
      return NextResponse.json({ error: "Talent requirement not found" }, { status: 404 });
    }
    
    // Update the talent requirement
    const updatedRequirement = await prisma.talentRequirement.update({
      where: { id: roleId },
      data: {
        title: data.title !== undefined ? data.title : undefined,
        description: data.description !== undefined ? data.description : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
        gender: data.gender !== undefined ? data.gender : undefined,
        minAge: data.minAge !== undefined ? data.minAge : undefined,
        maxAge: data.maxAge !== undefined ? data.maxAge : undefined,
        ethnicity: data.ethnicity !== undefined ? data.ethnicity : undefined,
        height: data.height !== undefined ? data.height : undefined,
        skills: data.skills !== undefined ? data.skills : undefined,
        otherRequirements: data.otherRequirements !== undefined ? data.otherRequirements : undefined,
        survey: data.survey !== undefined ? data.survey : undefined,
      },
    });
    
    return NextResponse.json(updatedRequirement);
  } catch (error) {
    console.error("Error updating talent requirement:", error);
    return NextResponse.json({ 
      error: "Failed to update talent requirement",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// DELETE /api/studio/projects/[id]/talent-requirements/[roleId] - Delete a talent requirement
export async function DELETE(
  request: Request,
  { params }: { params: { id: string, roleId: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { id: projectId, roleId } = params;
    
    // Find the user and their tenant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user?.Tenant || user.Tenant.type !== "STUDIO") {
      return NextResponse.json({ error: "Only studio accounts can manage talent requirements" }, { status: 403 });
    }
    
    // Find the studio associated with this tenant
    const studio = await prisma.studio.findFirst({
      where: { tenantId: user.Tenant.id },
    });
    
    if (!studio) {
      return NextResponse.json({ error: "Studio not found" }, { status: 404 });
    }
    
    // Check if the project belongs to this studio
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    
    if (!project || project.studioId !== studio.id) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 });
    }
    
    // Find the talent requirement
    const existingRequirement = await prisma.talentRequirement.findUnique({
      where: { id: roleId },
    });
    
    if (!existingRequirement || existingRequirement.projectId !== projectId) {
      return NextResponse.json({ error: "Talent requirement not found" }, { status: 404 });
    }
    
    // Delete the talent requirement
    await prisma.talentRequirement.delete({
      where: { id: roleId },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting talent requirement:", error);
    return NextResponse.json({ 
      error: "Failed to delete talent requirement",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}