'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import BookingForm from '@/app/components/bookings/BookingForm';
import BookingSearchBar from '@/app/components/bookings/BookingSearchBar';
import { toast } from "sonner";

interface Vehicle {
  id: string;
  model: string;
  pricePerDay: number;
  image?: string;
  description?: string;
}

interface Booking {
  id: string;
  vehicleId: string;
  startDate: Date;
  endDate: Date;
  status: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [searchDates, setSearchDates] = useState<{start: Date | null, end: Date | null}>({
    start: null,
    end: null
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    { id: '1', model: 'Model S', pricePerDay: 150, description: 'Luxury sedan with exceptional range and performance' },
    { id: '2', model: 'Model 3', pricePerDay: 120, description: 'Affordable all-electric car with impressive performance' },
    { id: '3', model: 'Model X', pricePerDay: 180, description: 'Premium SUV with falcon-wing doors and spacious interior' },
  ]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch bookings when component mounts
  useEffect(() => {
    // In a real app, you would fetch bookings from API
    // For demonstration, we'll use some mock data
    const mockBookings: Booking[] = [
      {
        id: '1',
        vehicleId: '1',
        startDate: new Date(Date.now() + 86400000), // tomorrow
        endDate: new Date(Date.now() + 86400000 * 3), // 3 days from tomorrow
        status: 'confirmed'
      },
      // Add more mock bookings as needed
    ];
    
    setBookings(mockBookings);
  }, []);

  // Handle search
  const handleSearch = async (startDate: Date, endDate: Date) => {
    setSearchDates({ start: startDate, end: endDate });
    setIsSearching(true);
    
    try {
      // Call the API endpoint
      const response = await fetch(
        `/api/availability?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to check availability');
      }
      
      const data = await response.json();
      setAvailableVehicles(data.availableVehicles);
      
      if (data.availableVehicles.length === 0) {
        toast.info("No vehicles available for selected dates");
      } else {
        toast.success(`Found ${data.availableVehicles.length} available vehicles`);
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      // Show an error message
      toast({
        description: "Failed to check vehicle availability. Please try again.",
      });
    }
  };

  // Check vehicle availability
  const checkVehicleAvailability = (startDate: Date, endDate: Date) => {
    // Filter out vehicles that have bookings during the selected date range
    const available = vehicles.filter(vehicle => {
      const vehicleBookings = bookings.filter(
        booking => 
          booking.vehicleId === vehicle.id && 
          booking.status !== 'cancelled'
      );
      
      // Check if any bookings overlap with the selected date range
      const isBooked = vehicleBookings.some(booking => {
        return (
          (startDate >= booking.startDate && startDate <= booking.endDate) ||
          (endDate >= booking.startDate && endDate <= booking.endDate) ||
          (startDate <= booking.startDate && endDate >= booking.endDate)
        );
      });
      
      return !isBooked;
    });
    
    setAvailableVehicles(available);
  };

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!session) {
    // Optionally redirect to login or show a message
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Please log in to view your dashboard.</h1>
        <Link href="/login" className="bg-red-600 text-white px-4 py-2 rounded">Login</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">

        {/* BookingSearchBar */}
        <div className="mb-8">
          <BookingSearchBar onSearch={handleSearch} />
        </div>
        
        {/* Display search results or vehicle selection */}
        {isSearching ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">
              {availableVehicles.length > 0 
                ? `Available Teslas (${availableVehicles.length})` 
                : "No Tesla Available for Selected Dates"}
            </h2>
            
            {availableVehicles.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-4">
                {availableVehicles.map(vehicle => (
                  <div 
                    key={vehicle.id} 
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition"
                    onClick={() => setSelectedVehicleId(vehicle.id)}
                  >
                    <h3 className="font-bold mb-2">Tesla {vehicle.model}</h3>
                    <p className="text-gray-600 mb-2 text-sm">{vehicle.description}</p>
                    <p className="text-gray-600 mb-2">${vehicle.pricePerDay}/day</p>
                    <button className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm">
                      Select
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">
                No Tesla vehicles are available for the selected dates. Please try different dates.
              </p>
            )}
          </div>
        ) : !selectedVehicleId ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Select a Tesla to Book</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {vehicles.map(vehicle => (
                <div 
                  key={vehicle.id} 
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => setSelectedVehicleId(vehicle.id)}
                >
                  <h3 className="font-bold mb-2">Tesla {vehicle.model}</h3>
                  <p className="text-gray-600 mb-2 text-sm">{vehicle.description}</p>
                  <p className="text-gray-600 mb-2">${vehicle.pricePerDay}/day</p>
                  <button className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm">
                    Select
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        
        {/* Show booking form when a vehicle is selected */}
        {selectedVehicleId && (
          <div className="mb-8">
            <button 
              onClick={() => {
                setSelectedVehicleId(null);
                if (isSearching) {
                  // Go back to search results
                } else {
                  // Go back to vehicle selection
                }
              }} 
              className="mb-4 text-red-600 hover:text-red-800 flex items-center"
            >
              ← Back to {isSearching ? 'search results' : 'vehicle selection'}
            </button>
            <BookingForm 
              vehicleId={selectedVehicleId} 
              pricePerDay={vehicles.find(v => v.id === selectedVehicleId)?.pricePerDay || 0}
            />
          </div>
        )}
        
        {/* Your bookings section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-2">Your Bookings</h2>
          <p className="text-gray-600">You have no bookings yet.</p>
        </div>
      </div>
    </div>
  );
}
