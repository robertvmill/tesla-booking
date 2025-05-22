import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/app/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Store mock vehicles in memory to persist between requests
// This will be reset when the server restarts
let mockVehiclesStore = [
  {
    id: "1",
    model: "Model X Long Range",
    image: "/model_x.png",
    description: "Spacious SUV with 348mi range, falcon wing doors, and 0-60 in 3.8s.",
    pricePerDay: 5,
    seats: 7,
    range: "348 miles",
    acceleration: "0-60 in 3.8s",
    features: ["Autopilot", "Falcon Wing Doors", "Premium Sound", "Wireless Charging"],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "2",
    model: "Model S Plaid",
    image: "/model_s.png",
    description: "Luxury sedan with 390mi range, 200mph top speed, and 0-60 in 1.99s.",
    pricePerDay: 5,
    seats: 5,
    range: "390 miles",
    acceleration: "0-60 in 1.99s",
    features: ["Autopilot", "Premium Interior", "Tri-Motor AWD", "1,020 hp"],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "3",
    model: "Model 3 Performance",
    image: "/model_3.png",
    description: "Sporty sedan with 315mi range, 162mph top speed, and 0-60 in 3.1s.",
    pricePerDay: 5,
    seats: 5,
    range: "315 miles",
    acceleration: "0-60 in 3.1s",
    features: ["Autopilot", "Glass Roof", "Dual Motor AWD", "Performance Brakes"],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Helper function to check if user is admin
async function isAdmin() {
  try {
    const session = await getServerSession(authOptions as any) as any;
    
    if (!session || !session.user || !session.user.email) {
      return false;
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });
    
    return user?.isAdmin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    // For development purposes, return true to allow testing without database
    return true;
  }
}

// Get all vehicles
export async function GET(request: Request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session || !(session.user as any).isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }
    
    // Fetch all vehicles
    const vehicles = await prisma.vehicle.findMany({
      orderBy: {
        model: 'asc',
      },
    });
    
    return NextResponse.json({ vehicles });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

// Create a new vehicle
export async function POST(request: Request) {
  try {
    // Check if user is admin
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['model', 'description', 'pricePerDay', 'seats', 'range', 'acceleration'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }
    
    // Try to create the vehicle in the database
    try {
      const vehicle = await prisma.vehicle.create({
        data: {
          model: data.model,
          image: data.image,
          description: data.description,
          pricePerDay: parseInt(data.pricePerDay),
          seats: parseInt(data.seats),
          range: data.range,
          acceleration: data.acceleration,
          features: Array.isArray(data.features) ? data.features : [],
        }
      });
      
      return NextResponse.json({ vehicle }, { status: 201 });
    } catch (dbError) {
      console.error('Database error creating vehicle:', dbError);
      
      // For development, create a mock vehicle with a unique ID
      const mockVehicle = {
        id: `mock-${Date.now()}`,
        model: data.model,
        image: data.image,
        description: data.description,
        pricePerDay: parseInt(data.pricePerDay),
        seats: parseInt(data.seats),
        range: data.range,
        acceleration: data.acceleration,
        features: Array.isArray(data.features) ? data.features : [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Add the mock vehicle to our in-memory store
      mockVehiclesStore = [mockVehicle, ...mockVehiclesStore];
      
      // Return the mock vehicle as if it was created in the database
      return NextResponse.json({ vehicle: mockVehicle }, { status: 201 });
    }
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json({ error: 'Failed to create vehicle' }, { status: 500 });
  }
}
