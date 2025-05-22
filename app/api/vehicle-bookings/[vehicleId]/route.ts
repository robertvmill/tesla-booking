import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { vehicleId: string } }
) {
  const vehicleId = params.vehicleId;

  try {
    // Fetch all bookings for this vehicle
    const bookings = await prisma.booking.findMany({
      where: {
        vehicleId: vehicleId,
      },
      select: {
        id: true,
        startDate: true, 
        endDate: true,
        status: true,
        vehicleId: true,
        totalPrice: true,
        createdAt: true,
        updatedAt: true,
        userId: true
      }
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Error fetching vehicle bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch vehicle bookings' }, { status: 500 });
  }
} 