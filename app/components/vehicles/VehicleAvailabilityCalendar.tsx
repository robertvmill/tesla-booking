'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '../../components/ui/calendar';
import { type SelectRangeEventHandler, type DateRange } from 'react-day-picker';
import { Booking } from '@prisma/client';
import { addDays, format, isSameDay, isWithinInterval, startOfDay, isBefore, differenceInDays, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
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
  pricePerDay = 5 
}: VehicleAvailabilityCalendarProps) {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined
  });
  const [hoveredBooking, setHoveredBooking] = useState<Booking | null>(null);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  // Keep track of daily prices
  const [dailyPrices, setDailyPrices] = useState<Map<string, DailyPrice>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Add current display month state
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Function to check if a date is booked
  const isDateBooked = (date: Date) => {
    return bookings.some((booking) => {
      const bookingStart = startOfDay(new Date(booking.startDate));
      const bookingEnd = startOfDay(new Date(booking.endDate));
      
      return isWithinInterval(date, {
        start: bookingStart,
        end: bookingEnd,
      }) && booking.status === 'confirmed'; // Only confirmed bookings block dates
    });
  };

  // Function to get all bookings for a specific date
  const getBookingsForDate = (date: Date) => {
    return bookings.filter((booking) => {
      const bookingStart = startOfDay(new Date(booking.startDate));
      const bookingEnd = startOfDay(new Date(booking.endDate));
      
      return isWithinInterval(date, {
        start: bookingStart,
        end: bookingEnd,
      }) && booking.status === 'confirmed'; // Only show confirmed bookings
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

  // Fetch pricing data for an entire month
  const fetchMonthPricing = async (month: Date) => {
    setIsLoading(true);
    try {
      // Get first and last day of the month
      const firstDay = startOfMonth(month);
      const lastDay = endOfMonth(month);
      
      // Create a date range to fetch
      const from = format(firstDay, 'yyyy-MM-dd');
      const to = format(lastDay, 'yyyy-MM-dd');
      
      // Fetch availability data from API
      const response = await fetch(`/api/availability?startDate=${from}&endDate=${to}`);
      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }
      
      const data = await response.json();
      const vehicleData = data.availableVehicles.find((v: {id: string}) => v.id === vehicleId);
      
      // Create a new daily prices map
      const newPrices = new Map<string, DailyPrice>();
      
      if (vehicleData) {
        // Get all days in the month
        const days = eachDayOfInterval({ start: firstDay, end: lastDay });
        
        // Check if special pricing data is available per day
        if (vehicleData.dailyPrices) {
          // API returned daily prices
          vehicleData.dailyPrices.forEach((dayData: {date: string, price: number, isSpecialPrice: boolean}) => {
            newPrices.set(dayData.date, {
              date: new Date(dayData.date),
              price: dayData.price,
              isSpecialPrice: dayData.isSpecialPrice
            });
          });
        } else if (vehicleData.hasSpecialPricing) {
          // Uniform special pricing
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
          // Regular pricing for all days
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
      
      // Merge with existing prices (to keep previously fetched months)
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

  // Calculate total price for selected date range
  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      let sum = 0;
      const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      
      days.forEach(day => {
        const price = getPriceForDate(day);
        sum += price;
      });
      
      setTotalPrice(sum);
    } else {
      setTotalPrice(0);
    }
  }, [dateRange, dailyPrices]);

  // Load pricing data when component mounts or month changes
  useEffect(() => {
    fetchMonthPricing(currentMonth);
  }, [currentMonth, vehicleId, pricePerDay]);

  // Handle month navigation
  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
  };

  // Check if a date range has any conflicts with existing bookings
  const hasDateRangeConflicts = (from: Date, to: Date) => {
    // Check each day in the range for conflicts
    let currentDate = startOfDay(new Date(from));
    const endDate = startOfDay(new Date(to));
    
    while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
      if (isDateBooked(currentDate)) {
        return true;
      }
      currentDate = addDays(currentDate, 1);
    }
    
    return false;
  };

  // Handle date range selection
  const handleSelect: SelectRangeEventHandler = (range) => {
    if (range) {
      setDateRange({
        from: range.from,
        to: range.to
      });
    }
  };

  // Main render function that returns the calendar UI
  return (
    // Adjust grid layout to give more space to the calendar column
    <div className="grid lg:grid-cols-[3fr_2fr] md:grid-cols-1 sm:grid-cols-1 gap-4 md:gap-6 lg:gap-8">
      {/* Left column containing the calendar */}
      <div className="w-full">
        {/* Calendar component with range selection mode */}
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={handleSelect}
          className="rounded-md border w-full text-sm md:text-base lg:text-lg"
          onMonthChange={handleMonthChange}
          // Custom styling classes for calendar elements
          classNames={{
            months: "flex flex-col space-y-4 sm:space-y-0 sm:space-x-4",
            month: "space-y-2 md:space-y-4 w-full",
            caption: "flex justify-center pt-1 relative items-center px-4 md:px-6",
            caption_label: "text-lg md:text-xl font-bold",
            nav: "space-x-1 flex items-center",
            nav_button: "h-7 w-7 md:h-9 md:w-9 bg-transparent p-0 hover:opacity-70",
            table: "w-full border-collapse",
            head_row: "flex w-full",
            head_cell: "rounded-md w-full font-semibold text-gray-500 h-8 md:h-10 flex items-center justify-center text-xs md:text-sm",
            row: "flex w-full mt-1 md:mt-2",
            cell: "relative p-0 text-center text-xs md:text-sm hover:bg-gray-100 rounded-md h-10 md:h-14 w-full flex justify-center items-center focus-within:relative focus-within:z-20",
            day: "h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 p-0 font-semibold flex items-center justify-center rounded-full hover:bg-gray-200 aria-selected:opacity-100",
            day_selected: "bg-blue-100 text-blue-800",
            day_today: "bg-gray-100 text-gray-900",
            day_outside: "opacity-50",
            day_disabled: "opacity-50 line-through",
            day_range_middle: "rounded-none",
            day_hidden: "invisible",
          }}
          // Custom modifiers for special date states
          modifiers={{
            booked: (date) => isDateBooked(date),
            selected: (date) => {
              // Mark single selected date
              if (dateRange.from && !dateRange.to && isSameDay(date, dateRange.from)) {
                return true;
              }
              // Mark date range
              if (dateRange.from && dateRange.to) {
                return isWithinInterval(date, {
                  start: dateRange.from,
                  end: dateRange.to
                });
              }
              return false;
            }
          }}
          // Classes for modified dates
          modifiersClassNames={{
            booked: "bg-red-100 text-red-800",
            selected: "bg-blue-100 text-blue-800"
          }}
          // Custom day cell rendering
          components={{
            DayContent: ({ date: dayDate }) => {
              const isBooked = isDateBooked(dayDate);
              const price = getPriceForDate(dayDate);
              const isSpecial = hasSpecialPricing(dayDate);
              
              return (
                <div
                  className={cn(
                    "w-full h-full flex flex-col items-center justify-center",
                    isBooked && "relative"
                  )}
                  onMouseEnter={() => {
                    if (isBooked) {
                      const bookingsForDay = getBookingsForDate(dayDate);
                      if (bookingsForDay.length > 0) {
                        setHoveredBooking(bookingsForDay[0]);
                      }
                    }
                  }}
                  onMouseLeave={() => setHoveredBooking(null)}
                >
                  <span className="text-xs sm:text-sm md:text-base">{format(dayDate, "d")}</span>
                  {!isBooked && (
                    <span className={cn(
                      "text-[8px] sm:text-[10px] md:text-[11px] font-medium",
                      isSpecial ? "text-green-700" : "text-gray-500"
                    )}>
                      ${price}
                    </span>
                  )}
                  {isBooked && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-red-600 rounded-full" />
                  )}
                </div>
              );
            },
          }}
        />
        
        {/* Calendar legend showing different date states */}
        <div className="mt-2 md:mt-4 flex flex-wrap items-center gap-2 md:gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 rounded-full"></div>
            <span className="text-xs">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 rounded-full"></div>
            <span className="text-xs">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border rounded-full"></div>
            <span className="text-xs">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border border-green-700 rounded-full flex items-center justify-center">
              <span className="text-[6px] text-green-700 font-bold">$</span>
            </div>
            <span className="text-xs">Special Pricing</span>
          </div>
        </div>
        
        {/* Booking info popup on hover */}
        {hoveredBooking && (
          <div className="mt-4 p-3 bg-gray-50 border rounded-md text-sm">
            <p className="font-semibold">Booking Info:</p>
            <p>Vehicle: {vehicleModel}</p>
            <p>Dates: {format(new Date(hoveredBooking.startDate), 'MMM d')} - {format(new Date(hoveredBooking.endDate), 'MMM d, yyyy')}</p>
            <p>Status: <span className="capitalize">{hoveredBooking.status}</span></p>
          </div>
        )}
      </div>

      {/* Right column containing booking details and instructions */}
      <div className="w-full">
        {/* Selected date range header */}
        <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-5">
          {dateRange.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, 'MMMM d, yyyy')} - {format(dateRange.to, 'MMMM d, yyyy')}
                <p className="text-xs md:text-sm text-gray-600 mt-1">
                  {differenceInDays(dateRange.to, dateRange.from) + 1} days
                </p>
              </>
            ) : (
              <>
                {format(dateRange.from, 'MMMM d, yyyy')}
                <p className="text-xs md:text-sm text-gray-600 mt-1">Select end date</p>
              </>
            )
          ) : (
            <>
              Select dates
              <p className="text-xs md:text-sm text-gray-600 mt-1">Click to select start date</p>
            </>
          )}
        </h3>
        
        {/* Booking status and summary section */}
        {dateRange.from && (
          <>
            {dateRange.to && hasDateRangeConflicts(dateRange.from, dateRange.to) ? (
              // Show error if dates conflict with existing bookings
              <div className="bg-red-50 p-3 md:p-5 rounded-md text-sm md:text-base">
                <p className="text-red-800 mb-2 text-base md:text-lg font-medium">Some dates in your selection are already booked.</p>
                <p className="text-gray-700">
                  Please adjust your date range to avoid conflicts with existing bookings.
                </p>
              </div>
            ) : dateRange.to ? (
              // Show booking summary if dates are valid
              <div className="bg-green-50 p-3 md:p-5 rounded-md">
                <p className="text-green-800 mb-2 md:mb-3 text-base md:text-lg font-medium">This {vehicleModel} is available for your selected dates!</p>
                <div className="mt-2 md:mt-4 mb-2 md:mb-3">
                  <p className="font-medium text-base md:text-lg">Booking Summary:</p>
                  {isLoading ? (
                    <p className="text-gray-700 text-sm md:text-base">Calculating price...</p>
                  ) : (
                    <div>
                      {/* Daily price breakdown */}
                      <div className="text-sm md:text-base mt-2 md:mt-3 mb-2 md:mb-3 max-h-32 md:max-h-40 overflow-y-auto">
                        {dateRange.from && dateRange.to && eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).map(day => (
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
                {/* Proceed to booking button */}
                <button 
                  onClick={() => {
                    if (dateRange.from && dateRange.to) {
                      router.push(`/booking?vehicleId=${vehicleId}&from=${format(dateRange.from, 'yyyy-MM-dd')}&to=${format(dateRange.to, 'yyyy-MM-dd')}`);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 md:py-3 px-4 md:px-6 rounded-md text-sm md:text-base w-full"
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
            <li>Select your check-in date first</li>
            <li>Then select your check-out date</li>
            <li>Review the booking summary</li>
            <li>Click &ldquo;Proceed to Booking&rdquo; to confirm</li>
          </ol>
          <p className="text-xs md:text-sm text-gray-500 mt-3">
            Note: Red dates are unavailable due to existing bookings. Green prices indicate special event pricing.
          </p>
        </div>
      </div>
    </div>
  );
}
