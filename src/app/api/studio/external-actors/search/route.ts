import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

// GET: Search for external actors
export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the studio ID from the user's tenant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user || !user.Tenant || user.Tenant.type !== 'STUDIO') {
      return NextResponse.json({ error: 'Not a studio user' }, { status: 403 });
    }
    
    const studio = await prisma.studio.findUnique({
      where: { tenantId: user.tenantId! },
    });
    
    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }
    
    // Get search parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    
    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }
    
    // Perform the search
    const externalActors = await prisma.externalActor.findMany({
      where: {
        studioId: studio.id,
        status: 'ACTIVE', // Only search for active external actors
        OR: [
          { email: { contains: query.toLowerCase(), mode: 'insensitive' } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { phoneNumber: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20, // Limit the number of results
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Format the results to match the talent search format
    const results = externalActors.map(actor => ({
      id: actor.id,
      name: `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.email,
      email: actor.email,
      phone: actor.phoneNumber || null,
      type: 'external', // Distinguish from registered talent
    }));
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching external actors:', error);
    return NextResponse.json(
      { error: 'Failed to search external actors' },
      { status: 500 }
    );
  }
}