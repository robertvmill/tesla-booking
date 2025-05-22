import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/app/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    // Get the current user session
    const session = await getServerSession(authOptions as any) as any;
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Find the user by email
    const userEmail = session.user.email;
    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get all bookings for this user
    const bookings = await prisma.booking.findMany({
      where: { userId: user.id },
      orderBy: { startDate: 'desc' },
      include: {
        vehicle: true
      }
    });
    
    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Get the current user session
  const session = await getServerSession(authOptions as any) as any;
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const userEmail = session.user.email;
  if (!userEmail) {
    return NextResponse.json({ error: 'User email not found' }, { status: 400 });
  }
  
  try {
    const { vehicleId, startDate, endDate } = await request.json();
    
    if (!vehicleId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Find the vehicle to get its price per day
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }
    
    // Calculate total price based on days and rate
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const totalPrice = vehicle.pricePerDay * diffDays;
    
    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        startDate: start,
        endDate: end,
        totalPrice,
        status: 'confirmed',
        user: {
          connect: { 
            email: userEmail 
          }
        },
        vehicle: {
          connect: { id: vehicleId }
        }
      },
    });
    
    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
