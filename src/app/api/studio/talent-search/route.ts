import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// GET /api/studio/talent/search - Search for talent based on query parameters
export async function GET(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Check if the user belongs to a studio tenant
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { Tenant: true },
  });
  
  if (!user?.Tenant || user.Tenant.type !== 'STUDIO') {
    return NextResponse.json({ error: "Only studio accounts can access this endpoint" }, { status: 403 });
  }
  
  try {
    // Get URL search parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const locationId = searchParams.get('locationId');
    const skillId = searchParams.get('skillId');
    // Age field has been removed from the schema
    // const minAge = searchParams.get('minAge') ? parseInt(searchParams.get('minAge')!) : undefined;
    // const maxAge = searchParams.get('maxAge') ? parseInt(searchParams.get('maxAge')!) : undefined;
    const gender = searchParams.get('gender');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Build where clause based on search parameters
    let whereClause: any = {
      User: {
        NOT: {
          Tenant: {
            type: 'STUDIO'
          }
        }
      }
    };
    
    if (query) {
      whereClause.OR = [
        {
          User: {
            OR: [
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
        },
        { bio: { contains: query, mode: 'insensitive' } },
        { Skill: { some: { name: { contains: query, mode: 'insensitive' } } } },
      ];
    }
    
    if (locationId) {
      whereClause.Location = {
        some: { id: locationId },
      };
    }
    
    if (skillId) {
      whereClause.Skill = {
        some: { id: skillId },
      };
    }
    
    // Age field has been removed from the schema
    // if (minAge !== undefined) {
    //   whereClause.age = {
    //     ...whereClause.age,
    //     gte: minAge,
    //   };
    // }
    
    // if (maxAge !== undefined) {
    //   whereClause.age = {
    //     ...whereClause.age,
    //     lte: maxAge,
    //   };
    // }
    
    if (gender) {
      whereClause.gender = gender;
    }
    
    // Execute the search query
    const [profiles, totalCount] = await Promise.all([
      prisma.profile.findMany({
        where: whereClause,
        include: {
          User: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          Skill: true,
          Location: true,
          ProfileImage: {
            where: { isPrimary: true },
            take: 1,
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.profile.count({
        where: whereClause,
      }),
    ]);
    
    // Format the results
    const results = profiles.map(profile => ({
      id: profile.id,
      userId: profile.userId,
      name: `${profile.User.firstName || ''} ${profile.User.lastName || ''}`.trim(),
      email: profile.User.email,
      bio: profile.bio,
      gender: profile.gender,
      availability: profile.availability,
      skills: profile.Skill,
      locations: profile.Location,
      imageUrl: profile.ProfileImage[0]?.url || null,
      user: profile.User,
      updatedAt: profile.updatedAt,
    }));
    
    return NextResponse.json({
      profiles: results,
      totalCount,
      page,
      limit,
      pages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error("Error searching talent:", error);
    return NextResponse.json({ error: "Failed to search talent" }, { status: 500 });
  }
}