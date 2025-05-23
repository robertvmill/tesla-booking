import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getToken } from 'next-auth/jwt';

/**
 * Stripe API Configuration
 * Initialize Stripe with secret key and latest API version
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

/**
 * POST /api/create-checkout
 * Creates a Stripe checkout session for vehicle booking payment
 * 
 * Flow:
 * 1. Authenticate user via session
 * 2. Validate request body (vehicleId, dates)
 * 3. Get vehicle details and calculate price
 * 4. Create pending booking record
 * 5. Create welcome message from admin
 * 6. Create Stripe checkout session
 * 7. Return checkout URL
 */
export async function POST(request: Request) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get authenticated user details
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log('User found:', user.id);
    
    // Validate request parameters
    const body = await request.json();
    const { vehicleId, startDate, endDate } = body;
    
    if (!vehicleId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get vehicle information
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    
    console.log('Vehicle details:', vehicle);
    
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }
    
    // Calculate booking duration and price
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationInMs = end.getTime() - start.getTime();
    const days = Math.ceil(durationInMs / (1000 * 60 * 60 * 24)) + 1; // Add 1 to include both start and end dates
    const totalAmount = vehicle.pricePerDay * days;
    
    // Create booking with status 'pending'
    const booking = await prisma.booking.create({
      data: {
        startDate: start,
        endDate: end,
        totalPrice: totalAmount,
        status: 'pending', // Set initial status as pending until payment is confirmed
        userId: user.id,
        vehicleId: vehicle.id
      },
    });
    
    console.log('Created booking:', booking.id);
    
    // Set up Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Tesla ${vehicle.model} Rental`,
              description: `${days} day rental from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
              // Only include images if they are valid URLs
              images: vehicle.image && vehicle.image.startsWith('http') ? [vehicle.image] : [],
            },
            unit_amount: vehicle.pricePerDay * 100, // Convert to cents for Stripe
            tax_behavior: 'exclusive',
          },
          quantity: days,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/bookings/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/results?startDate=${startDate}&endDate=${endDate}&canceled=true`,
      // Store booking reference data in metadata
      metadata: {
        bookingId: booking.id,
        vehicleId: vehicle.id,
        userId: user.id,
      },
      customer_email: user.email || undefined,
    });
    
    // Return checkout session URL
    return NextResponse.json({ url: checkoutSession.url });
    
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}