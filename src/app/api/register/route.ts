import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "@/lib/bcrypt-wrapper";
import { z } from "zod";
import crypto from "crypto";

// Validation schema for registration
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8).optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().optional(),
  userType: z.enum(["TALENT", "STUDIO"]),
  submissionId: z.string().optional(), // ID of the casting submission if coming from QR code
});

export async function POST(req: Request) {
  try {
    console.log("📝 REGISTRATION: API request received");
    const body = await req.json();
    console.log("📝 REGISTRATION: Request body parsed", { email: body.email, userType: body.userType });
    
    // Validate input data
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      console.log("📝 REGISTRATION ERROR: Invalid input data", result.error.flatten());
      return NextResponse.json(
        { error: "Invalid input data", details: result.error.flatten() },
        { status: 400 }
      );
    }
    
    const { email, password, confirmPassword, firstName, lastName, phoneNumber, userType, submissionId } = result.data;
    console.log(`📝 REGISTRATION: Validated data for ${email}, type: ${userType}`);
    
    // Verify passwords match if confirmPassword was provided
    if (confirmPassword && password !== confirmPassword) {
      console.log("📝 REGISTRATION ERROR: Passwords do not match");
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    console.log(`📝 REGISTRATION: Checking if user ${email} already exists`);
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      console.log(`📝 REGISTRATION ERROR: User ${email} already exists`);
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }
    
    console.log(`📝 REGISTRATION: User ${email} does not exist, proceeding with creation`);
    
    let hashedPassword;
    
    // Hash password
    try {
      console.log(`Hashing password for new user: ${email}`);
      hashedPassword = await bcrypt.hash(password, 10);
      
      // Verify the hash works properly
      const verifyHash = await bcrypt.compare(password, hashedPassword);
      if (!verifyHash) {
        console.error('Password hash verification failed - bcrypt may not be working correctly');
        return NextResponse.json(
          { error: "Server error during account creation. Please try again." },
          { status: 500 }
        );
      }
      
      console.log('Password hashed successfully');
    } catch (hashError) {
      console.error('Error hashing password:', hashError);
      return NextResponse.json(
        { error: "Server error during account creation. Please try again." },
        { status: 500 }
      );
    }
    
    // Create tenant first
    console.log(`📝 REGISTRATION: Creating tenant for ${firstName} ${lastName}, type: ${userType}`);
    let tenant;
    let user;
    
    try {
      tenant = await prisma.tenant.create({
        data: {
          id: crypto.randomUUID(),
          name: `${firstName} ${lastName}`,
          type: userType,
          updatedAt: new Date()
        },
      });
      console.log(`📝 REGISTRATION: Tenant created successfully with ID: ${tenant.id}`);
    
      // Create user with reference to tenant
      console.log(`📝 REGISTRATION: Creating user with email: ${email}`);
      user = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phoneNumber,
          tenantId: tenant.id,
          updatedAt: new Date()
        },
      });
      console.log(`📝 REGISTRATION: User created successfully with ID: ${user.id}`);
    } catch (dbError) {
      console.error(`📝 REGISTRATION ERROR: Database error creating user/tenant:`, dbError);
      throw dbError; // Re-throw to be caught by outer try/catch
    }
    
    if (!tenant || !user) {
      throw new Error("Failed to create tenant or user records");
    }
    
    // If there's a submission ID, mark the casting submission as converted
    if (submissionId && userType === 'TALENT') {
      try {
        // Find the casting submission
        const submission = await prisma.castingSubmission.findUnique({
          where: { id: submissionId },
          include: { 
            externalActor: true,
            castingCode: {
              include: {
                studio: true,
                project: true
              }
            }
          }
        });
        
        if (submission) {
          // Get the created profile for the new user
          const profile = await prisma.profile.findUnique({
            where: { userId: user.id }
          });
          
          if (!profile) {
            throw new Error('Profile not found for new user');
          }
          
          // Update the submission status
          await prisma.castingSubmission.update({
            where: { id: submissionId },
            data: {
              status: 'CONVERTED',
              convertedUserId: user.id,
              convertedToProfileId: profile.id,
              updatedAt: new Date()
            }
          });
          
          // If there's an external actor record, mark it as converted too
          if (submission.externalActor) {
            await prisma.externalActor.update({
              where: { id: submission.externalActor.id },
              data: {
                status: 'CONVERTED',
                convertedToUserId: user.id,
                convertedProfileId: profile.id,
                convertedToTalentAt: new Date(),
                updatedAt: new Date()
              }
            });
            
            // If the submission has a project, add the user to the project
            if (submission.castingCode?.projectId) {
              try {
                // Check if the user is already in this project
                const existingProjectMember = await prisma.projectMember.findFirst({
                  where: {
                    projectId: submission.castingCode.projectId,
                    profileId: profile.id
                  }
                });
                
                if (!existingProjectMember) {
                  // Add the new user to the project as a member
                  await prisma.projectMember.create({
                    data: {
                      id: crypto.randomUUID(),
                      projectId: submission.castingCode.projectId,
                      profileId: profile.id,
                      role: 'Talent',
                      updatedAt: new Date()
                    }
                  });
                }
              } catch (projectError) {
                console.error('Error adding user to project:', projectError);
                // Continue with registration even if project association fails
              }
            }
          }
        }
      } catch (submissionError) {
        console.error('Error updating casting submission:', submissionError);
        // Continue with registration even if this fails
      }
    }
    
    // Create profile based on user type
    try {
      if (userType === "TALENT" && user) {
        console.log(`📝 REGISTRATION: Creating talent profile for user ${user.id}`);
        const profile = await prisma.profile.create({
          data: {
            id: crypto.randomUUID(),
            userId: user.id,
            availability: true, // Default to available
            updatedAt: new Date()
          },
        });
        console.log(`📝 REGISTRATION: Talent profile created with ID: ${profile.id}`);
      } else if (userType === "STUDIO" && tenant) {
        // Create a studio record automatically
        const studioName = `${firstName} ${lastName}`.trim() || 'New Studio';
        console.log(`📝 REGISTRATION: Creating studio record for tenant ${tenant.id}`);
        const studio = await prisma.studio.create({
          data: {
            id: crypto.randomUUID(),
            name: studioName,
            tenantId: tenant.id,
            description: `Studio for ${studioName}`,
            updatedAt: new Date()
          },
        });
        console.log(`📝 REGISTRATION: Studio created with ID: ${studio.id}`);
      }
    } catch (profileError) {
      console.error(`📝 REGISTRATION ERROR: Database error creating profile/studio:`, profileError);
      // Continue with registration even if profile/studio creation fails
      // We'll return the user data but log the error
    }
    
    // Return user data (exclude password)
    if (!user) {
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 }
      );
    }
    
    console.log(`📝 REGISTRATION: Successfully completed registration for ${email}`);
    
    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId,
      tenantType: userType,
    });
  } catch (error) {
    console.error("📝 REGISTRATION ERROR: Unhandled error during registration:", error);
    
    // Add more detailed error information for debugging
    let errorDetails = error instanceof Error ? error.message : String(error);
    let errorStack = error instanceof Error ? error.stack : 'No stack trace';
    
    console.error("📝 REGISTRATION ERROR DETAILS:", errorDetails);
    console.error("📝 REGISTRATION ERROR STACK:", errorStack);
    
    // Check for specific Prisma errors
    if (errorDetails.includes('Prisma')) {
      console.error("📝 REGISTRATION ERROR: Database error detected");
      // Log more details about potential database connection issues
      try {
        // Simple query to test database connection
        await prisma.$queryRaw`SELECT 1 as test`;
        console.log("📝 REGISTRATION: Database connection test successful");
      } catch (dbError) {
        console.error("📝 REGISTRATION ERROR: Database connection test failed:", dbError);
      }
    }
    
    return NextResponse.json(
      { 
        error: "An error occurred during registration",
        details: errorDetails
      },
      { status: 500 }
    );
  }
}