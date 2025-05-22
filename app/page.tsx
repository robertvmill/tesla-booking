import prisma from './lib/prisma';
import BookingSearchBar from './components/bookings/BookingSearchBar';
import VehicleCard from './components/vehicles/VehicleCard';

// Mock data to use when database connection fails
const mockVehicles = [
  {
    id: "1",
    model: "Model X Long Range",
    image: "/model_x.png",
    description: "Spacious SUV with 348mi range, falcon wing doors, and 0-60 in 3.8s.",
    pricePerDay: 5,
    seats: 7,
    range: "348 miles",
    acceleration: "0-60 in 3.8s",
    features: ["Autopilot", "Falcon Wing Doors", "Premium Sound", "Wireless Charging"]
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
    features: ["Autopilot", "Premium Interior", "Tri-Motor AWD", "1,020 hp"]
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
    features: ["Autopilot", "Glass Roof", "Dual Motor AWD", "Performance Brakes"]
  }
];

export default async function Home() {
  // Try to fetch vehicles from the database, fall back to mock data if it fails
  let vehicles;
  try {
    vehicles = await prisma.vehicle.findMany();
  } catch (error) {
    console.error("Database connection error:", error);
    vehicles = mockVehicles;
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Booking Search Bar */}
      <BookingSearchBar />

      {/* Vehicle Listings */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-12 text-center">
          Available Vehicles
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              id={vehicle.id}
              model={vehicle.model}
              image={vehicle.image}
              description={vehicle.description}
              pricePerDay={vehicle.pricePerDay}
            />
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-100 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">
            Why Choose Our Tesla Rentals
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-3">Premium Experience</h3>
              <p className="text-gray-600">
                Drive the most advanced electric vehicles on the market
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-3">Flexible Booking</h3>
              <p className="text-gray-600">
                Easy online booking system with flexible scheduling options
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-3">24/7 Support</h3>
              <p className="text-gray-600">
                Customer service available any time you need assistance
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>© 2023 Tesla Bookings. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}