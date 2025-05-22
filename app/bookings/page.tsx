'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { CalendarIcon, CarIcon, ClockIcon, CreditCardIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';

// Define types for our data
interface Vehicle {
  id: string;
  model: string;
  pricePerDay: number;
  description: string;
}

interface Booking {
  id: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: string;
  vehicle: Vehicle;
  createdAt: string;
}

export default function BookingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/bookings');
      return;
    }

    // Fetch bookings if authenticated
    if (status === 'authenticated') {
      fetchBookings();
    }
  }, [status, router]);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/bookings');
      
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      
      const data = await response.json();
      setBookings(data.bookings);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load your bookings. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };



  // Format date to readable string
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  // Calculate booking duration in days
  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Bookings</h1>
          <Link href="/">
            <Button variant="outline">Book a New Tesla</Button>
          </Link>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-0">
                <Skeleton className="h-4 w-1/3 mb-2" />
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent className="py-4">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Bookings</h1>
        <Link href="/">
          <Button variant="outline">Book a New Tesla</Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-0">
                <Skeleton className="h-4 w-1/3 mb-2" />
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent className="py-4">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : bookings.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {bookings.map((booking) => (
            <Card key={booking.id} className="overflow-hidden">
              <CardHeader>
                <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(booking.status)} mb-2`}>
                  {booking.status}
                </div>
                <CardTitle className="text-xl">{booking.vehicle.model}</CardTitle>
                <CardDescription>Booked on {formatDate(booking.createdAt)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center text-sm">
                  <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                  <span>
                    {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <ClockIcon className="mr-2 h-4 w-4 opacity-70" />
                  <span>{calculateDuration(booking.startDate, booking.endDate)} days</span>
                </div>
                <div className="flex items-center text-sm">
                  <CreditCardIcon className="mr-2 h-4 w-4 opacity-70" />
                  <span>${booking.totalPrice.toFixed(2)}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Link href={`/bookings/${booking.id}`} className="w-full">
                  <Button variant="outline" className="w-full">View Details</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <CarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No bookings found</h3>
          <p className="mt-1 text-sm text-gray-500">You haven't made any bookings yet.</p>
          <div className="mt-6">
            <Link href="/">
              <Button>Browse Vehicles</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}