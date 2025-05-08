import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-helpers';

// GET /api/admin/talents
export async function GET(request: Request) {
  try {
    console.log('GET /api/admin/talents request received');
    
    // Check admin access with API-friendly options
    const session = await requireAdmin({ 
      redirectOnFailure: false, 
      throwOnFailure: true 
    });
    
    if (!session) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    // Get query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const skill = searchParams.get('skill') || '';
    const availability = searchParams.get('availability') || '';
    
    console.log('Query params:', { search, skill, availability });
    
    // Construct where clause
    const where: any = {
      Profile: {
        some: {} // Ensure we only get users with profiles
      }
    };
    
    // Search
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { 
          Profile: {
            some: {
              bio: { contains: search, mode: 'insensitive' }
            }
          }
        }
      ];
    }
    
    // Filter by availability
    if (availability === 'available') {
      where.Profile = {
        some: {
          availability: true
        }
      };
    } else if (availability === 'unavailable') {
      where.Profile = {
        some: {
          availability: false
        }
      };
    }
    
    // Define a type for the user with profile
    type UserWithProfile = {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      createdAt: Date;
      Profile: Array<{
        id: string;
        bio: string | null;
        gender: string | null;
        age: string | null;
        height: string | null;
        weight: string | null;
        hairColor: string | null;
        eyeColor: string | null;
        ethnicity: string | null;
        availability: boolean;
        ProfileImage: Array<{
          id: string;
          url: string;
          isPrimary: boolean;
        }>;
        Skill: Array<{
          id: string;
          name: string;
        }>;
        Location: Array<{
          id: string;
          name: string;
        }>;
      }>;
    };

    // Get users with talent profiles
    const users = await prisma.user.findMany({
      where: {
        Tenant: {
          type: 'TALENT'
        },
        Profile: {
          some: {} // Ensure we only get users with profiles
        },
        ...where
      },
      include: {
        Profile: {
          include: {
            ProfileImage: true,
            Skill: true,
            Location: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    }) as unknown as UserWithProfile[];
    
    console.log(`Found ${users.length} talents`);
    
    // Format response
    const formattedTalents = users.map(user => {
      // Safely handle possible empty Profile array
      const profile = user.Profile && user.Profile.length > 0 ? user.Profile[0] : null;
      
      // Safely map skills and locations with proper typing
      const skills = profile && profile.Skill 
        ? profile.Skill.map((s: { name: string }) => s.name) 
        : [];
        
      const locations = profile && profile.Location 
        ? profile.Location.map((l: { name: string }) => l.name) 
        : [];
      
      return {
        id: profile?.id || user.id,
        userId: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        headshotUrl: profile && profile.ProfileImage 
          ? profile.ProfileImage.find((img: { isPrimary: boolean; url: string }) => img.isPrimary)?.url || null 
          : null,
        bio: profile?.bio || null,
        gender: profile?.gender || null,
        // Handle special fields that may be stored in JSON if using custom fields
        age: profile?.age || null,
        height: profile?.height || null,
        weight: profile?.weight || null,
        hairColor: profile?.hairColor || null,
        eyeColor: profile?.eyeColor || null,
        ethnicity: profile?.ethnicity || null,
        skills: skills,
        locations: locations,
        availability: profile?.availability || false,
        createdAt: user.createdAt.toISOString(),
      };
    });
    
    // Filter by skill if needed
    let filtered = formattedTalents;
    if (skill) {
      filtered = formattedTalents.filter(talent => 
        talent.skills.some((s: string) => s.toLowerCase().includes(skill.toLowerCase()))
      );
    }
    
    return NextResponse.json({
      talents: filtered,
      count: filtered.length,
      total: formattedTalents.length
    });
  } catch (error) {
    console.error('Error fetching talents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch talents' },
      { status: 500 }
    );
  }
}