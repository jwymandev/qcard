import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

// This endpoint is called during the sign-up process to check if the email
// matches an external actor and convert them if it does
export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const email = session.user.email;
    
    if (!email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }
    
    // Find the user's profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Profile: true },
    });
    
    if (!user || !user.Profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    // Get the user's phone number
    const phoneNumber = user.phoneNumber;
    
    // Find any external actors with matching email or phone number
    const externalActors = await prisma.externalActor.findMany({
      where: {
        OR: [
          { email: email },
          ...(phoneNumber ? [{ phoneNumber: phoneNumber }] : []),
        ],
        status: { not: 'CONVERTED' }, // Only find actors that haven't been converted yet
      },
      include: {
        studio: true,
        projects: {
          include: {
            project: true,
          },
        },
      },
    });
    
    if (externalActors.length === 0) {
      return NextResponse.json({ 
        converted: false,
        message: phoneNumber 
          ? 'No external actor records found matching your email or phone number' 
          : 'No external actor records found matching your email'
      });
    }
    
    // Convert all found external actors
    const conversionResults = [];
    
    for (const actor of externalActors) {
      // Update the external actor record
      const updatedActor = await prisma.externalActor.update({
        where: { id: actor.id },
        data: {
          status: 'CONVERTED',
          convertedToTalentAt: new Date(),
          convertedProfileId: user.Profile.id,
        },
      });
      
      // Create project members for each project the external actor was part of
      for (const projectAssignment of actor.projects) {
        // Check if the user is already a member of this project
        const existingMember = await prisma.projectMember.findFirst({
          where: {
            projectId: projectAssignment.projectId,
            profileId: user.Profile.id,
          },
        });
        
        // If not already a member, add them to the project
        if (!existingMember) {
          await prisma.projectMember.create({
            data: {
              id: crypto.randomUUID(),
              projectId: projectAssignment.projectId,
              profileId: user.Profile.id,
              role: projectAssignment.role || 'Talent',
              notes: `Converted from external actor: ${actor.email}`,
              updatedAt: new Date(),
            },
          });
        }
      }
      
      conversionResults.push({
        id: actor.id,
        studio: actor.studio.name,
        projects: actor.projects.length,
      });
    }
    
    return NextResponse.json({
      converted: true,
      message: `Successfully converted ${externalActors.length} external actor records`,
      conversions: conversionResults,
    });
  } catch (error) {
    console.error('Error converting external actor:', error);
    return NextResponse.json(
      { error: 'Failed to convert external actor' },
      { status: 500 }
    );
  }
}