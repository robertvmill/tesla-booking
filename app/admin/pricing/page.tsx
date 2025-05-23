'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ArrowLeftIcon, PlusIcon, PencilIcon, TrashIcon, CalendarIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";

interface Vehicle {
  id: string;
  model: string;
}

interface SpecialPricing {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  priceType: 'multiplier' | 'fixed';
  priceValue: number;
  applyToAll: boolean;
  vehicles: { id: string; model: string }[];
  createdAt: string;
  updatedAt: string;
}

export default function AdminPricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [specialPricingRules, setSpecialPricingRules] = useState<SpecialPricing[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Deletion state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<SpecialPricing | null>(null);

  // Redirect if user is not authenticated or not an admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/admin/pricing');
      return;
    }
    
    // Check if user is an admin
    const isAdmin = session?.user ? (session.user as any).isAdmin : false;
    if (status === 'authenticated' && !isAdmin) {
      router.push('/');
      return;
    }

    // Fetch data if authenticated and admin
    if (status === 'authenticated' && isAdmin) {
      fetchSpecialPricing();
      fetchVehicles();
    }
  }, [status, session, router]);

  const fetchSpecialPricing = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/special-pricing');
      
      if (!response.ok) {
        throw new Error('Failed to fetch special pricing rules');
      }
      
      const data = await response.json();
      setSpecialPricingRules(data.specialPricing || []);
    } catch (err) {
      console.error('Error fetching special pricing:', err);
      setError('Failed to load special pricing rules. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/admin/vehicles');
      
      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }
      
      const data = await response.json();
      setVehicles(data.vehicles || []);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      // Don't set an error, just use empty state
    }
  };

  const handleDeleteRule = async () => {
    if (!selectedRule) return;
    
    try {
      const response = await fetch(`/api/admin/special-pricing/${selectedRule.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete special pricing rule');
      }

      // Remove the rule from the local state
      setSpecialPricingRules(
        specialPricingRules.filter(rule => rule.id !== selectedRule.id)
      );
      
      setDeleteDialogOpen(false);
      setSelectedRule(null);
    } catch (err) {
      console.error('Error deleting special pricing rule:', err);
      setError('Failed to delete special pricing rule. Please try again.');
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'MMM d, yyyy');
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
          <h1 className="text-2xl font-bold">Special Pricing</h1>
        </div>
        <p>Loading special pricing rules...</p>
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
          <h1 className="text-2xl font-bold">Special Pricing</h1>
        </div>
        <div className="flex space-x-2">
          <Link href="/admin/calendar">
            <Button variant="outline">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Calendar View
            </Button>
          </Link>
          <Button 
            className="bg-red-600 hover:bg-red-700"
            onClick={() => {
              router.push('/admin/calendar');
              // Add a small delay to make sure the page loads before opening the dialog
              setTimeout(() => {
                // This is a hack to trigger the special pricing dialog on the calendar page
                // A better approach would be to use a state management solution like Redux or Context API
                localStorage.setItem('openSpecialPricing', 'true');
              }, 100);
            }}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Special Pricing
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {specialPricingRules.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No special pricing rules</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a new special pricing rule.</p>
          <div className="mt-6">
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => router.push('/admin/calendar')}
            >
              Add Special Pricing
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Range</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applies To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {specialPricingRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatDate(rule.startDate)} - {formatDate(rule.endDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        rule.priceType === 'multiplier' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {rule.priceType === 'multiplier' ? 'Multiplier' : 'Fixed Price'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rule.priceType === 'multiplier' 
                        ? `${rule.priceValue}x` 
                        : `$${rule.priceValue}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rule.applyToAll 
                        ? 'All Vehicles' 
                        : `${rule.vehicles.length} vehicle${rule.vehicles.length !== 1 ? 's' : ''}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => {
                            // Store the rule ID in localStorage to edit it on the calendar page
                            localStorage.setItem('editSpecialPricing', rule.id);
                            router.push('/admin/calendar');
                          }}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-800"
                          onClick={() => {
                            setSelectedRule(rule);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Special Pricing Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this special pricing rule? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedRule && (
            <div className="py-4">
              <p className="font-medium">{selectedRule.name}</p>
              <p className="text-sm text-gray-500">
                {formatDate(selectedRule.startDate)} - {formatDate(selectedRule.endDate)}
              </p>
              <p className="text-sm mt-1">
                {selectedRule.priceType === 'multiplier' 
                  ? `${selectedRule.priceValue}x multiplier` 
                  : `$${selectedRule.priceValue} fixed price`}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRule}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 