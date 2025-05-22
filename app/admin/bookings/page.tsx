'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { CalendarIcon, PencilIcon, TrashIcon, ArrowLeftIcon, CheckIcon, XIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';

// Define types for our data
interface Vehicle {
  id: string;
  model: string;
  pricePerDay: number;
  description: string;
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
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

export default function AdminBookingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  // Redirect if user is not authenticated or not an admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/admin/bookings');
      return;
    }
    
    // Check if user is an admin
    const isAdmin = session?.user ? (session.user as any).isAdmin : false;
    if (status === 'authenticated' && !isAdmin) {
      router.push('/');
      return;
    }

    // Fetch bookings if authenticated and admin
    if (status === 'authenticated' && isAdmin) {
      fetchBookings();
    }
  }, [status, session, router]);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/bookings');
      
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      
      const data = await response.json();
      setBookings(data.bookings);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load bookings. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
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
      setBookings(bookings.map(booking => 
        booking.id === bookingId ? { ...booking, status: newStatus } : booking
      ));
    } catch (err) {
      console.error('Error updating booking status:', err);
      setError('Failed to update booking status. Please try again.');
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete booking');
      }

      // Remove the booking from the local state
      setBookings(bookings.filter(booking => booking.id !== bookingId));
      setDeleteConfirmation(null);
    } catch (err) {
      console.error('Error deleting booking:', err);
      setError('Failed to delete booking. Please try again.');
    }
  };

  // Format date to readable string
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  // Filter bookings based on status
  const filteredBookings = statusFilter === 'all' 
    ? bookings 
    : bookings.filter(booking => booking.status.toLowerCase() === statusFilter.toLowerCase());

  if (status === 'loading' || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Link href="/admin" className="mr-4">
            <Button variant="outline" size="icon">
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Manage Bookings</h1>
        </div>
        <p>Loading bookings...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Link href="/admin" className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Manage Bookings</h1>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
          >
            All
          </Button>
          <Button 
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('pending')}
            className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 hover:text-yellow-900"
          >
            Pending
          </Button>
          <Button 
            variant={statusFilter === 'confirmed' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('confirmed')}
            className="bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900"
          >
            Confirmed
          </Button>
          <Button 
            variant={statusFilter === 'completed' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('completed')}
            className="bg-blue-100 text-blue-800 hover:bg-blue-200 hover:text-blue-900"
          >
            Completed
          </Button>
          <Button 
            variant={statusFilter === 'cancelled' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('cancelled')}
            className="bg-red-100 text-red-800 hover:bg-red-200 hover:text-red-900"
          >
            Cancelled
          </Button>
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No bookings found with the selected filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">ID</th>
                <th className="border p-2 text-left">Customer</th>
                <th className="border p-2 text-left">Vehicle</th>
                <th className="border p-2 text-left">Dates</th>
                <th className="border p-2 text-left">Price</th>
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="border p-2">{booking.id.substring(0, 8)}...</td>
                  <td className="border p-2">{booking.user.name || booking.user.email}</td>
                  <td className="border p-2">{booking.vehicle.model}</td>
                  <td className="border p-2">
                    {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                  </td>
                  <td className="border p-2">${booking.totalPrice.toFixed(2)}</td>
                  <td className="border p-2">
                    <select
                      value={booking.status}
                      onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                      className="p-1 border rounded"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="border p-2">
                    <div className="flex space-x-2">
                      <Link href={`/admin/bookings/${booking.id}`}>
                        <Button variant="outline" size="sm">
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                      </Link>
                      {deleteConfirmation === booking.id ? (
                        <div className="flex space-x-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="bg-red-100 text-red-800 hover:bg-red-200"
                            onClick={() => handleDeleteBooking(booking.id)}
                          >
                            <CheckIcon className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setDeleteConfirmation(null)}
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteConfirmation(booking.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}