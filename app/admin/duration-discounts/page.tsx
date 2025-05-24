'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, PlusIcon, PencilIcon, TrashIcon, Percent } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Checkbox } from "@/app/components/ui/checkbox";

interface Vehicle {
  id: string;
  model: string;
}

interface DurationDiscount {
  id: string;
  name: string;
  durationType: '3_days' | 'week' | '2_weeks' | 'month';
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  applyToAll: boolean;
  isActive: boolean;
  vehicles: { id: string; model: string }[];
  createdAt: string;
  updatedAt: string;
}

const durationOptions = [
  { value: '3_days', label: '3+ Days' },
  { value: 'week', label: '1+ Week' },
  { value: '2_weeks', label: '2+ Weeks' },
  { value: 'month', label: '1+ Month' },
];

export default function AdminDurationDiscountsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [discounts, setDiscounts] = useState<DurationDiscount[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<DurationDiscount | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    durationType: '',
    discountType: 'percentage',
    discountValue: '',
    applyToAll: true,
    selectedVehicles: [] as string[],
    isActive: true,
  });

  // Redirect if user is not authenticated or not an admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/admin/duration-discounts');
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
      fetchDiscounts();
      fetchVehicles();
    }
  }, [status, session, router]);

  const fetchDiscounts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/duration-discounts');
      
      if (!response.ok) {
        throw new Error('Failed to fetch duration discounts');
      }
      
      const data = await response.json();
      setDiscounts(data.discounts || []);
    } catch (err) {
      console.error('Error fetching duration discounts:', err);
      setError('Failed to load duration discounts. Please try again later.');
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
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      durationType: '',
      discountType: 'percentage',
      discountValue: '',
      applyToAll: true,
      selectedVehicles: [],
      isActive: true,
    });
  };

  const handleAddDiscount = async () => {
    try {
      const response = await fetch('/api/admin/duration-discounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          durationType: formData.durationType,
          discountType: formData.discountType,
          discountValue: parseFloat(formData.discountValue),
          applyToAll: formData.applyToAll,
          vehicleIds: formData.applyToAll ? [] : formData.selectedVehicles,
          isActive: formData.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create duration discount');
      }

      const { discount } = await response.json();
      setDiscounts([discount, ...discounts]);
      setAddDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error creating duration discount:', err);
      setError('Failed to create duration discount. Please try again.');
    }
  };

  const handleEditDiscount = async () => {
    if (!selectedDiscount) return;
    
    try {
      const response = await fetch(`/api/admin/duration-discounts/${selectedDiscount.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          durationType: formData.durationType,
          discountType: formData.discountType,
          discountValue: parseFloat(formData.discountValue),
          applyToAll: formData.applyToAll,
          vehicleIds: formData.applyToAll ? [] : formData.selectedVehicles,
          isActive: formData.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update duration discount');
      }

      const { discount } = await response.json();
      setDiscounts(discounts.map(d => d.id === discount.id ? discount : d));
      setEditDialogOpen(false);
      setSelectedDiscount(null);
      resetForm();
    } catch (err) {
      console.error('Error updating duration discount:', err);
      setError('Failed to update duration discount. Please try again.');
    }
  };

  const handleDeleteDiscount = async () => {
    if (!selectedDiscount) return;
    
    try {
      const response = await fetch(`/api/admin/duration-discounts/${selectedDiscount.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete duration discount');
      }

      setDiscounts(discounts.filter(d => d.id !== selectedDiscount.id));
      setDeleteDialogOpen(false);
      setSelectedDiscount(null);
    } catch (err) {
      console.error('Error deleting duration discount:', err);
      setError('Failed to delete duration discount. Please try again.');
    }
  };

  const openEditDialog = (discount: DurationDiscount) => {
    setSelectedDiscount(discount);
    setFormData({
      name: discount.name,
      durationType: discount.durationType,
      discountType: discount.discountType,
      discountValue: discount.discountValue.toString(),
      applyToAll: discount.applyToAll,
      selectedVehicles: discount.vehicles.map(v => v.id),
      isActive: discount.isActive,
    });
    setEditDialogOpen(true);
  };

  const getDurationLabel = (durationType: string) => {
    return durationOptions.find(option => option.value === durationType)?.label || durationType;
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
          <h1 className="text-2xl font-bold">Duration Discounts</h1>
        </div>
        <p>Loading duration discounts...</p>
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
          <h1 className="text-2xl font-bold">Duration Discounts</h1>
        </div>
        <Button 
          className="bg-red-600 hover:bg-red-700"
          onClick={() => setAddDialogOpen(true)}
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Duration Discount
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {discounts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Percent className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No duration discounts</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a new duration discount.</p>
          <div className="mt-6">
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => setAddDialogOpen(true)}
            >
              Add Duration Discount
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applies To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {discounts.map((discount) => (
                  <tr key={discount.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{discount.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {getDurationLabel(discount.durationType)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {discount.discountType === 'percentage' 
                          ? `${discount.discountValue}%` 
                          : `$${discount.discountValue}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {discount.applyToAll 
                        ? 'All Vehicles' 
                        : `${discount.vehicles.length} vehicle${discount.vehicles.length !== 1 ? 's' : ''}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        discount.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {discount.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => openEditDialog(discount)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-800"
                          onClick={() => {
                            setSelectedDiscount(discount);
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
      
      {/* Add Discount Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Duration Discount</DialogTitle>
            <DialogDescription>
              Create a new discount for longer bookings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Discount Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Weekly Discount"
              />
            </div>
            
            <div>
              <Label htmlFor="durationType">Minimum Duration</Label>
              <Select value={formData.durationType} onValueChange={(value) => setFormData({ ...formData, durationType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="discountType">Discount Type</Label>
              <Select value={formData.discountType} onValueChange={(value) => setFormData({ ...formData, discountType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="discountValue">Discount Value</Label>
              <Input
                id="discountValue"
                type="number"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                placeholder={formData.discountType === 'percentage' ? '10' : '50'}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="applyToAll"
                checked={formData.applyToAll}
                onCheckedChange={(checked) => setFormData({ ...formData, applyToAll: !!checked })}
              />
              <Label htmlFor="applyToAll">Apply to all vehicles</Label>
            </div>
            
            {!formData.applyToAll && (
              <div>
                <Label>Select Vehicles</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {vehicles.map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`vehicle-${vehicle.id}`}
                        checked={formData.selectedVehicles.includes(vehicle.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              selectedVehicles: [...formData.selectedVehicles, vehicle.id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selectedVehicles: formData.selectedVehicles.filter(id => id !== vehicle.id)
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`vehicle-${vehicle.id}`}>{vehicle.model}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddDiscount}
              disabled={!formData.name || !formData.durationType || !formData.discountValue}
            >
              Add Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Discount Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Duration Discount</DialogTitle>
            <DialogDescription>
              Modify the duration discount settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Discount Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Weekly Discount"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-durationType">Minimum Duration</Label>
              <Select value={formData.durationType} onValueChange={(value) => setFormData({ ...formData, durationType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="edit-discountType">Discount Type</Label>
              <Select value={formData.discountType} onValueChange={(value) => setFormData({ ...formData, discountType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="edit-discountValue">Discount Value</Label>
              <Input
                id="edit-discountValue"
                type="number"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                placeholder={formData.discountType === 'percentage' ? '10' : '50'}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-applyToAll"
                checked={formData.applyToAll}
                onCheckedChange={(checked) => setFormData({ ...formData, applyToAll: !!checked })}
              />
              <Label htmlFor="edit-applyToAll">Apply to all vehicles</Label>
            </div>
            
            {!formData.applyToAll && (
              <div>
                <Label>Select Vehicles</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {vehicles.map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-vehicle-${vehicle.id}`}
                        checked={formData.selectedVehicles.includes(vehicle.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              selectedVehicles: [...formData.selectedVehicles, vehicle.id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selectedVehicles: formData.selectedVehicles.filter(id => id !== vehicle.id)
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`edit-vehicle-${vehicle.id}`}>{vehicle.model}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
              />
              <Label htmlFor="edit-isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditDiscount}
              disabled={!formData.name || !formData.durationType || !formData.discountValue}
            >
              Update Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Duration Discount</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this duration discount? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedDiscount && (
            <div className="py-4">
              <p className="font-medium">{selectedDiscount.name}</p>
              <p className="text-sm text-gray-500">
                {getDurationLabel(selectedDiscount.durationType)} - {selectedDiscount.discountType === 'percentage' 
                  ? `${selectedDiscount.discountValue}%` 
                  : `$${selectedDiscount.discountValue}`} discount
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDiscount}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 