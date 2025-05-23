'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { XIcon, PlusIcon, ImageIcon, UploadIcon, DollarSignIcon, Settings2Icon } from 'lucide-react';

interface VehicleFormProps {
  vehicleId?: string;
  isEditing?: boolean;
}

interface VehicleFormData {
  model: string;
  image: string;
  description: string;
  pricePerDay: string;
  seats: string;
  range: string;
  acceleration: string;
  features: string[];
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

export default function VehicleForm({ vehicleId, isEditing = false }: VehicleFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<VehicleFormData>({
    model: '',
    image: '',
    description: '',
    pricePerDay: '',
    seats: '',
    range: '',
    acceleration: '',
    features: [''],
  });
  
  // Tab state
  const [activeTab, setActiveTab] = useState('general');
  
  // Special Pricing state
  const [specialPricingRules, setSpecialPricingRules] = useState<SpecialPricing[]>([]);
  const [isLoadingPricing, setIsLoadingPricing] = useState(false);
  
  // Fetch vehicle data if editing
  useEffect(() => {
    if (isEditing && vehicleId) {
      fetchVehicle();
      
      // Also fetch special pricing rules for this vehicle
      if (vehicleId) {
        fetchSpecialPricing();
      }
    }
  }, [isEditing, vehicleId]);
  
  const fetchVehicle = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/vehicles/${vehicleId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch vehicle');
      }
      
      const data = await response.json();
      const vehicle = data.vehicle;
      
      setFormData({
        model: vehicle.model,
        image: vehicle.image || '',
        description: vehicle.description,
        pricePerDay: vehicle.pricePerDay.toString(),
        seats: vehicle.seats.toString(),
        range: vehicle.range,
        acceleration: vehicle.acceleration,
        features: vehicle.features.length > 0 ? vehicle.features : [''],
      });
    } catch (err) {
      console.error('Error fetching vehicle:', err);
      setError('Failed to load vehicle data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchSpecialPricing = async () => {
    if (!vehicleId) return;
    
    setIsLoadingPricing(true);
    try {
      const response = await fetch(`/api/admin/special-pricing?vehicleId=${vehicleId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch special pricing rules');
      }
      
      const data = await response.json();
      setSpecialPricingRules(data.specialPricing || []);
    } catch (err) {
      console.error('Error fetching special pricing:', err);
      // Don't set an error, just show empty state
    } finally {
      setIsLoadingPricing(false);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      // Preview the image
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target) {
          setImagePreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleFeatureChange = (index: number, value: string) => {
    const updatedFeatures = [...formData.features];
    updatedFeatures[index] = value;
    setFormData(prev => ({
      ...prev,
      features: updatedFeatures
    }));
  };
  
  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };
  
  const removeFeature = (index: number) => {
    if (formData.features.length <= 1) {
      return; // Keep at least one feature field
    }
    
    const updatedFeatures = formData.features.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      features: updatedFeatures
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Validate form data
    if (!formData.model || !formData.description || !formData.pricePerDay || 
        !formData.seats || !formData.range || !formData.acceleration) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }
    
    // Filter out empty features
    const filteredFeatures = formData.features.filter(feature => feature.trim() !== '');
    
    try {
      // If there's a new image file, upload it first
      let imagePath = formData.image;
      
      if (imageFile) {
        setIsUploading(true);
        const uploadFormData = new FormData();
        uploadFormData.append('file', imageFile);
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }
        
        const uploadData = await uploadResponse.json();
        imagePath = uploadData.filePath;
        setIsUploading(false);
      }
      
      // Now save the vehicle data with the image path
      const url = isEditing 
        ? `/api/admin/vehicles/${vehicleId}`
        : '/api/admin/vehicles';
      
      const method = isEditing ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          image: imagePath,
          features: filteredFeatures,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save vehicle');
      }
      
      // Redirect to vehicles list
      router.push('/admin/vehicles');
      router.refresh();
    } catch (err: any) {
      console.error('Error saving vehicle:', err);
      setError('Failed to save vehicle. Please try again.');
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Navigate to the special pricing management page
  const goToSpecialPricing = () => {
    router.push('/admin/calendar');
  };
  
  if (isEditing && isLoading) {
    return <div className="text-center py-8">Loading vehicle data...</div>;
  }
  
  return (
    <div>
      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex space-x-6">
          <button
            type="button"
            className={`py-2 px-1 font-medium text-sm relative ${
              activeTab === 'general'
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('general')}
          >
            <span className="flex items-center">
              <Settings2Icon className="h-4 w-4 mr-2" />
              General
            </span>
          </button>
          <button
            type="button"
            className={`py-2 px-1 font-medium text-sm relative ${
              activeTab === 'pricing'
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('pricing')}
          >
            <span className="flex items-center">
              <DollarSignIcon className="h-4 w-4 mr-2" />
              Special Pricing
            </span>
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {/* General Tab Content */}
      {activeTab === 'general' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="model">Model *</Label>
              <Input
                id="model"
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="e.g. Model S"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="image">Vehicle Image</Label>
              <div className="flex items-start space-x-4">
                <div className="flex-1">
                  <input
                    type="file"
                    id="image"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    className="hidden"
                    accept="image/*"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadIcon className="h-4 w-4 mr-2" />
                    {imageFile ? 'Change Image' : 'Upload Image'}
                  </Button>
                  {imageFile && (
                    <p className="text-sm text-gray-500 mt-1 truncate">
                      {imageFile.name}
                    </p>
                  )}
                </div>
                
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 border rounded flex items-center justify-center overflow-hidden bg-gray-50">
                    {imagePreview ? (
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                      />
                    ) : formData.image ? (
                      <img 
                        src={formData.image} 
                        alt="Current" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-gray-300" />
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter vehicle description"
                rows={4}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pricePerDay">Price Per Day ($) *</Label>
              <Input
                id="pricePerDay"
                name="pricePerDay"
                type="number"
                value={formData.pricePerDay}
                onChange={handleChange}
                placeholder="150"
                min="1"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="seats">Seats *</Label>
              <Input
                id="seats"
                name="seats"
                type="number"
                value={formData.seats}
                onChange={handleChange}
                placeholder="5"
                min="1"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="range">Range *</Label>
              <Input
                id="range"
                name="range"
                value={formData.range}
                onChange={handleChange}
                placeholder="e.g. 405 miles"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="acceleration">Acceleration *</Label>
              <Input
                id="acceleration"
                name="acceleration"
                value={formData.acceleration}
                onChange={handleChange}
                placeholder="e.g. 0-60 in 3.1s"
                required
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label>Features</Label>
              {formData.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2 mt-2">
                  <Input
                    value={feature}
                    onChange={(e) => handleFeatureChange(index, e.target.value)}
                    placeholder={`Feature ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeFeature(index)}
                    className="flex-shrink-0"
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addFeature}
                className="mt-2"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Feature
              </Button>
            </div>
          </div>
          
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/vehicles')}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || isUploading}
              className="w-full md:w-auto bg-red-600 hover:bg-red-700"
            >
              {isLoading || isUploading ? (
                <>
                  {isUploading ? 'Uploading Image...' : 'Saving...'}
                </>
              ) : (
                <>{isEditing ? 'Update Vehicle' : 'Add Vehicle'}</>
              )}
            </Button>
          </div>
        </form>
      )}
      
      {/* Special Pricing Tab Content */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          {isLoadingPricing ? (
            <div className="text-center py-8">Loading special pricing rules...</div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">Special Pricing Rules</h2>
                <Button 
                  onClick={goToSpecialPricing}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <DollarSignIcon className="h-4 w-4 mr-2" />
                  Manage Special Pricing
                </Button>
              </div>
              
              {specialPricingRules.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <DollarSignIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No special pricing rules</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    This vehicle doesn't have any special pricing rules applied directly to it.
                  </p>
                  <p className="text-sm text-gray-500">
                    There may still be global pricing rules that apply to all vehicles.
                  </p>
                  <div className="mt-6">
                    <Button 
                      onClick={goToSpecialPricing}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Set Special Pricing
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-2 text-left">Name</th>
                        <th className="border p-2 text-left">Date Range</th>
                        <th className="border p-2 text-left">Type</th>
                        <th className="border p-2 text-left">Value</th>
                        <th className="border p-2 text-left">Scope</th>
                      </tr>
                    </thead>
                    <tbody>
                      {specialPricingRules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-gray-50">
                          <td className="border p-2 font-medium">{rule.name}</td>
                          <td className="border p-2">
                            {formatDate(rule.startDate)} - {formatDate(rule.endDate)}
                          </td>
                          <td className="border p-2">
                            {rule.priceType === 'multiplier' ? 'Multiplier' : 'Fixed Price'}
                          </td>
                          <td className="border p-2">
                            {rule.priceType === 'multiplier' 
                              ? `${rule.priceValue}x` 
                              : `$${rule.priceValue}`}
                          </td>
                          <td className="border p-2">
                            {rule.applyToAll 
                              ? 'All Vehicles' 
                              : 'Selected Vehicles'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div className="mt-6 border-t pt-6">
                <p className="text-sm text-gray-500">
                  Special pricing rules are managed in the Calendar view, where you can set different 
                  prices for specific dates across all vehicles or just selected ones.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
