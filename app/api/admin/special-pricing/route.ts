import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';

// Helper function to check if user is an admin
async function isAdmin() {
  const session = await getServerSession(authOptions as any) as any;
  return session?.user?.isAdmin === true;
}

// Get all special pricing rules
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
    const query: any = {};
    
    // If vehicleId is provided, filter by vehicle
    if (vehicleId) {
      query.vehicles = {
        some: {
          id: vehicleId
        }
      };
    }
    
    // Get all special pricing rules
    const specialPricing = await prisma.specialPricing.findMany({
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
        startDate: 'asc'
      }
    });
    
    return NextResponse.json({ specialPricing });
  } catch (error) {
    console.error('Error fetching special pricing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch special pricing rules' },
      { status: 500 }
    );
  }
}

// Create a new special pricing rule
export async function POST(request: Request) {
  try {
    // Check if user is admin
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Parse the request body
    const data = await request.json();
    const { name, startDate, endDate, priceType, priceValue, applyToAll, vehicleIds } = data;
    
    // Validate required fields
    if (!name || !startDate || !endDate || !priceType || priceValue === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate price type
    if (priceType !== 'multiplier' && priceType !== 'fixed') {
      return NextResponse.json(
        { error: 'Invalid price type. Must be "multiplier" or "fixed"' },
        { status: 400 }
      );
    }
    
    // Create data object
    const createData: any = {
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      priceType,
      priceValue: parseFloat(priceValue),
      applyToAll: Boolean(applyToAll)
    };
    
    // If not applying to all vehicles, connect specific vehicles
    if (!applyToAll && vehicleIds && vehicleIds.length > 0) {
      createData.vehicles = {
        connect: vehicleIds.map((id: string) => ({ id }))
      };
    }
    
    // Create the special pricing rule
    const specialPricing = await prisma.specialPricing.create({
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
    
    return NextResponse.json({ specialPricing }, { status: 201 });
  } catch (error) {
    console.error('Error creating special pricing:', error);
    return NextResponse.json(
      { error: 'Failed to create special pricing rule' },
      { status: 500 }
    );
  }
} 