import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';

/**
 * GET /api/messages
 * Retrieves all messages for the current user, grouped by booking
 * For admin users, retrieves all messages across all bookings
 */
export async function GET() {
  try {
    // Get the current session to verify the user is authenticated
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the user from the database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    let messages;
    
    // Different query logic for admin users vs regular users
    if (user.isAdmin) {
      // Admin users can see all messages from all bookings
      messages = await prisma.message.findMany({
        include: {
          booking: {
            include: {
              vehicle: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                }
              }
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              isAdmin: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } else {
      // Regular users can only see their own messages
      // Find all bookings for the user
      const bookings = await prisma.booking.findMany({
        where: { userId: user.id },
        include: { 
          vehicle: true,
        },
      });
      
      const bookingIds = bookings.map(booking => booking.id);
      
      // Get all messages for these bookings, including booking and user details
      messages = await prisma.message.findMany({
        where: {
          bookingId: { in: bookingIds },
        },
        include: {
          booking: {
            include: {
              vehicle: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              isAdmin: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }
    
    return NextResponse.json({ 
      messages: messages.map(message => ({
        ...message,
        createdAt: message.createdAt.toISOString(),
        booking: {
          ...message.booking,
          startDate: message.booking.startDate.toISOString(),
          endDate: message.booking.endDate.toISOString(),
          createdAt: message.booking.createdAt.toISOString(),
          updatedAt: message.booking.updatedAt.toISOString(),
        }
      }))
    });
    
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
