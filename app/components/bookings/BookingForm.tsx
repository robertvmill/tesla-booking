'use client';

import { useState } from 'react';
import { toast } from "sonner";

interface BookingFormProps {
  vehicleId: string;
  pricePerDay: number;
}

export default function BookingForm({ vehicleId, pricePerDay }: BookingFormProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  const calculateTotalDays = () => {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };
  
  const totalDays = calculateTotalDays();
  const totalPrice = totalDays * pricePerDay;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.promise(submitBooking(), {
      loading: "Creating your booking...",
      success: "Booking confirmed successfully!",
      error: "Failed to create booking"
    });
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Book Your Tesla</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="startDate" className="block text-gray-700 mb-2">
              Pick-up Date
            </label>
            <input
              type="date"
              id="startDate"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-gray-700 mb-2">
              Return Date
            </label>
            <input
              type="date"
              id="endDate"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || new Date().toISOString().split('T')[0]}
              required
            />
          </div>
        </div>
        
        <div className="mb-6">
          <label htmlFor="name" className="block text-gray-700 mb-2">
            Full Name
          </label>
          <input
            type="text"
            id="name"
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="email" className="block text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
        </div>
        
        {totalDays > 0 && (
          <div className="bg-gray-100 p-4 rounded-md mb-6">
            <div className="flex justify-between mb-2">
              <span>Daily Rate:</span>
              <span>${pricePerDay}/day</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Number of Days:</span>
              <span>{totalDays}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total Price:</span>
              <span>${totalPrice}</span>
            </div>
          </div>
        )}
        
        <button
          type="submit"
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-md"
        >
          Confirm Booking
        </button>
      </form>
    </div>
  );
}