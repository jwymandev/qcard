import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';

// Validation schema for studio notes
const noteSchema = z.object({
  content: z.string().min(1, { message: "Note content is required" }),
});

// Helper function to check if a studio has access to modify a note
async function canAccessNote(userId: string, noteId: string) {
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
  
  const note = await prisma.studioNote.findFirst({
    where: {
      id: noteId,
      studioId: studio.id,
    },
  });
  
  return !!note;
}

// GET /api/studio/notes/[id] - Get all notes for a talent profile
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { tenant: true },
    });
    
    if (!user?.tenant || user.tenant.type !== "STUDIO") {
      return NextResponse.json({ error: "Only studio users can access notes" }, { status: 403 });
    }
    
    const studio = await prisma.studio.findFirst({
      where: { tenantId: user.tenant.id },
    });
    
    if (!studio) {
      return NextResponse.json({ error: "Studio profile not found" }, { status: 404 });
    }
    
    const { id: profileId } = params;
    
    const notes = await prisma.studioNote.findMany({
      where: {
        profileId,
        studioId: studio.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

// POST /api/studio/notes/[id] - Create a new note for a talent profile
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { tenant: true },
    });
    
    if (!user?.tenant || user.tenant.type !== "STUDIO") {
      return NextResponse.json({ error: "Only studio users can create notes" }, { status: 403 });
    }
    
    const studio = await prisma.studio.findFirst({
      where: { tenantId: user.tenant.id },
    });
    
    if (!studio) {
      return NextResponse.json({ error: "Studio profile not found" }, { status: 404 });
    }
    
    const { id: profileId } = params;
    const body = await request.json();
    
    // Validate input data
    const result = noteSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input data", details: result.error.format() },
        { status: 400 }
      );
    }
    
    const { content } = result.data;
    
    // Check if profile exists
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
    });
    
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    
    // Create the note
    const note = await prisma.studioNote.create({
      data: {
        content,
        studio: { connect: { id: studio.id } },
        profile: { connect: { id: profileId } },
      },
    });
    
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}

// For managing a specific note (delete)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { id } = params;
    
    // Check if the studio has access to this note
    if (!(await canAccessNote(session.user.id, id))) {
      return NextResponse.json({ error: "Unauthorized to access this note" }, { status: 403 });
    }
    
    // Delete the note
    await prisma.studioNote.delete({
      where: { id },
    });
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}