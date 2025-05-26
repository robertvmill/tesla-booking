'use client';

import React, { useState } from "react";
import { Search, ChevronLeft, ChevronRight, Calendar, MapPin, X, LogIn, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { toast } from "sonner";
import { addDays, format, isSameDay, isBefore, addMonths, startOfMonth, endOfMonth, isAfter, isSameMonth } from 'date-fns';
import { cn } from '../../../lib/utils';

const BookingSearchBar: React.FC = () => {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const router = useRouter();
  const { status } = useSession();

  const handleSearch = () => {
    if (!startDate || !endDate) {
      toast.error("Please select both dates");
      return;
    }

    if (startDate > endDate) {
      toast.error("Start date must be before end date");
      return;
    }

    // Check if user is authenticated
    if (status === 'unauthenticated') {
      setShowAuthModal(true);
      return;
    }

    // If user is authenticated, proceed with search
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    // Navigate to search results page with date parameters
    router.push(`/results?startDate=${startStr}&endDate=${endStr}`);
  };

  // Handle date click in calendar
  const handleDateClick = (date: Date) => {
    if (isBefore(date, new Date())) return;

    if (!startDate || (startDate && endDate)) {
      // Start new selection
      setStartDate(date);
      setEndDate(undefined);
    } else if (isBefore(date, startDate)) {
      // If clicked date is before start date, reset selection
      setStartDate(date);
      setEndDate(undefined);
    } else {
      // Set end date
      setEndDate(date);
    }
  };

  // Check if date is in range (including hover effect)
  const isDateInRange = (date: Date) => {
    if (!startDate) return false;
    
    if (!endDate && hoveredDate && isAfter(hoveredDate, startDate)) {
      return (
        (isAfter(date, startDate) && isBefore(date, hoveredDate)) ||
        isSameDay(date, startDate) ||
        isSameDay(date, hoveredDate)
      );
    }
    
    if (endDate) {
      return (
        (isAfter(date, startDate) && isBefore(date, endDate)) ||
        isSameDay(date, startDate) ||
        isSameDay(date, endDate)
      );
    }
    
    return isSameDay(date, startDate);
  };

  // Check if date is disabled
  const isDateDisabled = (date: Date) => {
    return isBefore(date, new Date());
  };

  // Navigation functions
  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => addMonths(prev, direction === "next" ? 1 : -1));
  };

  const clearDates = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  // Helper function to render calendar days
  const renderCalendarDays = (monthOffset: number = 0) => {
    const targetMonth = addMonths(currentMonth, monthOffset);
    const monthStart = startOfMonth(targetMonth);
    const monthEnd = endOfMonth(targetMonth);
    const calendarStartDate = monthStart;
    const calendarEndDate = monthEnd;

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = calendarStartDate;
    let formattedDate = "";

    // Add empty cells for days before month start
    const startDay = day.getDay();
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    while (day <= calendarEndDate) {
      formattedDate = format(day, dateFormat);
      const cloneDay = day;
      const isDisabled = isDateDisabled(cloneDay);
      const isInRange = isDateInRange(cloneDay);
      const isStart = startDate && isSameDay(cloneDay, startDate);
      const isEnd = endDate && isSameDay(cloneDay, endDate);
      const isToday = isSameDay(cloneDay, new Date());

      days.push(
        <div key={day.toString()} className="aspect-square relative">
          <button
            onClick={() => handleDateClick(cloneDay)}
            onMouseEnter={() => startDate && !endDate && setHoveredDate(cloneDay)}
            onMouseLeave={() => setHoveredDate(null)}
            disabled={isDisabled}
            className={cn(
              "w-full h-full flex items-center justify-center text-sm transition-all duration-200 relative z-10 rounded-lg",
              isDisabled 
                ? "text-gray-300 cursor-not-allowed" 
                : "hover:bg-red-50 hover:text-red-700 cursor-pointer text-gray-900 hover:scale-105",
              isToday && !isStart && !isEnd && "bg-blue-50 text-blue-700 font-semibold ring-2 ring-blue-200",
              isInRange && !isStart && !isEnd && "bg-red-50 text-red-900",
              (isStart || isEnd) && "bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold shadow-lg scale-105",
              isInRange && "relative"
            )}
          >
            {formattedDate}
          </button>
          
          {/* Range background */}
          {isInRange && !isStart && !isEnd && (
            <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-red-100 -z-10 rounded-lg" />
          )}
        </div>
      );

      if (days.length === 7) {
        rows.push(<div key={day.toString()} className="grid grid-cols-7 gap-2">{days}</div>);
        days = [];
      }
      day = addDays(day, 1);
    }

    if (days.length > 0) {
      rows.push(<div key={day.toString()} className="grid grid-cols-7 gap-2">{days}</div>);
    }

    return rows;
  };

  return (
    <>
      <div className="w-full max-w-4xl mx-auto px-4">
        {/* Hero Section with Gradient Background */}
        <div className="text-center mb-6 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-red-50 via-white to-red-50 rounded-3xl -z-10"></div>
          <div className="py-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-gray-900 via-red-800 to-gray-900 bg-clip-text text-transparent">
              Book Your Tesla Experience
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-2">
              Select your dates to check vehicle availability
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <MapPin className="h-4 w-4" />
              <span>Premium electric vehicles • Instant booking</span>
            </div>
          </div>
        </div>
        
        {/* Enhanced date selector with gradient and shadows */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700 rounded-3xl blur-xl opacity-20 -z-10"></div>
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-3 md:p-4">
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              <div className="flex-1 flex flex-col md:flex-row gap-3">
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="group flex-1 px-4 py-3 text-left hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 rounded-2xl transition-all duration-300 border-2 border-transparent hover:border-red-200 hover:shadow-lg"
                >
                  <div className="flex items-center gap-3 mb-1">
                    <Calendar className="h-5 w-5 text-red-600 group-hover:scale-110 transition-transform" />
                    <p className="text-sm md:text-base text-red-600 font-semibold">From</p>
                  </div>
                  <p className="text-gray-900 text-base md:text-lg font-medium">
                    {startDate ? format(startDate, "MMM d, yyyy") : "Select start date"}
                  </p>
                </button>
                
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="group flex-1 px-4 py-3 text-left hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 rounded-2xl transition-all duration-300 border-2 border-transparent hover:border-red-200 hover:shadow-lg"
                >
                  <div className="flex items-center gap-3 mb-1">
                    <Calendar className="h-5 w-5 text-red-600 group-hover:scale-110 transition-transform" />
                    <p className="text-sm md:text-base text-red-600 font-semibold">Until</p>
                  </div>
                  <p className="text-gray-900 text-base md:text-lg font-medium">
                    {endDate ? format(endDate, "MMM d, yyyy") : "Select end date"}
                  </p>
                </button>
              </div>
              
              <div className="flex items-center justify-center">
                <Button
                  onClick={handleSearch}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-2xl w-14 h-14 md:w-16 md:h-16 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-2xl shadow-lg border-0"
                  type="button"
                >
                  <Search className="h-5 w-5 md:h-6 md:w-6" />
                  <span className="sr-only">Search</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Calendar dropdown */}
        {showCalendar && (
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-red-600/10 rounded-2xl blur-xl -z-10"></div>
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl p-4 md:p-6">
              <div className="text-center space-y-2 mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-50 to-red-100 rounded-full">
                  <Calendar className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700">Select Dates</span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">When would you like to book?</h2>
                <p className="text-base md:text-lg text-gray-600">Choose your pickup and return dates</p>
              </div>

              {/* Enhanced Date Selection Display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-3 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Pickup Date</p>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">{startDate ? format(startDate, "MMM d, yyyy") : "Select date"}</p>
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-3 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Return Date</p>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">{endDate ? format(endDate, "MMM d, yyyy") : "Select date"}</p>
                </div>
              </div>

              {/* Enhanced Calendar Navigation */}
              <div className="flex items-center justify-between mb-6 bg-gray-50 rounded-xl p-3">
                <button
                  onClick={() => navigateMonth("prev")}
                  className="p-2 hover:bg-white rounded-xl transition-all duration-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSameMonth(currentMonth, new Date())}
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex flex-col sm:flex-row sm:gap-6 gap-1 items-center">
                  <h4 className="text-lg font-bold text-gray-900">{format(currentMonth, "MMMM yyyy")}</h4>
                  <h4 className="text-lg font-bold text-gray-900 hidden lg:block">{format(addMonths(currentMonth, 1), "MMMM yyyy")}</h4>
                </div>
                <button 
                  onClick={() => navigateMonth("next")} 
                  className="p-2 hover:bg-white rounded-xl transition-all duration-300 hover:shadow-md"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Enhanced Calendar Grid */}
              <div className="flex flex-col lg:flex-row lg:gap-8 justify-center mb-6 gap-6">
                {/* First Month */}
                <div className="space-y-3 flex-1">
                  <h4 className="text-lg font-semibold text-center lg:hidden text-gray-800">{format(currentMonth, "MMMM yyyy")}</h4>
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                      <div key={day} className="h-8 flex items-center justify-center text-sm text-gray-500 font-bold">
                        {day}
                      </div>
                    ))}
                  </div>
                  {/* Calendar days */}
                  <div className="space-y-2">
                    {renderCalendarDays(0)}
                  </div>
                </div>

                {/* Second Month - Hidden on mobile and tablet */}
                <div className="space-y-3 flex-1 hidden lg:block">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                      <div key={day} className="h-8 flex items-center justify-center text-sm text-gray-500 font-bold">
                        {day}
                      </div>
                    ))}
                  </div>
                  {/* Calendar days */}
                  <div className="space-y-2">
                    {renderCalendarDays(1)}
                  </div>
                </div>
              </div>

              {/* Enhanced Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-gray-200">
                {(startDate || endDate) && (
                  <button 
                    onClick={clearDates} 
                    className="text-sm text-gray-600 hover:text-red-600 underline hover:no-underline transition-colors order-2 sm:order-1 font-medium"
                  >
                    Clear all dates
                  </button>
                )}
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto order-1 sm:order-2">
                  <button 
                    onClick={() => setShowCalendar(false)}
                    className="w-full sm:w-auto px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors border-2 border-gray-300 hover:border-gray-400 rounded-xl font-medium"
                  >
                    Close Calendar
                  </button>
                  {startDate && endDate && (
                    <Button
                      onClick={() => {
                        handleSearch();
                        setShowCalendar(false);
                      }}
                      className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      Search Vehicles →
                    </Button>
                  )}
                </div>
              </div>

              {/* Enhanced Calendar legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-xl mt-4 border border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gradient-to-r from-red-600 to-red-700 rounded-md shadow-sm"></div>
                  <span className="text-sm font-medium text-gray-700">Selected Dates</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 rounded-md"></div>
                  <span className="text-sm font-medium text-gray-700">Date Range</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-50 border-2 border-blue-200 rounded-md"></div>
                  <span className="text-sm font-medium text-gray-700">Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded-md"></div>
                  <span className="text-sm font-medium text-gray-700">Available</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAuthModal(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 md:p-8">
            {/* Close button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal content */}
            <div className="text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-red-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Sign in to continue
                </h2>
                <p className="text-gray-600">
                  Please sign in or create an account to search for available vehicles and make bookings.
                </p>
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <Link href="/login" className="block">
                  <button 
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg flex items-center justify-center gap-2"
                    onClick={() => setShowAuthModal(false)}
                  >
                    <LogIn className="h-5 w-5" />
                    Sign In
                  </button>
                </Link>
                
                <Link href="/signup" className="block">
                  <button 
                    className="w-full border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:bg-gray-50 flex items-center justify-center gap-2"
                    onClick={() => setShowAuthModal(false)}
                  >
                    <UserPlus className="h-5 w-5" />
                    Create Account
                  </button>
                </Link>
              </div>

              {/* Additional info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Already have an account? <Link href="/login" className="text-red-600 hover:text-red-700 font-medium">Sign in here</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BookingSearchBar;