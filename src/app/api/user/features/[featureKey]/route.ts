import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasFeatureAccess } from '@/lib/subscription-helpers';

/**
 * API endpoint to check if a user has access to a specific feature
 */
export async function GET(
  request: Request, 
  { params }: { params: { featureKey: string } }
) {
  try {
    const session = await auth();
    const { featureKey } = params;
    
    // Check if user is authenticated
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { hasAccess: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Missing feature key
    if (!featureKey) {
      return NextResponse.json(
        { hasAccess: false, error: 'Missing feature key' },
        { status: 400 }
      );
    }
    
    const userId = session.user.id;
    
    // Check if user has access to this feature
    const access = await hasFeatureAccess(userId, featureKey);
    
    // Return feature access status
    return NextResponse.json({ hasAccess: access });
  } catch (error) {
    console.error(`Error checking feature access for ${params.featureKey}:`, error);
    return NextResponse.json(
      { hasAccess: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}