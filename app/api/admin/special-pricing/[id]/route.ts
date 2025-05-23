import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';

// Helper function to check if user is an admin
async function isAdmin() {
  const session = await getServerSession(authOptions as any) as any;
  return session?.user?.isAdmin === true;
}

// Get a single special pricing rule
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is admin
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    const id = params.id;
    
    // Get the special pricing rule
    const specialPricing = await prisma.specialPricing.findUnique({
      where: { id },
      include: {
        vehicles: {
          select: {
            id: true,
            model: true
          }
        }
      }
    });
    
    if (!specialPricing) {
      return NextResponse.json({ error: 'Special pricing rule not found' }, { status: 404 });
    }
    
    return NextResponse.json({ specialPricing });
  } catch (error) {
    console.error('Error fetching special pricing rule:', error);
    return NextResponse.json({ error: 'Failed to fetch special pricing rule' }, { status: 500 });
  }
}

// Update a special pricing rule
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is admin
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    const id = params.id;
    const data = await request.json();
    const { name, startDate, endDate, priceType, priceValue, applyToAll, vehicleIds } = data;
    
    // Check if the special pricing rule exists
    const existingRule = await prisma.specialPricing.findUnique({
      where: { id },
      include: { vehicles: true }
    });
    
    if (!existingRule) {
      return NextResponse.json({ error: 'Special pricing rule not found' }, { status: 404 });
    }
    
    // Prepare update data
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (priceType !== undefined) {
      if (priceType !== 'multiplier' && priceType !== 'fixed') {
        return NextResponse.json(
          { error: 'Invalid price type. Must be "multiplier" or "fixed"' },
          { status: 400 }
        );
      }
      updateData.priceType = priceType;
    }
    if (priceValue !== undefined) updateData.priceValue = parseFloat(priceValue);
    if (applyToAll !== undefined) updateData.applyToAll = Boolean(applyToAll);
    
    // Handle vehicle connections
    if (vehicleIds !== undefined) {
      // Disconnect all current vehicles
      updateData.vehicles = {
        set: [], // Clear existing connections
      };
      
      // If not applying to all and vehicles are specified, connect them
      if (!applyToAll && vehicleIds.length > 0) {
        updateData.vehicles.connect = vehicleIds.map((id: string) => ({ id }));
      }
    }
    
    // Update the special pricing rule
    const updatedRule = await prisma.specialPricing.update({
      where: { id },
      data: updateData,
      include: {
        vehicles: {
          select: {
            id: true,
            model: true
          }
        }
      }
    });
    
    return NextResponse.json({ specialPricing: updatedRule });
  } catch (error) {
    console.error('Error updating special pricing rule:', error);
    return NextResponse.json({ error: 'Failed to update special pricing rule' }, { status: 500 });
  }
}

// Delete a special pricing rule
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is admin
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    const id = params.id;
    
    // Check if the special pricing rule exists
    const existingRule = await prisma.specialPricing.findUnique({
      where: { id }
    });
    
    if (!existingRule) {
      return NextResponse.json({ error: 'Special pricing rule not found' }, { status: 404 });
    }
    
    // Delete the special pricing rule
    await prisma.specialPricing.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: 'Special pricing rule deleted successfully' });
  } catch (error) {
    console.error('Error deleting special pricing rule:', error);
    return NextResponse.json({ error: 'Failed to delete special pricing rule' }, { status: 500 });
  }
} 