'use client';

import { useState, useEffect, useMemo } from 'react';
import { addDays, format, isSameDay, isWithinInterval, startOfDay, isBefore, differenceInDays, eachDayOfInterval, startOfMonth, endOfMonth, addMonths, isAfter, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Booking } from '@prisma/client';
import { cn } from '../../../lib/utils';
import { useRouter } from 'next/navigation';

type VehicleAvailabilityCalendarProps = {
  vehicleId: string;
  bookings: Booking[];
  vehicleModel?: string;
  pricePerDay?: number;
};

// Define interface for daily pricing
interface DailyPrice {
  date: Date;
  price: number;
  isSpecialPrice: boolean;
}

export default function VehicleAvailabilityCalendar({ 
  vehicleId, 
  bookings, 
  vehicleModel = "Vehicle", 
  pricePerDay = 200 
}: VehicleAvailabilityCalendarProps) {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [checkInDate, setCheckInDate] = useState<Date | null>(null);
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [dailyPrices, setDailyPrices] = useState<Map<string, DailyPrice>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Function to check if a date is booked
  const isDateBooked = (date: Date) => {
    return bookings.some((booking) => {
      const bookingStart = startOfDay(new Date(booking.startDate));
      const bookingEnd = startOfDay(new Date(booking.endDate));
      
      return isWithinInterval(date, {
        start: bookingStart,
        end: bookingEnd,
      }) && booking.status === 'confirmed';
    });
  };

  // Get price for a specific date
  const getPriceForDate = (date: Date): number => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return dailyPrices.has(dateKey) ? dailyPrices.get(dateKey)!.price : pricePerDay;
  };
  
  // Check if a date has special pricing
  const hasSpecialPricing = (date: Date): boolean => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return dailyPrices.has(dateKey) ? dailyPrices.get(dateKey)!.isSpecialPrice : false;
  };

  // Calculate total price
  const totalPrice = useMemo(() => {
    if (!checkInDate || !checkOutDate) return 0;
    let sum = 0;
    const days = eachDayOfInterval({ start: checkInDate, end: checkOutDate });
    
    days.forEach(day => {
      const price = getPriceForDate(day);
      sum += price;
    });
    
    return sum;
  }, [checkInDate, checkOutDate, dailyPrices]);

  // Handle date click
  const handleDateClick = (date: Date) => {
    if (isDateBooked(date) || isBefore(date, new Date())) return;

    if (!checkInDate || (checkInDate && checkOutDate)) {
      // Start new selection
      setCheckInDate(date);
      setCheckOutDate(null);
    } else if (isBefore(date, checkInDate)) {
      // If clicked date is before check-in, reset selection
      setCheckInDate(date);
      setCheckOutDate(null);
    } else {
      // Set check-out date
      setCheckOutDate(date);
    }
  };

  // Check if date is in range (including hover effect)
  const isDateInRange = (date: Date) => {
    if (!checkInDate) return false;
    
    if (!checkOutDate && hoveredDate && isAfter(hoveredDate, checkInDate)) {
      return (
        (isAfter(date, checkInDate) && isBefore(date, hoveredDate)) ||
        isSameDay(date, checkInDate) ||
        isSameDay(date, hoveredDate)
      );
    }
    
    if (checkOutDate) {
      return (
        (isAfter(date, checkInDate) && isBefore(date, checkOutDate)) ||
        isSameDay(date, checkInDate) ||
        isSameDay(date, checkOutDate)
      );
    }
    
    return isSameDay(date, checkInDate);
  };

  // Check if date is disabled
  const isDateDisabled = (date: Date) => {
    return isBefore(date, new Date()) || isDateBooked(date);
  };

  // Navigation functions
  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => addMonths(prev, direction === "next" ? 1 : -1));
  };

  const clearDates = () => {
    setCheckInDate(null);
    setCheckOutDate(null);
  };

  // Fetch pricing data for an entire month
  const fetchMonthPricing = async (month: Date) => {
    setIsLoading(true);
    try {
      const firstDay = startOfMonth(month);
      const lastDay = endOfMonth(month);
      const from = format(firstDay, 'yyyy-MM-dd');
      const to = format(lastDay, 'yyyy-MM-dd');
      
      const response = await fetch(`/api/availability?startDate=${from}&endDate=${to}`);
      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }
      
      const data = await response.json();
      const vehicleData = data.availableVehicles.find((v: {id: string}) => v.id === vehicleId);
      
      const newPrices = new Map<string, DailyPrice>();
      
      if (vehicleData) {
        const days = eachDayOfInterval({ start: firstDay, end: lastDay });
        
        if (vehicleData.dailyPrices) {
          vehicleData.dailyPrices.forEach((dayData: {date: string, price: number, isSpecialPrice: boolean}) => {
            newPrices.set(dayData.date, {
              date: new Date(dayData.date),
              price: dayData.price,
              isSpecialPrice: dayData.isSpecialPrice
            });
          });
        } else if (vehicleData.hasSpecialPricing) {
          const dayPrice = vehicleData.adjustedPricePerDay || pricePerDay;
          days.forEach(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            newPrices.set(dateKey, {
              date: day,
              price: dayPrice,
              isSpecialPrice: true
            });
          });
        } else {
          days.forEach(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            newPrices.set(dateKey, {
              date: day, 
              price: pricePerDay,
              isSpecialPrice: false
            });
          });
        }
      }
      
      setDailyPrices(prevPrices => {
        const merged = new Map(prevPrices);
        newPrices.forEach((value, key) => {
          merged.set(key, value);
        });
        return merged;
      });
    } catch (error) {
      console.error('Error fetching monthly pricing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load pricing data when component mounts or month changes
  useEffect(() => {
    fetchMonthPricing(currentMonth);
    // Also fetch next month for dual display
    const nextMonth = addMonths(currentMonth, 1);
    fetchMonthPricing(nextMonth);
  }, [currentMonth, vehicleId, pricePerDay]);

  // Helper function to render calendar days
  const renderCalendarDays = (monthOffset: number = 0) => {
    const targetMonth = addMonths(currentMonth, monthOffset);
    const monthStart = startOfMonth(targetMonth);
    const monthEnd = endOfMonth(targetMonth);
    const startDate = monthStart;
    const endDate = monthEnd;

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    // Add empty cells for days before month start
    const startDay = day.getDay();
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    while (day <= endDate) {
      formattedDate = format(day, dateFormat);
      const cloneDay = day;
      const isDisabled = isDateDisabled(cloneDay);
      const isInRange = isDateInRange(cloneDay);
      const isCheckIn = checkInDate && isSameDay(cloneDay, checkInDate);
      const isCheckOut = checkOutDate && isSameDay(cloneDay, checkOutDate);
      const isToday = isSameDay(cloneDay, new Date());
      const price = getPriceForDate(cloneDay);
      const isSpecial = hasSpecialPricing(cloneDay);

      days.push(
        <div key={day.toString()} className="aspect-square relative">
          <button
            onClick={() => handleDateClick(cloneDay)}
            onMouseEnter={() => checkInDate && !checkOutDate && setHoveredDate(cloneDay)}
            onMouseLeave={() => setHoveredDate(null)}
            disabled={isDisabled}
            className={cn(
              "w-full h-full flex items-center justify-center text-sm transition-all duration-200 relative z-10",
              isDisabled 
                ? "text-gray-300 cursor-not-allowed" 
                : "hover:bg-gray-100 cursor-pointer text-gray-900",
              isToday && !isCheckIn && !isCheckOut && "bg-blue-100 text-blue-900 font-semibold",
              isInRange && !isCheckIn && !isCheckOut && "bg-red-50 text-red-900",
              (isCheckIn || isCheckOut) && "bg-red-600 text-white font-semibold rounded-md",
              isInRange && "relative"
            )}
          >
            {formattedDate}
          </button>
          
          {/* Price display */}
          {!isDisabled && (
            <div className="absolute -bottom-1 left-0 right-0 flex justify-center pointer-events-none z-30">
              <span 
                className={cn(
                  "text-[10px] leading-none px-1 py-0.5 rounded",
                  isSpecial ? "text-green-600 font-semibold bg-white/90" : "text-gray-500 bg-white/90"
                )}
              >
                ${price}
              </span>
            </div>
          )}
          
          {/* Range background */}
          {isInRange && !isCheckIn && !isCheckOut && (
            <div className="absolute inset-0 bg-red-50 -z-10" />
          )}
        </div>
      );

      if (days.length === 7) {
        rows.push(<div key={day.toString()} className="grid grid-cols-7 gap-1">{days}</div>);
        days = [];
      }
      day = addDays(day, 1);
    }

    if (days.length > 0) {
      rows.push(<div key={day.toString()} className="grid grid-cols-7 gap-1">{days}</div>);
    }

    return rows;
  };

  return (
    <div className="grid lg:grid-cols-[3fr_2fr] md:grid-cols-1 sm:grid-cols-1 gap-4 md:gap-6 lg:gap-8">
      {/* Left column - Calendar Component */}
      <div className="w-full">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="text-center space-y-2 mb-6">
            <h2 className="text-xl font-semibold text-gray-900">When would you like to book?</h2>
            <p className="text-gray-600">Select your pickup and return dates</p>
          </div>

          {/* Date Selection Display */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <div className="border border-gray-300 rounded-l-lg p-3">
              <p className="text-xs font-semibold text-gray-700 uppercase">Pickup</p>
              <p className="text-sm">{checkInDate ? format(checkInDate, "MMM d, yyyy") : "Add date"}</p>
            </div>
            <div className="border border-gray-300 rounded-r-lg p-3">
              <p className="text-xs font-semibold text-gray-700 uppercase">Return</p>
              <p className="text-sm">{checkOutDate ? format(checkOutDate, "MMM d, yyyy") : "Add date"}</p>
            </div>
          </div>

          {/* Calendar Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigateMonth("prev")}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              disabled={isSameMonth(currentMonth, new Date())}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col sm:flex-row sm:gap-8 gap-2 items-center">
              <h4 className="text-sm font-semibold">{format(currentMonth, "MMMM yyyy")}</h4>
              <h4 className="text-sm font-semibold hidden sm:block">{format(addMonths(currentMonth, 1), "MMMM yyyy")}</h4>
            </div>
            <button 
              onClick={() => navigateMonth("next")} 
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="flex flex-col sm:flex-row sm:gap-8 justify-center mb-6 gap-4">
            {/* First Month */}
            <div className="space-y-2 flex-1">
              {/* Month title for mobile */}
              <h4 className="text-sm font-semibold text-center sm:hidden">{format(currentMonth, "MMMM yyyy")}</h4>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <div key={day} className="h-6 flex items-center justify-center text-xs text-gray-500 font-medium">
                    {day}
                  </div>
                ))}
              </div>
              {/* Calendar days */}
              <div className="space-y-1">
                {renderCalendarDays(0)}
              </div>
            </div>

            {/* Second Month */}
            <div className="space-y-2 flex-1">
              {/* Month title for mobile */}
              <h4 className="text-sm font-semibold text-center sm:hidden">{format(addMonths(currentMonth, 1), "MMMM yyyy")}</h4>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <div key={day} className="h-6 flex items-center justify-center text-xs text-gray-500 font-medium">
                    {day}
                  </div>
                ))}
              </div>
              {/* Calendar days */}
              <div className="space-y-1">
                {renderCalendarDays(1)}
              </div>
            </div>
          </div>

          {/* Clear dates button */}
          {(checkInDate || checkOutDate) && (
            <div className="flex justify-center mb-4">
              <button onClick={clearDates} className="text-sm text-gray-600 underline hover:text-gray-800">
                Clear dates
              </button>
            </div>
          )}

          {/* Calendar legend */}
          <div className="flex flex-wrap items-center gap-4 text-sm bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>
              <span className="text-sm text-gray-700">Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-600 rounded"></div>
              <span className="text-sm text-gray-700">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
              <span className="text-sm text-gray-700">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-50 border border-green-200 rounded flex items-center justify-center">
                <span className="text-[8px] text-green-600 font-bold">*</span>
              </div>
              <span className="text-sm text-gray-700">Special Pricing</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right column - Booking Details */}
      <div className="w-full">
        <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-5">
          {checkInDate ? (
            checkOutDate ? (
              <>
                {format(checkInDate, 'MMMM d, yyyy')} - {format(checkOutDate, 'MMMM d, yyyy')}
                <p className="text-xs md:text-sm text-gray-600 mt-1">
                  {differenceInDays(checkOutDate, checkInDate)} days
                </p>
              </>
            ) : (
              <>
                {format(checkInDate, 'MMMM d, yyyy')}
                <p className="text-xs md:text-sm text-gray-600 mt-1">Select return date</p>
              </>
            )
          ) : (
            <>
              Select dates
              <p className="text-xs md:text-sm text-gray-600 mt-1">Click to select pickup date</p>
            </>
          )}
        </h3>
        
        {/* Booking status and summary section */}
        {checkInDate && (
          <>
            {checkOutDate ? (
              <div className="bg-green-50 p-3 md:p-5 rounded-md">
                <p className="text-green-800 mb-2 md:mb-3 text-base md:text-lg font-medium">This {vehicleModel} is available for your selected dates!</p>
                <div className="mt-2 md:mt-4 mb-2 md:mb-3">
                  <p className="font-medium text-base md:text-lg">Booking Summary:</p>
                  {isLoading ? (
                    <p className="text-gray-700 text-sm md:text-base">Calculating price...</p>
                  ) : (
                    <div>
                      <div className="text-sm md:text-base mt-2 md:mt-3 mb-2 md:mb-3 max-h-32 md:max-h-40 overflow-y-auto">
                        {checkInDate && checkOutDate && eachDayOfInterval({ start: checkInDate, end: checkOutDate }).map(day => (
                          <div key={format(day, 'yyyy-MM-dd')} className="flex justify-between text-gray-700 py-1">
                            <span>{format(day, 'MMM d')}</span>
                            <span className={cn(hasSpecialPricing(day) ? "text-green-700 font-medium" : "")}>
                              ${getPriceForDate(day)}/day
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="text-base md:text-xl font-bold mt-2 pt-2 border-t">Total: ${totalPrice}</p>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => {
                    if (checkInDate && checkOutDate) {
                      router.push(`/booking?vehicleId=${vehicleId}&from=${format(checkInDate, 'yyyy-MM-dd')}&to=${format(checkOutDate, 'yyyy-MM-dd')}`);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 md:py-3 px-4 md:px-6 rounded-md text-sm md:text-base w-full transition-colors"
                >
                  Proceed to Booking
                </button>
              </div>
            ) : (
              <div className="bg-blue-50 p-3 md:p-5 rounded-md text-sm md:text-base">
                <p className="text-blue-800 mb-2 text-base md:text-lg font-medium">Click on another date to complete your selection.</p>
              </div>
            )}
          </>
        )}

        <div className="mt-6 md:mt-8">
          <h4 className="font-semibold mb-3 text-base md:text-lg">Booking Instructions</h4>
          <ol className="text-gray-700 mb-4 list-decimal pl-5 space-y-1 md:space-y-2 text-sm md:text-base">
            <li>Select your pickup date first</li>
            <li>Then select your return date</li>
            <li>Review the booking summary</li>
            <li>Click &ldquo;Proceed to Booking&rdquo; to confirm</li>
          </ol>
          <p className="text-xs md:text-sm text-gray-500 mt-3">
            Note: Gray dates are unavailable due to existing bookings. Green prices indicate special event pricing.
          </p>
        </div>
      </div>
    </div>
  );
}
