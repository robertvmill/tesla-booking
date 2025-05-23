import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';

/**
 * GET /api/messages/unread
 * Returns the count of unread messages for the current user
 * - For regular users: counts unread admin messages in their bookings
 * - For admin users: counts unread user messages across all bookings
 */
export async function GET() {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user from session
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let count = 0;

    if (user.isAdmin) {
      // For admin users: count all unread user messages across all bookings
      count = await prisma.message.count({
        where: {
          isAdminMessage: false, // Messages from users
          isRead: false,
        },
      });
    } else {
      // For regular users: count unread admin messages in their bookings
      // Get all bookings for the user
      const bookings = await prisma.booking.findMany({
        where: { userId: user.id },
        select: { id: true },
      });
      
      // Get bookingIds
      const bookingIds = bookings.map(booking => booking.id);
      
      // Count unread admin messages for these bookings
      count = await prisma.message.count({
        where: {
          bookingId: { in: bookingIds },
          isAdminMessage: true,
          isRead: false,
        },
      });
    }
    
    return NextResponse.json({ count });
    
  } catch (error) {
    console.error('Error fetching unread message count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unread message count' },
      { status: 500 }
    );
  }
} 