import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getProfileFields } from '@/lib/profile-schema';

// GET /api/schema/talent - Get fields for talent profiles
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
    
    // Get fields for talent profiles
    const fields = await getProfileFields('TALENT');
    
    // Return the fields
    return NextResponse.json(fields);
  } catch (error) {
    console.error('Error fetching talent fields:', error);
    return NextResponse.json(
      { error: 'Failed to fetch talent fields' },
      { status: 500 }
    );
  }
}