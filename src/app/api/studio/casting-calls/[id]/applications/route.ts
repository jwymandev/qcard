import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// GET /api/studio/casting-calls/[id]/applications - Get all applications for a casting call
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const castingCallId = params.id;
    
    // Find the user and their tenant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user?.Tenant || user.Tenant.type !== "STUDIO") {
      return NextResponse.json({ error: "Only studio accounts can access applications" }, { status: 403 });
    }
    
    // Find the studio associated with this tenant
    const studio = await prisma.studio.findFirst({
      where: { tenantId: user.Tenant.id },
    });
    
    if (!studio) {
      return NextResponse.json({ error: "Studio not found" }, { status: 404 });
    }
    
    // Check if the casting call belongs to this studio
    const castingCall = await prisma.castingCall.findUnique({
      where: { id: castingCallId },
    });
    
    if (!castingCall || castingCall.studioId !== studio.id) {
      return NextResponse.json({ error: "Unauthorized to access these applications" }, { status: 403 });
    }
    
    // Get all applications for this casting call
    const applications = await prisma.application.findMany({
      where: { castingCallId },
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
          select: {
            title: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json(applications);
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json({ 
      error: "Failed to fetch applications",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}