import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';

// Helper function to check if user is an admin
async function isAdmin() {
  const session = await getServerSession(authOptions as any) as any;
  return session?.user?.isAdmin === true;
}

// Get all duration discounts
export async function GET(request: Request) {
  try {
    // Check if user is admin
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');
    
    // Build query
    let query: any = {};
    
    // If vehicleId is provided, filter by vehicle OR apply to all
    if (vehicleId) {
      query.OR = [
        // Discounts that apply to all vehicles
        { applyToAll: true },
        // Discounts that are specifically connected to this vehicle
        {
          vehicles: {
            some: {
              id: vehicleId
            }
          }
        }
      ];
    }
    
    // Get all duration discounts
    const discounts = await prisma.durationDiscount.findMany({
      where: query,
      include: {
        vehicles: {
          select: {
            id: true,
            model: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json({ discounts });
  } catch (error) {
    console.error('Error fetching duration discounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch duration discounts' },
      { status: 500 }
    );
  }
}

// Create a new duration discount
export async function POST(request: Request) {
  try {
    // Check if user is admin
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Parse the request body
    const data = await request.json();
    const { name, durationType, discountType, discountValue, applyToAll, vehicleIds, isActive } = data;
    
    // Validate required fields
    if (!name || !durationType || !discountType || discountValue === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate duration type
    const validDurationTypes = ['3_days', 'week', '2_weeks', 'month'];
    if (!validDurationTypes.includes(durationType)) {
      return NextResponse.json(
        { error: 'Invalid duration type' },
        { status: 400 }
      );
    }
    
    // Validate discount type
    if (discountType !== 'percentage' && discountType !== 'fixed_amount') {
      return NextResponse.json(
        { error: 'Invalid discount type. Must be "percentage" or "fixed_amount"' },
        { status: 400 }
      );
    }
    
    // Validate discount value
    const discountValueNum = parseFloat(discountValue);
    if (isNaN(discountValueNum) || discountValueNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid discount value' },
        { status: 400 }
      );
    }
    
    // For percentage discounts, ensure it's not more than 100%
    if (discountType === 'percentage' && discountValueNum > 100) {
      return NextResponse.json(
        { error: 'Percentage discount cannot exceed 100%' },
        { status: 400 }
      );
    }
    
    // Create data object
    const createData: any = {
      name,
      durationType,
      discountType,
      discountValue: discountValueNum,
      applyToAll: Boolean(applyToAll),
      isActive: Boolean(isActive)
    };
    
    // If not applying to all vehicles, connect specific vehicles
    if (!applyToAll && vehicleIds && vehicleIds.length > 0) {
      createData.vehicles = {
        connect: vehicleIds.map((id: string) => ({ id }))
      };
    }
    
    // Create the duration discount
    const discount = await prisma.durationDiscount.create({
      data: createData,
      include: {
        vehicles: {
          select: {
            id: true,
            model: true
          }
        }
      }
    });
    
    return NextResponse.json({ discount }, { status: 201 });
  } catch (error) {
    console.error('Error creating duration discount:', error);
    return NextResponse.json(
      { error: 'Failed to create duration discount' },
      { status: 500 }
    );
  }
} 