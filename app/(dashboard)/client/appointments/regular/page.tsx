'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  PawPrint,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  CalendarDays,
  CreditCard,
  Scissors,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { sendAdminNotification } from '@/lib/notifications';
import {
  getAvailableDates,
  calculateDuration,
  calculatePaymentAmount,
  isDateAvailable,
  checkAndUpdateSlotStatus,
  getNextAvailableTime,
  checkDuplicateBooking,
} from '@/lib/booking-engine';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  gender: 'male' | 'female' | 'unknown' | null;
  allow_repeat_kapon_booking?: boolean;
}

interface ClientProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  address_line1: string;
}

interface Service {
  id: string;
  service_name: string;
  service_category: string;
  description: string | null;
  base_price: number;
  duration_minutes: number;
  requires_specialist: boolean;
  is_active: boolean;
}

type Step = 'pet' | 'service' | 'date' | 'details' | 'payment';
type PaymentMethod = 'gcash' | 'maya' | 'cash';

const STEPS: Step[] = ['pet', 'service', 'date', 'details', 'payment'];
const STEP_LABELS: Record<Step, string> = {
  pet: 'Select Pet',
  service: 'Service',
  date: 'Pick a Date',
  details: 'Review',
  payment: 'Payment',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  });
}

function formatDisplayTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const currentIdx = STEPS.indexOf(current);
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEPS.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center gap-2 min-w-[64px]">
              <div
                className={[
                  'w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                  active
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-lg shadow-primary/20'
                    : done
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                ].join(' ')}
              >
                {done ? <CheckCircle2 size={20} /> : idx + 1}
              </div>
              <span
                className={`text-[11px] font-semibold whitespace-nowrap leading-tight text-center ${
                  active ? 'text-primary' : done ? 'text-primary/60' : 'text-muted-foreground'
                }`}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className="flex-1 h-[2px] rounded-full mb-5 transition-all duration-500">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    done ? 'bg-primary w-full' : 'bg-border w-full'
                  }`}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function RegularAppointmentPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>('pet');
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [calMonth, setCalMonth] = useState(() => new Date());
  const [availableDateSet, setAvailableDateSet] = useState<Set<string>>(new Set());
  const [loadingDates, setLoadingDates] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateFullError, setDateFullError] = useState(false);
  const [closedDateReason, setClosedDateReason] = useState<string | null>(null);
  const [closedDatesMap, setClosedDatesMap] = useState<Record<string, string | null>>({});

  const [reasonForVisit, setReasonForVisit] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [senderName, setSenderName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [appointmentNumber, setAppointmentNumber] = useState<string | null>(null);
  const [clinicSettings, setClinicSettings] = useState<any>(null);

  const petGender = (selectedPet?.gender as 'male' | 'female') ?? 'male';
  let isKaponService = false;
  if (selectedService?.service_name) {
    isKaponService = selectedService.service_name.toLowerCase().includes('kapon') || 
                     selectedService.service_name.toLowerCase().includes('neuter');
  }

  const calculatedPetDuration = selectedPet ? calculateDuration(petGender === 'female' ? 'female' : 'male') : 10;
  const duration = isKaponService ? calculatedPetDuration : (selectedService?.duration_minutes ?? calculatedPetDuration);
  const paymentAmount = selectedService?.base_price ?? calculatePaymentAmount({ appointmentType: 'regular', isAspinPuspin: false });

  useEffect(() => {
    (async () => {
      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) { setInitError('Session expired. Please log in again.'); setLoadingInit(false); return; }
        setUserId(user.id);

        const [profileRes, settingsRes, servicesRes] = await Promise.all([
          supabase
            .from('client_profiles')
            .select('id,user_id,first_name,last_name,phone,address_line1')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase.from('clinic_settings').select('*').limit(1).maybeSingle(),
          supabase.from('services').select('id,service_name,service_category,description,base_price,duration_minutes,requires_specialist,is_active').eq('is_active', true)
        ]);
        if (profileRes.error) throw profileRes.error;
        setProfile(profileRes.data ?? null);
        if (settingsRes.data) setClinicSettings(settingsRes.data);
        if (servicesRes.error) throw servicesRes.error;
        setServices((servicesRes.data ?? []) as Service[]);

        const profileId = profileRes.data?.id;
        const petsRes = profileId
          ? await supabase.from('pets').select('id,name,species,breed,gender,allow_repeat_kapon_booking').eq('owner_id', profileId).eq('is_active', true)
          : { data: [], error: null };
        if (petsRes.error) throw petsRes.error;
        setPets((petsRes.data ?? []) as Pet[]);
      } catch (e: any) {
        setInitError(e.message ?? 'Failed to load your profile.');
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  const loadAvailableDates = useCallback(async (month: number, year: number) => {
    setLoadingDates(true);
    setAvailableDateSet(new Set());
    const dates = await getAvailableDates('regular', month, year);
    setAvailableDateSet(new Set(dates));

    const { data: closedData } = await supabase
      .from('closed_dates')
      .select('closed_date, reason')
      .gte('closed_date', `${year}-${String(month).padStart(2,'0')}-01`)
      .lte('closed_date', `${year}-${String(month).padStart(2,'0')}-31`);

    const map: Record<string, string | null> = {};
    (closedData ?? []).forEach((r: any) => {
      map[r.closed_date] = r.reason ?? null;
    });
    setClosedDatesMap(map);
    setLoadingDates(false);
  }, []);

  useEffect(() => {
    if (step === 'date') loadAvailableDates(calMonth.getMonth() + 1, calMonth.getFullYear());
  }, [step, calMonth, loadAvailableDates]);

  function nextStep() {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  }
  function prevStep() {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  }

  async function handleSubmit() {
    if (!selectedPet || !selectedDate || !userId || !profile) return;
    if ((paymentMethod === 'gcash' || paymentMethod === 'maya') && !paymentReference.trim()) {
      setSubmitError('Please enter your transaction reference number.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setDateFullError(false);
    try {
      const stillAvailable = await isDateAvailable(selectedDate, 'regular');
      if (!stillAvailable) {
        setDateFullError(true);
        setStep('date');
        setSelectedDate(null);
        setSubmitting(false);
        return;
      }

      // Bug 2 fix: check for duplicate booking (same pet, same day)
      const isDuplicate = await checkDuplicateBooking(selectedPet.id, selectedDate);
      if (isDuplicate) {
        setSubmitError('This pet already has an appointment on this date. Please choose a different date.');
        setSubmitting(false);
        return;
      }

      // Block repeat kapon bookings unless admin enabled a one-time override. (Only for kapon services)
      if (isKaponService) {
        const [{ data: priorRegular }, { data: latestPet }] = await Promise.all([
          supabase
            .from('appointments')
            .select('id')
            .eq('pet_id', selectedPet.id)
            .eq('appointment_type_detail', 'regular')
            .limit(1),
          supabase
            .from('pets')
            .select('allow_repeat_kapon_booking')
            .eq('id', selectedPet.id)
            .maybeSingle(),
        ]);

        if ((priorRegular?.length ?? 0) > 0 && !latestPet?.allow_repeat_kapon_booking) {
          setSubmitError('This pet is currently disabled for repeat kapon booking. Please contact the clinic/admin to enable "Allow Again".');
          setSubmitting(false);
          return;
        }
      }

      // Bug 1 fix: calculate actual next available start time
      const nextStart = await getNextAvailableTime(selectedDate, 'regular');
      if (!nextStart) {
        setSubmitError('Could not determine the next available time slot. Please try again.');
        setSubmitting(false);
        return;
      }
      const scheduledStart = new Date(nextStart);
      const scheduledEnd = new Date(scheduledStart.getTime() + duration * 60 * 1000);
      const payload = {
        pet_id: selectedPet.id,
        booked_by: userId,
        appointment_type: 'wellness',
        appointment_type_detail: 'regular',
        scheduled_start: scheduledStart.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        reason_for_visit: reasonForVisit,
        special_instructions: specialInstructions || null,
        appointment_status: 'pending',
        pet_gender_at_booking: petGender === 'female' ? 'female' : 'male',
        duration_minutes: duration,
        is_aspin_puspin: false,
        payment_amount: paymentAmount,
        payment_status: 'unpaid',
        payment_method: paymentMethod ?? null,
        payment_reference: paymentReference.trim() || null,
        payment_sender_name: (paymentMethod === 'gcash' || paymentMethod === 'maya')
          ? senderName.trim()
          : null,
        is_emergency: false,
        service_id: selectedService?.id,
        is_kapon_service: isKaponService,
      };
      const createRes = await fetch('/api/client/appointments/regular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const createJson = await createRes.json().catch(() => null);
      if (!createRes.ok) {
        const errorToken = createJson?.error || '';
        const message = createJson?.message || 'Something went wrong. Please try again.';
        if (errorToken === 'kapon_repeat_blocked') {
          setSubmitError('This pet is currently disabled for repeat kapon booking. Please contact the clinic/admin to enable "Allow Again".');
          setSubmitting(false);
          return;
        }
        setSubmitError(message);
        setSubmitting(false);
        return;
      }

      const appt = createJson as { id: string; appointment_number: string };
      await checkAndUpdateSlotStatus(selectedDate, 'regular');
      setAppointmentNumber(appt.appointment_number);

      // Notify CMS admins about new appointment (fire-and-forget)
      sendAdminNotification({
        type: 'booked',
        label: appt.appointment_number,
        appointmentId: appt.id,
        clientUserId: userId ?? undefined,
      }).catch(console.error);
      setStep('payment');
    } catch (e: any) {
      setSubmitError(e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Loading ───
  if (loadingInit) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
          <p className="font-medium text-base">Loading your profile…</p>
        </div>
      </main>
    );
  }

  // ─── Error ───
  if (initError) {
    return (
      <main className="flex items-center justify-center min-h-screen p-6">
        <div className="bg-card border border-border rounded-2xl p-10 text-center max-w-sm w-full shadow-sm">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-destructive" />
          </div>
          <p className="font-bold text-lg mb-2">Unable to load</p>
          <p className="text-sm text-muted-foreground">{initError}</p>
        </div>
      </main>
    );
  }

  // ─── No pets ───
  if (pets.length === 0) {
    return (
      <main className="flex items-center justify-center min-h-screen p-6">
        <div className="bg-card border border-dashed border-border rounded-3xl p-14 text-center max-w-md w-full space-y-5 shadow-sm">
          <div className="text-7xl">🐾</div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Register Your Pet First</h2>
            <p className="text-muted-foreground">
              You need at least one registered pet to book an appointment.
            </p>
          </div>
          <Button
            size="lg"
            className="bg-primary text-primary-foreground hover:opacity-90 active:scale-95 w-full"
            onClick={() => router.push('/client/pets')}
          >
            Add a Pet
          </Button>
        </div>
      </main>
    );
  }

  // ─── Success ───
  if (appointmentNumber) {
    return (
      <main className="flex items-center justify-center min-h-screen p-6 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="bg-card border border-border rounded-3xl p-10 text-center max-w-lg w-full space-y-6 shadow-lg">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={44} className="text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Booking Received!</h2>
            <p className="text-muted-foreground">
              We&apos;ll confirm your appointment shortly.
            </p>
          </div>
          <div className="bg-accent rounded-2xl p-5 space-y-3 text-sm text-left">
            <Row label="Appointment #" value={appointmentNumber} valueClass="font-mono" />
            <Row label="Pet" value={selectedPet?.name ?? ''} />
            <Row label="Service" value={selectedService?.service_name ?? 'Regular'} />
            <Row label="Date" value={selectedDate ? formatDisplayDate(selectedDate) : ''} />
            <Row label="Duration" value={`${duration} minutes`} />
            <Row
              label="Amount"
              value={`\u20b1${paymentAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
              valueClass="text-primary font-bold text-base"
            />
            <Row label="Payment" value={paymentMethod?.toUpperCase() ?? 'N/A'} />
          </div>
          <p className="text-xs text-muted-foreground">
            Payment status will be updated once our team verifies your reference.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:opacity-90 active:scale-95 w-full"
              onClick={() => router.push('/client/appointments')}
            >
              View My Appointments
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => {
                setStep('pet');
                setSelectedPet(null);
                setSelectedDate(null);
                setReasonForVisit('');
                setSpecialInstructions('');
                setConfirmed(false);
                setPaymentMethod(null);
                setPaymentReference('');
                setSenderName('');
                setAppointmentNumber(null);
              }}
            >
              Book Another
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // ─── Main wizard ───
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Page Header ── */}
        <div className="mb-8">
          <Link
            href="/client/appointments"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5 group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Appointments
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shadow-sm">
              <Scissors size={26} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Regular Appointment</h1>
              <p className="text-muted-foreground mt-0.5">{selectedService ? `${selectedService.service_name} booking` : 'Select a service to begin'}</p>
            </div>
          </div>
        </div>

        {/* ── Step indicator ── */}
        <StepIndicator current={step} />

        {/* ── Card wrapper ── */}
        <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">

          {/* Step title bar */}
          <div className="px-8 py-5 border-b border-border bg-accent/40">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                {STEPS.indexOf(step) + 1}
              </span>
              <h2 className="text-lg font-bold">
                {step === 'pet' && 'Which pet is this for?'}
                {step === 'service' && 'Confirm Service'}
                {step === 'date' && 'Pick an Available Date'}
                {step === 'details' && 'Review & Add Details'}
                {step === 'payment' && 'Complete Payment'}
              </h2>
            </div>
          </div>

          <div className="p-8 space-y-6">

            {/* ── STEP 1: Select Pet ── */}
            {step === 'pet' && (
              <section className="space-y-5 animate-in fade-in duration-300">
                <p className="text-muted-foreground">Select the pet you&apos;re booking this appointment for.</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {pets.map((pet) => {
                    const isSelected = selectedPet?.id === pet.id;
                    const emoji = pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾';
                    return (
                      <button
                        key={pet.id}
                        onClick={() => setSelectedPet(pet)}
                        className={[
                          'text-left bg-background border-2 rounded-2xl p-6 transition-all duration-200 hover:shadow-lg active:scale-[0.98] group',
                          isSelected
                            ? 'border-primary ring-2 ring-primary/20 shadow-md'
                            : 'border-border hover:border-primary/40',
                        ].join(' ')}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 transition-colors ${isSelected ? 'bg-primary/10' : 'bg-accent group-hover:bg-primary/5'}`}>
                            {emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-lg truncate leading-tight">{pet.name}</p>
                            <p className="text-sm text-muted-foreground capitalize mt-0.5">
                              {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}
                            </p>
                            <span
                              className={`inline-block mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                pet.gender === 'female'
                                  ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}
                            >
                              {pet.gender ?? 'unknown'}
                            </span>
                          </div>
                          {isSelected && (
                            <CheckCircle2 size={22} className="text-primary flex-shrink-0 mt-1" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    size="lg"
                    disabled={!selectedPet}
                    className="bg-primary text-primary-foreground hover:opacity-90 active:scale-95 min-w-[140px]"
                    onClick={nextStep}
                  >
                    Continue <ChevronRight size={18} className="ml-1" />
                  </Button>
                </div>
              </section>
            )}

            {/* ── STEP 2: Service ── */}
            {step === 'service' && selectedPet && (
              <section className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-gradient-to-br from-primary/8 to-primary/3 border-2 border-primary/30 rounded-2xl p-6 flex flex-col gap-5">
                  <p className="font-bold text-xl">Select a Service</p>
                  
                  {Object.entries(
                    services.reduce((acc, s) => {
                      const cat = s.service_category;
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(s);
                      return acc;
                    }, {} as Record<string, Service[]>)
                  ).map(([category, items]) => (
                    <div key={category}>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                        {category}
                      </h3>
                      <div className="grid gap-3">
                        {items.map(service => (
                          <button
                            key={service.id}
                            onClick={() => setSelectedService(service)}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${
                              selectedService?.id === service.id
                                ? 'border-primary bg-primary/8'
                                : 'border-border hover:border-primary/50 bg-card'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <p className="font-semibold text-lg flex items-center gap-2">
                                  {service.service_name}
                                  {selectedService?.id === service.id && (
                                    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                      <CheckCircle2 size={10} /> Selected
                                    </span>
                                  )}
                                </p>
                                {service.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-bold text-primary whitespace-nowrap">
                                  &#8369;{service.base_price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </p>
                                {(() => {
                                  const isThisKapon = service.service_name.toLowerCase().includes('kapon') || service.service_name.toLowerCase().includes('neuter');
                                  const displayDuration = isThisKapon ? calculatedPetDuration : service.duration_minutes;
                                  return displayDuration ? (
                                    <p className="text-xs text-muted-foreground whitespace-nowrap">~{displayDuration} min</p>
                                  ) : null;
                                })()}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {selectedService && (
                    <div className="mt-4 pt-4 border-t border-primary/20 flex flex-wrap items-center gap-6">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Amount</p>
                        <p className="text-xl font-bold text-primary">
                          &#8369;{paymentAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Duration</p>
                        <p className="text-lg font-bold text-foreground">
                          ~{duration} min
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-accent/60 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center flex-shrink-0">
                    <PawPrint size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{selectedPet.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {selectedPet.species}{selectedPet.breed ? ` · ${selectedPet.breed}` : ''} · {selectedPet.gender ?? 'unknown'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 justify-between pt-2">
                  <Button size="lg" variant="outline" onClick={prevStep} className="min-w-[110px]">
                    <ChevronLeft size={18} className="mr-1" /> Back
                  </Button>
                  <Button 
                    size="lg" 
                    className="bg-primary text-primary-foreground hover:opacity-90 active:scale-95 min-w-[140px]" 
                    onClick={nextStep}
                    disabled={!selectedService}
                  >
                    Continue <ChevronRight size={18} className="ml-1" />
                  </Button>
                </div>
              </section>
            )}

            {/* ── STEP 3: Pick a Date ── */}
            {step === 'date' && (
              <section className="space-y-5 animate-in fade-in duration-300">
                {dateFullError && (
                  <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">That date just became fully booked. Please pick another date.</span>
                  </div>
                )}

                {loadingDates ? (
                  <div className="flex items-center justify-center gap-3 text-muted-foreground py-8">
                    <Loader2 size={20} className="animate-spin text-primary" />
                    <span className="text-sm">Loading available dates…</span>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <div className="w-full max-w-md">
                      <Calendar
                        mode="single"
                        month={calMonth}
                        onMonthChange={(m) => {
                          setCalMonth(m);
                          setClosedDateReason(null);
                        }}
                        selected={selectedDate ? new Date(`${selectedDate}T12:00:00`) : undefined}
                        onSelect={(d) => {
                          if (!d) return;
                          const key = toDateKey(d);

                          setClosedDateReason(null);

                          // If date is in closedDatesMap, show reason
                          if (key in closedDatesMap) {
                            setClosedDateReason(
                              closedDatesMap[key] ??
                              'This date is unavailable for booking.'
                            );
                            return;
                          }

                          // If not in available set, it's full
                          if (!availableDateSet.has(key)) {
                            setDateFullError(false);
                            setClosedDateReason(null);
                            return;
                          }

                          // Date is available
                          setSelectedDate(key);
                          setDateFullError(false);
                        }}
                        disabled={(d) => {
                          if (d < new Date(new Date().setHours(0,0,0,0)))
                            return true;
                          if (loadingDates) return true;
                          const key = toDateKey(d);
                          // Allow clicking closed dates so reason can show
                          // Only fully disable past dates and non-weekday dates
                          const dow = d.getDay();
                          if (dow === 0 || dow === 6) return true;
                          return false;
                        }}
                        modifiers={{ available: (d) => availableDateSet.has(toDateKey(d)) }}
                        modifiersClassNames={{ available: 'ring-1 ring-primary/40 bg-primary/5' }}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-5 pt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-primary/10 ring-1 ring-primary/40 inline-block" />
                    Available
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-muted inline-block opacity-50" />
                    Full / Unavailable
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-primary inline-block" />
                    Today
                  </span>
                </div>

                {closedDateReason && (
                  <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-400 animate-in fade-in duration-200">
                    <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">
                        This date is unavailable for booking.
                      </p>
                      <p className="mt-0.5 text-xs">
                        Reason: {closedDateReason}
                      </p>
                    </div>
                  </div>
                )}

                {selectedDate && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
                    <CalendarDays size={18} className="text-primary flex-shrink-0" />
                    <p className="text-sm font-semibold text-primary">{formatDisplayDate(selectedDate)}</p>
                  </div>
                )}

                <div className="flex gap-3 justify-between pt-2">
                  <Button size="lg" variant="outline" onClick={prevStep} className="min-w-[110px]">
                    <ChevronLeft size={18} className="mr-1" /> Back
                  </Button>
                  <Button
                    size="lg"
                    disabled={!selectedDate}
                    className="bg-primary text-primary-foreground hover:opacity-90 active:scale-95 min-w-[140px]"
                    onClick={nextStep}
                  >
                    Continue <ChevronRight size={18} className="ml-1" />
                  </Button>
                </div>
              </section>
            )}

            {/* ── STEP 4: Review & Details ── */}
            {step === 'details' && selectedPet && selectedDate && (
              <section className="space-y-6 animate-in fade-in duration-300">
                {/* Summary */}
                <div className="bg-accent/60 rounded-2xl p-5 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Booking Summary</p>
                  <Row label="Pet" value={selectedPet.name} />
                  <Row label="Service" value={selectedService?.service_name ?? 'Regular'} />
                  <Row label="Date" value={formatDisplayDate(selectedDate)} />
                  <Row label="Duration" value={`~${duration} minutes`} />
                  <div className="pt-2 mt-2 border-t border-border">
                    <Row
                      label="Total Amount"
                      value={`\u20b1${paymentAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
                      valueClass="font-bold text-primary text-base"
                    />
                  </div>
                </div>

                {/* Form fields */}
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="reason" className="text-sm font-semibold">
                      Reason for Visit <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="reason"
                      placeholder="e.g. Routine kapon for my dog"
                      value={reasonForVisit}
                      onChange={(e) => setReasonForVisit(e.target.value)}
                      className="h-11 focus:ring-2 focus:ring-ring"
                      maxLength={200}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instructions" className="text-sm font-semibold">
                      Special Instructions{' '}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Textarea
                      id="instructions"
                      placeholder="Allergies, medications, or anything the vet should know…"
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      className="focus:ring-2 focus:ring-ring resize-none"
                      rows={4}
                      maxLength={500}
                    />
                  </div>
                </div>

                {/* Confirmation */}
                <div className="flex items-start gap-4 bg-background border border-border rounded-2xl p-5">
                  <Checkbox
                    id="confirm-details"
                    checked={confirmed}
                    onCheckedChange={(v) => setConfirmed(Boolean(v))}
                    className="mt-0.5 w-5 h-5"
                  />
                  <Label htmlFor="confirm-details" className="text-sm cursor-pointer leading-relaxed">
                    I confirm the details above are correct and understand that{' '}
                    <strong>&#8369;{paymentAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>{' '}
                    will be due upon appointment.
                  </Label>
                </div>

                <div className="flex gap-3 justify-between pt-2">
                  <Button size="lg" variant="outline" onClick={prevStep} className="min-w-[110px]">
                    <ChevronLeft size={18} className="mr-1" /> Back
                  </Button>
                  <Button
                    size="lg"
                    disabled={!reasonForVisit.trim() || !confirmed}
                    className="bg-primary text-primary-foreground hover:opacity-90 active:scale-95 min-w-[180px]"
                    onClick={nextStep}
                  >
                    Proceed to Payment <ChevronRight size={18} className="ml-1" />
                  </Button>
                </div>
              </section>
            )}

            {/* ── STEP 5: Payment ── */}
            {step === 'payment' && !appointmentNumber && selectedPet && selectedDate && (
              <section className="space-y-6 animate-in fade-in duration-300">
                {/* Amount banner */}
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-1">
                      Total Amount Due
                    </p>
                    <p className="text-4xl font-bold text-primary">
                      &#8369;{paymentAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <CreditCard size={32} className="text-primary/60" />
                  </div>
                </div>

                {/* Payment method */}
                <div className="space-y-3">
                  <p className="text-sm font-bold">Select Payment Method</p>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { id: 'gcash', label: 'GCash', emoji: '💙', desc: 'Send to our GCash number' },
                      { id: 'maya', label: 'Maya', emoji: '💚', desc: 'Send to our Maya number' },
                      { id: 'cash', label: 'Cash', emoji: '💵', desc: 'Pay on appointment day' },
                    ] as const).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setPaymentMethod(m.id)}
                        className={[
                          'border-2 rounded-2xl p-4 text-left transition-all duration-200 active:scale-95 group',
                          paymentMethod === m.id
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border bg-background hover:border-primary/40 hover:shadow-sm',
                        ].join(' ')}
                      >
                        <div className="text-3xl mb-2">{m.emoji}</div>
                        <p className={`text-sm font-bold ${paymentMethod === m.id ? 'text-primary' : ''}`}>{m.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{m.desc}</p>
                        {paymentMethod === m.id && (
                          <CheckCircle2 size={16} className="text-primary mt-2" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reference number */}
                {(paymentMethod === 'gcash' || paymentMethod === 'maya') && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* Render QR UI if configured */}
                    {((paymentMethod === 'gcash' && clinicSettings?.gcash_qr_url) || 
                      (paymentMethod === 'maya' && clinicSettings?.maya_qr_url)) && (
                      <div className="flex flex-col items-center p-4 border rounded-xl bg-accent/20">
                        <Label className="text-sm font-bold mb-3 text-center">
                          Scan to Pay via {paymentMethod === 'gcash' ? 'GCash' : 'Maya'}
                        </Label>
                        <div className="w-48 h-48 relative rounded-xl border bg-white overflow-hidden shadow-sm flex items-center justify-center p-2 mb-2">
                          <img 
                            src={paymentMethod === 'gcash' ? clinicSettings.gcash_qr_url : clinicSettings.maya_qr_url} 
                            alt={`${paymentMethod} QR`} 
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          Total Amount: <span className="font-bold text-foreground">₱ {paymentAmount.toFixed(2)}</span>
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="ref" className="text-sm font-bold">
                        Transaction Reference Number <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="ref"
                        placeholder={`Enter your ${paymentMethod === 'gcash' ? 'GCash' : 'Maya'} reference number`}
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        className="h-11 focus:ring-2 focus:ring-ring font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        Found in your {paymentMethod === 'gcash' ? 'GCash' : 'Maya'} transaction history.
                        Payment will be verified by our team.
                      </p>
                    </div>
                  </div>
                )}

                {(paymentMethod === 'gcash' || paymentMethod === 'maya') && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <Label htmlFor="senderName" className="text-sm font-bold">
                      Account Name / Sender Name{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="senderName"
                      placeholder="Name shown on your GCash/Maya account"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="h-11 focus:ring-2 focus:ring-ring"
                    />
                    <p className="text-xs text-muted-foreground">
                      The name registered on your {paymentMethod === 'gcash'
                        ? 'GCash' : 'Maya'} account.
                    </p>
                  </div>
                )}

                {paymentMethod === 'cash' && (
                  <div style={{ backgroundColor: '#fef08a', color: '#1a1a1a', borderColor: '#ca8a04' }} className="border rounded-xl p-4 text-sm animate-in fade-in duration-200 flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">💡</span>
                    <span>
                      Please bring the exact amount of{' '}
                      <strong>&#8369;{paymentAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>{' '}
                      on your appointment day.
                    </span>
                  </div>
                )}

                {submitError && (
                  <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">{submitError}</span>
                  </div>
                )}

                <div className="flex gap-3 justify-between pt-2">
                  <Button size="lg" variant="outline" onClick={prevStep} disabled={submitting} className="min-w-[110px]">
                    <ChevronLeft size={18} className="mr-1" /> Back
                  </Button>
                  <Button
                    size="lg"
                    disabled={
                      !paymentMethod ||
                      submitting ||
                      ((paymentMethod === 'gcash' || paymentMethod === 'maya') && !paymentReference.trim()) ||
                      ((paymentMethod === 'gcash' || paymentMethod === 'maya') && !senderName.trim())
                    }
                    className="bg-primary text-primary-foreground hover:opacity-90 active:scale-95 flex-1 max-w-xs"
                    onClick={handleSubmit}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin mr-2" />
                        Confirming…
                      </>
                    ) : (
                      'Confirm Booking'
                    )}
                  </Button>
                </div>
              </section>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Row helper
// ─────────────────────────────────────────────────────────────────────────────

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground text-sm flex-shrink-0">{label}</span>
      <span className={`font-semibold text-sm text-right ${valueClass ?? ''}`}>{value}</span>
    </div>
  );
}
