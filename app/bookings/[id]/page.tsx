'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { CalendarIcon, CarIcon, ClockIcon, CreditCardIcon, ArrowLeftIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
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

  if (status === 'loading' || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Link href="/bookings" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to My Bookings
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
          <Link href="/bookings" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to My Bookings
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
          <Link href="/bookings" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to My Bookings
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
        <Link href="/bookings" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to My Bookings
        </Link>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(booking.status)} mb-1`}>
              {booking.status}
            </div>
            <CardTitle className="text-xl">{booking.vehicle.model}</CardTitle>
            <CardDescription>Booking Reference: {booking.id.substring(0, 8)}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap">
              <div className="w-1/2 pr-2">
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <CalendarIcon className="mr-2 h-3 w-3 opacity-70" />
                    <span>
                      {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <ClockIcon className="mr-2 h-3 w-3 opacity-70" />
                    <span>{calculateDuration(booking.startDate, booking.endDate)} days</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CreditCardIcon className="mr-2 h-3 w-3 opacity-70" />
                    <span>${booking.totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CarIcon className="mr-2 h-3 w-3 opacity-70" />
                    <span>{booking.vehicle.description}</span>
                  </div>
                </div>
              </div>
              
              {booking.vehicle.image && (
                <div className="w-1/2 pl-2">
                  <img 
                    src={booking.vehicle.image} 
                    alt={booking.vehicle.model} 
                    className="rounded-lg w-full object-cover max-h-40"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <div>
          <h2 className="text-xl font-semibold mb-2">Communication</h2>
          <ChatInterface bookingId={booking.id} />
        </div>
      </div>
    </div>
  );
}
