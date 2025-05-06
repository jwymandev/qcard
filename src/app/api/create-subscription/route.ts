import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import stripe from '@/lib/stripe';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const session = await auth();
    const { planId, locationIds } = await req.json();
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        Profile: true,
        Tenant: true
      },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get subscription plan details
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      return NextResponse.json({ error: 'Subscription plan not found' }, { status: 404 });
    }

    if (!plan.stripePriceId) {
      return NextResponse.json({ error: 'Subscription plan has no associated Stripe price' }, { status: 400 });
    }

    // Check if user already has a Stripe customer ID
    let customerId = '';
    
    // Get existing subscription if any
    const existingSubscription = await prisma.subscription.findFirst({
      where: { userId: userId, status: { in: ['ACTIVE', 'TRIALING'] } },
    });
    
    if (existingSubscription?.stripeCustomerId) {
      customerId = existingSubscription.stripeCustomerId;
    } else {
      // Create or retrieve a Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
        metadata: {
          userId: user.id,
          tenantType: user.Tenant?.type || 'UNKNOWN'
        }
      });
      
      customerId = customer.id;
    }

    // Get tenant type and ID (studio or talent)
    const tenantType = user.Tenant?.type || 'UNKNOWN';
    const studioId = tenantType === 'STUDIO' ? 
      (await prisma.studio.findFirst({ where: { tenantId: user.tenantId || '' } }))?.id : 
      undefined;
    
    // Create checkout session
    // Using 'as any' to work around TypeScript issues with Stripe SDK
    const checkoutSession = await (stripe.checkout.sessions.create as any)({
      payment_method_types: ['card'],
      customer: customerId,
      line_items: plan.stripePriceId ? [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ] : [],
      mode: 'subscription',
      subscription_data: {
        metadata: {
          userId: user.id,
          planId: plan.id,
          locations: JSON.stringify(locationIds),
          studioId: studioId
        },
        trial_period_days: 7, // Optional: Give users a 7-day free trial
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?canceled=true`,
      metadata: {
        userId: user.id,
        planId: plan.id,
        tenantType
      },
    });
    
    return NextResponse.json({ 
      url: checkoutSession.url,
      sessionId: checkoutSession.id
    });
  } catch (error) {
    console.error('Error creating subscription checkout session:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}