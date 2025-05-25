import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { authPrisma } from '@/lib/secure-db-connection';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// This endpoint initializes a profile for a talent user if they don't have one yet
export async function POST() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // Enhanced session logging for debugging
    console.log("Initializing profile for user:", {
      userId: session.user.id,
      email: session.user.email,
      sessionData: JSON.stringify(session)
    });
    
    // Additional debugging to understand the session issue
    console.log("SESSION DEBUG - Looking up session user in both database clients");
    
    // Try to find the user in both prisma clients to identify discrepancies
    const regularUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true }
    });
    
    const authUser = await authPrisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true }
    });
    
    console.log("SESSION DEBUG - Regular prisma result:", regularUser);
    console.log("SESSION DEBUG - Auth prisma result:", authUser);
    
    // If user is not found in either database, try to find by email
    if (!regularUser && !authUser && session.user.email) {
      console.log("SESSION DEBUG - User not found by ID, trying email lookup");
      
      const userByEmail = await authPrisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, email: true }
      });
      
      console.log("SESSION DEBUG - User found by email:", userByEmail);
      
      // If we found a user by email but the ID doesn't match the session
      if (userByEmail && userByEmail.id !== session.user.id) {
        console.log("SESSION DEBUG - CRITICAL: Session ID mismatch detected!");
        console.log(`Session has ID ${session.user.id} but database has ID ${userByEmail.id} for email ${session.user.email}`);
      }
    }
    
    // Check if user has a profile - use authPrisma for reliability
    console.log("Checking for existing profile...");
    
    // First check: Try to find user by ID to handle potential session mismatch
    let userToCheck = await authPrisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true }
    });
    
    // If user not found by ID but we have email, try to find by email
    if (!userToCheck && session.user.email) {
      console.log("SESSION MISMATCH CHECK - User not found by ID, trying email lookup");
      
      const userByEmail = await authPrisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, email: true }
      });
      
      if (userByEmail) {
        console.log("SESSION MISMATCH RESOLVED - Found user by email:", userByEmail);
        userToCheck = userByEmail;
        
        // Update session ID to match actual user ID
        console.log(`Updating session ID from ${session.user.id} to ${userByEmail.id}`);
        session.user.id = userByEmail.id;
      }
    }
    
    // If we still couldn't find the user, proceed with original ID (will likely fail later)
    const userIdToUse = userToCheck?.id || session.user.id;
    
    // Check for existing profile (fetch without images to avoid schema issues)
    console.log(`Looking for profile with userId: ${userIdToUse}`);
    const existingProfile = await authPrisma.profile.findUnique({
      where: { userId: userIdToUse },
      include: {
        Location: true,
        Skill: true,
      }
    });
    
    // If profile exists, get images separately to avoid schema issues
    let profileImages: any[] = [];
    if (existingProfile) {
      try {
        profileImages = await authPrisma.profileImage.findMany({
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
    
    // Check if user exists first - use authPrisma for reliability
    console.log("Checking if user exists with ID:", session.user.id);
    let userExists = await authPrisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true }
    });
    
    // If user not found by ID but we have an email, try to find by email
    if (!userExists && session.user.email) {
      console.log("User not found by ID, trying by email:", session.user.email);
      
      const userByEmail = await authPrisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, email: true }
      });
      
      if (userByEmail) {
        console.log("Found user by email instead of ID:", userByEmail);
        userExists = userByEmail;
        
        // CRITICAL: We found the user but with a different ID than in the session
        console.log("SESSION MISMATCH DETECTED - Session has wrong user ID");
        console.log(`Session ID: ${session.user.id}, Actual user ID: ${userByEmail.id}`);
        
        // Use the correct ID for profile creation
        // This is a temporary workaround for the session mismatch issue
        console.log("Using correct user ID from email lookup for profile creation");
        session.user.id = userByEmail.id;
      }
    }
    
    if (!userExists) {
      console.error("User not found by ID or email:", session.user.id, session.user.email);
      return NextResponse.json({ 
        error: "User not found when creating profile" 
      }, { status: 404 });
    }
    
    // Create a new profile for the user with error handling
    try {
      // Create profile without trying to include images in the response - use authPrisma for reliability
      console.log("Creating new profile with authPrisma for user ID:", session.user.id);
      const newProfile = await authPrisma.profile.create({
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