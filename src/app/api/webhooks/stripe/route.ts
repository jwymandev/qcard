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
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.metadata?.userId) {
        await prisma.payment.update({
          where: {
            stripeId: session.id,
          },
          data: {
            status: 'COMPLETED',
          },
        });
      }
      break;
      
    case 'invoice.paid':
      const invoice = event.data.object as Stripe.Invoice;
      
      if (invoice.customer) {
        // Handle studio subscription payment
        // This would require additional customer metadata to map to your studio
      }
      break;
      
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new NextResponse(null, { status: 200 });
}