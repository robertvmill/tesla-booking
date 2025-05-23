'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBookingDetails() {
      if (!sessionId) {
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/bookings/session?sessionId=${sessionId}`);
        if (!response.ok) throw new Error('Failed to fetch booking details');
        
        const data = await response.json();
        setBooking(data.booking);
        
        // Create welcome message if it doesn't exist (fallback for development)
        await ensureWelcomeMessage(data.booking.id);
        
        // Trigger a refresh of unread messages count and inbox
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('refreshUnreadCount'));
        }
      } catch (err) {
        console.error(err);
        setError('Could not load booking details');
      } finally {
        setLoading(false);
      }
    }

    // Function to ensure welcome message exists
    async function ensureWelcomeMessage(bookingId: string) {
      try {
        // Check if there are any messages for this booking
        const messagesResponse = await fetch(`/api/bookings/${bookingId}/messages`);
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          
          // If no messages exist, create a welcome message
          if (!messagesData.messages || messagesData.messages.length === 0) {
            await fetch(`/api/bookings/${bookingId}/messages`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                content: `Thank you for choosing RideReady! We're thrilled you'll be experiencing our vehicle. Your reservation has been confirmed. If you have any questions before your trip, feel free to message us here. We look forward to getting you on the road in style!`,
                isAdminMessage: true
              }),
            });
          }
        }
      } catch (err) {
        console.error('Error ensuring welcome message:', err);
        // Don't fail the whole page if message creation fails
      }
    }

    fetchBookingDetails();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-lg">Loading your booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-6">{error || 'Could not find your booking'}</p>
            <Link href="/" className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-md">
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="text-center mb-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">Booking Confirmed!</h1>
            <p className="text-lg text-gray-600 mt-2">
              Thank you for booking with Tesla Rentals
            </p>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold mb-4">Booking Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500">Vehicle</p>
                <p className="font-medium">Tesla {booking.vehicle.model}</p>
              </div>
              
              <div>
                <p className="text-gray-500">Booking ID</p>
                <p className="font-medium">{booking.id}</p>
              </div>
              
              <div>
                <p className="text-gray-500">Start Date</p>
                <p className="font-medium">{new Date(booking.startDate).toLocaleDateString()}</p>
              </div>
              
              <div>
                <p className="text-gray-500">End Date</p>
                <p className="font-medium">{new Date(booking.endDate).toLocaleDateString()}</p>
              </div>
              
              <div>
                <p className="text-gray-500">Total Price</p>
                <p className="font-medium">${booking.totalPrice.toFixed(2)}</p>
              </div>
              
              <div>
                <p className="text-gray-500">Status</p>
                <p className="font-medium text-green-600">Confirmed</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <Link href="/bookings" className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-md">
              View All Bookings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-lg">Loading booking details...</p>
        </div>
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}