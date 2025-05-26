import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { authPrisma } from '@/lib/secure-db-connection';
import crypto from 'crypto';

/**
 * POST /api/studio/auto-init
 * Special endpoint to initialize studio for any STUDIO tenant type user
 * This endpoint is used by the init-studio-auto component and startup scripts
 */
export async function POST() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // Check if the user exists and has the STUDIO tenant type - use authPrisma for reliability
    console.log("Auto-init: Checking if user exists with ID:", session.user.id);
    const user = await authPrisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user) {
      console.error(`Auto-init: User not found for ID: ${session.user.id}`);
      console.error("This indicates stale session data - user should sign out and sign back in");
      return NextResponse.json({ 
        error: "User not found", 
        details: "Session contains invalid user ID - please sign out and sign back in",
        sessionUserId: session.user.id
      }, { status: 404 });
    }
    
    // If tenant doesn't exist or isn't STUDIO type, we can't create a studio
    if (!user.Tenant) {
      console.error(`Auto-init: User ${user.id} has no tenant associated`);
      console.error("This indicates corrupted session data - user should sign out and sign back in");
      return NextResponse.json({ 
        error: "User has no tenant", 
        details: "Session contains user without tenant - please sign out and sign back in",
        userId: user.id
      }, { status: 400 });
    }
    
    if (user.Tenant.type !== "STUDIO") {
      return NextResponse.json({ 
        error: "Tenant is not a STUDIO type", 
        tenantType: user.Tenant.type 
      }, { status: 400 });
    }
    
    // Check if a studio already exists for this tenant to avoid duplicates - use authPrisma for reliability
    console.log("Auto-init: Checking if studio exists for tenant ID:", user.Tenant.id);
    const existingStudio = await authPrisma.studio.findFirst({
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
    let studioName = user.Tenant.name;
    
    // If tenant has no name, use user name or default
    if (!studioName) {
      studioName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      if (!studioName) studioName = 'New Studio';
    }
    
    console.log("Auto-init: Creating new studio with authPrisma for tenant ID:", user.Tenant.id);
    const studio = await authPrisma.studio.create({
      data: {
        id: crypto.randomUUID(),
        name: studioName,
        tenantId: user.Tenant.id,
        description: `Studio for ${studioName}`,
        updatedAt: new Date(),
        // Don't include createdAt, let it use the default value
      },
    });
    
    // Log successful initialization
    console.log(`Studio "${studio.name}" initialized for tenant ${user.Tenant.id} (${user.Tenant.name})`);
    
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