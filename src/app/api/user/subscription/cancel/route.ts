import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import stripe from '@/lib/stripe';
import { prisma } from '@/lib/db';

/**
 * API route to cancel a user's subscription
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
        status: { in: ['ACTIVE', 'TRIALING'] }
      }
    });
    
    if (!dbSubscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }
    
    // Cancel the subscription at period end in Stripe
    await stripe.subscriptions.update(dbSubscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    });
    
    // Update the subscription in our database
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        cancelAtPeriodEnd: true,
        updatedAt: new Date()
      }
    });
    
    return NextResponse.json({
      message: 'Subscription will be canceled at the end of the billing period'
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}