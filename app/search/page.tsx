'use client';

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
}

function SearchContent() {
  const searchParams = useSearchParams();
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVehicles() {
      if (!startDate || !endDate) {
        toast.error('Please select valid dates');
        return;
      }

      try {
        const response = await fetch(`/api/availability?startDate=${startDate}&endDate=${endDate}`);
        if (!response.ok) {
          throw new Error('Failed to fetch available vehicles');
        }

        const data = await response.json();
        setVehicles(data.availableVehicles);
      } catch (error) {
        toast.error('Error checking availability');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchVehicles();
  }, [startDate, endDate]);

  if (!startDate || !endDate) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-6">Invalid Search</h1>
          <p>Please select valid dates to search for available vehicles.</p>
          <Link href="/" className="text-red-600 hover:underline mt-4 inline-block">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const formattedStartDate = new Date(startDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const formattedEndDate = new Date(endDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short', 
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Available Vehicles</h1>
        
        <div className="bg-white p-4 rounded-lg shadow-sm mb-8 inline-block">
          <p className="text-lg">
            <span className="font-medium">Selected Dates:</span> {formattedStartDate} - {formattedEndDate}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
          </div>
        ) : vehicles.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-48 bg-gray-200 relative">
                  <Image
                    src={vehicle.image}
                    alt={vehicle.model}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-gray-900">Tesla {vehicle.model}</h3>
                  <p className="text-gray-800 mb-4">{vehicle.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">${vehicle.pricePerDay}/day</span>
                    <Link href={`/booking?vehicleId=${vehicle.id}&startDate=${startDate}&endDate=${endDate}`}>
                      <span className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md">
                        Book Now
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <h2 className="text-2xl font-bold mb-4">No Vehicles Available</h2>
            <p className="text-gray-600 mb-6">
              Sorry, we don't have any Tesla vehicles available for the selected dates.
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

export default function SearchResults() {
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
      <SearchContent />
    </Suspense>
  );
} 