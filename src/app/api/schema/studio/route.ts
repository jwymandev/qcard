import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getProfileFields } from '@/lib/profile-schema';

// GET /api/schema/studio - Get fields for studio profiles
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
    
    // Get fields for studio profiles
    const fields = await getProfileFields('STUDIO');
    
    // Return the fields
    return NextResponse.json(fields);
  } catch (error) {
    console.error('Error fetching studio fields:', error);
    return NextResponse.json(
      { error: 'Failed to fetch studio fields' },
      { status: 500 }
    );
  }
}