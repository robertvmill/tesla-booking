'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { 
  CalendarIcon, 
  CarIcon, 
  ClockIcon, 
  CreditCardIcon, 
  ArrowLeftIcon,
  UserIcon,
  MailIcon,
  PhoneIcon,
  CheckIcon,
  XIcon
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
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

interface User {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

interface Booking {
  id: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: string;
  vehicle: Vehicle;
  user: User;
  createdAt: string;
}

export default function AdminBookingDetailsPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/admin/bookings/' + params.id);
      return;
    }
    
    // Check if user is an admin
    const isAdmin = session?.user ? (session.user as any).isAdmin : false;
    if (status === 'authenticated' && !isAdmin) {
      router.push('/');
      return;
    }

    // Fetch booking if authenticated and admin
    if (status === 'authenticated' && isAdmin) {
      fetchBookingDetails();
    }
  }, [status, session, router, params.id]);

  const fetchBookingDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/bookings/${params.id}`);
      
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

  const handleStatusChange = async (newStatus: string) => {
    setStatusUpdateLoading(true);
    try {
      const response = await fetch(`/api/admin/bookings/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update booking status');
      }

      // Update the booking in the local state
      if (booking) {
        setBooking({ ...booking, status: newStatus });
      }
    } catch (err) {
      console.error('Error updating booking status:', err);
      setError('Failed to update booking status. Please try again.');
    } finally {
      setStatusUpdateLoading(false);
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
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/admin/bookings" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to All Bookings
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
          
          <div className="mt-8">
            <Skeleton className="h-6 w-1/4 mb-4" />
            <Skeleton className="h-[500px] w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/admin/bookings" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to All Bookings
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
        <div className="mb-6">
          <Link href="/admin/bookings" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to All Bookings
          </Link>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-6">
            Booking not found. It may have been deleted.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/admin/bookings" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to All Bookings
        </Link>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(booking.status)} mb-2`}>
                  {booking.status}
                </div>
                <CardTitle className="text-2xl">{booking.vehicle.model}</CardTitle>
                <CardDescription>Booking Reference: {booking.id.substring(0, 8)}</CardDescription>
              </div>
              
              <div className="flex space-x-2">
                {booking.status !== 'confirmed' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="bg-green-100 text-green-800 hover:bg-green-200"
                    onClick={() => handleStatusChange('confirmed')}
                    disabled={statusUpdateLoading}
                  >
                    <CheckIcon className="h-4 w-4 mr-1" />
                    Confirm
                  </Button>
                )}
                
                {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                    onClick={() => handleStatusChange('completed')}
                    disabled={statusUpdateLoading}
                  >
                    Complete
                  </Button>
                )}
                
                {booking.status !== 'cancelled' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="bg-red-100 text-red-800 hover:bg-red-200"
                    onClick={() => handleStatusChange('cancelled')}
                    disabled={statusUpdateLoading}
                  >
                    <XIcon className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Booking Details</h3>
                <div className="space-y-3">
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
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Customer Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <UserIcon className="mr-2 h-4 w-4 opacity-70" />
                    <span>{booking.user.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <MailIcon className="mr-2 h-4 w-4 opacity-70" />
                    <span>{booking.user.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <PhoneIcon className="mr-2 h-4 w-4 opacity-70" />
                    <span>{booking.user.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Vehicle Information</h3>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <CarIcon className="mr-2 h-4 w-4 opacity-70" />
                  <span>{booking.vehicle.model}</span>
                </div>
                <div className="text-sm">
                  <p>{booking.vehicle.description}</p>
                </div>
              </div>
            </div>
            
            {booking.vehicle.image && (
              <div className="mt-4">
                <img 
                  src={booking.vehicle.image} 
                  alt={booking.vehicle.model} 
                  className="rounded-lg w-full object-cover max-h-64"
                />
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Communication with Customer</h2>
          <ChatInterface bookingId={booking.id} />
        </div>
      </div>
    </div>
  );
}
