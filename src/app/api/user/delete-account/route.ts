import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

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
    
    // 1. Delete profile images (if any)
    await prisma.profileImage.deleteMany({
      where: {
        profileId: userId
      }
    });
    
    // 2. Delete the user's profile
    await prisma.profile.deleteMany({
      where: {
        userId: userId
      }
    });
    
    // 3. Delete user's applications to casting calls
    // Need to get the profile ID first to delete applications
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      select: { id: true }
    });
    
    if (profile) {
      await prisma.application.deleteMany({
        where: {
          profileId: profile.id
        }
      });
    }
    
    // 4. Delete scene talent assignments
    if (profile) {
      await prisma.sceneTalent.deleteMany({
        where: {
          profileId: profile.id
        }
      });
    }
    
    // 5. Delete messages sent by or to the user
    await prisma.message.deleteMany({
      where: {
        OR: [
          { studioSenderId: userId },
          { studioReceiverId: userId },
          { talentSenderId: userId },
          { talentReceiverId: userId }
        ]
      }
    });
    
    // 6. If user is a studio user, delete their studio notes
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { Tenant: { include: { Studio: true } } }
    });
    
    if (user?.Tenant?.Studio) {
      await prisma.studioNote.deleteMany({
        where: {
          studioId: user.Tenant.Studio.id
        }
      });
    }
    
    // 7. Finally, delete the user account
    await prisma.user.delete({
      where: {
        id: userId
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}