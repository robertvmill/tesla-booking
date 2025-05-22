import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/app/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { hash } from 'bcryptjs';

// Helper function to check if user is admin
async function isAdmin() {
  const session = await getServerSession(authOptions as any) as any;
  
  if (!session || !session.user || !session.user.email) {
    return false;
  }
  
  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });
  
  return user?.isAdmin === true;
}

// Get a single user
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Check if user is admin
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    const userId = params.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isAdmin: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        bookings: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            totalPrice: true,
            status: true,
            vehicle: {
              select: {
                id: true,
                model: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// Update a user
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    // Check if user is admin
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    const userId = params.id;
    const data = await request.json();
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Validate and prepare update data
    const updateData: any = {};
    const allowedFields = ['name', 'email', 'phone', 'isAdmin'];
    
    Object.keys(data).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = data[key];
      }
    });
    
    // Handle password update separately if provided
    if (data.password && data.password.trim() !== '') {
      updateData.password = await hash(data.password, 12);
    }
    
    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isAdmin: true,
        phone: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// Delete a user
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    // Check if user is admin
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    const userId = params.id;
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        bookings: {
          where: {
            OR: [
              { status: 'pending' },
              { status: 'confirmed' }
            ]
          }
        }
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if user has active bookings
    if (user.bookings.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete user with active bookings',
        activeBookings: user.bookings.length
      }, { status: 400 });
    }
    
    // Check if user is the current admin
    const session = await getServerSession(authOptions as any) as any;
    if (session?.user?.email === user.email) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }
    
    // Delete the user
    await prisma.user.delete({
      where: { id: userId }
    });
    
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
