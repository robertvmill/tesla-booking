'use client';

import React, { useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import DatePickerInput from "@/app/components/bookings/DatePickerInput";
import { Button } from "@/app/components/ui/button";
import { toast } from "sonner";

const BookingSearchBar: React.FC = () => {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const router = useRouter();

  const handleSearch = () => {
    if (!startDate || !endDate) {
      toast.error("Please select both dates");
      return;
    }

    if (startDate > endDate) {
      toast({
        description: "Start date must be before end date",
      });
      return;
    }

    // Format dates for URL
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    // Navigate to search results page with date parameters
    router.push(`/results?startDate=${startStr}&endDate=${endStr}`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-4">Book Your Tesla Experience</h1>
      <p className="text-lg text-center text-gray-500 mb-8">
        Select your dates to check vehicle availability
      </p>
      <div className="bg-white rounded-full shadow-lg p-2 flex flex-col md:flex-row gap-2">
        <div className="flex-1 flex flex-col md:flex-row">
          <div className="flex-1 px-2">
            <p className="text-base text-gray-500 font-medium ml-4 mb-1">From</p>
            <DatePickerInput
              placeholder="Start date"
              date={startDate}
              setDate={setStartDate}
            />
          </div>
          <div className="flex-1 px-2">
            <p className="text-base text-gray-500 font-medium ml-4 mb-1">Until</p>
            <DatePickerInput
              placeholder="End date"
              date={endDate}
              setDate={setEndDate}
            />
          </div>
        </div>
        <div className="px-2 flex items-end mb-1 md:mb-0">
          <Button
            onClick={handleSearch}
            className="bg-red-600 hover:bg-red-700 text-white rounded-full w-16 h-16 flex items-center justify-center transition-all duration-300 hover:scale-105"
            type="button"
          >
            <Search className="h-6 w-6" />
            <span className="sr-only">Search</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookingSearchBar;