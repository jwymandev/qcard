import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import stripe from '@/lib/stripe';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await auth();
    const { locationIds } = await req.json();
    
    if (!session || !session.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const userId = session.user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    
    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }
    
    // Get pricing based on locations
    const basePrice = 1999; // $19.99
    const additionalLocationPrice = 999; // $9.99
    
    const totalAmount = basePrice + ((locationIds.length - 1) * additionalLocationPrice);
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'QCard Talent Subscription',
              description: `Access to ${locationIds.length} casting location(s)`,
            },
            unit_amount: totalAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?canceled=true`,
      metadata: {
        userId: user.id,
        locations: JSON.stringify(locationIds),
      },
    });
    
    // Create payment record
    await prisma.payment.create({
      data: {
        amount: totalAmount / 100, // Convert to dollars
        userId: userId,
        stripeId: session.id,
      },
    });
    
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}