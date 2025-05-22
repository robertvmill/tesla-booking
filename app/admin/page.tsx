'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import { BookOpenCheck, Car, Users, Settings, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Redirect if user is not authenticated or not an admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/admin');
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
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <BookOpenCheck className="h-8 w-8 text-red-500 mb-2" />
            <CardTitle>Manage Bookings</CardTitle>
            <CardDescription>View, edit and manage all customer bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Update booking status, modify dates, or cancel bookings as needed.</p>
          </CardContent>
          <CardFooter>
            <Link href="/admin/bookings" className="w-full">
              <Button variant="default" className="w-full">Manage Bookings</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <Calendar className="h-8 w-8 text-red-500 mb-2" />
            <CardTitle>Booking Calendar</CardTitle>
            <CardDescription>View and manage bookings in calendar view</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">See all bookings on a calendar and cancel bookings when necessary.</p>
          </CardContent>
          <CardFooter>
            <Link href="/admin/calendar" className="w-full">
              <Button variant="default" className="w-full">View Calendar</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <Car className="h-8 w-8 text-red-500 mb-2" />
            <CardTitle>Manage Vehicles</CardTitle>
            <CardDescription>Add, edit or remove vehicles from the fleet</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Update vehicle details, pricing, and availability.</p>
          </CardContent>
          <CardFooter>
            <Link href="/admin/vehicles" className="w-full">
              <Button variant="default" className="w-full">Manage Vehicles</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <Users className="h-8 w-8 text-red-500 mb-2" />
            <CardTitle>Manage Users</CardTitle>
            <CardDescription>View and manage user accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Update user information, reset passwords, or grant admin privileges.</p>
          </CardContent>
          <CardFooter>
            <Link href="/admin/users" className="w-full">
              <Button variant="default" className="w-full">Manage Users</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <Settings className="h-8 w-8 text-red-500 mb-2" />
            <CardTitle>Site Settings</CardTitle>
            <CardDescription>Configure application settings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Update site configuration, payment settings, and notification preferences.</p>
          </CardContent>
          <CardFooter>
            <Link href="/admin/settings" className="w-full">
              <Button variant="default" className="w-full">Site Settings</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}