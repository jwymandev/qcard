import { NextResponse } from 'next/server';
import { auth, signOut } from '@/auth';
import { prisma } from '@/lib/db';
import { authPrisma } from '@/lib/secure-db-connection';

export async function DELETE() {
  try {
    // Get the current session
    const session = await auth();
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Delete the user's data in order to maintain referential integrity
    // This depends on your schema and cascade delete settings
    
    console.log(`Starting account deletion process for user: ${userId}`);
    
    // First, get the user and their profile to determine what needs to be deleted
    const user = await authPrisma.user.findUnique({
      where: { id: userId },
      include: { 
        Tenant: { 
          include: { 
            Studio: true 
          } 
        },
        Profile: true
      }
    });
    
    if (!user) {
      console.error(`User not found for deletion: ${userId}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log(`User found: ${user.email}, tenant type: ${user.Tenant?.type}`);
    
    // Get the profile ID if it exists
    const profileId = user.Profile?.id;
    
    if (profileId) {
      console.log(`Found profile ID: ${profileId}, deleting related data`);
      
      // 1. Delete profile images
      const deletedImages = await authPrisma.profileImage.deleteMany({
        where: {
          profileId: profileId
        }
      });
      console.log(`Deleted ${deletedImages.count} profile images`);
      
      // 2. Delete applications to casting calls
      const deletedApplications = await authPrisma.application.deleteMany({
        where: {
          profileId: profileId
        }
      });
      console.log(`Deleted ${deletedApplications.count} casting call applications`);
      
      // 3. Delete scene talent assignments
      const deletedSceneTalent = await authPrisma.sceneTalent.deleteMany({
        where: {
          profileId: profileId
        }
      });
      console.log(`Deleted ${deletedSceneTalent.count} scene talent assignments`);
      
      // 4. Delete project memberships
      const deletedMemberships = await authPrisma.projectMember.deleteMany({
        where: {
          profileId: profileId
        }
      });
      console.log(`Deleted ${deletedMemberships.count} project memberships`);
    }
    
    // 5. Delete messages related to this user
    const deletedMessages = await authPrisma.message.deleteMany({
      where: {
        OR: [
          // If user is a talent
          profileId && { talentSenderId: profileId },
          profileId && { talentReceiverId: profileId },
          // If user is a studio and has a studio record
          user.Tenant?.Studio?.id && { studioSenderId: user.Tenant.Studio.id },
          user.Tenant?.Studio?.id && { studioReceiverId: user.Tenant.Studio.id }
        ].filter(Boolean) // Filter out undefined conditions
      }
    });
    console.log(`Deleted ${deletedMessages.count} messages`);
    
    // 6. If user is a studio, handle studio-specific deletions
    if (user.Tenant?.type === 'STUDIO' && user.Tenant.Studio) {
      const studioId = user.Tenant.Studio.id;
      console.log(`Found studio ID: ${studioId}, deleting studio-related data`);
      
      // Delete studio notes
      const deletedNotes = await authPrisma.studioNote.deleteMany({
        where: { studioId: studioId }
      });
      console.log(`Deleted ${deletedNotes.count} studio notes`);
      
      // Delete casting calls
      const deletedCastingCalls = await authPrisma.castingCall.deleteMany({
        where: { studioId: studioId }
      });
      console.log(`Deleted ${deletedCastingCalls.count} casting calls`);
      
      // Delete projects
      const deletedProjects = await authPrisma.project.deleteMany({
        where: { studioId: studioId }
      });
      console.log(`Deleted ${deletedProjects.count} projects`);
      
      // Delete the studio record
      await authPrisma.studio.delete({
        where: { id: studioId }
      });
      console.log(`Deleted studio record: ${studioId}`);
    }
    
    // 7. Delete the profile if it exists
    if (profileId) {
      await authPrisma.profile.delete({
        where: { id: profileId }
      });
      console.log(`Deleted profile: ${profileId}`);
    }
    
    // 8. Delete the tenant
    if (user.Tenant) {
      await authPrisma.tenant.delete({
        where: { id: user.Tenant.id }
      });
      console.log(`Deleted tenant: ${user.Tenant.id}`);
    }
    
    // 9. Finally, delete the user account
    await authPrisma.user.delete({
      where: { id: userId }
    });
    console.log(`Successfully deleted user account: ${userId}`);
    
    // Sign out the user to clear their session
    try {
      await signOut({ redirect: false });
      console.log("User session signed out after account deletion");
    } catch (signOutError) {
      console.error("Error signing out session after account deletion:", signOutError);
      // Continue with cookie clearing even if signOut fails
    }
    
    // Create a response with forced cookie clearing
    const response = NextResponse.json({ success: true });
    
    // Clear all potential auth cookies
    const cookiesToClear = [
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'next-auth.callback-url',
      'next-auth.csrf-token',
      '__Host-next-auth.csrf-token',
      'auth-state',
      'user-preferences'
    ];
    
    // Set each cookie to expire in the past
    cookiesToClear.forEach(cookieName => {
      response.cookies.set({
        name: cookieName,
        value: '',
        expires: new Date(0),
        path: '/',
      });
      
      // Also try with secure flag
      response.cookies.set({
        name: cookieName,
        value: '',
        expires: new Date(0),
        path: '/',
        secure: true,
      });
    });
    
    console.log("All auth cookies cleared after account deletion");
    
    return response;
  } catch (error) {
    console.error('Error deleting account:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to delete account';
    let errorDetails = null;
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for Prisma-specific errors
      if ('code' in error) {
        const prismaError = error as any;
        errorDetails = {
          code: prismaError.code,
          meta: prismaError.meta
        };
        
        // Handle specific Prisma error codes
        if (prismaError.code === 'P2025') {
          // Record not found
          statusCode = 404;
          errorMessage = 'User account or related records not found';
        } else if (prismaError.code === 'P2003') {
          // Foreign key constraint failed
          statusCode = 409;
          errorMessage = 'Cannot delete account due to related records';
        }
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        success: false
      },
      { status: statusCode }
    );
  }
}