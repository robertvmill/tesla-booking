'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { PencilIcon, TrashIcon, ArrowLeftIcon, PlusIcon, CheckIcon, XIcon, CarIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';

// Define types for our data
interface Vehicle {
  id: string;
  model: string;
  image: string | null;
  description: string;
  pricePerDay: number;
  seats: number;
  range: string;
  acceleration: string;
  features: string[];
  createdAt: string;
  updatedAt: string;
}

export default function AdminVehiclesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  // Redirect if user is not authenticated or not an admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/admin/vehicles');
      return;
    }
    
    // Check if user is an admin
    const isAdmin = session?.user ? (session.user as any).isAdmin : false;
    if (status === 'authenticated' && !isAdmin) {
      router.push('/');
      return;
    }

    // Fetch vehicles if authenticated and admin
    if (status === 'authenticated' && isAdmin) {
      fetchVehicles();
    }
  }, [status, session, router]);

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/vehicles');
      
      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }
      
      const data = await response.json();
      setVehicles(data.vehicles);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Failed to load vehicles. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    try {
      const response = await fetch(`/api/admin/vehicles/${vehicleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.activeBookings) {
          throw new Error(`Cannot delete: This vehicle has ${data.activeBookings} active bookings.`);
        }
        throw new Error('Failed to delete vehicle');
      }

      // Remove the vehicle from the local state
      setVehicles(vehicles.filter(vehicle => vehicle.id !== vehicleId));
      setDeleteConfirmation(null);
    } catch (err: any) {
      console.error('Error deleting vehicle:', err);
      setError(err.message || 'Failed to delete vehicle. Please try again.');
    }
  };

  // Format date to readable string
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Link href="/admin" className="mr-4">
            <Button variant="outline" size="icon">
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Manage Vehicles</h1>
        </div>
        <p>Loading vehicles...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href="/admin" className="mr-4">
            <Button variant="outline" size="icon">
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Manage Vehicles</h1>
        </div>
        <Link href="/admin/vehicles/new">
          <Button className="bg-red-600 hover:bg-red-700">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {vehicles.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <CarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No vehicles found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a new vehicle to your fleet.</p>
          <div className="mt-6">
            <Link href="/admin/vehicles/new">
              <Button className="bg-red-600 hover:bg-red-700">Add Vehicle</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Model</th>
                <th className="border p-2 text-left">Price/Day</th>
                <th className="border p-2 text-left">Seats</th>
                <th className="border p-2 text-left">Range</th>
                <th className="border p-2 text-left">Added</th>
                <th className="border p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-gray-50">
                  <td className="border p-2">
                    <div className="font-medium">{vehicle.model}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">{vehicle.description.substring(0, 50)}...</div>
                  </td>
                  <td className="border p-2">${vehicle.pricePerDay.toFixed(2)}</td>
                  <td className="border p-2">{vehicle.seats}</td>
                  <td className="border p-2">{vehicle.range}</td>
                  <td className="border p-2">{formatDate(vehicle.createdAt)}</td>
                  <td className="border p-2">
                    <div className="flex space-x-2">
                      <Link href={`/admin/vehicles/${vehicle.id}`}>
                        <Button variant="outline" size="sm">
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                      </Link>
                      {deleteConfirmation === vehicle.id ? (
                        <div className="flex space-x-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="bg-red-100 text-red-800 hover:bg-red-200"
                            onClick={() => handleDeleteVehicle(vehicle.id)}
                          >
                            <CheckIcon className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setDeleteConfirmation(null)}
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteConfirmation(vehicle.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
