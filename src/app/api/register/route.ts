import { prisma } from "@/lib/db";
import { authPrisma } from "@/lib/secure-db-connection"; // Import the secure client
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
    
    // Check if user already exists - use the secure auth client
    console.log(`📝 REGISTRATION: Checking if user ${email} already exists`);
    const existingUser = await authPrisma.user.findUnique({
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
    
    // Create tenant and user (with transaction if available, or sequentially if not)
    console.log(`📝 REGISTRATION: Creating tenant and user for ${firstName} ${lastName}, type: ${userType}`);
    let tenant;
    let user;
    
    try {
      // Generate IDs and timestamp once to ensure consistency
      const tenantId = crypto.randomUUID();
      const userId = crypto.randomUUID();
      const now = new Date();
      
      // Check if transaction is available on the auth Prisma instance
      if (typeof authPrisma.$transaction === 'function') {
        // Use transaction approach (preferred for data consistency)
        console.log(`📝 REGISTRATION: Using transaction-based approach`);
        
        const result = await authPrisma.$transaction(async (tx) => {
          // First, verify database connection is working
          await tx.$queryRaw`SELECT 1 as connected`;
          
          // 1. Create tenant first
          const newTenant = await tx.tenant.create({
            data: {
              id: tenantId,
              name: `${firstName} ${lastName}`,
              type: userType,
              createdAt: now,
              updatedAt: now
            },
          });
          
          console.log(`📝 REGISTRATION: Tenant created successfully with ID: ${newTenant.id}`);
          
          // 2. Create user with reference to tenant
          const newUser = await tx.user.create({
            data: {
              id: userId,
              email,
              password: hashedPassword,
              firstName,
              lastName,
              phoneNumber,
              tenantId: newTenant.id,
              role: 'USER', // All new users start as regular users
              createdAt: now,
              updatedAt: now
            },
          });
          
          console.log(`📝 REGISTRATION: User created successfully with ID: ${newUser.id}`);
          
          // 3. Create profile/studio based on user type in the same transaction
          if (userType === "TALENT") {
            console.log(`📝 REGISTRATION: Creating talent profile for user ${newUser.id}`);
            const profile = await tx.profile.create({
              data: {
                id: crypto.randomUUID(),
                userId: newUser.id,
                availability: true, // Default to available
                createdAt: now,
                updatedAt: now
              },
            });
            console.log(`📝 REGISTRATION: Talent profile created with ID: ${profile.id}`);
          } else if (userType === "STUDIO") {
            // Create a studio record automatically
            const studioName = `${firstName} ${lastName}`.trim() || 'New Studio';
            console.log(`📝 REGISTRATION: Creating studio record for tenant ${newTenant.id}`);
            const studio = await tx.studio.create({
              data: {
                id: crypto.randomUUID(),
                name: studioName,
                tenantId: newTenant.id,
                description: `Studio for ${studioName}`,
                createdAt: now,
                updatedAt: now
              },
            });
            console.log(`📝 REGISTRATION: Studio created with ID: ${studio.id}`);
          }
          
          return { tenant: newTenant, user: newUser };
        }, {
          maxWait: 10000, // 10s max wait time
          timeout: 20000, // 20s timeout
        });
        
        tenant = result.tenant;
        user = result.user;
      } else {
        // Fallback to sequential operations if transaction is not available
        // (This happens with the mock client during development)
        console.log(`📝 REGISTRATION: Transaction not available, using sequential operations`);
        
        // 1. Create tenant first
        tenant = await authPrisma.tenant.create({
          data: {
            id: tenantId,
            name: `${firstName} ${lastName}`,
            type: userType,
            createdAt: now,
            updatedAt: now
          },
        });
        
        console.log(`📝 REGISTRATION: Tenant created successfully with ID: ${tenant.id}`);
        
        // 2. Create user with reference to tenant
        user = await authPrisma.user.create({
          data: {
            id: userId,
            email,
            password: hashedPassword,
            firstName,
            lastName,
            phoneNumber,
            tenantId: tenant.id,
            role: 'USER', // All new users start as regular users
            createdAt: now,
            updatedAt: now
          },
        });
        
        console.log(`📝 REGISTRATION: User created successfully with ID: ${user.id}`);
        
        // 3. Create profile/studio based on user type
        if (userType === "TALENT") {
          console.log(`📝 REGISTRATION: Creating talent profile for user ${user.id}`);
          const profile = await authPrisma.profile.create({
            data: {
              id: crypto.randomUUID(),
              userId: user.id,
              availability: true, // Default to available
              createdAt: now,
              updatedAt: now
            },
          });
          console.log(`📝 REGISTRATION: Talent profile created with ID: ${profile.id}`);
        } else if (userType === "STUDIO") {
          // Create a studio record automatically
          const studioName = `${firstName} ${lastName}`.trim() || 'New Studio';
          console.log(`📝 REGISTRATION: Creating studio record for tenant ${tenant.id}`);
          const studio = await authPrisma.studio.create({
            data: {
              id: crypto.randomUUID(),
              name: studioName,
              tenantId: tenant.id,
              description: `Studio for ${studioName}`,
              createdAt: now,
              updatedAt: now
            },
          });
          console.log(`📝 REGISTRATION: Studio created with ID: ${studio.id}`);
        }
      }
      
      console.log(`📝 REGISTRATION: Registration completed successfully, created user ${user.id} and tenant ${tenant.id}`);
    } catch (dbError) {
      console.error(`📝 REGISTRATION ERROR: Database error creating user/tenant:`, dbError);
      
      // Specific handling for common database errors
      let errorMessage = "Failed to create account";
      
      if (dbError instanceof Error) {
        // Check for unique constraint violations (duplicate email)
        if (dbError.message.includes('Unique constraint') && dbError.message.includes('email')) {
          errorMessage = "Email address is already in use";
        }
        // Check for foreign key constraint failures
        else if (dbError.message.includes('Foreign key constraint')) {
          errorMessage = "Database constraint violation";
        }
        // Check for connection failures
        else if (dbError.message.includes('connect') || dbError.message.includes('connection')) {
          errorMessage = "Database connection error";
        }
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
    
    if (!tenant || !user) {
      console.error(`📝 REGISTRATION ERROR: Transaction returned incomplete data`);
      return NextResponse.json({ error: "Failed to create user account - incomplete data" }, { status: 500 });
    }
    
    // Process submission ID in a separate transaction (if present)
    // This is done after the main transaction to ensure user creation succeeds
    if (submissionId && userType === 'TALENT') {
      try {
        console.log(`📝 REGISTRATION: Processing submission ID: ${submissionId} for user ${user.id}`);
        
        // Get the user's profile
        const profile = await prisma.profile.findUnique({
          where: { userId: user.id }
        });
        
        if (!profile) {
          console.warn(`📝 REGISTRATION WARNING: Profile not found for user ${user.id}, cannot process submission`);
        } else {
          // Process the submission (with transaction if available)
          if (typeof prisma.$transaction === 'function') {
            // Use transaction approach
            await prisma.$transaction(async (tx) => {
              // Find the casting submission
              const submission = await tx.castingSubmission.findUnique({
                where: { id: submissionId },
                include: { 
                  externalActor: true,
                  castingCode: {
                    include: {
                      project: true
                    }
                  }
                }
              });
              
              if (!submission) {
                console.warn(`📝 REGISTRATION WARNING: Submission ${submissionId} not found`);
                return;
              }
              
              // Update the submission status
              await tx.castingSubmission.update({
                where: { id: submissionId },
                data: {
                  status: 'CONVERTED',
                  convertedUserId: user.id,
                  convertedToProfileId: profile.id,
                  updatedAt: new Date()
                }
              });
              
              console.log(`📝 REGISTRATION: Updated submission ${submissionId} to CONVERTED status`);
              
              // Process external actor and project membership if needed
              if (submission.externalActor && submission.castingCode?.projectId) {
                console.log(`📝 REGISTRATION: Processing external actor and project membership`);
                await tx.externalActor.update({
                  where: { id: submission.externalActor.id },
                  data: {
                    status: 'CONVERTED',
                    convertedToUserId: user.id,
                    convertedProfileId: profile.id,
                    convertedToTalentAt: new Date(),
                    updatedAt: new Date()
                  }
                });
                
                // Add to project if needed
                await tx.projectMember.upsert({
                  where: {
                    projectId_profileId: {
                      projectId: submission.castingCode.projectId,
                      profileId: profile.id
                    }
                  },
                  create: {
                    id: crypto.randomUUID(),
                    projectId: submission.castingCode.projectId,
                    profileId: profile.id,
                    role: 'Talent',
                    createdAt: new Date(),
                    updatedAt: new Date()
                  },
                  update: {
                    updatedAt: new Date()
                  }
                });
              }
            });
          } else {
            // Sequential operations fallback
            console.log(`📝 REGISTRATION: Processing submission without transaction`);
            
            // Find the casting submission
            const submission = await prisma.castingSubmission.findUnique({
              where: { id: submissionId },
              include: { 
                externalActor: true,
                castingCode: {
                  include: {
                    project: true
                  }
                }
              }
            });
            
            if (!submission) {
              console.warn(`📝 REGISTRATION WARNING: Submission ${submissionId} not found`);
              return;
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
            
            console.log(`📝 REGISTRATION: Updated submission ${submissionId} to CONVERTED status`);
            
            // Process external actor and project membership if needed
            if (submission.externalActor && submission.castingCode?.projectId) {
              console.log(`📝 REGISTRATION: Processing external actor and project membership`);
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
              
              try {
                // Add to project if needed - use create or update based on existence
                const existingMember = await prisma.projectMember.findUnique({
                  where: {
                    projectId_profileId: {
                      projectId: submission.castingCode.projectId,
                      profileId: profile.id
                    }
                  }
                });
                
                if (existingMember) {
                  // Update existing member
                  await prisma.projectMember.update({
                    where: {
                      projectId_profileId: {
                        projectId: submission.castingCode.projectId,
                        profileId: profile.id
                      }
                    },
                    data: {
                      updatedAt: new Date()
                    }
                  });
                } else {
                  // Create new member
                  await prisma.projectMember.create({
                    data: {
                      id: crypto.randomUUID(),
                      projectId: submission.castingCode.projectId,
                      profileId: profile.id,
                      role: 'Talent',
                      createdAt: new Date(),
                      updatedAt: new Date()
                    }
                  });
                }
              } catch (memberError) {
                console.error(`📝 REGISTRATION WARNING: Error processing project membership:`, memberError);
              }
            }
          }
        }
      } catch (submissionError) {
        console.error('📝 REGISTRATION WARNING: Error processing submission:', submissionError);
        // Continue with registration even if submission processing fails
      }
    }
    
    // Return user data (exclude password)
    if (!user) {
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 }
      );
    }
    
    console.log(`📝 REGISTRATION: Successfully completed registration for ${email}`);
    
    // Generate a JWT token to use for automatic sign-in
    // This will let the client automatically sign in the user without requiring a separate login
    try {
      // Import signIn function from auth.ts
      const { signIn } = await import('@/auth');
      
      // Attempt to sign in with the newly created credentials
      // This will create a valid session token
      console.log(`📝 REGISTRATION: Attempting automatic sign-in for user ${email}`);
      
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      
      if (signInResult?.error) {
        console.error(`📝 REGISTRATION WARNING: Automatic sign-in failed: ${signInResult.error}`);
        // Continue with registration response even if auto-login fails
      } else {
        console.log(`📝 REGISTRATION: Automatic sign-in successful`);
      }
    } catch (signInError) {
      console.error(`📝 REGISTRATION WARNING: Error during automatic sign-in:`, signInError);
      // Continue with registration response even if auto-login fails
    }
    
    // Return user data (exclude password)
    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId,
      tenantType: userType,
      autoSignInAttempted: true,
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