import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * API route that checks if the current user has a studio initialized
 * Used by middleware and components to determine if studio initialization is needed
 */
export async function GET() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
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
    
    // Return basic studio info
    return NextResponse.json({ 
      status: "ok",
      studio: {
        id: studio.id,
        name: studio.name
      }
    });
  } catch (error) {
    console.error("Error checking studio access:", error);
    return NextResponse.json({ 
      error: "Failed to check studio access",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}