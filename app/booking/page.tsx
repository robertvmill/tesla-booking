'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, differenceInDays } from 'date-fns';
import { Button } from '@/app/components/ui/button';
import { loadStripe } from '@stripe/stripe-js';
import Image from 'next/image';
import Link from 'next/link';

// Initialize Stripe with your publishable key
// In production, you would use an environment variable
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_test_key');

export default function BookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [vehicle, setVehicle] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const vehicleId = searchParams.get('vehicleId');
  const fromDate = searchParams.get('from');
  const toDate = searchParams.get('to');

  // Calculate booking details
  const startDate = fromDate ? new Date(fromDate) : null;
  const endDate = toDate ? new Date(toDate) : null;
  const numberOfDays = startDate && endDate ? differenceInDays(endDate, startDate) + 1 : 0;

  useEffect(() => {
    // Redirect if missing required parameters
    if (!vehicleId || !fromDate || !toDate) {
      router.push('/');
      return;
    }

    // Fetch vehicle details
    const fetchVehicle = async () => {
      try {
        const response = await fetch(`/api/admin/vehicles/${vehicleId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch vehicle');
        }
        const data = await response.json();
        setVehicle(data.vehicle);
      } catch (err) {
        console.error('Error fetching vehicle:', err);
        setError('Failed to load vehicle details. Please try again.');
      }
    };

    fetchVehicle();
  }, [vehicleId, fromDate, toDate, router]);

  const handleCheckout = async () => {
    if (!vehicle || !startDate || !endDate) return;

    setIsLoading(true);
    try {
      // Create a checkout session
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          pricePerDay: vehicle.pricePerDay,
          numberOfDays,
          vehicleModel: vehicle.model,
        }),
      });

      if (response.status === 401) {
        // Unauthorized - User needs to log in
        setError('Please log in to complete your booking');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await response.json();
      
      // Check if we have a checkout URL
      if (data.url) {
        // Redirect directly to the Stripe checkout URL
        window.location.href = data.url;
        return;
      } else if (data.sessionId) {
        // Legacy approach using redirectToCheckout
        const stripe = await stripePromise;
        if (stripe) {
          const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
          if (error) {
            throw error;
          }
        }
      } else {
        throw new Error('No checkout URL or session ID returned from the server');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'An error occurred during checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
          {error === 'Please log in to complete your booking' ? (
            <div className="mt-4">
              <p className="mb-4">You need to be logged in to book a vehicle.</p>
              <div className="flex space-x-4">
                <Link 
                  href={`/login?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`} 
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md"
                >
                  Log In
                </Link>
                <Link 
                  href={`/signup?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`} 
                  className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          ) : (
            <Link href="/" className="text-red-600 hover:text-red-800">
              &larr; Back to all vehicles
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading booking details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container mx-auto px-4 py-8">
        <Link href={`/vehicles/${vehicleId}`} className="text-red-600 hover:text-red-800 mb-6 inline-block">
          &larr; Back to vehicle details
        </Link>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Complete Your Booking</h1>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Vehicle Summary */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Vehicle Details</h2>
                <div className="bg-gray-100 rounded-lg p-4 mb-4">
                  <div className="h-48 bg-gray-200 relative rounded-md mb-4">
                    {vehicle.image ? (
                      <Image 
                        src={vehicle.image} 
                        alt={`Tesla ${vehicle.model}`} 
                        fill 
                        className="object-cover rounded-md"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                        Tesla {vehicle.model}
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold">Tesla {vehicle.model}</h3>
                  <p className="text-gray-700 mt-2">{vehicle.description}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-600 text-sm">Seats:</span>
                      <p className="font-medium">{vehicle.seats}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm">Range:</span>
                      <p className="font-medium">{vehicle.range}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm">Acceleration:</span>
                      <p className="font-medium">{vehicle.acceleration}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm">Price Per Day:</span>
                      <p className="font-medium">${vehicle.pricePerDay}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Summary */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Booking Summary</h2>
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="mb-4">
                    <h3 className="font-semibold">Dates</h3>
                    <p className="text-gray-700">
                      {startDate && format(startDate, 'MMMM d, yyyy')} - {endDate && format(endDate, 'MMMM d, yyyy')}
                    </p>
                    <p className="text-sm text-gray-600">{numberOfDays} days</p>
                  </div>

                  <div className="mb-4">
                    <h3 className="font-semibold">Price Breakdown</h3>
                    <div className="flex justify-between mt-1">
                      <span className="text-gray-700">${vehicle.pricePerDay} × {numberOfDays} days</span>
                      <span className="font-medium">${vehicle.pricePerDay * numberOfDays}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-300 my-4 pt-4">
                    <div className="flex justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-lg">${vehicle.pricePerDay * numberOfDays}</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    disabled={isLoading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 mt-4"
                  >
                    {isLoading ? (
                      <>
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                        Processing...
                      </>
                    ) : (
                      'Proceed to Payment'
                    )}
                  </Button>

                  <p className="text-xs text-gray-600 mt-2 text-center">
                    You will be redirected to Stripe to complete your payment securely.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
