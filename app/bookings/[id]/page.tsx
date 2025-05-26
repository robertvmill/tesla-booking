'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { CalendarIcon, ClockIcon, CreditCardIcon, ArrowLeftIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { ChatInterface } from '@/app/components/ui/ChatInterface';

// Define types for our data
interface Vehicle {
  id: string;
  model: string;
  pricePerDay: number;
  description: string;
  image?: string;
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

export default function BookingDetailsPage({ params }: { params: { id: string } }) {
  const bookingId = params.id;
  const { status } = useSession();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/bookings/' + bookingId);
      return;
    }

    // Fetch booking if authenticated
    if (status === 'authenticated') {
      fetchBookingDetails();
    }
  }, [status, router, bookingId]);

  const fetchBookingDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch booking details');
      }
      
      const data = await response.json();
      setBooking(data.booking);
    } catch (err) {
      console.error('Error fetching booking details:', err);
      setError('Failed to load booking details. Please try again later.');
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

  if (status === 'loading' || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Link href="/inbox" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            All Messages
          </Link>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-1/3 mb-2" />
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
          
          <div className="mt-4">
            <Skeleton className="h-6 w-1/4 mb-4" />
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Link href="/inbox" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            All Messages
          </Link>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Link href="/inbox" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            All Messages
          </Link>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-6">
            Booking not found. It may have been deleted or you don&apos;t have permission to view it.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <Link href="/inbox" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          All Messages
        </Link>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
              <div className="flex-1 mb-3 md:mb-0">
                <h1 className="text-lg font-semibold mb-1">{booking.vehicle.model}</h1>
                <p className="text-sm text-gray-600 mb-2">Booking Reference: {booking.id.substring(0, 8)}</p>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    <span>{formatDate(booking.startDate)} - {formatDate(booking.endDate)}</span>
                  </div>
                  <div className="flex items-center">
                    <ClockIcon className="mr-1 h-3 w-3" />
                    <span>{calculateDuration(booking.startDate, booking.endDate)} days</span>
                  </div>
                  <div className="flex items-center">
                    <CreditCardIcon className="mr-1 h-3 w-3" />
                    <span>${booking.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              {booking.vehicle.image && (
                <div className="md:w-32 md:h-20 w-full h-24">
                  <img 
                    src={booking.vehicle.image} 
                    alt={booking.vehicle.model} 
                    className="rounded-lg w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Communication</h2>
          <ChatInterface bookingId={booking.id} />
        </div>
      </div>
    </div>
  );
}
