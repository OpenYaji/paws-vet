'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/auth-client';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  weight_kg: number;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  icon: string;
}

const services: Service[] = [
  { id: 'consultation', name: 'General Check-up', duration_minutes: 30, icon: '🩺' },
  { id: 'vaccination', name: 'Vaccination', duration_minutes: 20, icon: '💉' },
  { id: 'surgery', name: 'Surgery', duration_minutes: 120, icon: '🏥' },
  { id: 'dental', name: 'Dental Cleaning', duration_minutes: 45, icon: '🦷' },
  { id: 'grooming', name: 'Grooming', duration_minutes: 60, icon: '✂️' },
  { id: 'emergency', name: 'Emergency', duration_minutes: 45, icon: '🚨' },
];

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
];

export default function ClientAppointmentsPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [bookingStep, setBookingStep] = useState<'pet' | 'service' | 'time' | 'review' | 'success'>('pet');
  
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  useEffect(() => {
    fetchClientData();
  }, []);

  useEffect(() => {
    if (clientId) {
      fetchPets();
    }
  }, [clientId]);

  useEffect(() => {
    if (selectedService && selectedDate) {
      filterAvailableSlots();
    }
  }, [selectedService, selectedDate]);

  const fetchClientData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Auth error:', authError);
        setLoading(false);
        return;
      }

      if (!user) {
        console.error('No authenticated user found');
        setLoading(false);
        return;
      }

      console.log('Authenticated user:', user.id, 'Role:', user.user_metadata?.role);
      setUserId(user.id);
      setUserEmail(user.email || ''); // Store user email

      const { data, error } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Database error fetching client profile:', error);
        setLoading(false);
        return;
      }

      if (data) {
        console.log('Client profile loaded:', data);
        setClientId(data.id);
        setClientProfile(data);
      } else {
        console.warn('No client profile found for user:', user.id);
        console.warn('This user may have a different role. Attempting to create client profile...');
        
        // Try to create a client profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('client_profiles')
          .insert({
            user_id: user.id,
            first_name: user.email?.split('@')[0] || 'User',
            last_name: '',
            phone: '+10000000000',
            address_line1: 'N/A',
            city: 'N/A',
            state: 'N/A',
            zip_code: '00000',
            communication_preference: 'email'
          })
          .select()
          .single();

        if (createError) {
          console.error('Failed to create client profile:', createError);
          setLoading(false);
          return;
        }

        if (newProfile) {
          console.log('Created new client profile:', newProfile);
          setClientId(newProfile.id);
          setClientProfile(newProfile);
        }
      }
    } catch (error) {
      console.error('Unexpected error in fetchClientData:', error);
      setLoading(false);
    }
  };

  const fetchPets = async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      console.log('Fetching pets for client:', clientId);
      const response = await fetch(`/api/client/pets?client_id=${clientId}`);
      
      if (!response.ok) {
        console.error('Failed to fetch pets:', response.status, response.statusText);
        setPets([]);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Fetched pets data:', data);
      
      const petsArray = Array.isArray(data) ? data : [];
      setPets(petsArray);
      
      // Auto-select if only one pet
      if (petsArray.length === 1) {
        console.log('Auto-selecting single pet:', petsArray[0]);
        setSelectedPet(petsArray[0]);
        setBookingStep('service');
      }
    } catch (error) {
      console.error('Error fetching pets:', error);
      setPets([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAvailableSlots = () => {
    if (!selectedService) return;
    
    // Simple filtering - in production, this would check against actual vet schedules
    const filtered = timeSlots.filter(slot => {
      const [hours, minutes] = slot.split(':').map(Number);
      const slotTime = hours * 60 + minutes;
      const endTime = slotTime + selectedService.duration_minutes;
      
      // Must end before 5 PM (17:00 = 1020 minutes)
      return endTime <= 1020;
    });
    
    setAvailableSlots(filtered);
  };

  const handlePetSelection = (pet: Pet) => {
    setSelectedPet(pet);
    setBookingStep('service');
  };

  const handleServiceSelection = (service: Service) => {
    setSelectedService(service);
    setBookingStep('time');
  };

  const handleTimeSelection = (time: string) => {
    setSelectedTime(time);
    setBookingStep('review');
  };

  const handleConfirmAppointment = async () => {
  console.log('Attempting to create appointment...');

  if (!selectedPet || !selectedService || !selectedDate || !selectedTime) {
    alert('Missing appointment details. Please complete all steps.');
    return;
  }

  if (!userId) {
    alert('User session expired. Please refresh the page and login again.');
    return;
  }
  
  const [hours, minutes] = selectedTime.split(':').map(Number);
  const scheduledStart = new Date(selectedDate);
  scheduledStart.setHours(hours, minutes, 0, 0);
  
  const scheduledEnd = new Date(scheduledStart);
  scheduledEnd.setMinutes(scheduledEnd.getMinutes() + selectedService.duration_minutes);

  try {
    const appointmentData = {
      pet_id: selectedPet.id,
      booked_by: userId,
      // FIX: do NOT send appointment_type from frontend — API defaults to 'consultation'
      scheduled_start: scheduledStart.toISOString(),
      scheduled_end: scheduledEnd.toISOString(),
      reason_for_visit: selectedService.name,
      appointment_status: 'pending',
      is_emergency: selectedService.id === 'emergency',
    };

    console.log('Creating appointment with data:', appointmentData);

    const response = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointmentData),
    });

    const result = await response.json();
    console.log('Appointment response:', result);

    if (!response.ok) {
      console.error('Failed to create appointment. Status:', response.status);
      console.error('Error details:', result);
      
      let errorMessage = 'Failed to create appointment.';
      if (result.error) {
        errorMessage += ` Error: ${result.error}`;
      }
      if (result.details) {
        errorMessage += ` Details: ${result.details}`;
      }
      
      alert(errorMessage);
      return;
    }

    console.log('Appointment created successfully:', result);
    setBookingStep('success');
  } catch (error) {
    console.error('Unexpected error creating appointment:', error);
    alert('An unexpected error occurred. Please try again.');
  }
};

  const generateGoogleCalendarLink = () => {
    if (!selectedPet || !selectedService || !selectedDate || !selectedTime) return '';
    
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const start = new Date(selectedDate);
    start.setHours(hours, minutes, 0, 0);
    
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + selectedService.duration_minutes);
    
    const title = `${selectedService.name} - ${selectedPet.name}`;
    const details = `Veterinary appointment for ${selectedPet.name} at PAWS Clinic`;
    const location = 'PAWS Veterinary Clinic';
    
    const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatDate(start)}/${formatDate(end)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
  };

  if (loading) {
    return (
      <main className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/50 rounded-full animate-pulse"></div>
            <div className="absolute inset-1 bg-card rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-transparent border-t-primary"></div>
            </div>
          </div>
          <p className="text-lg font-medium text-foreground">Loading appointments...</p>
          <p className="text-sm text-muted-foreground">Please wait a moment</p>
        </div>
      </main>
    );
  }

  // No Pets - Gate View
  if (pets.length === 0) {
    return (
      <main className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="max-w-2xl w-full">
          <div className="text-center space-y-6 border-2 border-dashed border-border rounded-2xl bg-gradient-to-br from-primary/5 to-transparent p-12">
            <div className="text-7xl">🐾</div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Register Your Pet First</h2>
              <p className="text-lg text-muted-foreground">
                You haven't registered a pet yet. Please add your pet's details to book appointments.
              </p>
            </div>
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
              <Link href="/client/pets" className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Your Pet
              </Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Success View
  if (bookingStep === 'success') {
    return (
      <main className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="max-w-2xl w-full">
          <div className="bg-card border-2 border-primary/30 rounded-2xl p-8 text-center space-y-6 bg-gradient-to-b from-primary/5 to-transparent">
            <div className="text-7xl animate-bounce">✓</div>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold">Appointment Confirmed!</h1>
              <p className="text-lg text-muted-foreground">
                Your appointment for <span className="text-primary font-semibold">{selectedPet?.name}</span> has been scheduled successfully.
              </p>
            </div>

            <div className="bg-background border border-border rounded-xl p-6 space-y-4 text-left">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Pet</p>
                  <p className="font-semibold text-base">{selectedPet?.name} ({selectedPet?.species})</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Service</p>
                  <p className="font-semibold text-base">{selectedService?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Date & Time</p>
                  <p className="font-semibold text-base">
                    {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {selectedTime}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Duration</p>
                  <p className="font-semibold text-base">{selectedService?.duration_minutes} minutes</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Button asChild className="w-full bg-primary hover:bg-primary/90" size="lg">
                <a href={generateGoogleCalendarLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 mr-2" />
                  Add to Google Calendar
                </a>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setBookingStep('pet');
                  setSelectedPet(null);
                  setSelectedService(null);
                  setSelectedDate(undefined);
                  setSelectedTime('');
                }}
                size="lg"
                className="border-2"
              >
                Book Another Appointment
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-8">
      <div className="pt-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">Book Appointment</h1>
        <p className="text-lg text-muted-foreground">Quick and easy pet care scheduling</p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center gap-3 max-w-2xl">
        {[
          { step: 'pet', label: 'Pet' },
          { step: 'service', label: 'Service' },
          { step: 'time', label: 'Date & Time' },
          { step: 'review', label: 'Review' }
        ].map((item, index) => {
          const isCompleted = ['pet', 'service', 'time', 'review'].indexOf(bookingStep) > index;
          const isActive = bookingStep === item.step;
          
          return (
            <React.Fragment key={item.step}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                      : isCompleted
                      ? 'bg-primary/20 text-primary'
                      : 'bg-border text-muted-foreground'
                  }`}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                <span className={`text-xs font-medium transition-colors ${isActive ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                  {item.label}
                </span>
              </div>
              {index < 3 && (
                <div
                  className={`flex-1 h-1 rounded-full transition-all ${
                    isCompleted ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="max-w-4xl">
        {/* Step 1: Select Pet */}
        {bookingStep === 'pet' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-2xl font-bold mb-2">Select Your Pet</h2>
              <p className="text-muted-foreground">Who needs an appointment?</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pets.map((pet) => (
                <button
                  key={pet.id}
                  onClick={() => handlePetSelection(pet)}
                  className="group bg-card border-2 border-border hover:border-primary hover:shadow-lg rounded-xl p-6 text-left transition-all duration-300 hover:scale-105"
                >
                  <div className="text-5xl mb-3 group-hover:scale-125 transition-transform duration-300 inline-block">
                    {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
                  </div>
                  <h3 className="text-xl font-bold mb-1">{pet.name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{pet.species.charAt(0).toUpperCase() + pet.species.slice(1)} • {pet.breed || 'Mixed'}</p>
                  <p className="text-xs text-muted-foreground mt-2">{pet.weight_kg} kg</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Service */}
        {bookingStep === 'service' && selectedPet && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBookingStep('pet')}
                className="mb-4 hover:bg-accent transition-colors"
              >
                ← Back to Pet Selection
              </Button>
              <h2 className="text-2xl font-bold mb-2">Select Service for <span className="text-primary">{selectedPet.name}</span></h2>
              <p className="text-muted-foreground">What service do you need?</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelection(service)}
                  className="group bg-card border-2 border-border hover:border-primary hover:shadow-lg rounded-xl p-6 text-center transition-all duration-300 hover:scale-105"
                >
                  <div className="text-5xl mb-3 group-hover:scale-125 transition-transform duration-300 inline-block">{service.icon}</div>
                  <h3 className="font-bold mb-1">{service.name}</h3>
                  <p className="text-xs text-muted-foreground">{service.duration_minutes} minutes</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Select Date & Time */}
        {bookingStep === 'time' && selectedService && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBookingStep('service')}
                className="mb-4 hover:bg-accent transition-colors"
              >
                ← Back to Services
              </Button>
              <h2 className="text-2xl font-bold mb-2">Choose Date & Time</h2>
              <p className="text-muted-foreground">
                Service: <span className="font-semibold text-foreground">{selectedService.name}</span> ({selectedService.duration_minutes} minutes)
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-bold mb-4 text-lg">Select Date</h3>
                <div className="border border-border rounded-lg overflow-hidden bg-background">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date() || date.getDay() === 0}
                    className="p-3"
                  />
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-bold mb-4 text-lg">Available Time Slots</h3>
                {!selectedDate ? (
                  <div className="flex items-center justify-center h-40 text-center">
                    <p className="text-muted-foreground text-sm">👆 Please select a date first</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((time) => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? 'default' : 'outline'}
                        onClick={() => handleTimeSelection(time)}
                        className="text-sm transition-all duration-200 hover:scale-105"
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review & Confirm */}
        {bookingStep === 'review' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBookingStep('time')}
                className="mb-4 hover:bg-accent transition-colors"
              >
                ← Back to Date & Time
              </Button>
              <h2 className="text-2xl font-bold">Review & Confirm</h2>
            </div>
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-xl p-6">
                  <h3 className="font-bold mb-4 text-lg flex items-center gap-2">
                    <span className="text-2xl">📋</span> Appointment Details
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Pet</p>
                      <p className="text-base font-semibold">{selectedPet?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Service</p>
                      <p className="text-base font-semibold">{selectedService?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Date</p>
                      <p className="text-base font-semibold">{selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Time</p>
                      <p className="text-base font-semibold">{selectedTime}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Duration</p>
                      <p className="text-base font-semibold">{selectedService?.duration_minutes} minutes</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-accent to-transparent border border-border rounded-xl p-6">
                  <h3 className="font-bold mb-4 text-lg flex items-center gap-2">
                    <span className="text-2xl">👤</span> Contact Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Name</p>
                      <p className="text-base font-semibold">{clientProfile?.first_name} {clientProfile?.last_name}</p>
                    </div>
                    {clientProfile?.phone && clientProfile.phone !== '+10000000000' && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Phone</p>
                        <p className="text-base font-semibold">{clientProfile.phone}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-semibold uppercase text-muted-foreground block mb-2">
                        Email for Confirmation
                      </label>
                      <Input
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full border-2 transition-colors focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              {!userId && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-lg text-sm flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <p className="font-semibold">Session Issue Detected</p>
                    <p>Please refresh the page to continue.</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setBookingStep('time')}
                  className="flex-1"
                >
                  Edit Details
                </Button>
                <Button
                  onClick={handleConfirmAppointment}
                  size="lg"
                  className="flex-1 bg-primary hover:bg-primary/90 transition-colors"
                  disabled={!userId || !userEmail}
                >
                  {!userId ? '⏳ Refreshing Session' : !userEmail ? '✉️ Enter Email' : '✓ Confirm Appointment'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
