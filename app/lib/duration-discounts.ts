import prisma from './prisma';
import { differenceInDays } from 'date-fns';

export interface DurationDiscount {
  id: string;
  name: string;
  durationType: '3_days' | 'week' | '2_weeks' | 'month';
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  applyToAll: boolean;
  isActive: boolean;
  vehicles: { id: string; model: string }[];
}

export interface DiscountCalculationResult {
  discountApplied: boolean;
  discountAmount: number;
  discountName?: string;
  originalPrice: number;
  finalPrice: number;
}

// Helper function to get minimum days for each duration type
const getDurationMinimumDays = (durationType: string): number => {
  switch (durationType) {
    case '3_days':
      return 3;
    case 'week':
      return 7;
    case '2_weeks':
      return 14;
    case 'month':
      return 30;
    default:
      return 0;
  }
};

// Helper function to get duration priority (higher number = longer duration = higher priority)
const getDurationPriority = (durationType: string): number => {
  switch (durationType) {
    case 'month':
      return 4;
    case '2_weeks':
      return 3;
    case 'week':
      return 2;
    case '3_days':
      return 1;
    default:
      return 0;
  }
};

/**
 * Calculate the best duration discount for a booking
 * @param vehicleId - The ID of the vehicle being booked
 * @param startDate - The start date of the booking
 * @param endDate - The end date of the booking
 * @param basePrice - The base price for the booking (before discounts)
 * @returns Promise<DiscountCalculationResult>
 */
export async function calculateDurationDiscount(
  vehicleId: string,
  startDate: Date,
  endDate: Date,
  basePrice: number
): Promise<DiscountCalculationResult> {
  try {
    // Calculate the number of days in the booking
    const bookingDays = differenceInDays(endDate, startDate) + 1; // +1 to include both start and end dates
    
    // Get all active duration discounts that apply to this vehicle
    const discounts = await prisma.durationDiscount.findMany({
      where: {
        isActive: true,
        OR: [
          { applyToAll: true },
          {
            vehicles: {
              some: {
                id: vehicleId
              }
            }
          }
        ]
      },
      include: {
        vehicles: {
          select: {
            id: true,
            model: true
          }
        }
      }
    });
    
    // Filter discounts that apply to this booking duration
    const applicableDiscounts = discounts.filter(discount => {
      const minimumDays = getDurationMinimumDays(discount.durationType);
      return bookingDays >= minimumDays;
    });
    
    // If no discounts apply, return original price
    if (applicableDiscounts.length === 0) {
      return {
        discountApplied: false,
        discountAmount: 0,
        originalPrice: basePrice,
        finalPrice: basePrice
      };
    }
    
    // Sort discounts by priority (longest duration first) and then by discount value (highest first)
    const sortedDiscounts = applicableDiscounts.sort((a, b) => {
      const priorityA = getDurationPriority(a.durationType);
      const priorityB = getDurationPriority(b.durationType);
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Higher priority first
      }
      
      // If same priority, prefer higher discount value
      return b.discountValue - a.discountValue;
    });
    
    // Apply the best discount
    const bestDiscount = sortedDiscounts[0];
    let discountAmount = 0;
    
    if (bestDiscount.discountType === 'percentage') {
      discountAmount = (basePrice * bestDiscount.discountValue) / 100;
    } else {
      // Fixed amount discount
      discountAmount = bestDiscount.discountValue;
    }
    
    // Ensure discount doesn't exceed the base price
    discountAmount = Math.min(discountAmount, basePrice);
    
    const finalPrice = basePrice - discountAmount;
    
    return {
      discountApplied: true,
      discountAmount,
      discountName: bestDiscount.name,
      originalPrice: basePrice,
      finalPrice
    };
    
  } catch (error) {
    console.error('Error calculating duration discount:', error);
    // If there's an error, return original price without discount
    return {
      discountApplied: false,
      discountAmount: 0,
      originalPrice: basePrice,
      finalPrice: basePrice
    };
  }
}

/**
 * Get all duration discounts for a specific vehicle
 * @param vehicleId - The ID of the vehicle
 * @returns Promise<DurationDiscount[]>
 */
export async function getVehicleDurationDiscounts(vehicleId: string): Promise<DurationDiscount[]> {
  try {
    const discounts = await prisma.durationDiscount.findMany({
      where: {
        isActive: true,
        OR: [
          { applyToAll: true },
          {
            vehicles: {
              some: {
                id: vehicleId
              }
            }
          }
        ]
      },
      include: {
        vehicles: {
          select: {
            id: true,
            model: true
          }
        }
      },
      orderBy: [
        { durationType: 'desc' }, // Longest duration first
        { discountValue: 'desc' } // Highest discount first
      ]
    });
    
    return discounts;
  } catch (error) {
    console.error('Error fetching vehicle duration discounts:', error);
    return [];
  }
}

/**
 * Get a preview of potential discounts for different booking durations
 * @param vehicleId - The ID of the vehicle
 * @param pricePerDay - The daily price of the vehicle
 * @returns Promise<{durationType: string, days: number, discount: string, savings: number}[]>
 */
export async function getDurationDiscountPreview(vehicleId: string, pricePerDay: number) {
  const discounts = await getVehicleDurationDiscounts(vehicleId);
  const durations = [
    { type: '3_days', days: 3 },
    { type: 'week', days: 7 },
    { type: '2_weeks', days: 14 },
    { type: 'month', days: 30 }
  ];
  
  const preview = [];
  
  for (const duration of durations) {
    const basePrice = pricePerDay * duration.days;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + duration.days - 1);
    
    const result = await calculateDurationDiscount(vehicleId, startDate, endDate, basePrice);
    
    if (result.discountApplied) {
      preview.push({
        durationType: duration.type,
        days: duration.days,
        discount: result.discountName || 'Discount',
        savings: result.discountAmount,
        finalPrice: result.finalPrice
      });
    }
  }
  
  return preview;
} 