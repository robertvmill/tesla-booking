// Import required Next.js components
import Image from 'next/image';
import Link from 'next/link';

// Main About page component
export default function AboutPage() {
  return (
    // Full-height container with light gray background and top padding
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Main content container with padding */}
      <div className="container mx-auto px-4 py-12">
        {/* Page title */}
        <h1 className="text-4xl font-bold text-center mb-8">About Tesla Bookings</h1>
        
        {/* Hero image container */}
        <div className="relative max-w-4xl mx-auto h-96 mb-12">
          <Image 
            src="/toronto_skyline.png" 
            alt="Toronto skyline" 
            fill 
            className="object-cover rounded-xl"
            priority
          />
        </div>
        
        {/* Content section with white background card */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white p-8 rounded-xl shadow-md">
            {/* Main heading */}
            <h2 className="text-2xl font-bold mb-4">Book a Tesla in the Heart of Toronto</h2>
            
            {/* Introduction paragraph */}
            <p className="text-lg mb-6">
              Welcome to Tesla Bookings, Toronto&apos;s premier Tesla rental service. We offer a fleet of high-performance, 
              all-electric Tesla vehicles available for both short and long-term rentals.
            </p>
            
            {/* Our Story section */}
            <h3 className="text-xl font-bold mb-3">Our Story</h3>
            <p className="text-gray-700 mb-6">
              Jeff is the proud owner of a growing fleet of Tesla vehicles in downtown Toronto. What started as a 
              passion for sustainable transportation has grown into Toronto&apos;s most sought-after Tesla rental service.
              Whether you need a vehicle for a special occasion, business trip, or just want to experience the 
              thrill of driving a Tesla, our impeccably maintained vehicles are available for your convenience.
            </p>
            
            {/* Our Fleet section */}
            <h3 className="text-xl font-bold mb-3">Our Fleet</h3>
            <p className="text-gray-700 mb-6">
              We maintain a diverse collection of Tesla&apos;s most popular models, including the Model S, Model 3, and Model X.
              Each vehicle is meticulously maintained and fully charged for your journey.
            </p>
            
            {/* Call to action button */}
            <div className="mt-8">
              <Link href="/dashboard" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-md">
                Book Your Tesla Today
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
