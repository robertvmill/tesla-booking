import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';

/**
 * GET /api/messages/unread
 * Returns the count of unread messages for the current user
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

    // Get all bookings for the user
    const bookings = await prisma.booking.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    
    // Get bookingIds
    const bookingIds = bookings.map(booking => booking.id);
    
    // Count unread admin messages for these bookings
    const count = await prisma.message.count({
      where: {
        bookingId: { in: bookingIds },
        isAdminMessage: true,
        isRead: false,
      },
    });
    
    return NextResponse.json({ count });
    
  } catch (error) {
    console.error('Error fetching unread message count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unread message count' },
      { status: 500 }
    );
  }
} 