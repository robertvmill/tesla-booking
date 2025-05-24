import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';

// Helper function to check if user is an admin
async function isAdmin() {
  const session = await getServerSession(authOptions as any) as any;
  return session?.user?.isAdmin === true;
}

// Update a duration discount
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    // Check if user is admin
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    const { id } = params;
    
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
    
    // Check if discount exists
    const existingDiscount = await prisma.durationDiscount.findUnique({
      where: { id },
      include: { vehicles: true }
    });
    
    if (!existingDiscount) {
      return NextResponse.json(
        { error: 'Duration discount not found' },
        { status: 404 }
      );
    }
    
    // First, disconnect all existing vehicles
    await prisma.durationDiscount.update({
      where: { id },
      data: {
        vehicles: {
          disconnect: existingDiscount.vehicles.map(v => ({ id: v.id }))
        }
      }
    });
    
    // Create update data object
    const updateData: any = {
      name,
      durationType,
      discountType,
      discountValue: discountValueNum,
      applyToAll: Boolean(applyToAll),
      isActive: Boolean(isActive)
    };
    
    // If not applying to all vehicles, connect specific vehicles
    if (!applyToAll && vehicleIds && vehicleIds.length > 0) {
      updateData.vehicles = {
        connect: vehicleIds.map((vehicleId: string) => ({ id: vehicleId }))
      };
    }
    
    // Update the duration discount
    const discount = await prisma.durationDiscount.update({
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
    
    return NextResponse.json({ discount });
  } catch (error) {
    console.error('Error updating duration discount:', error);
    return NextResponse.json(
      { error: 'Failed to update duration discount' },
      { status: 500 }
    );
  }
}

// Delete a duration discount
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    // Check if user is admin
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    const { id } = params;
    
    // Check if discount exists
    const existingDiscount = await prisma.durationDiscount.findUnique({
      where: { id }
    });
    
    if (!existingDiscount) {
      return NextResponse.json(
        { error: 'Duration discount not found' },
        { status: 404 }
      );
    }
    
    // Delete the duration discount
    await prisma.durationDiscount.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: 'Duration discount deleted successfully' });
  } catch (error) {
    console.error('Error deleting duration discount:', error);
    return NextResponse.json(
      { error: 'Failed to delete duration discount' },
      { status: 500 }
    );
  }
} 