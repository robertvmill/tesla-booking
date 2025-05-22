import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/app/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET: Fetch all messages for a specific booking
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions as any) as any;
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const bookingId = params.id;
    
    // Find the user by email
    const userEmail = session.user.email;
    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if the user is authorized to view these messages
    // (either they own the booking or they are an admin)
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });
    
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    
    if (booking.userId !== user.id && !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized to view these messages' }, { status: 403 });
    }
    
    // Get all messages for this booking
    const messages = await prisma.message.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            isAdmin: true
          }
        }
      }
    });
    
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST: Create a new message for a booking
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions as any) as any;
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const bookingId = params.id;
    
    // Find the user by email
    const userEmail = session.user.email;
    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if the user is authorized to send messages for this booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });
    
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    
    if (booking.userId !== user.id && !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized to send messages for this booking' }, { status: 403 });
    }
    
    const { content } = await request.json();
    
    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 });
    }
    
    // Create the message
    const message = await prisma.message.create({
      data: {
        content,
        isAdminMessage: user.isAdmin,
        booking: {
          connect: { id: bookingId }
        },
        user: {
          connect: { id: user.id }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            isAdmin: true
          }
        }
      }
    });
    
    return NextResponse.json(message);
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}
