import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

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