'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function BookingConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Redirect to the correct confirmation page with the session_id
    if (sessionId) {
      router.replace(`/bookings/confirmation?session_id=${sessionId}`);
    } else {
      router.replace('/bookings/confirmation');
    }
  }, [router, sessionId]);

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mx-auto"></div>
        <p className="mt-4 text-lg">Redirecting to your booking confirmation...</p>
      </div>
    </div>
  );
}

export default function BookingConfirmationRedirect() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-lg">Loading...</p>
        </div>
      </div>
    }>
      <BookingConfirmationContent />
    </Suspense>
  );
}
