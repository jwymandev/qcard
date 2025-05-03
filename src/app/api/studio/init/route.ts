import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import crypto from 'crypto';

// POST /api/studio/init - Initialize a studio account for existing users
export async function POST() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // Check if the user exists and has the STUDIO tenant type
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    if (!user.Tenant || user.Tenant.type !== "STUDIO") {
      return NextResponse.json({ error: "Only studio accounts can be initialized" }, { status: 403 });
    }
    
    // Check if a studio already exists for this tenant
    const existingStudio = await prisma.studio.findFirst({
      where: { tenantId: user.Tenant.id },
    });
    
    if (existingStudio) {
      // Studio already exists, just return it
      return NextResponse.json({ 
        message: "Studio already initialized",
        studio: existingStudio
      });
    }
    
    // Create a new studio record for this tenant
    const studioName = user.Tenant.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'New Studio';
    
    const studio = await prisma.studio.create({
      data: {
        id: crypto.randomUUID(),
        name: studioName,
        tenantId: user.Tenant.id,
        description: `Studio for ${studioName}`,
        updatedAt: new Date()
      },
    });
    
    return NextResponse.json({ 
      message: "Studio initialized successfully",
      studio
    });
  } catch (error) {
    console.error("Error initializing studio:", error);
    return NextResponse.json({ 
      error: "Failed to initialize studio",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}