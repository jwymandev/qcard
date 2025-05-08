import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-helpers';

// GET /api/admin/studios
export async function GET(request: Request) {
  try {
    console.log('GET /api/admin/studios request received');
    
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
    
    console.log('Query params:', { search });
    
    // Build where clause
    let where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
        { 
          Tenant: {
            User: {
              some: {
                OR: [
                  { email: { contains: search, mode: 'insensitive' } },
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } }
                ]
              }
            }
          }
        }
      ];
    }
    
    // Define a type for the studios with relations
    type StudioWithRelations = {
      id: string;
      name: string;
      description: string | null;
      contactEmail: string | null;
      contactPhone: string | null;
      website: string | null;
      tenantId: string;
      createdAt: Date;
      updatedAt: Date;
      Tenant: {
        id: string;
        name: string;
        type: string;
      };
      Project: Array<{ id: string }>;
      CastingCall: Array<{ id: string }>;
    };

    // Get studios with counts
    const studios = await prisma.studio.findMany({
      where,
      include: {
        Tenant: true,
        Project: {
          select: {
            id: true
          }
        },
        CastingCall: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    }) as unknown as StudioWithRelations[];
    
    console.log(`Found ${studios.length} studios`);
    
    // Format response
    const formattedStudios = studios.map(studio => ({
      id: studio.id,
      name: studio.name,
      description: studio.description || '',
      contactEmail: studio.contactEmail || '',
      contactPhone: studio.contactPhone || '',
      website: studio.website || '',
      tenantId: studio.tenantId,
      createdAt: studio.createdAt.toISOString(),
      projectCount: studio.Project.length,
      castingCallCount: studio.CastingCall.length
    }));
    
    return NextResponse.json({
      studios: formattedStudios,
      count: formattedStudios.length
    });
  } catch (error) {
    console.error('Error fetching studios:', error);
    return NextResponse.json(
      { error: 'Failed to fetch studios' },
      { status: 500 }
    );
  }
}