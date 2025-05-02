import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    console.log("Debug endpoint - fetching user data for:", session.user.id);
    
    // First get basic user information (without complex relations)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        Tenant: true,
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Remove password for security
    const { password, ...userData } = user;
    
    // Separately fetch profile information to avoid relation issues
    let profileData = null;
    try {
      const profile = await prisma.profile.findUnique({
        where: { userId: session.user.id },
      });
      
      if (profile) {
        // Get relations in separate queries to avoid schema issues
        const [locations, skills] = await Promise.all([
          prisma.location.findMany({
            where: {
              Profile: {
                some: {
                  id: profile.id
                }
              }
            }
          }),
          prisma.skill.findMany({
            where: {
              Profile: {
                some: {
                  id: profile.id
                }
              }
            }
          })
        ]);
        
        // Safely try to get the profile images separately
        let images: any[] = [];
        try {
          images = await prisma.profileImage.findMany({
            where: { profileId: profile.id }
          });
        } catch (imgErr) {
          console.error("Error fetching profile images:", imgErr);
        }
        
        profileData = {
          ...profile,
          locations,
          skills,
          images
        };
      }
    } catch (profileErr) {
      console.error("Error fetching profile details:", profileErr);
      profileData = { error: "Failed to fetch profile details" };
    }
    
    // Return detailed user info for debugging
    return NextResponse.json({
      message: "Debug user information",
      user: {
        ...userData,
        profile: profileData
      },
      session: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        tenantType: (session.user as any).tenantType
      }
    });
  } catch (error) {
    console.error("Error fetching debug user info:", error);
    return NextResponse.json({ 
      error: "Failed to fetch debug user info",
      errorDetails: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}