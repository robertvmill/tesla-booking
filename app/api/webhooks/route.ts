import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/app/lib/prisma';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// This is your Stripe webhook secret for testing your endpoint locally
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  const body = await request.text();
  const sig = headers().get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret!);
  } catch (err) {
    const error = err as Error;
    console.error(`Webhook Error: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Update the booking status to confirmed
      if (session.metadata?.bookingId) {
        await prisma.booking.update({
          where: { id: session.metadata.bookingId },
          data: { 
            status: 'confirmed',
            paymentIntentId: session.payment_intent as string,
          },
        });
      }
      break;
      
    case 'checkout.session.expired':
      // Handle expired checkout sessions
      if (event.data.object.metadata?.bookingId) {
        await prisma.booking.update({
          where: { id: event.data.object.metadata.bookingId },
          data: { status: 'cancelled' },
        });
      }
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

export const config = {
  api: {
    bodyParser: false,
  },
};