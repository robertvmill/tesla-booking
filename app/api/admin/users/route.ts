import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/app/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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

// Get all users
export async function GET(request: Request) {
  try {
    // Check if user is admin
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isAdmin: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            bookings: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
