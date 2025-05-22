'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO, addDays, addMonths, getDate, startOfMonth, 
  endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { ArrowLeftIcon, ArrowRightIcon, TrashIcon, CheckIcon, XIcon, PlusIcon, CalendarIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";

// Define types for our data
interface Vehicle {
  id: string;
  model: string;
  image: string;
  pricePerDay: number;
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
}

interface Booking {
  id: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: string;
  vehicle: Vehicle;
  user: User;
  createdAt: string;
}

interface VehicleTimeOff {
  id: string;
  vehicleId: string;
  startDate: Date;
  endDate: Date;
  reason: string;
}

export default function AdminCalendarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  
  // New state for vehicle management
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [timeOffDialogOpen, setTimeOffDialogOpen] = useState(false);
  const [vehicleTimeOffs, setVehicleTimeOffs] = useState<VehicleTimeOff[]>([]);
  const [timeOffReason, setTimeOffReason] = useState('');
  const [newBookingDialogOpen, setNewBookingDialogOpen] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  
  // State for date selection on calendar
  const [selectionMode, setSelectionMode] = useState<'none' | 'timeOff'>('none');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedVehiclesForTimeOff, setSelectedVehiclesForTimeOff] = useState<string[]>([]);

  // Redirect if user is not authenticated or not an admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/admin/calendar');
      return;
    }
    
    // Check if user is an admin
    const isAdmin = session?.user ? (session.user as { isAdmin: boolean }).isAdmin : false;
    if (status === 'authenticated' && !isAdmin) {
      router.push('/');
      return;
    }

    // Fetch bookings if authenticated and admin
    if (status === 'authenticated' && isAdmin) {
      fetchBookings();
      fetchVehicles();
    }
  }, [status, session, router]);

  // Calculate total price when date range or selected vehicle changes
  useEffect(() => {
    if (selectedVehicle && dateRange[0] && dateRange[1]) {
      // Add 1 to include both start and end dates
      const days = Math.floor((dateRange[1].getTime() - dateRange[0].getTime()) / (1000 * 60 * 60 * 24)) + 1;
      setTotalPrice(days * selectedVehicle.pricePerDay);
    } else {
      setTotalPrice(0);
    }
  }, [dateRange, selectedVehicle]);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/bookings');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(`Failed to fetch bookings: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load bookings. Please try again later.');
      // Initialize with empty array to prevent further errors
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/admin/vehicles');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(`Failed to fetch vehicles: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setVehicles(data.vehicles || []);

      // Update mock time off periods only if we have vehicles
      if (data.vehicles && data.vehicles.length > 0) {
        setVehicleTimeOffs([
          {
            id: '1',
            vehicleId: data.vehicles[0]?.id,
            startDate: addDays(new Date(), 5),
            endDate: addDays(new Date(), 7),
            reason: 'Maintenance'
          },
          {
            id: '2',
            vehicleId: data.vehicles[1]?.id || data.vehicles[0]?.id,
            startDate: addDays(new Date(), 10),
            endDate: addDays(new Date(), 12),
            reason: 'Repair'
          }
        ]);
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Failed to load vehicles. Please try again later.');
      // Initialize with empty array to prevent further errors
      setVehicles([]);
    }
  };

  // Get color based on booking status
  function getStatusColor(status: string, isHex: boolean = false) {
    switch (status.toLowerCase()) {
      case 'pending':
        return isHex ? '#fef9c3' : 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return isHex ? '#dcfce7' : 'bg-green-100 text-green-800';
      case 'completed':
        return isHex ? '#dbeafe' : 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return isHex ? '#fee2e2' : 'bg-red-100 text-red-800';
      default:
        return isHex ? '#f3f4f6' : 'bg-gray-100 text-gray-800';
    }
  }

  // Add time off period for vehicle(s)
  const handleAddTimeOff = () => {
    // Use either date range from inputs or selected dates from calendar
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    // If dates were selected on the calendar
    if (selectedDates.length > 0) {
      // Sort dates to find min and max
      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
      startDate = sortedDates[0];
      endDate = sortedDates[sortedDates.length - 1];
    } else if (dateRange[0] && dateRange[1]) {
      // Otherwise use date range from inputs
      startDate = dateRange[0];
      endDate = dateRange[1];
    }
    
    if (!startDate || !endDate || !timeOffReason) {
      return;
    }
    
    // Determine which vehicles to add time off for
    const targetVehicleIds = selectedVehiclesForTimeOff.length > 0 
      ? selectedVehiclesForTimeOff 
      : selectedVehicle ? [selectedVehicle.id] : [];
    
    if (targetVehicleIds.length === 0) {
      alert('Please select at least one vehicle');
      return;
    }
    
    // Create time off entries for each selected vehicle
    const newTimeOffs = targetVehicleIds.map(vehicleId => ({
      id: `to_${Date.now()}_${vehicleId}`,
      vehicleId,
      startDate,
      endDate,
      reason: timeOffReason
    }));
    
    setVehicleTimeOffs([...vehicleTimeOffs, ...newTimeOffs]);
    setTimeOffDialogOpen(false);
    setDateRange([null, null]);
    setTimeOffReason('');
    setSelectedDates([]);
    setSelectionMode('none');
    setSelectedVehiclesForTimeOff([]);
  };
  
  // Toggle date selection for time off
  const toggleDateSelection = (date: Date) => {
    if (selectionMode !== 'timeOff') return;
    
    setSelectedDates(prev => {
      // Check if date is already selected
      const isSelected = prev.some(d => 
        isSameDay(d, date)
      );
      
      if (isSelected) {
        // Remove if already selected
        return prev.filter(d => !isSameDay(d, date));
      } else {
        // Add if not selected
        return [...prev, date];
      }
    });
  };

  // Create a new booking
  const handleCreateBooking = async () => {
    if (!selectedVehicle || !dateRange[0] || !dateRange[1] || !customerEmail) {
      return;
    }
    
    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleId: selectedVehicle.id,
          startDate: format(dateRange[0], 'yyyy-MM-dd'),
          endDate: format(dateRange[1], 'yyyy-MM-dd'),
          userEmail: customerEmail,
          totalPrice,
          status: 'confirmed'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create booking');
      }

      const data = await response.json();
      
      // Add the new booking to the state
      setBookings([...bookings, data.booking]);
      
      // Clear form and close dialog
      setNewBookingDialogOpen(false);
      setDateRange([null, null]);
      setCustomerEmail('');
      
      // Refresh bookings
      fetchBookings();
    } catch (err) {
      console.error('Error creating booking:', err);
      setError('Failed to create booking. Please try again.');
    }
  };

  // Handle booking cancellation
  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    
    try {
      const response = await fetch(`/api/admin/bookings/${selectedBooking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel booking');
      }

      // Update the booking in the local state
      setBookings(bookings.map(booking => 
        booking.id === selectedBooking.id ? { ...booking, status: 'cancelled' } : booking
      ));
      
      setCancelDialogOpen(false);
      setSelectedBooking(null);
    } catch (err) {
      console.error('Error cancelling booking:', err);
      setError('Failed to cancel booking. Please try again.');
    }
  };

  // Generate month days
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Get bookings for a specific day
  const getBookingsForDay = (day: Date) => {
    return bookings.filter(booking => {
      if (!booking || !booking.startDate || !booking.endDate || !booking.vehicle) return false;
      
      // Filter by vehicle if one is selected
      if (selectedVehicle && booking.vehicle.id !== selectedVehicle.id) return false;
      
      const startDate = parseISO(booking.startDate);
      const endDate = parseISO(booking.endDate);
      
      // Check if the day falls within the booking period (inclusive)
      return (day >= startDate && day <= endDate);
    });
  };

  // Get time offs for a specific day
  const getTimeOffsForDay = (day: Date) => {
    return vehicleTimeOffs.filter(timeOff => {
      if (!timeOff || !timeOff.startDate || !timeOff.endDate) return false;
      
      // Filter by vehicle if one is selected
      if (selectedVehicle && timeOff.vehicleId !== selectedVehicle.id) return false;
      
      // Check if the day falls within the time off period (inclusive)
      return (day >= timeOff.startDate && day <= timeOff.endDate);
    });
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
          <h1 className="text-2xl font-bold">Booking Calendar</h1>
        </div>
        <p>Loading calendar...</p>
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
        <h1 className="text-2xl font-bold">Booking Calendar</h1>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {selectionMode === 'timeOff' && (
        <div className="mb-6 bg-purple-100 border border-purple-300 p-3 rounded-md text-purple-800 flex justify-between items-center">
          <span>
            <span className="font-semibold">Time Off Selection Mode:</span> Click on days to select/deselect them for time off periods.
            {selectedDates.length > 0 && (
              <span className="ml-2">({selectedDates.length} days selected)</span>
            )}
          </span>
          <Button 
            variant="outline" 
            size="sm"
            className="bg-white"
            onClick={() => {
              setSelectionMode('none');
              setSelectedDates([]);
            }}
          >
            <XIcon className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      )}
      
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <select 
            className="px-3 py-2 border rounded-md"
            value={selectedVehicle?.id || ''}
            onChange={(e) => {
              const vehicleId = e.target.value;
              setSelectedVehicle(vehicleId ? vehicles.find(v => v.id === vehicleId) || null : null);
            }}
            disabled={selectionMode === 'timeOff'}
          >
            <option value="">All Vehicles</option>
            {vehicles.map(vehicle => (
              <option key={vehicle.id} value={vehicle.id}>{vehicle.model}</option>
            ))}
          </select>
          
          <select
            className="px-3 py-2 border rounded-md"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'month' | 'agenda')}
            disabled={selectionMode === 'timeOff'}
          >
            <option value="month">Month</option>
            <option value="agenda">Agenda</option>
          </select>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setNewBookingDialogOpen(true)}
            disabled={selectionMode === 'timeOff'}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Booking
          </Button>
          <Button 
            variant={selectionMode === 'timeOff' ? 'default' : 'outline'}
            onClick={() => {
              if (selectionMode === 'timeOff') {
                setTimeOffDialogOpen(true);
              } else {
                setTimeOffDialogOpen(true);
              }
            }}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            {selectionMode === 'timeOff' ? 'Continue to Time Off Form' : 'Add Time Off'}
          </Button>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-4">
          {viewMode === 'month' && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setCurrentMonth(prevMonth => addMonths(prevMonth, -1))}
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setCurrentMonth(prevMonth => addMonths(prevMonth, 1))}
                  >
                    <ArrowRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-1 mb-2 text-center font-medium">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1 auto-rows-fr">
                {monthDays.map(day => {
                  const dayBookings = getBookingsForDay(day);
                  const dayTimeOffs = getTimeOffsForDay(day);
                  const isDateSelected = selectedDates.some(d => isSameDay(d, day));
                  
                  return (
                    <div 
                      key={day.toString()}
                      className={`min-h-[100px] border rounded-md p-1 
                        ${!isSameMonth(day, currentMonth) ? 'bg-gray-50 text-gray-400' : ''}
                        ${isSameDay(day, new Date()) ? 'bg-blue-50 border-blue-200' : ''}
                        ${isDateSelected ? 'bg-purple-100 border-purple-300' : ''}
                        ${selectionMode === 'timeOff' ? 'cursor-pointer hover:bg-purple-50' : ''}
                      `}
                      onClick={() => {
                        if (selectionMode === 'timeOff') {
                          toggleDateSelection(day);
                        } else if (dayBookings.length > 0) {
                          setSelectedBooking(dayBookings[0]);
                        }
                      }}
                    >
                      <div className="font-medium mb-1 text-sm p-1 flex justify-between">
                        <span>{getDate(day)}</span>
                        {isDateSelected && (
                          <span className="bg-purple-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                            ✓
                          </span>
                        )}
                      </div>
                      
                      <div className="overflow-y-auto max-h-[80px]">
                        {dayBookings.map(booking => (
                          <div 
                            key={booking.id}
                            className={`text-xs p-1 mb-1 rounded truncate ${getStatusColor(booking.status)}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBooking(booking);
                            }}
                          >
                            {booking.vehicle.model} - {booking.user.name || booking.user.email}
                          </div>
                        ))}
                        
                        {dayTimeOffs.map(timeOff => (
                          <div 
                            key={timeOff.id}
                            className="text-xs p-1 mb-1 rounded truncate bg-slate-200 text-slate-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle time off click if needed
                            }}
                          >
                            {vehicles.find(v => v.id === timeOff.vehicleId)?.model || 'Vehicle'} - {timeOff.reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {viewMode === 'agenda' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Upcoming Bookings</h2>
              
              {/* Group bookings by date */}
              {bookings
                .filter(booking => {
                  // If a vehicle is selected, only show bookings for that vehicle
                  return !selectedVehicle || booking.vehicle.id === selectedVehicle.id;
                })
                .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                .map(booking => (
                  <div 
                    key={booking.id} 
                    className="border rounded-md p-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{booking.vehicle.model}</p>
                        <p className="text-sm text-gray-500">{booking.user.name || booking.user.email}</p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </div>
                    </div>
                    
                    <div className="text-sm mt-2">
                      <p>{format(parseISO(booking.startDate), 'MMM d, yyyy')} - {format(parseISO(booking.endDate), 'MMM d, yyyy')}</p>
                      <p className="font-medium mt-1">${booking.totalPrice.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              
              {bookings.length === 0 || (selectedVehicle && bookings.filter(b => b.vehicle.id === selectedVehicle.id).length === 0) && (
                <p className="text-gray-500 text-center py-4">No bookings found</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Booking Details Card */}
      {selectedBooking && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-medium">{selectedBooking.vehicle.model}</h3>
                  <p className="text-sm text-gray-500">{selectedBooking.user.name || selectedBooking.user.email}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedBooking.status)}`}>
                  {selectedBooking.status}
                </div>
              </div>
              
              <div className="text-sm">
                <p>
                  {format(parseISO(selectedBooking.startDate), 'MMM d, yyyy')} - {format(parseISO(selectedBooking.endDate), 'MMM d, yyyy')}
                </p>
                <p className="font-medium mt-1">${selectedBooking.totalPrice.toFixed(2)}</p>
              </div>
              
              <div className="flex gap-2">
                <Link href={`/admin/bookings/${selectedBooking.id}`}>
                  <Button variant="outline" size="sm">View Full Details</Button>
                </Link>
                {selectedBooking.status !== 'cancelled' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    <TrashIcon className="h-4 w-4 mr-1" /> Cancel Booking
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Cancel Booking Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="py-4">
              <p className="font-medium">{selectedBooking.vehicle.model}</p>
              <p className="text-sm text-gray-500">{selectedBooking.user.name || selectedBooking.user.email}</p>
              <p className="text-sm mt-1">
                {format(parseISO(selectedBooking.startDate), 'MMM d, yyyy')} - {format(parseISO(selectedBooking.endDate), 'MMM d, yyyy')}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              <XIcon className="h-4 w-4 mr-1" /> No, Keep It
            </Button>
            <Button variant="destructive" onClick={handleCancelBooking}>
              <CheckIcon className="h-4 w-4 mr-1" /> Yes, Cancel Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Time Off Dialog */}
      <Dialog open={timeOffDialogOpen} onOpenChange={(open) => {
        setTimeOffDialogOpen(open);
        if (!open) {
          setSelectionMode('none');
          setSelectedDates([]);
          setSelectedVehiclesForTimeOff([]);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vehicle Time Off</DialogTitle>
            <DialogDescription>
              Mark a period when vehicles will be unavailable for booking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">Vehicles</label>
              <div className="mb-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="mr-2"
                  onClick={() => {
                    if (selectedVehiclesForTimeOff.length === vehicles.length) {
                      // If all are selected, deselect all
                      setSelectedVehiclesForTimeOff([]);
                    } else {
                      // Otherwise select all
                      setSelectedVehiclesForTimeOff(vehicles.map(v => v.id));
                    }
                  }}
                >
                  {selectedVehiclesForTimeOff.length === vehicles.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              
              <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                {vehicles.map(vehicle => (
                  <div key={vehicle.id} className="flex items-center mb-2">
                    <input 
                      type="checkbox"
                      id={`vehicle-${vehicle.id}`}
                      checked={selectedVehiclesForTimeOff.includes(vehicle.id)}
                      onChange={() => {
                        setSelectedVehiclesForTimeOff(prev => {
                          if (prev.includes(vehicle.id)) {
                            return prev.filter(id => id !== vehicle.id);
                          } else {
                            return [...prev, vehicle.id];
                          }
                        });
                      }}
                      className="mr-2"
                    />
                    <label htmlFor={`vehicle-${vehicle.id}`}>{vehicle.model}</label>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">Dates</label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  className={`${selectionMode === 'timeOff' ? 'bg-purple-100' : ''}`}
                  onClick={() => {
                    setSelectionMode(prev => prev === 'timeOff' ? 'none' : 'timeOff');
                  }}
                >
                  {selectionMode === 'timeOff' ? 'Finish Selection' : 'Select on Calendar'}
                </Button>
              </div>
              
              {selectionMode === 'timeOff' && selectedDates.length > 0 && (
                <div className="bg-purple-50 rounded-md p-2 mb-3">
                  <p className="text-sm">
                    <span className="font-medium">Selected Dates: </span>
                    {selectedDates.length} days selected
                    {selectedDates.length > 0 && (
                      <>
                        <br />
                        From: {format(selectedDates.sort((a, b) => a.getTime() - b.getTime())[0], 'MMM d, yyyy')}
                        <br />
                        To: {format(selectedDates.sort((a, b) => a.getTime() - b.getTime())[selectedDates.length - 1], 'MMM d, yyyy')}
                      </>
                    )}
                  </p>
                </div>
              )}
              
              {(selectionMode !== 'timeOff' || selectedDates.length === 0) && (
                <>
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 border rounded-md"
                      value={dateRange[0] ? format(dateRange[0], 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : null;
                        setDateRange([date, dateRange[1]]);
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">End Date</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 border rounded-md"
                      value={dateRange[1] ? format(dateRange[1], 'yyyy-MM-dd') : ''}
                      min={dateRange[0] ? format(dateRange[0], 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : null;
                        setDateRange([dateRange[0], date]);
                      }}
                    />
                  </div>
                </>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Reason</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., Maintenance, Repairs, etc."
                value={timeOffReason}
                onChange={(e) => setTimeOffReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setTimeOffDialogOpen(false);
              setSelectionMode('none');
              setSelectedDates([]);
            }}>
              Cancel
            </Button>
            <Button 
              disabled={
                (selectedDates.length === 0 && (!dateRange[0] || !dateRange[1])) || 
                !timeOffReason || 
                selectedVehiclesForTimeOff.length === 0
              } 
              onClick={handleAddTimeOff}
            >
              Add Time Off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* New Booking Dialog */}
      <Dialog open={newBookingDialogOpen} onOpenChange={setNewBookingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Booking</DialogTitle>
            <DialogDescription>
              Book a vehicle for a customer directly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">Vehicle</label>
              <select 
                className="w-full px-3 py-2 border rounded-md"
                value={selectedVehicle?.id || ''}
                onChange={(e) => {
                  const vehicleId = e.target.value;
                  setSelectedVehicle(vehicles.find(v => v.id === vehicleId) || null);
                }}
              >
                <option value="" disabled>Select a vehicle</option>
                {vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>{vehicle.model}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input 
                type="date" 
                className="w-full px-3 py-2 border rounded-md"
                value={dateRange[0] ? format(dateRange[0], 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : null;
                  setDateRange([date, dateRange[1]]);
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input 
                type="date" 
                className="w-full px-3 py-2 border rounded-md"
                value={dateRange[1] ? format(dateRange[1], 'yyyy-MM-dd') : ''}
                min={dateRange[0] ? format(dateRange[0], 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : null;
                  setDateRange([dateRange[0], date]);
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Customer Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="customer@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>
            
            {totalPrice > 0 && (
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="font-medium">Booking Summary:</p>
                {selectedVehicle && (
                  <p className="text-sm">Vehicle: {selectedVehicle.model}</p>
                )}
                {dateRange[0] && dateRange[1] && (
                  <p className="text-sm">
                    Dates: {format(dateRange[0], 'MMM d, yyyy')} - {format(dateRange[1], 'MMM d, yyyy')}
                  </p>
                )}
                <p className="text-lg font-bold mt-1">Total: ${totalPrice.toFixed(2)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewBookingDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              disabled={!selectedVehicle || !dateRange[0] || !dateRange[1] || !customerEmail} 
              onClick={handleCreateBooking}
            >
              Create Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 