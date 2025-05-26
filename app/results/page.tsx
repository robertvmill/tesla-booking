'use client';

/**
 * Results Page Component
 * 
 * A responsive page that displays available Tesla vehicles based on selected dates:
 * - Fetches available vehicles from API based on date range
 * - Displays vehicles in a responsive grid layout
 * - Handles booking creation and Stripe checkout flow
 * - Shows loading states and error handling
 * 
 * Design Notes:
 * - Clean, minimal layout with consistent spacing
 * - Card-based design for vehicle listings
 * - Responsive grid: 1 column mobile, 2 cols tablet, 3 cols desktop
 * - Image handling with Next.js Image component for optimization
 * - Loading spinner and error states for better UX
 * - Hover effects on cards for interactivity
 * - Clear CTAs with red brand color
 */

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from "sonner";

interface Vehicle {
  id: string;
  model: string;
  description: string;
  pricePerDay: number;
  image: string;
  totalPrice?: number;
  originalPrice?: number;
  discountApplied?: boolean;
  discountAmount?: number;
  discountName?: string;
  dailyBreakdown?: Array<{date: string, price: number, isSpecialPrice: boolean}>;
}

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

function ResultsContent() {
  const searchParams = useSearchParams();
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState<string | null>(null);

  // Calculate number of days
  const numberOfDays = startDate && endDate ? 
    Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;

  useEffect(() => {
    async function fetchVehicles() {
      if (!startDate || !endDate) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/availability?startDate=${startDate}&endDate=${endDate}`);
        if (!response.ok) throw new Error('Failed to fetch vehicles');
        const data = await response.json();
        
        // Process vehicles with pricing information
        const vehiclesWithPricing = await Promise.all(
          (data.availableVehicles || []).map(async (vehicle: Vehicle) => {
            try {
              // Fetch duration discounts for this vehicle
              const discountResponse = await fetch(`/api/admin/duration-discounts?vehicleId=${vehicle.id}`);
              let discounts: DurationDiscount[] = [];
              if (discountResponse.ok) {
                const discountData = await discountResponse.json();
                discounts = discountData.discounts || [];
              }

              // Calculate pricing
              let totalPrice = 0;
              let dailyBreakdown = [];
              
              // If vehicle has daily pricing from the API response
              if (vehicle.dailyBreakdown && Array.isArray(vehicle.dailyBreakdown)) {
                dailyBreakdown = vehicle.dailyBreakdown;
                totalPrice = vehicle.dailyBreakdown.reduce((sum: number, day: {price: number}) => sum + day.price, 0);
              } else {
                // Calculate based on number of days and base price
                const currentDate = new Date(startDate);
                const endDateObj = new Date(endDate);
                
                while (currentDate <= endDateObj) {
                  dailyBreakdown.push({
                    date: currentDate.toISOString().split('T')[0],
                    price: vehicle.pricePerDay || 200,
                    isSpecialPrice: false
                  });
                  totalPrice += vehicle.pricePerDay || 200;
                  currentDate.setDate(currentDate.getDate() + 1);
                }
              }

              // Calculate duration discount
              const bookingDays = numberOfDays;
              let bestDiscount: DurationDiscount | null = null;
              let discountAmount = 0;

              if (discounts.length > 0) {
                const applicableDiscounts = discounts.filter((discount: DurationDiscount) => {
                  const minimumDays = getDurationMinimumDays(discount.durationType);
                  return bookingDays >= minimumDays && discount.isActive;
                });

                if (applicableDiscounts.length > 0) {
                  // Sort by priority (longest duration first) and then by discount value
                  const sortedDiscounts = applicableDiscounts.sort((a: DurationDiscount, b: DurationDiscount) => {
                    const priorityA = getDurationPriority(a.durationType);
                    const priorityB = getDurationPriority(b.durationType);
                    
                    if (priorityA !== priorityB) {
                      return priorityB - priorityA;
                    }
                    
                    return b.discountValue - a.discountValue;
                  });

                  bestDiscount = sortedDiscounts[0];
                  
                  if (bestDiscount.discountType === 'percentage') {
                    discountAmount = (totalPrice * bestDiscount.discountValue) / 100;
                  } else {
                    discountAmount = bestDiscount.discountValue;
                  }
                  
                  discountAmount = Math.min(discountAmount, totalPrice);
                }
              }

              const finalPrice = totalPrice - discountAmount;

              return {
                ...vehicle,
                totalPrice: finalPrice,
                originalPrice: totalPrice,
                discountApplied: discountAmount > 0,
                discountAmount,
                discountName: bestDiscount?.name,
                dailyBreakdown
              };
            } catch (error) {
              console.error(`Error calculating pricing for vehicle ${vehicle.id}:`, error);
              return {
                ...vehicle,
                totalPrice: (vehicle.pricePerDay || 200) * numberOfDays,
                originalPrice: (vehicle.pricePerDay || 200) * numberOfDays,
                discountApplied: false
              };
            }
          })
        );
        
        setVehicles(vehiclesWithPricing);
      } catch (error) {
        console.error(error);
        toast.error("Couldn't load available vehicles");
      } finally {
        setLoading(false);
      }
    }
    
    fetchVehicles();
  }, [startDate, endDate, numberOfDays]);

  // Helper functions for duration discounts
  const getDurationMinimumDays = (durationType: string): number => {
    switch (durationType) {
      case '3_days': return 3;
      case 'week': return 7;
      case '2_weeks': return 14;
      case 'month': return 30;
      default: return 0;
    }
  };

  const getDurationPriority = (durationType: string): number => {
    switch (durationType) {
      case 'month': return 4;
      case '2_weeks': return 3;
      case 'week': return 2;
      case '3_days': return 1;
      default: return 0;
    }
  };

  async function createBooking(vehicleId: string) {
    if (!startDate || !endDate || !vehicleId) {
      toast.error("Missing booking information");
      return;
    }
    
    setIsBooking(vehicleId);
    
    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleId,
          startDate,
          endDate,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }
      
      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error(error);
      toast.error("Failed to create checkout. Please try again.");
      setIsBooking(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 pt-16">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Enhanced Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full mb-3">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-gray-700">Search Results</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900">
            Available Tesla Vehicles
          </h1>
        </div>
        
        {/* Enhanced Date Selection Display */}
        <div className="relative mb-8">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Selected Dates</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {startDate && endDate ? 
                      `${new Date(startDate).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })} to ${new Date(endDate).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}` 
                      : 'No dates selected'
                    }
                  </p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Duration</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {numberOfDays} {numberOfDays === 1 ? 'day' : 'days'}
                  </p>
                </div>
              </div>
              <Link 
                href="/" 
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg text-center text-sm"
              >
                ← Change Dates
              </Link>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200"></div>
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-red-600 absolute top-0 left-0"></div>
            </div>
            <p className="mt-3 text-gray-600 font-medium">Finding available vehicles...</p>
          </div>
        ) : vehicles.length > 0 ? (
          <div className="space-y-6">
            {vehicles.map((vehicle, index) => (
              <div key={vehicle.id} className="group relative">
                {/* Subtle background effect */}
                <div className="absolute inset-0 bg-gray-100 rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 -z-10"></div>
                
                <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-500 group-hover:scale-[1.01]">
                  <div className="flex flex-col lg:flex-row">
                    {/* Enhanced Image Section */}
                    <div className="lg:w-2/5 h-48 lg:h-auto bg-gray-100 relative overflow-hidden">
                      {vehicle.image && (
                        <Image
                          src={vehicle.image}
                          alt={vehicle.model}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      )}
                      {/* Subtle overlay */}
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      {/* Vehicle number badge */}
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center font-bold text-gray-800 shadow-md text-sm">
                        {index + 1}
                      </div>
                    </div>
                    
                    {/* Enhanced Content Section */}
                    <div className="p-6 lg:w-3/5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl lg:text-2xl font-bold mb-2 text-gray-900 group-hover:text-red-700 transition-colors">
                              Tesla {vehicle.model}
                            </h3>
                            <p className="text-gray-600 text-base leading-relaxed">{vehicle.description}</p>
                          </div>
                        </div>
                        
                        {/* Enhanced Pricing Section */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                <p className="text-xs font-semibold text-gray-700">Total for {numberOfDays} days</p>
                              </div>
                              {vehicle.discountApplied && (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 rounded-full">
                                  <span className="text-xs text-green-700">✓</span>
                                  <span className="text-xs text-green-700 font-medium">{vehicle.discountName}</span>
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              {vehicle.discountApplied && (
                                <p className="text-base text-gray-500 line-through mb-1">${vehicle.originalPrice}</p>
                              )}
                              <div className="flex items-baseline gap-2">
                                <p className="text-2xl lg:text-3xl font-bold text-gray-900">
                                  ${vehicle.totalPrice}
                                </p>
                                {vehicle.discountApplied && (
                                  <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full">
                                    Save ${vehicle.discountAmount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Enhanced Daily breakdown */}
                          {vehicle.dailyBreakdown && vehicle.dailyBreakdown.length > 0 && (
                            <details className="mt-3 group/details">
                              <summary className="text-xs text-gray-600 cursor-pointer hover:text-red-600 transition-colors font-medium flex items-center gap-2">
                                <span>View daily breakdown</span>
                                <svg className="w-3 h-3 transition-transform group-open/details:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </summary>
                              <div className="mt-3 bg-white rounded-lg p-3 border border-gray-200 max-h-32 overflow-y-auto">
                                <div className="space-y-1">
                                  {vehicle.dailyBreakdown.map((day, index) => (
                                    <div key={index} className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
                                      <span className="text-xs text-gray-700 font-medium">
                                        {new Date(day.date).toLocaleDateString('en-US', { 
                                          weekday: 'short', 
                                          month: 'long', 
                                          day: 'numeric' 
                                        })}
                                      </span>
                                      <span className={`text-xs font-semibold ${
                                        day.isSpecialPrice 
                                          ? "text-green-600 bg-green-50 px-2 py-0.5 rounded-full" 
                                          : "text-gray-900"
                                      }`}>
                                        ${day.price}/day
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                      
                      {/* Enhanced Action Button */}
                      <div className="flex justify-end">
                        <button 
                          onClick={() => createBooking(vehicle.id)}
                          disabled={isBooking === vehicle.id}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-xl font-semibold text-base transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none flex items-center gap-2"
                        >
                          {isBooking === vehicle.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              Book for ${vehicle.totalPrice}
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                              </svg>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-3 text-gray-900">No Vehicles Available</h2>
              <p className="text-gray-600 mb-6 text-base leading-relaxed">
                Sorry, we don&apos;t have any Tesla vehicles available for the selected dates. 
                Try adjusting your dates or check back later.
              </p>
              <Link 
                href="/" 
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Try Different Dates
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
          </div>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
