'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '../../components/ui/calendar';
import { type SelectRangeEventHandler, type DateRange } from 'react-day-picker';
import { Booking } from '@prisma/client';
import { addDays, format, isSameDay, isWithinInterval, startOfDay, isBefore, differenceInDays } from 'date-fns';
import { cn } from '../../../lib/utils';
import { useRouter } from 'next/navigation';

type VehicleAvailabilityCalendarProps = {
  vehicleId: string;
  bookings: Booking[];
  vehicleModel?: string;
  pricePerDay?: number;
};

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

  // Function to check if a date is booked
  const isDateBooked = (date: Date) => {
    return bookings.some((booking) => {
      const bookingStart = startOfDay(new Date(booking.startDate));
      const bookingEnd = startOfDay(new Date(booking.endDate));
      
      return isWithinInterval(date, {
        start: bookingStart,
        end: bookingEnd,
      }) && booking.status !== 'cancelled';
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
      }) && booking.status !== 'cancelled';
    });
  };

  // Calculate total price when date range changes
  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      const days = differenceInDays(dateRange.to, dateRange.from) + 1;
      setTotalPrice(days * pricePerDay);
    } else {
      setTotalPrice(0);
    }
  }, [dateRange, pricePerDay]);

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

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={handleSelect}
          className="rounded-md border"
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
          modifiersClassNames={{
            booked: "bg-red-100 text-red-800",
            selected: "bg-blue-100 text-blue-800"
          }}
          components={{
            DayContent: ({ date: dayDate }) => {
              const isBooked = isDateBooked(dayDate);
              
              return (
                <div
                  className={cn(
                    "w-full h-full flex items-center justify-center",
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
                  {format(dayDate, "d")}
                  {isBooked && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-red-600 rounded-full" />
                  )}
                </div>
              );
            },
          }}
        />
        
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 rounded-full"></div>
            <span className="text-sm">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 rounded-full"></div>
            <span className="text-sm">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border rounded-full"></div>
            <span className="text-sm">Available</span>
          </div>
        </div>
        
        {hoveredBooking && (
          <div className="mt-4 p-3 bg-gray-50 border rounded-md text-sm">
            <p className="font-semibold">Booking Info:</p>
            <p>Vehicle: {vehicleModel}</p>
            <p>Dates: {format(new Date(hoveredBooking.startDate), 'MMM d')} - {format(new Date(hoveredBooking.endDate), 'MMM d, yyyy')}</p>
            <p>Status: <span className="capitalize">{hoveredBooking.status}</span></p>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">
          {dateRange.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, 'MMMM d, yyyy')} - {format(dateRange.to, 'MMMM d, yyyy')}
                <p className="text-sm text-gray-600 mt-1">
                  {differenceInDays(dateRange.to, dateRange.from) + 1} days
                </p>
              </>
            ) : (
              <>
                {format(dateRange.from, 'MMMM d, yyyy')}
                <p className="text-sm text-gray-600 mt-1">Select end date</p>
              </>
            )
          ) : (
            <>
              Select dates
              <p className="text-sm text-gray-600 mt-1">Click to select start date</p>
            </>
          )}
        </h3>
        
        {dateRange.from && (
          <>
            {dateRange.to && hasDateRangeConflicts(dateRange.from, dateRange.to) ? (
              <div className="bg-red-50 p-4 rounded-md">
                <p className="text-red-800 mb-2">Some dates in your selection are already booked.</p>
                <p className="text-gray-700">
                  Please adjust your date range to avoid conflicts with existing bookings.
                </p>
              </div>
            ) : dateRange.to ? (
              <div className="bg-green-50 p-4 rounded-md">
                <p className="text-green-800 mb-2">This {vehicleModel} is available for your selected dates!</p>
                <div className="mt-3 mb-2">
                  <p className="font-semibold">Booking Summary:</p>
                  <p className="text-gray-700">{differenceInDays(dateRange.to, dateRange.from) + 1} days × ${pricePerDay}/day</p>
                  <p className="text-lg font-bold mt-1">Total: ${totalPrice}</p>
                </div>
                <button 
                  onClick={() => {
                    if (dateRange.from && dateRange.to) {
                      router.push(`/booking?vehicleId=${vehicleId}&from=${format(dateRange.from, 'yyyy-MM-dd')}&to=${format(dateRange.to, 'yyyy-MM-dd')}`);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md inline-block mt-2"
                >
                  Proceed to Booking
                </button>
              </div>
            ) : (
              <div className="bg-blue-50 p-4 rounded-md">
                <p className="text-blue-800 mb-2">Click on another date to complete your selection.</p>
                <p className="text-gray-700">
                  Click on another date to complete your selection.
                </p>
              </div>
            )}
          </>
        )}

        <div className="mt-6">
          <h4 className="font-semibold mb-2">Booking Instructions</h4>
          <ol className="text-gray-700 mb-4 list-decimal pl-5 space-y-1">
            <li>Select your check-in date first</li>
            <li>Then select your check-out date</li>
            <li>Review the booking summary</li>
            <li>Click &ldquo;Proceed to Booking&rdquo; to confirm</li>
          </ol>
          <p className="text-sm text-gray-500 mt-2">
            Note: Red dates are unavailable due to existing bookings.
          </p>
        </div>
      </div>
    </div>
  );
}
