'use client';

import { useState, useEffect } from 'react';
import { Percent } from 'lucide-react';

interface DurationDiscount {
  id: string;
  name: string;
  durationType: '3_days' | 'week' | '2_weeks' | 'month';
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  applyToAll: boolean;
  isActive: boolean;
  vehicles: { id: string; model: string }[];
}

interface VehicleDurationDiscountsProps {
  vehicleId: string;
}

// Helper function to get duration labels
const getDurationLabel = (durationType: string): string => {
  switch (durationType) {
    case '3_days':
      return '3+ Days';
    case 'week':
      return '1+ Week';
    case '2_weeks':
      return '2+ Weeks';
    case 'month':
      return '1+ Month';
    default:
      return durationType;
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

export default function VehicleDurationDiscounts({ vehicleId }: VehicleDurationDiscountsProps) {
  const [discounts, setDiscounts] = useState<DurationDiscount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/admin/duration-discounts?vehicleId=${vehicleId}`);
        
        if (response.ok) {
          const data = await response.json();
          // Filter for active discounts and sort by priority
          const activeDiscounts = (data.discounts || [])
            .filter((discount: DurationDiscount) => discount.isActive)
            .sort((a: DurationDiscount, b: DurationDiscount) => 
              getDurationPriority(a.durationType) - getDurationPriority(b.durationType)
            );
          setDiscounts(activeDiscounts);
        }
      } catch (err) {
        console.error('Error fetching duration discounts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (vehicleId) {
      fetchDiscounts();
    }
  }, [vehicleId]);

  if (isLoading) {
    return (
      <div>
        <p className="text-sm text-gray-500">Discounts</p>
        <div className="flex items-center mt-1">
          <div className="animate-spin h-3 w-3 border-2 border-gray-600 border-t-transparent rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (discounts.length === 0) {
    return (
      <div>
        <p className="text-sm text-gray-500">Discounts</p>
        <p className="text-lg font-bold text-gray-900">None Available</p>
        <p className="text-xs text-gray-500">No special offers currently</p>
      </div>
    );
  }

  // Show the best discount (highest value)
  const bestDiscount = discounts.reduce((best, current) => {
    if (current.discountType === 'percentage' && best.discountType === 'percentage') {
      return current.discountValue > best.discountValue ? current : best;
    }
    if (current.discountType === 'fixed_amount' && best.discountType === 'fixed_amount') {
      return current.discountValue > best.discountValue ? current : best;
    }
    // Prefer percentage discounts over fixed amounts for display
    if (current.discountType === 'percentage' && best.discountType === 'fixed_amount') {
      return current;
    }
    return best;
  });

  return (
    <div>
      <p className="text-sm text-gray-500">Best Discount</p>
      <div className="flex items-center mt-1">
        <Percent className="h-4 w-4 text-green-600 mr-1" />
        <p className="text-lg font-bold text-green-700">
          {bestDiscount.discountType === 'percentage' 
            ? `${bestDiscount.discountValue}% off` 
            : `$${bestDiscount.discountValue} off`}
        </p>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {getDurationLabel(bestDiscount.durationType)} • {discounts.length > 1 ? `+${discounts.length - 1} more` : bestDiscount.name}
      </p>
    </div>
  );
} 