// -------------------------------------------------------
// AdminCalendarPage Component
// -------------------------------------------------------
// A comprehensive calendar view for managing vehicle bookings and time-off periods
// Features:
// - Monthly/Agenda view toggle
// - Vehicle filtering
// - Booking creation/cancellation
// - Vehicle time-off management
// - Interactive date selection
// - Responsive layout
// -------------------------------------------------------

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO, addDays } from 'date-fns';
import { ArrowLeftIcon, TrashIcon, CheckIcon, XIcon, PlusIcon, CalendarIcon, DollarSignIcon } from 'lucide-react';
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

// FullCalendar imports
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { DateSelectArg, EventClickArg } from '@fullcalendar/core';

// -------------------------------------------------------
// Type Definitions
// -------------------------------------------------------

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

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  extendedProps: {
    type: 'booking' | 'timeOff' | 'specialPricing';
    booking?: Booking;
    timeOff?: VehicleTimeOff;
    specialPricing?: SpecialPricing;
    vehicleId: string;
    vehicleModel: string;
    status?: string;
  };
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  display?: string;
  allDay?: boolean;
}

// -------------------------------------------------------
// Main Component
// -------------------------------------------------------

export default function AdminCalendarPage() {
  // -------------------------------------------------------
  // State Management
  // -------------------------------------------------------
  const { data: session, status } = useSession();
  const router = useRouter();
  const calendarRef = useRef(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Vehicle Management State
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [timeOffDialogOpen, setTimeOffDialogOpen] = useState(false);
  const [vehicleTimeOffs, setVehicleTimeOffs] = useState<VehicleTimeOff[]>([]);
  const [timeOffReason, setTimeOffReason] = useState('');
  const [newBookingDialogOpen, setNewBookingDialogOpen] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);
  const [calendarView, setCalendarView] = useState<'dayGridMonth' | 'listMonth'>('dayGridMonth');
  
  // Calendar Selection State
  const [selectedVehiclesForTimeOff, setSelectedVehiclesForTimeOff] = useState<string[]>([]);
  
  // Special Pricing State
  const [specialPricingDialogOpen, setSpecialPricingDialogOpen] = useState(false);
  const [specialPricingRules, setSpecialPricingRules] = useState<SpecialPricing[]>([]);
  const [selectedSpecialPricing, setSelectedSpecialPricing] = useState<SpecialPricing | null>(null);
  const [specialPricingName, setSpecialPricingName] = useState('');
  const [priceType, setPriceType] = useState<'multiplier' | 'fixed'>('multiplier');
  const [priceValue, setPriceValue] = useState<number>(1);
  const [applyToAllVehicles, setApplyToAllVehicles] = useState(true);
  const [selectedVehiclesForPricing, setSelectedVehiclesForPricing] = useState<string[]>([]);
  const [deleteSpecialPricingDialogOpen, setDeleteSpecialPricingDialogOpen] = useState(false);

  // -------------------------------------------------------
  // Authentication & Initial Data Loading
  // -------------------------------------------------------

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
      fetchSpecialPricing();
      
      // Check for stored commands from other pages
      const openSpecialPricing = localStorage.getItem('openSpecialPricing');
      const editSpecialPricingId = localStorage.getItem('editSpecialPricing');
      
      if (openSpecialPricing === 'true') {
        // Clear the command
        localStorage.removeItem('openSpecialPricing');
        
        // Open the dialog after a short delay to make sure data is loaded
        setTimeout(() => {
          resetSpecialPricingForm();
          setSpecialPricingDialogOpen(true);
        }, 500);
      }
      
      if (editSpecialPricingId) {
        // Clear the command
        localStorage.removeItem('editSpecialPricing');
        
        // Open the edit dialog after data is loaded
        setTimeout(async () => {
          try {
            const response = await fetch(`/api/admin/special-pricing/${editSpecialPricingId}`);
            
            if (!response.ok) {
              throw new Error('Failed to fetch special pricing rule');
            }
            
            const data = await response.json();
            const rule = data.specialPricing;
            
            if (rule) {
              setSelectedSpecialPricing(rule);
              setSpecialPricingName(rule.name);
              setPriceType(rule.priceType);
              setPriceValue(rule.priceValue);
              setApplyToAllVehicles(rule.applyToAll);
              
              if (!rule.applyToAll && rule.vehicles) {
                setSelectedVehiclesForPricing(rule.vehicles.map((v: { id: string }) => v.id));
              } else {
                setSelectedVehiclesForPricing([]);
              }
              
              setDateRange([new Date(rule.startDate), new Date(rule.endDate)]);
              setSpecialPricingDialogOpen(true);
            }
          } catch (err) {
            console.error('Error fetching special pricing rule:', err);
          }
        }, 500);
      }
    }
  }, [status, session, router]);

  // -------------------------------------------------------
  // Price Calculation Effect
  // -------------------------------------------------------

  useEffect(() => {
    if (selectedVehicle && dateRange[0] && dateRange[1]) {
      // Add 1 to include both start and end dates
      const days = Math.floor((dateRange[1].getTime() - dateRange[0].getTime()) / (1000 * 60 * 60 * 24)) + 1;
      setTotalPrice(days * selectedVehicle.pricePerDay);
    } else {
      setTotalPrice(0);
    }
  }, [dateRange, selectedVehicle]);

  // -------------------------------------------------------
  // Data Fetching Functions
  // -------------------------------------------------------

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

  const fetchSpecialPricing = async () => {
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
    }
  };

  // -------------------------------------------------------
  // Utility Functions
  // -------------------------------------------------------

  // Get color based on booking status
  function getStatusColor(status: string, isHex: boolean = false) {
    switch (status.toLowerCase()) {
      case 'pending':
        return isHex ? '#fbbf24' : 'bg-yellow-400 text-yellow-900'; // More visible yellow
      case 'confirmed':
        return isHex ? '#4ade80' : 'bg-green-400 text-green-900'; // More saturated green
      case 'completed':
        return isHex ? '#60a5fa' : 'bg-blue-400 text-blue-900'; // More saturated blue
      case 'cancelled':
        return isHex ? '#f87171' : 'bg-red-400 text-red-900'; // More saturated red
      default:
        return isHex ? '#9ca3af' : 'bg-gray-400 text-gray-900'; // Darker gray
    }
  }

  function getSpecialPricingColor(priceType: string, isHex: boolean = false) {
    return priceType === 'multiplier' 
      ? (isHex ? '#dbeafe' : 'bg-blue-100 text-blue-800') // Blue for multipliers
      : (isHex ? '#dcfce7' : 'bg-green-100 text-green-800'); // Green for fixed prices
  }

  // -------------------------------------------------------
  // Event Handlers
  // -------------------------------------------------------

  // Add time off period for vehicle(s)
  const handleAddTimeOff = () => {
    if (!dateRange[0] || !dateRange[1] || !timeOffReason) {
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
      startDate: dateRange[0]!,
      endDate: dateRange[1]!,
      reason: timeOffReason
    }));
    
    setVehicleTimeOffs([...vehicleTimeOffs, ...newTimeOffs]);
    setTimeOffDialogOpen(false);
    setDateRange([null, null]);
    setTimeOffReason('');
    setSelectedVehiclesForTimeOff([]);
  };

  // Handle date selection from the calendar
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setDateRange([selectInfo.start, selectInfo.end]);
    // Default to time-off dialog for now
    setTimeOffDialogOpen(true);
  };

  // Handle event click
  const handleEventClick = (clickInfo: EventClickArg) => {
    const eventType = clickInfo.event.extendedProps.type;
    
    if (eventType === 'booking') {
      setSelectedBooking(clickInfo.event.extendedProps.booking);
    } else if (eventType === 'specialPricing') {
      setSelectedSpecialPricing(clickInfo.event.extendedProps.specialPricing);
      
      // Prefill the form data for editing
      const rule = clickInfo.event.extendedProps.specialPricing;
      setSpecialPricingName(rule.name);
      setPriceType(rule.priceType);
      setPriceValue(rule.priceValue);
      setApplyToAllVehicles(rule.applyToAll);
      
      if (!rule.applyToAll && rule.vehicles) {
        setSelectedVehiclesForPricing(rule.vehicles.map((v: { id: string }) => v.id));
      } else {
        setSelectedVehiclesForPricing([]);
      }
      
      setDateRange([new Date(rule.startDate), new Date(rule.endDate)]);
      
      // Open the dialog for editing
      setSpecialPricingDialogOpen(true);
    }
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

  // Handle booking deletion
  const handleDeleteBooking = async () => {
    if (!selectedBooking) return;
    
    try {
      const response = await fetch(`/api/admin/bookings/${selectedBooking.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete booking');
      }

      // Remove the booking from the local state
      setBookings(bookings.filter(booking => booking.id !== selectedBooking.id));
      
      setDeleteDialogOpen(false);
      setSelectedBooking(null);
    } catch (err) {
      console.error('Error deleting booking:', err);
      setError('Failed to delete booking. Please try again.');
    }
  };

  // Add special pricing rule
  const handleAddSpecialPricing = async () => {
    if (!dateRange[0] || !dateRange[1] || !specialPricingName || priceValue === 0) {
      return;
    }
    
    try {
      const payload = {
        name: specialPricingName,
        startDate: format(dateRange[0], 'yyyy-MM-dd'),
        endDate: format(dateRange[1], 'yyyy-MM-dd'),
        priceType,
        priceValue,
        applyToAll: applyToAllVehicles,
        vehicleIds: !applyToAllVehicles ? selectedVehiclesForPricing : []
      };
      
      const response = await fetch('/api/admin/special-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to create special pricing rule');
      }

      // Refresh special pricing rules
      fetchSpecialPricing();
      
      // Clear form and close dialog
      setSpecialPricingDialogOpen(false);
      resetSpecialPricingForm();
    } catch (err) {
      console.error('Error creating special pricing rule:', err);
      setError('Failed to create special pricing rule. Please try again.');
    }
  };
  
  // Handle special pricing deletion
  const handleDeleteSpecialPricing = async () => {
    if (!selectedSpecialPricing) return;
    
    try {
      const response = await fetch(`/api/admin/special-pricing/${selectedSpecialPricing.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete special pricing rule');
      }

      // Remove the rule from the local state
      setSpecialPricingRules(specialPricingRules.filter(rule => rule.id !== selectedSpecialPricing.id));
      
      setDeleteSpecialPricingDialogOpen(false);
      setSelectedSpecialPricing(null);
    } catch (err) {
      console.error('Error deleting special pricing rule:', err);
      setError('Failed to delete special pricing rule. Please try again.');
    }
  };
  
  const resetSpecialPricingForm = () => {
    setSpecialPricingName('');
    setPriceType('multiplier');
    setPriceValue(1);
    setApplyToAllVehicles(true);
    setSelectedVehiclesForPricing([]);
    setDateRange([null, null]);
  };

  // -------------------------------------------------------
  // Calendar Events
  // -------------------------------------------------------

  // Convert bookings, time offs, and special pricing to calendar events
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];
    
    // Add bookings as events
    bookings.forEach(booking => {
      // Skip if we're filtering by vehicle and this booking is for a different vehicle
      if (selectedVehicle && booking.vehicle.id !== selectedVehicle.id) {
        return;
      }
      
      const statusColor = getStatusColor(booking.status, true);
      
      events.push({
        id: `booking_${booking.id}`,
        title: `${booking.vehicle.model} - ${booking.user.name || booking.user.email}`,
        start: booking.startDate,
        end: booking.endDate,
        backgroundColor: statusColor,
        borderColor: statusColor,
        allDay: true,
        extendedProps: {
          type: 'booking',
          booking: booking,
          vehicleId: booking.vehicle.id,
          vehicleModel: booking.vehicle.model,
          status: booking.status
        }
      });
    });
    
    // Add time offs as events
    vehicleTimeOffs.forEach(timeOff => {
      // Skip if we're filtering by vehicle and this time off is for a different vehicle
      if (selectedVehicle && timeOff.vehicleId !== selectedVehicle.id) {
        return;
      }
      
      const vehicle = vehicles.find(v => v.id === timeOff.vehicleId);
      
      events.push({
        id: `timeOff_${timeOff.id}`,
        title: `${vehicle?.model || 'Vehicle'} - ${timeOff.reason}`,
        start: format(timeOff.startDate, 'yyyy-MM-dd'),
        end: format(timeOff.endDate, 'yyyy-MM-dd'),
        backgroundColor: '#94a3b8', // slate-400
        borderColor: '#64748b', // slate-500
        display: 'block',
        allDay: true,
        extendedProps: {
          type: 'timeOff',
          timeOff: timeOff,
          vehicleId: timeOff.vehicleId,
          vehicleModel: vehicle?.model || 'Vehicle'
        }
      });
    });
    
    // Add special pricing as events
    specialPricingRules.forEach(rule => {
      // If rule applies to all vehicles or we're not filtering
      if (rule.applyToAll || !selectedVehicle) {
        const priceTypeColor = getSpecialPricingColor(rule.priceType, true);
        const ruleTitle = rule.applyToAll 
          ? `All Vehicles - ${rule.name}`
          : `${rule.vehicles.length} Vehicles - ${rule.name}`;
        
        events.push({
          id: `specialPrice_${rule.id}`,
          title: `💰 ${ruleTitle}: ${rule.priceType === 'multiplier' ? `${rule.priceValue}x` : `$${rule.priceValue}`}`,
          start: rule.startDate,
          end: rule.endDate,
          backgroundColor: priceTypeColor,
          borderColor: priceTypeColor,
          textColor: '#000000',
          display: 'block',
          allDay: true,
          extendedProps: {
            type: 'specialPricing',
            specialPricing: rule,
            vehicleId: 'all',
            vehicleModel: 'All Vehicles'
          }
        });
      } 
      // If rule applies to specific vehicles and we're filtering
      else if (!rule.applyToAll && selectedVehicle) {
        // Check if this rule applies to the selected vehicle
        const appliesTo = rule.vehicles.some(v => v.id === selectedVehicle.id);
        
        if (appliesTo) {
          const priceTypeColor = getSpecialPricingColor(rule.priceType, true);
          
          events.push({
            id: `specialPrice_${rule.id}_${selectedVehicle.id}`,
            title: `💰 ${selectedVehicle.model} - ${rule.name}: ${rule.priceType === 'multiplier' ? `${rule.priceValue}x` : `$${rule.priceValue}`}`,
            start: rule.startDate,
            end: rule.endDate,
            backgroundColor: priceTypeColor,
            borderColor: priceTypeColor,
            textColor: '#000000',
            display: 'block',
            allDay: true,
            extendedProps: {
              type: 'specialPricing',
              specialPricing: rule,
              vehicleId: selectedVehicle.id,
              vehicleModel: selectedVehicle.model
            }
          });
        }
      }
    });
    
    return events;
  }, [bookings, vehicleTimeOffs, specialPricingRules, selectedVehicle, vehicles]);

  // -------------------------------------------------------
  // Loading State
  // -------------------------------------------------------

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

  // -------------------------------------------------------
  // Main Render
  // -------------------------------------------------------

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
      
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <select 
            className="px-3 py-2 border rounded-md"
            value={selectedVehicle?.id || ''}
            onChange={(e) => {
              const vehicleId = e.target.value;
              setSelectedVehicle(vehicleId ? vehicles.find(v => v.id === vehicleId) || null : null);
            }}
          >
            <option value="">All Vehicles</option>
            {vehicles.map(vehicle => (
              <option key={vehicle.id} value={vehicle.id}>{vehicle.model}</option>
            ))}
          </select>
          
          <select
            className="px-3 py-2 border rounded-md"
            value={calendarView}
            onChange={(e) => setCalendarView(e.target.value as 'dayGridMonth' | 'listMonth')}
          >
            <option value="dayGridMonth">Month</option>
            <option value="listMonth">List</option>
          </select>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setNewBookingDialogOpen(true)}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Booking
          </Button>
          <Button 
            variant="outline"
            onClick={() => setTimeOffDialogOpen(true)}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Add Time Off
          </Button>
          <Button 
            variant="outline"
            className="border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
            onClick={() => {
              resetSpecialPricingForm();
              setSpecialPricingDialogOpen(true);
            }}
          >
            <DollarSignIcon className="h-4 w-4 mr-2" />
            Special Pricing
          </Button>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-4">
          <div style={{ height: 'calc(80vh - 200px)' }}>
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
              initialView={calendarView}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,listMonth'
              }}
              events={calendarEvents}
              selectable={true}
              select={handleDateSelect}
              eventClick={handleEventClick}
              height="100%"
              eventTimeFormat={{
                hour: 'numeric',
                minute: '2-digit',
                meridiem: 'short'
              }}
              views={{
                dayGridMonth: {
                  titleFormat: { year: 'numeric', month: 'long' }
                },
                listMonth: {
                  titleFormat: { year: 'numeric', month: 'long' }
                }
              }}
            />
          </div>
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
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-red-800 hover:text-red-900"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <TrashIcon className="h-4 w-4 mr-1" /> Delete Permanently
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Special Pricing Details Card */}
      {selectedSpecialPricing && !specialPricingDialogOpen && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Special Pricing Details</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-medium">{selectedSpecialPricing.name}</h3>
                                <p className="text-sm text-gray-500">
                {selectedSpecialPricing.applyToAll 
                  ? 'Applies to all vehicles' 
                  : `Applies to ${selectedSpecialPricing.vehicles?.length || 0} vehicles`}
              </p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${getSpecialPricingColor(selectedSpecialPricing.priceType)}`}>
                  {selectedSpecialPricing.priceType === 'multiplier' 
                    ? `${selectedSpecialPricing.priceValue}x multiplier` 
                    : `$${selectedSpecialPricing.priceValue} fixed price`}
                </div>
              </div>
              
              <div className="text-sm">
                <p>
                  {format(parseISO(selectedSpecialPricing.startDate), 'MMM d, yyyy')} - {format(parseISO(selectedSpecialPricing.endDate), 'MMM d, yyyy')}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Prefill the form for editing
                    setSpecialPricingName(selectedSpecialPricing.name);
                    setPriceType(selectedSpecialPricing.priceType);
                    setPriceValue(selectedSpecialPricing.priceValue);
                    setApplyToAllVehicles(selectedSpecialPricing.applyToAll);
                    
                    if (!selectedSpecialPricing.applyToAll) {
                      setSelectedVehiclesForPricing(selectedSpecialPricing.vehicles.map((v: { id: string }) => v.id));
                    } else {
                      setSelectedVehiclesForPricing([]);
                    }
                    
                    setDateRange([
                      new Date(selectedSpecialPricing.startDate), 
                      new Date(selectedSpecialPricing.endDate)
                    ]);
                    
                    setSpecialPricingDialogOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-red-800 hover:text-red-900"
                  onClick={() => setDeleteSpecialPricingDialogOpen(true)}
                >
                  <TrashIcon className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
              
              {!selectedSpecialPricing.applyToAll && selectedSpecialPricing.vehicles.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Applied to:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedSpecialPricing.vehicles.map(vehicle => (
                      <span 
                        key={vehicle.id} 
                        className="px-2 py-1 bg-gray-100 rounded-full text-xs"
                      >
                        {vehicle.model}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
      <Dialog open={timeOffDialogOpen} onOpenChange={setTimeOffDialogOpen}>
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
              <label className="block text-sm font-medium mb-1">Dates</label>
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
            <Button variant="outline" onClick={() => setTimeOffDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              disabled={
                !dateRange[0] || !dateRange[1] || 
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

      {/* Add Delete Booking Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Booking Permanently</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this booking? This action cannot be undone and will remove all associated records from the system.
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="py-4">
              <p className="font-medium">{selectedBooking.vehicle.model}</p>
              <p className="text-sm text-gray-500">{selectedBooking.user.name || selectedBooking.user.email}</p>
              <p className="text-sm mt-1">
                {format(parseISO(selectedBooking.startDate), 'MMM d, yyyy')} - {format(parseISO(selectedBooking.endDate), 'MMM d, yyyy')}
              </p>
              <p className="text-sm mt-1 font-semibold text-red-600">
                This will permanently delete the booking from the database.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              <XIcon className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteBooking}>
              <TrashIcon className="h-4 w-4 mr-1" /> Yes, Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Special Pricing Dialog */}
      <Dialog open={specialPricingDialogOpen} onOpenChange={setSpecialPricingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedSpecialPricing ? 'Edit Special Pricing' : 'Add Special Pricing'}
            </DialogTitle>
            <DialogDescription>
              Set special pricing for specific dates or events.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., Holiday Season, Formula 1 Weekend"
                value={specialPricingName}
                onChange={(e) => setSpecialPricingName(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Price Type</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={priceType}
                onChange={(e) => setPriceType(e.target.value as 'multiplier' | 'fixed')}
              >
                <option value="multiplier">Multiplier (e.g., 1.5x standard price)</option>
                <option value="fixed">Fixed Price (override standard price)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                {priceType === 'multiplier' ? 'Multiplier Value' : 'Fixed Price Value'}
              </label>
              <input
                type="number"
                min={priceType === 'multiplier' ? 0.1 : 1}
                step={priceType === 'multiplier' ? 0.1 : 1}
                className="w-full px-3 py-2 border rounded-md"
                placeholder={priceType === 'multiplier' ? 'e.g., 1.5' : 'e.g., 200'}
                value={priceValue}
                onChange={(e) => setPriceValue(parseFloat(e.target.value))}
              />
              <p className="text-xs text-gray-500 mt-1">
                {priceType === 'multiplier' 
                  ? 'Values above 1 increase price, below 1 decrease price'
                  : 'Fixed price per day in dollars'}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start Date</label>
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
                  <label className="block text-xs text-gray-500 mb-1">End Date</label>
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
              </div>
            </div>
            
            <div>
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="apply-all-vehicles"
                  checked={applyToAllVehicles}
                  onChange={(e) => setApplyToAllVehicles(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="apply-all-vehicles" className="text-sm font-medium">
                  Apply to all vehicles
                </label>
              </div>
              
              {!applyToAllVehicles && (
                <div>
                  <label className="block text-sm font-medium mb-1">Select Vehicles</label>
                  <div className="mb-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="mr-2"
                      onClick={() => {
                        if (selectedVehiclesForPricing.length === vehicles.length) {
                          // If all are selected, deselect all
                          setSelectedVehiclesForPricing([]);
                        } else {
                          // Otherwise select all
                          setSelectedVehiclesForPricing(vehicles.map(v => v.id));
                        }
                      }}
                    >
                      {selectedVehiclesForPricing.length === vehicles.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  
                  <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                    {vehicles.map(vehicle => (
                      <div key={vehicle.id} className="flex items-center mb-2">
                        <input 
                          type="checkbox"
                          id={`vehicle-pricing-${vehicle.id}`}
                          checked={selectedVehiclesForPricing.includes(vehicle.id)}
                          onChange={() => {
                            setSelectedVehiclesForPricing(prev => {
                              if (prev.includes(vehicle.id)) {
                                return prev.filter(id => id !== vehicle.id);
                              } else {
                                return [...prev, vehicle.id];
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <label htmlFor={`vehicle-pricing-${vehicle.id}`}>{vehicle.model}</label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <div className="flex w-full justify-between">
              {selectedSpecialPricing && (
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    setSpecialPricingDialogOpen(false);
                    setDeleteSpecialPricingDialogOpen(true);
                  }}
                >
                  <TrashIcon className="h-4 w-4 mr-1" /> Delete
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => {
                  setSpecialPricingDialogOpen(false);
                  if (selectedSpecialPricing) {
                    setSelectedSpecialPricing(null);
                  }
                  resetSpecialPricingForm();
                }}>
                  Cancel
                </Button>
                <Button 
                  disabled={
                    !dateRange[0] || !dateRange[1] || 
                    !specialPricingName || 
                    (!applyToAllVehicles && selectedVehiclesForPricing.length === 0)
                  } 
                  onClick={async () => {
                    if (selectedSpecialPricing) {
                      // Update existing rule
                      try {
                        const payload = {
                          name: specialPricingName,
                          startDate: format(dateRange[0]!, 'yyyy-MM-dd'),
                          endDate: format(dateRange[1]!, 'yyyy-MM-dd'),
                          priceType,
                          priceValue,
                          applyToAll: applyToAllVehicles,
                          vehicleIds: !applyToAllVehicles ? selectedVehiclesForPricing : []
                        };
                        
                        const response = await fetch(`/api/admin/special-pricing/${selectedSpecialPricing.id}`, {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify(payload),
                        });
                        
                        if (!response.ok) {
                          throw new Error('Failed to update special pricing rule');
                        }
                        
                        // Refresh the data
                        fetchSpecialPricing();
                        
                        // Close the dialog and reset
                        setSpecialPricingDialogOpen(false);
                        setSelectedSpecialPricing(null);
                        resetSpecialPricingForm();
                      } catch (err) {
                        console.error('Error updating special pricing rule:', err);
                        setError('Failed to update special pricing rule');
                      }
                    } else {
                      // Create new rule
                      handleAddSpecialPricing();
                    }
                  }}
                >
                  {selectedSpecialPricing ? 'Update' : 'Add Special Pricing'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Special Pricing Dialog */}
      <Dialog open={deleteSpecialPricingDialogOpen} onOpenChange={setDeleteSpecialPricingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Special Pricing Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this special pricing rule? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedSpecialPricing && (
            <div className="py-4">
              <p className="font-medium">{selectedSpecialPricing.name}</p>
              <p className="text-sm text-gray-500">
                {format(parseISO(selectedSpecialPricing.startDate), 'MMM d, yyyy')} - {format(parseISO(selectedSpecialPricing.endDate), 'MMM d, yyyy')}
              </p>
              <p className="text-sm mt-1">
                {selectedSpecialPricing.priceType === 'multiplier' 
                  ? `${selectedSpecialPricing.priceValue}x multiplier` 
                  : `$${selectedSpecialPricing.priceValue} fixed price`}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSpecialPricingDialogOpen(false)}>
              <XIcon className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSpecialPricing}>
              <TrashIcon className="h-4 w-4 mr-1" /> Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 