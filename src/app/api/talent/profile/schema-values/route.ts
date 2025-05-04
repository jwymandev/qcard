import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getProfileFieldValues, saveProfileFieldValues } from '@/lib/profile-schema';

// GET /api/talent/profile/schema-values - Get custom field values for the logged-in talent's profile
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
    
    // Find the user's profile
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }
    
    // Get field values
    const values = await getProfileFieldValues(profile.id);
    
    // Return the values
    return NextResponse.json(values);
  } catch (error) {
    console.error('Error fetching profile field values:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile field values' },
      { status: 500 }
    );
  }
}

// POST /api/talent/profile/schema-values - Save custom field values for the logged-in talent's profile
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
    
    // Find the user's profile
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }
    
    // Parse request body
    const values = await request.json();
    
    // Save field values
    await saveProfileFieldValues(profile.id, values);
    
    // Return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving profile field values:', error);
    return NextResponse.json(
      { error: 'Failed to save profile field values' },
      { status: 500 }
    );
  }
}