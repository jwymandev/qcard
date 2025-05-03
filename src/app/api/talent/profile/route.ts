import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Validation schema for updating a profile
// Adjusted to match the actual database schema
const profileUpdateSchema = z.object({
  bio: z.string().optional().nullable(),
  height: z.string().optional().nullable(),
  weight: z.string().optional().nullable(),
  hairColor: z.string().optional().nullable(),
  eyeColor: z.string().optional().nullable(),
  // Field 'gender' might be causing issues - we'll still accept it but handle it specially
  gender: z.string().optional().nullable(),
  ethnicity: z.string().optional().nullable(),
  // age field has been removed from the schema
  // age: z.number().int().min(0).max(120).optional().nullable(),
  // Languages is actually stored as a string in the database according to the schema
  languages: z.union([
    z.array(z.string()),
    z.string()
  ]).optional().nullable(),
  experience: z.string().optional().nullable(),
  availability: z.boolean().optional(),
  headshotUrl: z.string().optional().nullable(),
  // Relation fields
  skillIds: z.array(z.string()).optional(),
  locationIds: z.array(z.string()).optional(),
});

// GET /api/talent/profile - Get the authenticated user's profile
export async function GET() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    console.log("Fetching profile for user:", session.user.id);
    
    // Get user profile with related data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });
    
    if (!user) {
      console.error("User not found in database:", session.user.id);
      return NextResponse.json({ 
        error: "User not found", 
        sessionUserId: session.user.id 
      }, { status: 404 });
    }
    
    console.log("User found, checking for profile", {
      userId: user.id,
      email: user.email
    });
    
    // Get the profile directly from the database for debugging
    console.log("Fetching raw profile data");
    
    // Get profile with relations
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      include: {
        Skill: true,
        Location: true
      }
    });
    
    if (profile) {
      console.log("Found profile with relations:", {
        id: profile.id,
        fields: Object.keys(profile),
        skillCount: profile.Skill?.length || 0,
        locationCount: profile.Location?.length || 0
      });
    }
    
    // Get profile images separately
    let profileImages: any[] = [];
    
    if (profile) {
      // Fetch images
      try {
        console.log("Fetching profile images");
        profileImages = await prisma.profileImage.findMany({
          where: { profileId: profile.id },
          orderBy: { isPrimary: 'desc' } // Primary image first
        });
        console.log(`Found ${profileImages.length} images`);
      } catch (imgErr) {
        console.error("Error fetching profile images:", imgErr);
      }
    }
    
    // If profile doesn't exist, return a specific error so the UI can handle initialization
    if (!profile) {
      console.log("Profile not found for user", user.id, "- needs initialization");
      return NextResponse.json({ 
        error: "Profile not found, needs initialization",
        userId: user.id
      }, { status: 404 });
    }
    
    console.log("Profile found for user", user.id);
    
    // Construct a complete profile response with properly mapped relation fields
    const completeProfile = {
      ...profile,
      skills: profile.Skill || [],
      locations: profile.Location || [],
      images: profileImages
    };
    
    console.log("Returning complete profile with relations");
    return NextResponse.json(completeProfile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    
    // Enhanced error details
    return NextResponse.json({ 
      error: "Failed to fetch profile",
      message: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      userId: session.user.id
    }, { status: 500 });
  }
}

// PATCH /api/talent/profile - Update the authenticated user's profile
export async function PATCH(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    
    // Validate input data
    const result = profileUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input data", details: result.error.format() },
        { status: 400 }
      );
    }
    
    const validatedData = result.data;
    
    console.log("Updating profile for user:", session.user.id);
    
    // Get user profile
    let profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });
    
    if (!profile) {
      console.log("Profile not found for user", session.user.id, "- creating new profile during update");
      
      // Double-check that user exists first
      const userExists = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true }
      });
      
      if (!userExists) {
        console.error("Cannot create profile: user not found:", session.user.id);
        return NextResponse.json({ error: "User not found when creating profile" }, { status: 404 });
      }
      
      // Create profile if it doesn't exist
      try {
        profile = await prisma.profile.create({
          data: {
            id: crypto.randomUUID(),
            userId: session.user.id,
            availability: true, // Default to available
            updatedAt: new Date(),
          },
        });
        console.log("Created new profile during update for user", session.user.id);
      } catch (error) {
        const createError = error as any;
        console.error("Failed to create profile during update:", createError);
        
        // Handle unique constraint violations
        if (createError && createError.code === 'P2002') {
          return NextResponse.json({ 
            error: "Profile already exists but could not be found (unique constraint violation)",
            details: createError.message
          }, { status: 409 });
        }
        
        throw createError; // Re-throw to be caught by outer catch
      }
    }
    
    // Extract relation IDs
    const { skillIds, locationIds, ...allProfileData } = validatedData;
    
    // Include fields that we know exist in the database schema
    // This eliminates fields that might be in the schema file but not in the actual DB
    // Added back 'ethnicity' and 'gender' since they exist in the Profile schema
    const safeFields = [
      'bio', 'height', 'weight', 'hairColor', 'eyeColor', 
      'experience', 'availability', 'headshotUrl',
      'gender', 'ethnicity'
    ];
    
    // Filter out any fields that might cause problems
    const unsafeFields = Object.keys(allProfileData).filter(key => !safeFields.includes(key));
    if (unsafeFields.length > 0) {
      console.log("Removing unsafe fields from update:", unsafeFields);
    }
    
    const profileData = Object.fromEntries(
      Object.entries(allProfileData).filter(([key]) => safeFields.includes(key))
    );
    
    // Handle languages field separately as it might be causing issues
    let languages = null;
    if (allProfileData.languages && Array.isArray(allProfileData.languages)) {
      // Convert array to comma-separated string as per the schema
      languages = allProfileData.languages.join(',');
    }
    
    console.log("Updating profile with safe data:", {
      profileId: profile.id,
      userId: session.user.id,
      fields: Object.keys(profileData),
      hasSkills: !!skillIds,
      hasLocations: !!locationIds,
      languages: languages !== null ? 'present' : 'absent'
    });
    
    // Try a minimal update first with just one field to see if it works
    try {
      console.log("Attempting minimal update with just bio field");
      const minimalProfileData: any = { bio: profileData.bio || null };
      
      // Update profile without including any relations
      const updatedProfile = await prisma.profile.update({
        where: { id: profile.id },
        data: minimalProfileData
      });
      
      // If bio update works, try to update other fields one by one
      // Age field has been removed from the schema
      // if (profileData.age !== undefined) {
      //   try {
      //     console.log("Updating age field");
      //     await prisma.profile.update({
      //       where: { id: profile.id },
      //       data: { age: typeof profileData.age === 'number' ? profileData.age : null },
      //     });
      //   } catch (error) {
      //     console.error("Failed to update age field:", error);
      //   }
      // }
      
      // Availability field
      if (profileData.availability !== undefined) {
        try {
          console.log("Updating availability field");
          await prisma.profile.update({
            where: { id: profile.id },
            data: { availability: profileData.availability } as any,
          });
        } catch (error) {
          console.error("Failed to update availability field:", error);
        }
      }
      
      // height, weight, hairColor, eyeColor, gender, ethnicity fields
      for (const field of ['height', 'weight', 'hairColor', 'eyeColor', 'gender', 'ethnicity']) {
        if (profileData[field] !== undefined) {
          try {
            console.log(`Updating ${field} field`);
            await prisma.profile.update({
              where: { id: profile.id },
              data: { [field]: profileData[field] } as any,
            });
          } catch (error) {
            console.error(`Failed to update ${field} field:`, error);
          }
        }
      }
      
      // Experience field
      if (profileData.experience !== undefined) {
        try {
          console.log("Updating experience field");
          await prisma.profile.update({
            where: { id: profile.id },
            data: { experience: profileData.experience } as any,
          });
        } catch (error) {
          console.error("Failed to update experience field:", error);
        }
      }
      
      // Languages field
      if (languages !== null) {
        try {
          console.log("Updating languages field");
          await prisma.profile.update({
            where: { id: profile.id },
            data: { languages } as any,
          });
        } catch (error) {
          console.error("Failed to update languages field:", error);
        }
      }
      
      // Update relations separately
      if (skillIds) {
        try {
          console.log("Updating skills relation");
          await prisma.profile.update({
            where: { id: profile.id },
            data: {
              Skill: {
                set: skillIds.map(id => ({ id })),
              },
            } as any,
          });
        } catch (error) {
          console.error("Failed to update skills relation:", error);
        }
      }
      
      if (locationIds) {
        try {
          console.log("Updating locations relation");
          await prisma.profile.update({
            where: { id: profile.id },
            data: {
              Location: {
                set: locationIds.map(id => ({ id })),
              },
            } as any,
          });
        } catch (error) {
          console.error("Failed to update locations relation:", error);
        }
      }
      
      // After basic update works, fetch the full profile info
      const fullProfile = await prisma.profile.findUnique({
        where: { id: profile.id },
        include: {
          Location: true,
          Skill: true,
        },
      });
      
      // Fetch images separately
      let profileImages: any[] = [];
      try {
        if (fullProfile && fullProfile.id) {
          profileImages = await prisma.profileImage.findMany({
            where: { profileId: fullProfile.id },
            orderBy: { isPrimary: 'desc' } // Primary image first
          });
        }
      } catch (imgErr) {
        console.error("Error fetching profile images after update:", imgErr);
      }
      
      console.log("Profile updated successfully for user", session.user.id);
      
      // Check if profile exists after updates
      if (!fullProfile) {
        return NextResponse.json({ 
          error: "Could not find updated profile",
          userId: session.user.id
        }, { status: 404 });
      }
      
      // Map Prisma's relation fields for frontend compatibility
      return NextResponse.json({
        ...fullProfile,
        images: profileImages,
        skills: fullProfile.Skill || [],
        locations: fullProfile.Location || []
      });
    } catch (error) {
      const updateError = error as any;
      console.error("Error during profile update operation:", updateError);
      
      // Handle foreign key constraint failures (likely invalid skill or location IDs)
      if (updateError && updateError.code === 'P2003') {
        return NextResponse.json({ 
          error: "Invalid reference: one or more skills or locations do not exist",
          details: updateError.message
        }, { status: 400 });
      }
      
      throw updateError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ 
      error: "Failed to update profile",
      message: error instanceof Error ? error.message : String(error),
      code: error instanceof Error && 'code' in error ? error.code : 'unknown',
      userId: session.user.id
    }, { status: 500 });
  }
}