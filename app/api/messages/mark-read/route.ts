import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';

/**
 * POST /api/messages/mark-read
 * 
 * Purpose:
 * Marks all unread admin messages as read for a specific booking.
 * This endpoint is called when a user views messages in a booking thread.
 * 
 * Authentication:
 * - Requires authenticated user session
 * - Validates user owns the booking
 * 
 * Request body:
 * {
 *   bookingId: string  // ID of the booking containing messages to mark as read
 * }
 * 
 * Response:
 * - 200: { success: true }
 * - 400: { error: 'Missing bookingId' }
 * - 401: { error: 'Unauthorized' }
 * - 403: { error: 'Booking not found or not authorized' }
 * - 404: { error: 'User not found' }
 * - 500: { error: 'Failed to mark messages as read' }
 * 
 * Design:
 * 1. Authenticate user via session
 * 2. Validate request parameters
 * 3. Verify user owns the booking
 * 4. Update all unread admin messages to read status
 * 5. Return success response
 */
export async function POST(request: Request) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get bookingId from request body
    const { bookingId } = await request.json();
    
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }
    
    // Check if the booking belongs to the user
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });
    
    if (!booking || booking.userId !== user.id) {
      return NextResponse.json({ error: 'Booking not found or not authorized' }, { status: 403 });
    }
    
    // Mark all admin messages in this booking as read
    await prisma.message.updateMany({
      where: {
        bookingId: bookingId,
        isAdminMessage: true,
        isRead: false,
      },
      data: { 
        isRead: true 
      },
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark messages as read' },
      { status: 500 }
    );
  }
} 