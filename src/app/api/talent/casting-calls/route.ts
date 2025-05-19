import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// GET /api/talent/casting-calls - Get all casting calls available to talent
export async function GET(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // Find the user and check if they have a talent profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        Profile: {
          include: {
            regions: {
              include: {
                region: true
              }
            }
          }
        },
      },
    });
    
    if (!user?.Profile) {
      return NextResponse.json({ error: "Talent profile not found" }, { status: 404 });
    }
    
    // Get search parameters from the URL
    const { searchParams } = new URL(request.url);
    
    // Build the where clause for filtering
    const where: any = {
      status: "OPEN", // Only show open casting calls
    };
    
    // Optional filters
    const locationId = searchParams.get('locationId');
    if (locationId) {
      where.locationId = locationId;
    }
    
    const regionId = searchParams.get('regionId');
    if (regionId) {
      where.regionId = regionId;
    }
    
    const startDate = searchParams.get('startDate');
    if (startDate) {
      where.startDate = {
        gte: new Date(startDate)
      };
    }
    
    const endDate = searchParams.get('endDate');
    if (endDate) {
      where.endDate = {
        lte: new Date(endDate)
      };
    }
    
    // Get talent's regions to filter calls by region if no specific region is selected
    const talentRegionIds = user.Profile.regions.map(r => r.regionId);
    
    // If showAllRegions param is not true AND no specific region is requested
    // filter by the talent's regions
    const showAllRegions = searchParams.get('showAllRegions') === 'true';
    if (!showAllRegions && !regionId && talentRegionIds.length > 0) {
      where.regionId = {
        in: talentRegionIds
      };
    }
    
    // Get all active casting calls
    const castingCalls = await prisma.castingCall.findMany({
      where,
      include: {
        Location: {
          include: {
            region: true
          }
        },
        region: true,
        Skill: true,
        Studio: {
          select: {
            id: true,
            name: true,
          }
        },
        Project: {
          select: {
            id: true,
            title: true,
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
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Format the data for the frontend
    const formattedCastingCalls = castingCalls.map(call => ({
      id: call.id,
      title: call.title,
      description: call.description,
      requirements: call.requirements,
      compensation: call.compensation,
      startDate: call.startDate,
      endDate: call.endDate,
      status: call.status,
      location: call.Location ? {
        id: call.Location.id,
        name: call.Location.name,
        region: call.Location.region ? {
          id: call.Location.region.id,
          name: call.Location.region.name
        } : null
      } : null,
      region: call.region ? {
        id: call.region.id,
        name: call.region.name,
      } : null,
      skills: call.Skill.map(skill => ({
        id: skill.id,
        name: skill.name,
      })),
      studio: call.Studio,
      project: call.Project,
      // Check if the talent has already applied
      application: call.Application.length > 0 ? {
        id: call.Application[0].id,
        status: call.Application[0].status,
      } : null,
      createdAt: call.createdAt,
    }));
    
    return NextResponse.json({
      castingCalls: formattedCastingCalls,
      talentRegions: user.Profile.regions.map(r => ({ 
        id: r.region.id, 
        name: r.region.name 
      })),
      usingRegionFilter: !showAllRegions && !regionId && talentRegionIds.length > 0
    });
  } catch (error) {
    console.error("Error fetching casting calls for talent:", error);
    return NextResponse.json({ 
      error: "Failed to fetch casting calls",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}