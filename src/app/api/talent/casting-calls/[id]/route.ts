import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// GET /api/talent/casting-calls/[id] - Get a specific casting call details
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const id = params.id;
    
    // Find the user and check if they have a talent profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Profile: true },
    });
    
    if (!user?.Profile) {
      return NextResponse.json({ error: "Talent profile not found" }, { status: 404 });
    }
    
    // Get the casting call with detailed information
    const castingCall = await prisma.castingCall.findUnique({
      where: { id },
      include: {
        Location: true,
        Skill: true,
        Studio: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        },
        Project: {
          select: {
            id: true,
            title: true,
            description: true,
          }
        },
        // Include application status for the current talent
        Application: {
          where: {
            profileId: user.Profile.id
          },
          select: {
            id: true,
            status: true,
            message: true,
            createdAt: true,
          }
        },
      },
    });
    
    if (!castingCall) {
      return NextResponse.json({ error: "Casting call not found" }, { status: 404 });
    }
    
    // Format the data for the frontend
    const formattedCastingCall = {
      id: castingCall.id,
      title: castingCall.title,
      description: castingCall.description,
      requirements: castingCall.requirements,
      compensation: castingCall.compensation,
      startDate: castingCall.startDate,
      endDate: castingCall.endDate,
      status: castingCall.status,
      location: castingCall.Location ? {
        id: castingCall.Location.id,
        name: castingCall.Location.name,
      } : null,
      skills: castingCall.Skill.map(skill => ({
        id: skill.id,
        name: skill.name,
      })),
      studio: castingCall.Studio,
      project: castingCall.Project,
      // Check if the talent has already applied
      application: castingCall.Application.length > 0 ? {
        id: castingCall.Application[0].id,
        status: castingCall.Application[0].status,
        message: castingCall.Application[0].message,
        createdAt: castingCall.Application[0].createdAt,
      } : null,
      createdAt: castingCall.createdAt,
      updatedAt: castingCall.updatedAt,
    };
    
    return NextResponse.json(formattedCastingCall);
  } catch (error) {
    console.error("Error fetching casting call detail:", error);
    return NextResponse.json({ 
      error: "Failed to fetch casting call details",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}