'use client';

import { useState, useEffect } from 'react';
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
      const response = await fetch(`/api/pets?client_id=${clientId}`);
      
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
    console.log('Selected Pet:', selectedPet);
    console.log('Selected Service:', selectedService);
    console.log('Selected Date:', selectedDate);
    console.log('Selected Time:', selectedTime);
    console.log('User ID:', userId);
    console.log('Client ID:', clientId);

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
        appointment_type: selectedService.id,
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
      <main className="p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  // No Pets - Gate View
  if (pets.length === 0) {
    return (
      <main className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-secondary/20">
            <div className="text-6xl mb-4">🐾</div>
            <h2 className="text-2xl font-bold mb-2">Register Your Pet First</h2>
            <p className="text-muted-foreground mb-6">
              You haven't registered a pet yet. Please add your pet's details to book appointments.
            </p>
            <Button asChild size="lg">
              <Link href="/client/pets">
                <Plus className="w-4 h-4 mr-2" />
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
      <main className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card border border-border rounded-lg p-8 text-center space-y-6">
            <div className="text-6xl">✓</div>
            <h1 className="text-3xl font-bold">Appointment Confirmed!</h1>
            <p className="text-muted-foreground text-lg">
              Your appointment for <strong>{selectedPet?.name}</strong> has been scheduled successfully.
            </p>

            <div className="bg-secondary/30 rounded-lg p-6 space-y-3 text-left">
              <div>
                <p className="text-sm text-muted-foreground">Pet</p>
                <p className="font-semibold">{selectedPet?.name} ({selectedPet?.species})</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Service</p>
                <p className="font-semibold">{selectedService?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date & Time</p>
                <p className="font-semibold">
                  {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {selectedTime}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-semibold">{selectedService?.duration_minutes} minutes</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Button asChild className="w-full" size="lg">
                <a href={generateGoogleCalendarLink()} target="_blank" rel="noopener noreferrer">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Add to Google Calendar
                </a>
              </Button>
              <Button variant="outline" onClick={() => {
                setBookingStep('pet');
                setSelectedPet(null);
                setSelectedService(null);
                setSelectedDate(undefined);
                setSelectedTime('');
              }}>
                Book Another Appointment
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Book Appointment</h1>
        <p className="text-muted-foreground">Quick and easy pet care scheduling</p>
      </div>
      {/* Progress Indicator */}
      <div className="flex items-center gap-2 max-w-2xl">
        {['pet', 'service', 'time', 'review'].map((step, index) => (
          <div key={step} className="flex items-center flex-1">
            <div className={`flex-1 h-2 rounded-full transition-colors ${
              ['pet', 'service', 'time', 'review'].indexOf(bookingStep) >= index
                ? 'bg-primary'
                : 'bg-border'
            }`} />
          </div>
        ))}
      </div>

      <div className="max-w-4xl">
        {/* Step 1: Select Pet */}
        {bookingStep === 'pet' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Select Your Pet</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pets.map((pet) => (
                <button
                  key={pet.id}
                  onClick={() => handlePetSelection(pet)}
                  className="bg-card border-2 border-border hover:border-primary rounded-lg p-6 text-left transition-all"
                >
                  <div className="text-4xl mb-2">
                    {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
                  </div>
                  <h3 className="text-xl font-bold">{pet.name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{pet.species} • {pet.breed || 'Mixed'}</p>
                  <p className="text-xs text-muted-foreground mt-1">{pet.weight_kg} kg</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Service */}
        {bookingStep === 'service' && selectedPet && (
          <div className="space-y-4">
            <div>
              <Button variant="ghost" size="sm" onClick={() => setBookingStep('pet')}>
                ← Back
              </Button>
              <h2 className="text-2xl font-bold mt-2">Select Service for {selectedPet.name}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelection(service)}
                  className="bg-card border-2 border-border hover:border-primary rounded-lg p-6 text-center transition-all"
                >
                  <div className="text-5xl mb-2">{service.icon}</div>
                  <h3 className="font-bold">{service.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{service.duration_minutes} min</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Select Date & Time */}
        {bookingStep === 'time' && selectedService && (
          <div className="space-y-4">
            <div>
              <Button variant="ghost" size="sm" onClick={() => setBookingStep('service')}>
                ← Back
              </Button>
              <h2 className="text-2xl font-bold mt-2">Choose Date & Time</h2>
              <p className="text-muted-foreground">
                {selectedService.name} ({selectedService.duration_minutes} minutes)
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Select Date</h3>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date() || date.getDay() === 0}
                  className="rounded-md border"
                />
              </div>
              <div>
                <h3 className="font-semibold mb-3">Available Time Slots</h3>
                {!selectedDate ? (
                  <p className="text-muted-foreground text-sm">Please select a date first</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {availableSlots.map((time) => (
                      <Button
                        key={time}
                        variant="outline"
                        onClick={() => handleTimeSelection(time)}
                        className="text-sm"
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
          <div className="space-y-4">
            <div>
              <Button variant="ghost" size="sm" onClick={() => setBookingStep('time')}>
                ← Back
              </Button>
              <h2 className="text-2xl font-bold mt-2">Review & Confirm</h2>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Appointment Details</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Pet:</span> <strong>{selectedPet?.name}</strong></p>
                    <p><span className="text-muted-foreground">Service:</span> <strong>{selectedService?.name}</strong></p>
                    <p><span className="text-muted-foreground">Date:</span> <strong>{selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</strong></p>
                    <p><span className="text-muted-foreground">Time:</span> <strong>{selectedTime}</strong></p>
                    <p><span className="text-muted-foreground">Duration:</span> <strong>{selectedService?.duration_minutes} minutes</strong></p>
                  </div>
                </div>
                <div></div>
                  <h3 className="font-semibold mb-3">Contact Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Name:</span> <strong>{clientProfile?.first_name} {clientProfile?.last_name}</strong></p>
                    {clientProfile?.phone && clientProfile.phone !== '+10000000000' && (
                      <p><span className="text-muted-foreground">Phone:</span> <strong>{clientProfile.phone}</strong></p>
                    )}
                    <div>
                      <label className="text-sm font-medium block mb-1">
                        Email for confirmation
                      </label>
                      <Input
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        We'll send booking confirmation here
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Debug Info */}
              {!userId && (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 p-3 rounded-md text-sm">
                  <p className="font-medium">⚠️ Session Issue Detected</p>
                  <p>Please refresh the page to continue.</p>
                </div>
              )}

              <Button 
                onClick={handleConfirmAppointment} 
                size="lg" 
                className="w-full"
                disabled={!userId || !userEmail}
              >
                {!userId ? 'Please refresh page' : !userEmail ? 'Enter email to continue' : 'Confirm Appointment'}
              </Button>
            </div>
        )}
      </div>
    </main>
  );
}
