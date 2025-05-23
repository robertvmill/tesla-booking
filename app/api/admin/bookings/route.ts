import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';

export async function GET(request: Request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session || !(session.user as any).isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }
    
    // Fetch all bookings with vehicle and user info
    const bookings = await prisma.booking.findMany({
      include: {
        vehicle: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            // Don't include sensitive info
            password: false,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });
    
    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session || !(session.user as any).isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }
    
    // Parse the request body
    const data = await request.json();
    const { vehicleId, startDate, endDate, userEmail, totalPrice: providedTotalPrice, status } = data;
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find vehicle
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    
    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }
    
    // Calculate days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Calculate base price
    let basePrice = vehicle.pricePerDay;
    let totalPrice = providedTotalPrice;
    
    // If no total price is provided, calculate it
    if (!totalPrice) {
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
    }
    
    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalPrice,
        status: status || 'confirmed',
        vehicleId,
        userId: user.id,
      },
      include: {
        vehicle: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            password: false,
          },
        },
      },
    });
    
    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
