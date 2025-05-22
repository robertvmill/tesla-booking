'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface BookVehicleButtonProps {
  vehicleId: string;
}

export default function BookVehicleButton({ vehicleId }: BookVehicleButtonProps) {
  const router = useRouter();
  
  const handleClick = () => {
    // First scroll to the calendar section
    const calendarSection = document.getElementById('availability-calendar');
    if (calendarSection) {
      calendarSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Optionally, you can also navigate to the booking page after a delay
    // setTimeout(() => {
    //   router.push(`/booking?vehicleId=${vehicleId}`);
    // }, 1500);
  };
  
  return (
    <button
      onClick={handleClick}
      className="bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-md inline-block font-medium"
    >
      Book This Vehicle
    </button>
  );
}
