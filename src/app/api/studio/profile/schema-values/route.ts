import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getStudioFieldValues, saveStudioFieldValues } from '@/lib/profile-schema';

// GET /api/studio/profile/schema-values - Get custom field values for the logged-in studio
export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Find the user's tenant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user || !user.Tenant || user.Tenant.type !== 'STUDIO') {
      return NextResponse.json(
        { error: 'Studio tenant not found' },
        { status: 404 }
      );
    }
    
    // Find the studio
    const studio = await prisma.studio.findUnique({
      where: { tenantId: user.Tenant.id },
    });
    
    if (!studio) {
      return NextResponse.json(
        { error: 'Studio not found' },
        { status: 404 }
      );
    }
    
    // Get field values
    const values = await getStudioFieldValues(studio.id);
    
    // Return the values
    return NextResponse.json(values);
  } catch (error) {
    console.error('Error fetching studio field values:', error);
    return NextResponse.json(
      { error: 'Failed to fetch studio field values' },
      { status: 500 }
    );
  }
}

// POST /api/studio/profile/schema-values - Save custom field values for the logged-in studio
export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Find the user's tenant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user || !user.Tenant || user.Tenant.type !== 'STUDIO') {
      return NextResponse.json(
        { error: 'Studio tenant not found' },
        { status: 404 }
      );
    }
    
    // Find the studio
    const studio = await prisma.studio.findUnique({
      where: { tenantId: user.Tenant.id },
    });
    
    if (!studio) {
      return NextResponse.json(
        { error: 'Studio not found' },
        { status: 404 }
      );
    }
    
    // Parse request body
    const values = await request.json();
    
    // Save field values
    await saveStudioFieldValues(studio.id, values);
    
    // Return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving studio field values:', error);
    return NextResponse.json(
      { error: 'Failed to save studio field values' },
      { status: 500 }
    );
  }
}