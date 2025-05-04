import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// This endpoint initializes a profile for a talent user if they don't have one yet
export async function POST() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // Log session info for debugging
    console.log("Initializing profile for user:", {
      userId: session.user.id,
      email: session.user.email
    });
    
    // Check if user has a profile
    console.log("Checking for existing profile...");
    // Check for existing profile (fetch without images to avoid schema issues)
    const existingProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      include: {
        Location: true,
        Skill: true,
      }
    });
    
    // If profile exists, get images separately to avoid schema issues
    let profileImages: any[] = [];
    if (existingProfile) {
      try {
        profileImages = await prisma.profileImage.findMany({
          where: { profileId: existingProfile.id }
        });
      } catch (imgError) {
        console.error("Error fetching profile images:", imgError);
      }
    }
    
    if (existingProfile) {
      console.log("Profile already exists for user", session.user.id);
      return NextResponse.json({ 
        message: "Profile already exists",
        profile: {
          ...existingProfile,
          images: profileImages
        }
      });
    }
    
    console.log("No existing profile found, creating new profile");
    
    // Check if user exists first
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true }
    });
    
    if (!userExists) {
      console.error("User not found:", session.user.id);
      return NextResponse.json({ 
        error: "User not found when creating profile" 
      }, { status: 404 });
    }
    
    // Create a new profile for the user with error handling
    try {
      // Create profile without trying to include images in the response
      const newProfile = await prisma.profile.create({
        data: {
          id: crypto.randomUUID(),
          userId: session.user.id,
          availability: true, // Default to available
          updatedAt: new Date(),
        },
        include: {
          Location: true,
          Skill: true,
        },
      });
      
      // Profile was created successfully
      console.log("Profile created successfully for user", session.user.id);
      return NextResponse.json({
        message: "Profile created successfully",
        profile: {
          ...newProfile,
          images: [] // New profile won't have images yet
        }
      });
    } catch (createError) {
      console.error("Database error creating profile:", createError);
      
      // Additional info for error diagnosis
      if (createError instanceof Error && 'code' in createError && createError.code === 'P2002') {
        return NextResponse.json({ 
          error: "Profile already exists but could not be found (unique constraint violation)",
          details: createError.message
        }, { status: 409 });
      }
      
      throw createError; // Re-throw to be caught by outer catch
    }
    
  } catch (error: unknown) {
    console.error("Error initializing profile:", error);
    let errorMessage = "Unknown error";
    let errorCode = "unknown";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      if ('code' in error) {
        errorCode = (error as any).code || 'unknown';
      }
    }
    
    return NextResponse.json({ 
      error: "Failed to initialize profile",
      message: errorMessage,
      code: errorCode
    }, { status: 500 });
  }
}