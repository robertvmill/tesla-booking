'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import VehicleForm from '../VehicleForm';

export default function NewVehiclePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect if user is not authenticated or not an admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/admin/vehicles/new');
      return;
    }
    
    // Check if user is an admin
    const isAdmin = session?.user ? (session.user as any).isAdmin : false;
    if (status === 'authenticated' && !isAdmin) {
      router.push('/');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Link href="/admin/vehicles" className="mr-4">
            <Button variant="outline" size="icon">
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Add New Vehicle</h1>
        </div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Link href="/admin/vehicles" className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Add New Vehicle</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <VehicleForm />
      </div>
    </div>
  );
}
