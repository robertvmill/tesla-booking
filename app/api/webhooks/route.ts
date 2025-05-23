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
      console.log('Webhook: checkout.session.completed event received');
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Update the booking status to confirmed
      if (session.metadata?.bookingId) {
        const bookingId = session.metadata.bookingId;
        const userId = session.metadata.userId;
        console.log(`Webhook: Processing booking ${bookingId} for user ${userId}`);
        
        // First, get the booking with vehicle details
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: { vehicle: true }
        });
        
        if (booking) {
          console.log(`Webhook: Found booking for ${booking.vehicle.model}`);
          
          // Update booking status
          await prisma.booking.update({
            where: { id: bookingId },
            data: { 
              status: 'confirmed',
            },
          });
          console.log(`Webhook: Updated booking status to confirmed`);
          
          // Calculate number of days for the booking
          const startDate = new Date(booking.startDate);
          const endDate = new Date(booking.endDate);
          const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          
          // Create welcome message from admin
          const message = await prisma.message.create({
            data: {
              content: `Thank you for choosing RideReady! We're thrilled you'll be experiencing our ${booking.vehicle.model}. Your reservation for ${days} days has been confirmed. If you have any questions before your trip, feel free to message us here. We look forward to getting you on the road in style!`,
              bookingId: bookingId,
              userId: userId,
              isAdminMessage: true
            }
          });
          console.log(`Webhook: Created welcome message ${message.id}`);
        } else {
          console.log(`Webhook: No booking found for ID ${bookingId}`);
        }
      } else {
        console.log('Webhook: No booking metadata found in session');
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