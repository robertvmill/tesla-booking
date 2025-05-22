import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all vehicles
    const allVehicles = await prisma.vehicle.findMany();

    // Get bookings that overlap with the requested date range
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        AND: [
          { status: { not: 'cancelled' } },
          {
            OR: [
              {
                AND: [
                  { startDate: { lte: end } },
                  { endDate: { gte: start } }
                ]
              }
            ]
          }
        ]
      },
      select: {
        vehicleId: true
      }
    });

    // Get ids of vehicles that are booked during the requested period
    const bookedVehicleIds = overlappingBookings.map(booking => booking.vehicleId);

    // Filter out the booked vehicles
    const availableVehicles = allVehicles.filter(
      vehicle => !bookedVehicleIds.includes(vehicle.id)
    );

    return NextResponse.json({ availableVehicles });
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 });
  }
}
