import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

// This endpoint initializes a profile for a user if they don't have one yet
export async function POST() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // Check if user has a profile
    const existingProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });
    
    if (existingProfile) {
      return NextResponse.json({ 
        message: "Profile already exists",
        profile: existingProfile
      });
    }
    
    // Create a new profile for the user
    const newProfile = await prisma.profile.create({
      data: {
        userId: session.user.id,
        availability: true, // Default to available
      },
      include: {
        locations: true,
        skills: true,
        images: true,
      },
    });
    
    return NextResponse.json({
      message: "Profile created successfully",
      profile: newProfile
    });
    
  } catch (error) {
    console.error("Error initializing profile:", error);
    return NextResponse.json({ error: "Failed to initialize profile" }, { status: 500 });
  }
}