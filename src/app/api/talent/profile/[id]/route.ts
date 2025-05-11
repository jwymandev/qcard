import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// GET /api/talent/profile/[id] - Get a specific talent profile by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { id } = params;
    
    // Get the current user data including tenant information
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true, Profile: true },
    });
    
    if (!user) {
      return NextResponse.json({ error: "User data not found" }, { status: 404 });
    }
    
    let isAuthorized = false;
    
    // If it's an admin or super admin, they can access all profiles
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      isAuthorized = true;
    }
    // If talent user, they can only see their own profile
    else if (user.Tenant?.type === 'TALENT' && user.Profile) {
      isAuthorized = user.Profile.id === id;
    }
    // If studio user, check if this talent was converted from their external actor
    else if (user.Tenant?.type === 'STUDIO') {
      // Find the studio for this user
      const studio = await prisma.studio.findFirst({
        where: { tenantId: user.tenantId || '' },
      });
      
      if (studio) {
        // Check if this profile was converted from this studio's external actor
        const externalActor = await prisma.externalActor.findFirst({
          where: {
            studioId: studio.id,
            convertedProfileId: id,
            status: 'CONVERTED',
          },
        });
        
        isAuthorized = !!externalActor;
      }
    }
    
    if (!isAuthorized) {
      return NextResponse.json({ 
        error: "You don't have permission to view this profile"
      }, { status: 403 });
    }
    
    // Get user profile with related data
    const profile = await prisma.profile.findUnique({
      where: { id },
      include: {
        User: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        Location: true,
        Skill: true,
        ProfileImage: {
          orderBy: { isPrimary: 'desc' }, // Primary image first
        },
      },
    });
    
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching talent profile:", error);
    return NextResponse.json({ error: "Failed to fetch talent profile" }, { status: 500 });
  }
}