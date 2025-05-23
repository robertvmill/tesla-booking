import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { format, eachDayOfInterval } from 'date-fns';
import { Vehicle } from '@prisma/client';

// Define custom types for special pricing with vehicles relationship
interface SpecialPricingWithVehicles {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  priceType: string;
  priceValue: number;
  applyToAll: boolean;
  createdAt: Date;
  updatedAt: Date;
  vehicles: { id: string }[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
  }

  try {
    // Parse dates consistently to avoid timezone issues
    // Add 'T00:00:00' to ensure local timezone interpretation
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');

    // Get all vehicles
    const allVehicles = await prisma.vehicle.findMany();

    // Get bookings that overlap with the requested date range
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        AND: [
          { status: 'confirmed' },
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
    
    // Get any special pricing rules that apply to this date range
    // TODO: Fix special pricing integration after Prisma client update
    // const specialPricingRules = await (prisma as any).specialPricing.findMany({
    //   where: {
    //     AND: [
    //       { startDate: { lte: end } },
    //       { endDate: { gte: start } }
    //     ]
    //   },
    //   include: {
    //     vehicles: {
    //       select: {
    //         id: true
    //       }
    //     }
    //   }
    // }) as unknown as SpecialPricingWithVehicles[];
    const specialPricingRules: SpecialPricingWithVehicles[] = [];
    
    // Get all days in the range
    const allDaysInRange = eachDayOfInterval({ start, end });
    
    // Enhance available vehicles with adjusted prices
    const enhancedVehicles = availableVehicles.map((vehicle: Vehicle) => {
      // Default to standard pricing
      let hasSpecialPricing = false;
      let adjustedPricePerDay = vehicle.pricePerDay;
      
      // Generate daily prices for each day in the range
      const dailyPrices = allDaysInRange.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        
        // Find applicable rules for this vehicle on this specific day
        const applicableRules = specialPricingRules.filter((rule: SpecialPricingWithVehicles) => {
          const ruleStart = new Date(rule.startDate);
          const ruleEnd = new Date(rule.endDate);
          
          // Check if the day falls within the rule's date range
          const dayInRuleRange = day >= ruleStart && day <= ruleEnd;
          
          // Check if the rule applies to this vehicle
          const ruleAppliesToVehicle = rule.applyToAll || rule.vehicles.some((v: { id: string }) => v.id === vehicle.id);
          
          return dayInRuleRange && ruleAppliesToVehicle;
        });
        
        // Sort by creation date (newest first) to get precedence
        applicableRules.sort((a: SpecialPricingWithVehicles, b: SpecialPricingWithVehicles) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        // Default price for the day
        let dayPrice = vehicle.pricePerDay;
        let isSpecialPrice = false;
        
        // Apply the first (most recent) rule if any exist
        if (applicableRules.length > 0) {
          const rule = applicableRules[0];
          isSpecialPrice = true;
          hasSpecialPricing = true;
          
          if (rule.priceType === 'multiplier') {
            dayPrice = Math.round(vehicle.pricePerDay * rule.priceValue);
          } else if (rule.priceType === 'fixed') {
            dayPrice = Math.round(rule.priceValue);
          }
        }
        
        return {
          date: dayStr,
          price: dayPrice,
          isSpecialPrice
        };
      });
      
      // Calculate total price for the stay
      const totalPrice = dailyPrices.reduce((sum, day) => sum + day.price, 0);
      
      // Calculate average price per day (for backward compatibility)
      adjustedPricePerDay = hasSpecialPricing ? Math.round(totalPrice / dailyPrices.length) : vehicle.pricePerDay;
      
      return {
        ...vehicle,
        adjustedPricePerDay,
        totalPrice,
        hasSpecialPricing,
        dailyPrices
      };
    });

    return NextResponse.json({ availableVehicles: enhancedVehicles });
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 });
  }
}
