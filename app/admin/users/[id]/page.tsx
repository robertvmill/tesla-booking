'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeftIcon, UserIcon, ShieldIcon, CalendarIcon, CarIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';

// Define types for our data
interface Booking {
  id: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: string;
  vehicle: {
    id: string;
    model: string;
  };
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  isAdmin: boolean;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  bookings: Booking[];
}

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const userId = params.id;
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    isAdmin: false,
    password: '',
  });
  
  // Redirect if user is not authenticated or not an admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/admin/users/' + userId);
      return;
    }
    
    // Check if user is an admin
    const isAdmin = session?.user ? (session.user as any).isAdmin : false;
    if (status === 'authenticated' && !isAdmin) {
      router.push('/');
      return;
    }

    // Fetch user if authenticated and admin
    if (status === 'authenticated' && isAdmin) {
      fetchUser();
    }
  }, [status, session, router, userId]);
  
  const fetchUser = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      
      const data = await response.json();
      setUser(data.user);
      
      // Initialize form data
      setFormData({
        name: data.user.name || '',
        email: data.user.email || '',
        phone: data.user.phone || '',
        isAdmin: data.user.isAdmin,
        password: '',
      });
    } catch (err) {
      console.error('Error fetching user:', err);
      setError('Failed to load user data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      isAdmin: checked
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Check if trying to remove admin status from self
      const currentUserEmail = session?.user?.email;
      if (user?.email === currentUserEmail && user?.isAdmin && !formData.isAdmin) {
        setError("You cannot remove your own admin privileges");
        setIsSaving(false);
        return;
      }
      
      // Prepare data for update
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        isAdmin: formData.isAdmin,
      };
      
      // Only include password if it was changed
      if (formData.password.trim() !== '') {
        updateData.password = formData.password;
      }
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user');
      }
      
      const data = await response.json();
      
      // Update local user state with new data
      if (user) {
        setUser({
          ...user,
          name: data.user.name,
          email: data.user.email,
          phone: data.user.phone,
          isAdmin: data.user.isAdmin,
        });
      }
      
      // Reset password field
      setFormData(prev => ({
        ...prev,
        password: '',
      }));
      
      setSuccessMessage('User updated successfully');
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Failed to update user. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Format date to readable string
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };
  
  // Format booking date range
  const formatDateRange = (startDate: string, endDate: string) => {
    return `${format(new Date(startDate), 'MMM d')} - ${format(new Date(endDate), 'MMM d, yyyy')}`;
  };
  
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (status === 'loading' || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Link href="/admin/users" className="mr-4">
            <Button variant="outline" size="icon">
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">User Details</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Skeleton className="h-40 w-full mb-4" />
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="md:col-span-2">
            <Skeleton className="h-60 w-full" />
          </div>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Link href="/admin/users" className="mr-4">
            <Button variant="outline" size="icon">
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">User Details</h1>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          User not found or you don't have permission to view this user.
        </div>
      </div>
    );
  }
  
  const isCurrentUser = user.email === session?.user?.email;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Link href="/admin/users" className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">User Details</h1>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
          {successMessage}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex justify-center mb-4">
                {user.image ? (
                  <img 
                    src={user.image} 
                    alt={user.name || 'User'} 
                    className="w-24 h-24 rounded-full"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                    <UserIcon className="h-12 w-12 text-gray-500" />
                  </div>
                )}
              </div>
              <CardTitle className="text-center">{user.name || 'Unnamed User'}</CardTitle>
              <CardDescription className="text-center">
                {user.email}
                {isCurrentUser && <span className="block text-xs text-gray-500 mt-1">(This is you)</span>}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Member since:</span>
                  <span>{formatDate(user.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone:</span>
                  <span>{user.phone || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Admin:</span>
                  <span className={user.isAdmin ? "text-green-600 font-medium" : "text-gray-600"}>
                    {user.isAdmin ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bookings:</span>
                  <span>{user.bookings.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Edit User</CardTitle>
              <CardDescription>Update user information and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Full Name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="email@example.com"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(123) 456-7890"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password (leave blank to keep unchanged)</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="New password"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isAdmin"
                    checked={formData.isAdmin}
                    onCheckedChange={handleCheckboxChange}
                    disabled={isCurrentUser && user.isAdmin}
                  />
                  <Label htmlFor="isAdmin" className="cursor-pointer">
                    Admin privileges
                    {isCurrentUser && user.isAdmin && (
                      <span className="text-xs text-gray-500 ml-2">(Cannot remove your own admin status)</span>
                    )}
                  </Label>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/admin/users')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-red-600 hover:bg-red-700"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          
          {user.bookings.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Bookings History</CardTitle>
                <CardDescription>This user has made {user.bookings.length} bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {user.bookings.map((booking) => (
                    <div key={booking.id} className="border rounded-md p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium">{booking.vehicle.model}</h3>
                          <div className="flex items-center text-sm text-gray-500">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {formatDateRange(booking.startDate, booking.endDate)}
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Total:</span>
                        <span className="font-medium">${booking.totalPrice.toFixed(2)}</span>
                      </div>
                      <div className="mt-2">
                        <Link href={`/admin/bookings/${booking.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
