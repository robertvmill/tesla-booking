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
import VehicleAvailabilityCalendar from '../components/vehicles/VehicleAvailabilityCalendar';

interface Vehicle {
  id: string;
  model: string;
  description: string;
  pricePerDay: number;
  image: string;
}

interface Booking {
  id: string;
  vehicleId: string;
  startDate: Date;
  endDate: Date;
  status: string;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState<string | null>(null);
  // Using navigation to handle bookings elsewhere
  const [vehicleBookings, setVehicleBookings] = useState<{[key: string]: Booking[]}>({});
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVehicles() {
      if (!startDate || !endDate) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/availability?startDate=${startDate}&endDate=${endDate}`);
        if (!response.ok) throw new Error('Failed to fetch vehicles');
        const data = await response.json();
        setVehicles(data.availableVehicles || []);
        
        // Fetch bookings for each vehicle to display in calendar
        if (data.availableVehicles && data.availableVehicles.length > 0) {
          const bookingsPromises = data.availableVehicles.map(async (vehicle: Vehicle) => {
            const bookingsResponse = await fetch(`/api/vehicle-bookings/${vehicle.id}`);
            if (bookingsResponse.ok) {
              const bookingsData = await bookingsResponse.json();
              return { vehicleId: vehicle.id, bookings: bookingsData.bookings };
            }
            return { vehicleId: vehicle.id, bookings: [] };
          });
          
          const bookingsResults = await Promise.all(bookingsPromises);
          const bookingsMap = bookingsResults.reduce((acc, result) => {
            acc[result.vehicleId] = result.bookings;
            return acc;
          }, {} as {[key: string]: Booking[]});
          
          setVehicleBookings(bookingsMap);
        }
      } catch (error) {
        console.error(error);
        toast.error("Couldn't load available vehicles");
      } finally {
        setLoading(false);
      }
    }
    
    fetchVehicles();
  }, [startDate, endDate]);

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
  
  const toggleVehicleCalendar = (vehicleId: string) => {
    setExpandedVehicle(expandedVehicle === vehicleId ? null : vehicleId);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Available Vehicles</h1>
        
        <div className="bg-white p-4 rounded-lg shadow-sm mb-8 inline-block">
          <p className="text-lg">Selected dates: {startDate} to {endDate}</p>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
          </div>
        ) : vehicles.length > 0 ? (
          <div className="flex flex-col gap-8">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/3 h-64 md:h-auto bg-gray-200 relative">
                    {vehicle.image && (
                      <Image
                        src={vehicle.image}
                        alt={vehicle.model}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="p-6 md:w-2/3">
                    <h3 className="text-xl font-bold mb-2 text-gray-900">Tesla {vehicle.model}</h3>
                    <p className="text-gray-700 mb-4">{vehicle.description}</p>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-bold text-gray-900"></span>
                      <div className="flex space-x-3">
                        <button 
                          onClick={() => toggleVehicleCalendar(vehicle.id)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md"
                        >
                          {expandedVehicle === vehicle.id ? 'Hide Calendar' : 'View Availability Calendar'}
                        </button>
                        <button 
                          onClick={() => createBooking(vehicle.id)}
                          className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md"
                          disabled={isBooking === vehicle.id}
                        >
                          {isBooking === vehicle.id ? 'Processing...' : 'Book Now'}
                        </button>
                      </div>
                    </div>
                    
                    {expandedVehicle === vehicle.id && (
                      <div className="mt-4 border-t pt-4 overflow-x-auto">
                        <h4 className="text-lg font-semibold mb-3">Availability Calendar</h4>
                        <div className="min-w-full">
                          <VehicleAvailabilityCalendar 
                            vehicleId={vehicle.id} 
                            bookings={vehicleBookings[vehicle.id] || []}
                            vehicleModel={vehicle.model}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <h2 className="text-2xl font-bold mb-4">No Vehicles Available</h2>
            <p className="text-gray-600 mb-6">
              Sorry, we don&apos;t have any Tesla vehicles available for the selected dates.
            </p>
            <Link href="/" className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-md">
              Try Different Dates
            </Link>
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
