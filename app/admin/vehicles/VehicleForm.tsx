'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { XIcon, PlusIcon, ImageIcon, UploadIcon } from 'lucide-react';

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
  
  // Fetch vehicle data if editing
  useEffect(() => {
    if (isEditing && vehicleId) {
      fetchVehicle();
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
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setImageFile(file);
      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
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
    if (formData.features.length === 1) {
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
    } catch (err) {
      console.error('Error saving vehicle:', err);
      setError('Failed to save vehicle. Please try again.');
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };
  
  if (isEditing && isLoading) {
    return <div className="text-center py-8">Loading vehicle data...</div>;
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
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
          <div className="border rounded-md p-4">
            {imagePreview || formData.image ? (
              <div className="relative w-full h-48 mb-4">
                <img 
                  src={imagePreview || formData.image} 
                  alt="Vehicle preview" 
                  className="w-full h-full object-cover rounded-md"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center w-full h-48 mb-4 bg-gray-100 rounded-md">
                <ImageIcon className="h-12 w-12 text-gray-400" />
              </div>
            )}
            
            <div className="flex items-center gap-4">
              <input
                type="file"
                id="imageFile"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon className="h-4 w-4 mr-2" />
                {formData.image || imagePreview ? 'Change Image' : 'Upload Image'}
              </Button>
              {(formData.image || imagePreview) && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setImagePreview(null);
                    setImageFile(null);
                    setFormData(prev => ({ ...prev, image: '' }));
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  Remove Image
                </Button>
              )}
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
  );
}
