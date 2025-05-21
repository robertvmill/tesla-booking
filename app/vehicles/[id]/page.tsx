import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "../../lib/prisma";
import VehicleAvailabilityCalendar from "../../components/vehicles/VehicleAvailabilityCalendar";
import BookVehicleButton from "../../components/vehicles/BookVehicleButton";

// Mock data to use when database connection fails
const mockVehicles = {
  "1": {
    id: "1",
    model: "Model X Long Range",
    image: "/model_x.png",
    description: "Spacious SUV with 348mi range, falcon wing doors, and 0-60 in 3.8s.",
    pricePerDay: 5,
    seats: 7,
    range: "348 miles",
    acceleration: "0-60 in 3.8s",
    features: ["Autopilot", "Falcon Wing Doors", "Premium Sound", "Wireless Charging"],
    bookings: []
  },
  "2": {
    id: "2",
    model: "Model S Plaid",
    image: "/model_s.png",
    description: "Luxury sedan with 390mi range, 200mph top speed, and 0-60 in 1.99s.",
    pricePerDay: 5,
    seats: 5,
    range: "390 miles",
    acceleration: "0-60 in 1.99s",
    features: ["Autopilot", "Premium Interior", "Tri-Motor AWD", "1,020 hp"],
    bookings: []
  },
  "3": {
    id: "3",
    model: "Model 3 Performance",
    image: "/model_3.png",
    description: "Sporty sedan with 315mi range, 162mph top speed, and 0-60 in 3.1s.",
    pricePerDay: 5,
    seats: 5,
    range: "315 miles",
    acceleration: "0-60 in 3.1s",
    features: ["Autopilot", "Glass Roof", "Dual Motor AWD", "Performance Brakes"],
    bookings: []
  }
};

// Define the page props type
type VehicleDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function VehicleDetailPage({ params }: VehicleDetailPageProps) {
  // Use Promise.resolve to await params to fix the Next.js warning
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;

  // Try to fetch vehicle data from the database, fall back to mock data if it fails
  let vehicle;
  try {
    vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        bookings: true, // Include bookings to display availability
      },
    });

    // If vehicle not found in database, check mock data
    if (!vehicle) {
      vehicle = mockVehicles[id as keyof typeof mockVehicles];
      if (!vehicle) {
        notFound();
      }
    }
  } catch (error) {
    console.error("Database connection error:", error);
    // Try to use mock data instead
    vehicle = mockVehicles[id as keyof typeof mockVehicles];
    if (!vehicle) {
      notFound();
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container mx-auto px-4 py-8">
        <Link href="/" className="text-red-600 hover:text-red-800 mb-6 inline-block">
          &larr; Back to all vehicles
        </Link>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Vehicle Header */}
          <div className="grid md:grid-cols-2 gap-8 p-6">
            {/* Vehicle Image */}
            <div className="h-64 md:h-80 relative rounded-lg overflow-hidden">
              <Image
                src={vehicle.image || "/default-vehicle.jpg"}
                alt={`Tesla ${vehicle.model}`}
                fill
                className="object-cover"
              />
            </div>

            {/* Vehicle Details */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Tesla {vehicle.model}</h1>
              <p className="text-gray-700 mb-6">{vehicle.description}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-100 p-3 rounded-md">
                  <p className="text-sm text-gray-500">Price</p>
                  <p className="text-lg font-bold text-gray-900">${vehicle.pricePerDay}/day</p>
                </div>
                <div className="bg-gray-100 p-3 rounded-md">
                  <p className="text-sm text-gray-500">Seats</p>
                  <p className="text-lg font-bold text-gray-900">{vehicle.seats}</p>
                </div>
                <div className="bg-gray-100 p-3 rounded-md">
                  <p className="text-sm text-gray-500">Range</p>
                  <p className="text-lg font-bold text-gray-900">{vehicle.range}</p>
                </div>
                <div className="bg-gray-100 p-3 rounded-md">
                  <p className="text-sm text-gray-500">Acceleration</p>
                  <p className="text-lg font-bold text-gray-900">{vehicle.acceleration}</p>
                </div>
              </div>

              <BookVehicleButton vehicleId={vehicle.id} />
            </div>
          </div>

          {/* Features Section */}
          <div className="p-6 border-t border-gray-200">
            <h2 className="text-2xl font-bold mb-4">Features</h2>
            <ul className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {vehicle.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <span className="mr-2">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Availability Calendar */}
          <div id="availability-calendar" className="p-6 border-t border-gray-200">
            <h2 className="text-2xl font-bold mb-6">Availability Calendar</h2>
            <VehicleAvailabilityCalendar 
              vehicleId={vehicle.id} 
              bookings={vehicle.bookings}
              vehicleModel={vehicle.model}
              pricePerDay={vehicle.pricePerDay} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
