'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface VehicleCardProps {
  id: string;
  model: string;
  image: string | null;
  description: string;
  pricePerDay: number;
}

export default function VehicleCard({ id, model, image, description, pricePerDay }: VehicleCardProps) {
  const router = useRouter();
  
  const handleCardClick = () => {
    router.push(`/vehicles/${id}`);
  };
  
  const handleBookNowClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the card click from triggering
    router.push(`/vehicles/${id}`);
  };
  
  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="h-48 bg-gray-200 relative">
        {/* If we have an image, use it, otherwise show placeholder */}
        {image ? (
          <Image 
            src={image} 
            alt={`Tesla ${model}`} 
            fill 
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            Tesla {model}
          </div>
        )}
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2 text-gray-900">Tesla {model}</h3>
        <p className="text-gray-800 mb-4">{description}</p>
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">${pricePerDay}/day</span>
          <button 
            onClick={handleBookNowClick}
            className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md"
          >
            View & Book
          </button>
        </div>
      </div>
    </div>
  );
}