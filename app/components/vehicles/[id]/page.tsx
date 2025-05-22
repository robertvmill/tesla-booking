import Link from 'next/link';

// This would typically come from a database
const getVehicleById = (id: string) => {
  const vehicles = [
    {
      id: "1",
      model: "Model S",
      image: "/tesla-model-s.jpg",
      description: "Luxury sedan with exceptional range and performance",
      pricePerDay: 150,
      features: ["Autopilot", "Long Range Battery", "Premium Interior", "Dual Motor"],
      seats: 5,
      range: "370 miles",
      acceleration: "3.1 seconds 0-60 mph"
    },
    {
      id: "2",
      model: "Model 3",
      image: "/tesla-model-3.jpg",
      description: "Compact sports sedan with impressive efficiency",
      pricePerDay: 120,
      features: ["Autopilot", "Standard Range Plus", "Minimalist Interior", "Rear-Wheel Drive"],
      seats: 5,
      range: "272 miles",
      acceleration: "5.3 seconds 0-60 mph"
    },
    {
      id: "3",
      model: "Model X",
      image: "/tesla-model-x.jpg",
      description: "SUV with falcon-wing doors and spacious interior",
      pricePerDay: 180,
      features: ["Autopilot", "Long Range Plus", "Falcon Wing Doors", "Third Row Seating"],
      seats: 7,
      range: "340 miles",
      acceleration: "2.5 seconds 0-60 mph"
    }
  ];
  
  return vehicles.find(vehicle => vehicle.id === id);
};

export default function VehicleDetails({ params }: { params: { id: string } }) {
  const vehicle = getVehicleById(params.id);
  
  if (!vehicle) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Vehicle not found</h1>
        <p className="mb-8">The requested vehicle does not exist.</p>
        <Link href="/" className="bg-black text-white px-6 py-3 rounded-md">
          Return to Homepage
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <Link href="/" className="text-gray-600 hover:text-black">
          ← Back to Vehicles
        </Link>
      </div>
      
      <div className="grid md:grid-cols-2 gap-12">
        {/* Vehicle Image */}
        <div className="bg-gray-200 rounded-lg h-80 flex items-center justify-center">
          <div className="text-gray-500 text-xl">Tesla {vehicle.model}</div>
        </div>
        
        {/* Vehicle Details */}
        <div>
          <h1 className="text-3xl font-bold mb-3">Tesla {vehicle.model}</h1>
          <p className="text-gray-600 mb-6">{vehicle.description}</p>
          
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3">Specifications</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Seats</p>
                <p className="font-semibold">{vehicle.seats}</p>
              </div>
              <div>
                <p className="text-gray-600">Range</p>
                <p className="font-semibold">{vehicle.range}</p>
              </div>
              <div>
                <p className="text-gray-600">Acceleration</p>
                <p className="font-semibold">{vehicle.acceleration}</p>
              </div>
              <div>
                <p className="text-gray-600">Daily Rate</p>
                <p className="font-semibold">${vehicle.pricePerDay}/day</p>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-3">Features</h2>
            <ul className="grid grid-cols-2 gap-2">
              {vehicle.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <span className="mr-2">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          
          <Link 
            href={`/booking?vehicleId=${vehicle.id}`}
            className="w-full block bg-red-600 hover:bg-red-700 text-white text-center font-bold py-3 px-6 rounded-md"
          >
            Book Now
          </Link>
        </div>
      </div>
    </div>
  );
}