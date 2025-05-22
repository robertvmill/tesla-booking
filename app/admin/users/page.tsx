'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { PencilIcon, TrashIcon, ArrowLeftIcon, CheckIcon, XIcon, UserIcon, ShieldIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';

// Define types for our data
interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  isAdmin: boolean;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    bookings: number;
  };
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  // Redirect if user is not authenticated or not an admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/admin/users');
      return;
    }
    
    // Check if user is an admin
    const isAdmin = session?.user ? (session.user as any).isAdmin : false;
    if (status === 'authenticated' && !isAdmin) {
      router.push('/');
      return;
    }

    // Fetch users if authenticated and admin
    if (status === 'authenticated' && isAdmin) {
      fetchUsers();
    }
  }, [status, session, router]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.activeBookings) {
          throw new Error(`Cannot delete: This user has ${data.activeBookings} active bookings.`);
        }
        throw new Error('Failed to delete user');
      }

      // Remove the user from the local state
      setUsers(users.filter(user => user.id !== userId));
      setDeleteConfirmation(null);
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.message || 'Failed to delete user. Please try again.');
    }
  };

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    try {
      // Check if trying to remove admin status from self
      const currentUserEmail = session?.user?.email;
      const targetUser = users.find(user => user.id === userId);
      
      if (targetUser?.email === currentUserEmail && currentIsAdmin) {
        setError("You cannot remove your own admin privileges");
        return;
      }
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isAdmin: !currentIsAdmin }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      // Update the user in the local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isAdmin: !currentIsAdmin } : user
      ));
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Failed to update user. Please try again.');
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
          <h1 className="text-2xl font-bold">Manage Users</h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white p-4 rounded-md shadow">
              <Skeleton className="h-6 w-1/3 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Link href="/admin" className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Manage Users</h1>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {users.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">There are no registered users in the system.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">User</th>
                <th className="border p-2 text-left">Email</th>
                <th className="border p-2 text-left">Phone</th>
                <th className="border p-2 text-left">Bookings</th>
                <th className="border p-2 text-left">Joined</th>
                <th className="border p-2 text-left">Admin</th>
                <th className="border p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isCurrentUser = user.email === session?.user?.email;
                
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="border p-2">
                      <div className="flex items-center">
                        {user.image ? (
                          <img 
                            src={user.image} 
                            alt={user.name || 'User'} 
                            className="w-8 h-8 rounded-full mr-2"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-2">
                            <UserIcon className="h-4 w-4 text-gray-500" />
                          </div>
                        )}
                        <span className="font-medium">
                          {user.name || 'Unnamed User'}
                          {isCurrentUser && <span className="ml-2 text-xs text-gray-500">(You)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="border p-2">{user.email}</td>
                    <td className="border p-2">{user.phone || '-'}</td>
                    <td className="border p-2">{user._count.bookings}</td>
                    <td className="border p-2">{formatDate(user.createdAt)}</td>
                    <td className="border p-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className={user.isAdmin ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                        onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                      >
                        {user.isAdmin ? (
                          <><ShieldIcon className="h-4 w-4 mr-1" /> Yes</>
                        ) : (
                          'No'
                        )}
                      </Button>
                    </td>
                    <td className="border p-2">
                      <div className="flex space-x-2">
                        <Link href={`/admin/users/${user.id}`}>
                          <Button variant="outline" size="sm">
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                        </Link>
                        {!isCurrentUser && (
                          deleteConfirmation === user.id ? (
                            <div className="flex space-x-1">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="bg-red-100 text-red-800 hover:bg-red-200"
                                onClick={() => handleDeleteUser(user.id)}
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
                              onClick={() => setDeleteConfirmation(user.id)}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
