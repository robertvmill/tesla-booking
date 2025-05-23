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
    
    // Calculate days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Calculate base price
    let basePrice = vehicle.pricePerDay;
    let totalPrice = 0;
    
    // Check for special pricing rules that apply to this date range and vehicle
    const specialPricingRules = await prisma.specialPricing.findMany({
      where: {
        OR: [
          // Apply to all vehicles
          { applyToAll: true },
          // Apply to this specific vehicle
          {
            vehicles: {
              some: {
                id: vehicleId
              }
            }
          }
        ],
        // Overlaps with booking date range
        AND: [
          { startDate: { lte: end } },
          { endDate: { gte: start } }
        ]
      },
      orderBy: {
        createdAt: 'desc' // Most recently created rule takes precedence
      }
    });
    
    // If we have special pricing rules, apply them
    if (specialPricingRules.length > 0) {
      // Use the most recent rule (first in the sorted array)
      const rule = specialPricingRules[0];
      
      if (rule.priceType === 'multiplier') {
        // Apply multiplier to base price
        basePrice = Math.round(basePrice * rule.priceValue);
      } else if (rule.priceType === 'fixed') {
        // Override with fixed price
        basePrice = Math.round(rule.priceValue);
      }
    }
    
    // Calculate final price
    totalPrice = basePrice * diffDays;
    
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
