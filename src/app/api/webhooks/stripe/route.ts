import { headers } from 'next/headers';
import stripe from '@/lib/stripe';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature') as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (error: any) {
    console.error('Webhook signature verification failed', error.message);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const checkoutSession = event.data.object;
        
        // Handle one-time payment completion (legacy support)
        if (checkoutSession.mode === 'payment' && checkoutSession.metadata?.userId) {
          await prisma.payment.update({
            where: {
              stripeId: checkoutSession.id,
            },
            data: {
              status: 'COMPLETED',
              updatedAt: new Date(),
            },
          });
        }
        
        // Handle subscription checkout completion
        if (checkoutSession.mode === 'subscription') {
          const { userId, planId, studioId } = checkoutSession.metadata || {};
          
          if (userId && planId) {
            console.log(`Subscription created for user ${userId}, plan ${planId}`);
            
            // Get subscription details from the checkout session
            const subscription = await stripe.subscriptions.retrieve(
              checkoutSession.subscription as string
            );
            
            // Create or update subscription record
            await createOrUpdateSubscription(
              userId, 
              planId, 
              studioId, 
              checkoutSession.customer as string, 
              subscription.id, 
              subscription
            );
          }
        }
        break;
        
      case 'customer.subscription.created':
        const createdSubscription = event.data.object;
        handleSubscriptionChange(createdSubscription, 'ACTIVE');
        break;
        
      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object;
        handleSubscriptionChange(updatedSubscription);
        break;
        
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        handleSubscriptionChange(deletedSubscription, 'CANCELED');
        break;
        
      case 'invoice.paid':
        const paidInvoice = event.data.object;
        const paidSubscriptionId = paidInvoice.subscription;
        
        if (paidSubscriptionId && typeof paidSubscriptionId === 'string') {
          // Get the subscription from Stripe
          const subscription = await stripe.subscriptions.retrieve(paidSubscriptionId);
          
          // Find the subscription in our database
          const dbSubscription = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId: paidSubscriptionId }
          });
          
          if (dbSubscription) {
            // Update the subscription period dates
            await prisma.subscription.update({
              where: { id: dbSubscription.id },
              data: {
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                status: mapStripeStatusToDB(subscription.status) as any,
                updatedAt: new Date()
              }
            });
            
            // Create a payment record for this invoice
            await prisma.payment.create({
              data: {
                id: paidInvoice.id,
                stripeId: paidInvoice.id,
                amount: paidInvoice.amount_paid / 100, // Convert from cents to dollars
                currency: paidInvoice.currency,
                status: 'COMPLETED',
                userId: dbSubscription.userId,
                studioId: dbSubscription.studioId,
                updatedAt: new Date(),
              }
            });
          }
        }
        break;
        
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        
        if (failedInvoice.subscription && typeof failedInvoice.subscription === 'string') {
          const subscription = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId: failedInvoice.subscription }
          });
          
          if (subscription) {
            await prisma.subscription.update({
              where: { id: subscription.id },
              data: {
                status: 'PAST_DUE' as any,
                updatedAt: new Date()
              }
            });
          }
        }
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`Error handling webhook event ${event.type}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new NextResponse(`Webhook handling error: ${errorMessage}`, { status: 500 });
  }

  return new NextResponse(null, { status: 200 });
}

/**
 * Helper function to map Stripe subscription status to our database enum
 */
function mapStripeStatusToDB(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active': return 'ACTIVE';
    case 'past_due': return 'PAST_DUE';
    case 'canceled': return 'CANCELED';
    case 'incomplete': return 'INCOMPLETE';
    case 'incomplete_expired': return 'INCOMPLETE_EXPIRED';
    case 'trialing': return 'TRIALING';
    case 'unpaid': return 'UNPAID';
    default: return 'ACTIVE';
  }
}

/**
 * Helper function to create or update a subscription record
 */
async function createOrUpdateSubscription(
  userId: string,
  planId: string,
  studioId: string | undefined,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  stripeSubscription: any
) {
  // Check if subscription already exists
  const existingSubscription = await prisma.subscription.findFirst({
    where: { 
      OR: [
        { stripeSubscriptionId },
        { userId, status: { in: ['ACTIVE', 'TRIALING'] } }
      ]
    }
  });
  
  const currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
  const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
  
  if (existingSubscription) {
    // Update existing subscription
    return prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        planId,
        status: mapStripeStatusToDB(stripeSubscription.status) as any,
        stripeCustomerId,
        stripeSubscriptionId,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        updatedAt: new Date()
      }
    });
  } else {
    // Create new subscription
    return prisma.subscription.create({
      data: {
        userId,
        studioId,
        planId,
        status: mapStripeStatusToDB(stripeSubscription.status) as any,
        stripeCustomerId,
        stripeSubscriptionId,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        updatedAt: new Date()
      }
    });
  }
}

/**
 * Handle subscription changes (created, updated, deleted)
 */
async function handleSubscriptionChange(subscription: any, forceStatus?: string) {
  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id }
  });
  
  if (!dbSubscription) {
    console.log(`No subscription found in database for Stripe subscription ${subscription.id}`);
    return;
  }
  
  const status = forceStatus || mapStripeStatusToDB(subscription.status);
  
  // Update subscription in database
  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: status as any,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      updatedAt: new Date()
    }
  });
}