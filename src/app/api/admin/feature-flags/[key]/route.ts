import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * API routes for managing individual feature flags
 */
export async function GET(
  request: Request,
  { params }: { params: { key: string } }
) {
  try {
    const session = await auth();
    const { key } = params;
    
    // Check if user is super admin
    if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Get feature flag
    const featureFlag = await prisma.featureFlag.findUnique({
      where: { key }
    });
    
    if (!featureFlag) {
      return NextResponse.json(
        { error: 'Feature flag not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(featureFlag);
  } catch (error) {
    console.error(`Error fetching feature flag (${params.key}):`, error);
    return NextResponse.json(
      { error: 'Failed to fetch feature flag' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { key: string } }
) {
  try {
    const session = await auth();
    const { key } = params;
    
    // Check if user is super admin
    if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Parse request body
    const data = await request.json();
    const { name, description, defaultValue } = data;
    
    // Check if feature flag exists
    const featureFlag = await prisma.featureFlag.findUnique({
      where: { key }
    });
    
    if (!featureFlag) {
      return NextResponse.json(
        { error: 'Feature flag not found' },
        { status: 404 }
      );
    }
    
    // Update feature flag
    const updatedFlag = await prisma.featureFlag.update({
      where: { key },
      data: {
        name: name !== undefined ? name : featureFlag.name,
        description: description !== undefined ? description : featureFlag.description,
        defaultValue: defaultValue !== undefined ? defaultValue : featureFlag.defaultValue,
        updatedAt: new Date()
      }
    });
    
    return NextResponse.json(updatedFlag);
  } catch (error) {
    console.error(`Error updating feature flag (${params.key}):`, error);
    return NextResponse.json(
      { error: 'Failed to update feature flag' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { key: string } }
) {
  try {
    const session = await auth();
    const { key } = params;
    
    // Check if user is super admin
    if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Check if feature flag exists
    const featureFlag = await prisma.featureFlag.findUnique({
      where: { key }
    });
    
    if (!featureFlag) {
      return NextResponse.json(
        { error: 'Feature flag not found' },
        { status: 404 }
      );
    }
    
    // Delete feature flag
    await prisma.featureFlag.delete({
      where: { key }
    });
    
    return NextResponse.json(
      { message: 'Feature flag deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error deleting feature flag (${params.key}):`, error);
    return NextResponse.json(
      { error: 'Failed to delete feature flag' },
      { status: 500 }
    );
  }
}