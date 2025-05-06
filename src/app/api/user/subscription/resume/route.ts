import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import stripe from '@/lib/stripe';
import { prisma } from '@/lib/db';

/**
 * API route to resume a canceled subscription
 */
export async function POST() {
  try {
    const session = await auth();
    
    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Get the subscription from the database
    const dbSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        cancelAtPeriodEnd: true
      }
    });
    
    if (!dbSubscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No canceled subscription found' },
        { status: 404 }
      );
    }
    
    // Resume the subscription in Stripe
    await stripe.subscriptions.update(dbSubscription.stripeSubscriptionId, {
      cancel_at_period_end: false
    });
    
    // Update the subscription in our database
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        cancelAtPeriodEnd: false,
        updatedAt: new Date()
      }
    });
    
    return NextResponse.json({
      message: 'Subscription has been resumed'
    });
  } catch (error) {
    console.error('Error resuming subscription:', error);
    return NextResponse.json(
      { error: 'Failed to resume subscription' },
      { status: 500 }
    );
  }
}