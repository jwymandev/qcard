import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserSubscription } from '@/lib/subscription-helpers';

/**
 * API endpoint to get the current user's subscription status
 */
export async function GET() {
  try {
    const session = await auth();
    
    // Check if user is authenticated
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Get subscription info
    const subscriptionInfo = await getUserSubscription(userId);
    
    return NextResponse.json(subscriptionInfo);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}