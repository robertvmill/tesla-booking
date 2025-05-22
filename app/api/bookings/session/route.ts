import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  try {
    // Get the session to check if user is authenticated
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the Stripe session
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!checkoutSession || !checkoutSession.metadata?.bookingId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }

    // Get the booking details
    const booking = await prisma.booking.findUnique({
      where: { id: checkoutSession.metadata.bookingId },
      include: {
        vehicle: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Get the user from the database using the email from the session
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if the booking belongs to the authenticated user
    if (booking.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Booking details retrieved successfully for booking ID:', booking.id);

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Error fetching booking details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking details' },
      { status: 500 }
    );
  }
}