'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  PawPrint,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  CalendarDays,
  CreditCard,
  Users,
  AlertCircle,
  MapPin,
  Phone,
  ArrowLeft,
} from 'lucide-react';
import {
  calculatePaymentAmount,
  checkAndUpdateSlotStatus,
  getOpenOutreachPrograms,
  getNextAvailableTime,
  checkDuplicateBooking,
} from '@/lib/booking-engine';
import type { OutreachProgram } from '@/lib/booking-engine';
import { sendAdminNotification } from '@/lib/notifications';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  gender: 'male' | 'female' | 'unknown' | null;
}

interface ClientProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  address_line1: string;
}

type Step = 'program' | 'info' | 'review';
type PaymentMethod = 'gcash' | 'maya' | 'cash';

const STEPS: Step[] = ['program', 'info', 'review'];
const STEP_LABELS: Record<Step, string> = {
  program: 'Select Event',
  info: 'Pet & Owner',
  review: 'Review',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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

function slotsLeft(program: OutreachProgram): number {
  return Math.max(program.max_capacity - program.current_bookings, 0);
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
            <div className="flex flex-col items-center gap-2 min-w-[80px]">
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

export default function OutreachAppointmentPage() {
  const router = useRouter();

  // ── auth / data ──
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [openPrograms, setOpenPrograms] = useState<OutreachProgram[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // ── wizard state ──
  const [step, setStep] = useState<Step>('program');
  const [selectedProgram, setSelectedProgram] = useState<OutreachProgram | null>(null);

  // step 2 fields
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [petBreedOverride, setPetBreedOverride] = useState<string>('');
  const [isAspinPuspin, setIsAspinPuspin] = useState<boolean | null>(null);
  const [medicalNotes, setMedicalNotes] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentReference, setPaymentReference] = useState('');

  // submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // success
  const [appointmentNumber, setAppointmentNumber] = useState<string | null>(null);
  const [clinicSettings, setClinicSettings] = useState<any>(null);

  // ── Derived ──
  const selectedPet = pets.find((p) => p.id === selectedPetId) ?? null;
  const paymentAmount =
    isAspinPuspin === null
      ? null
      : calculatePaymentAmount({
          appointmentType: 'outreach',
          isAspinPuspin: isAspinPuspin,
        });
  const needsPayment = paymentAmount !== null && paymentAmount > 0;

  // ── Init ──
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser();
        if (authErr || !user) {
          setInitError('Session expired. Please log in again.');
          setLoadingInit(false);
          return;
        }
        setUserId(user.id);

        const [profileRes, programs, settingsRes] = await Promise.all([
          supabase
            .from('client_profiles')
            .select('id,user_id,first_name,last_name,phone,address_line1')
            .eq('user_id', user.id)
            .maybeSingle(),
          getOpenOutreachPrograms(),
          supabase.from('clinic_settings').select('*').limit(1).maybeSingle()
        ]);

        if (profileRes.error) throw profileRes.error;
        setProfile(profileRes.data ?? null);
        setOpenPrograms(programs);
        if (settingsRes.data) setClinicSettings(settingsRes.data);

        const profileId = profileRes.data?.id;
        const petsRes = profileId
          ? await supabase
              .from('pets')
              .select('id,name,species,breed,gender')
              .eq('owner_id', profileId)
              .eq('is_active', true)
          : { data: [], error: null };
        if (petsRes.error) throw petsRes.error;
        setPets((petsRes.data ?? []) as Pet[]);
      } catch (e: any) {
        setInitError(e.message ?? 'Failed to load data.');
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  // Auto-fill breed when pet changes
  useEffect(() => {
    if (selectedPet) {
      setPetBreedOverride(selectedPet.breed ?? '');
    }
  }, [selectedPetId]);

  // ── Navigation ──
  function nextStep() {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  }
  function prevStep() {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  }

  // ── Submit ──
  async function handleSubmit() {
    if (!selectedProgram || !selectedPet || !userId || !profile || isAspinPuspin === null) return;
    if (needsPayment && paymentMethod === null) {
      setSubmitError('Please select a payment method.');
      return;
    }
    if (needsPayment && (paymentMethod === 'gcash' || paymentMethod === 'maya') && !paymentReference.trim()) {
      setSubmitError('Please enter your transaction reference number.');
      return;
    }

    // Live capacity check — selectedProgram may be stale if loaded earlier
    const { data: liveProgram, error: programErr } = await supabase
      .from('outreach_programs')
      .select('is_open, is_full, current_bookings, max_capacity')
      .eq('id', selectedProgram.id)
      .single();

    if (programErr || !liveProgram) {
      setSubmitError('Could not verify program availability. Please try again.');
      return;
    }

    if (!liveProgram.is_open || liveProgram.is_full) {
      setSubmitError('Sorry, this outreach program is now full or closed. Please check back for future programs.');
      return;
    }

    if (liveProgram.current_bookings >= liveProgram.max_capacity) {
      setSubmitError('Sorry, this outreach program has reached maximum capacity.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const petGender =
        selectedPet.gender === 'female' ? 'female' : 'male';
      const duration = petGender === 'female' ? 15 : 10;

      // Scheduled start defaults to 08:00 PHT on program day
      // Check for duplicate booking (same pet, same day)
      const isDuplicate = await checkDuplicateBooking(
        selectedPet.id,
        selectedProgram.program_date,
      );
      if (isDuplicate) {
        setSubmitError('This pet already has an appointment on this date.');
        setSubmitting(false);
        return;
      }

      const nextStart = await getNextAvailableTime(
        selectedProgram.program_date,
        'outreach',
      );
      if (!nextStart) {
        setSubmitError('Could not determine the next available time slot. Please try again.');
        setSubmitting(false);
        return;
      }
      const scheduledStart = new Date(nextStart);
      const scheduledEnd   = new Date(scheduledStart.getTime() + duration * 60 * 1000);

      const payload = {
        pet_id:                  selectedPet.id,
        booked_by:               userId,
        appointment_type:        'kapon',
        appointment_type_detail: 'outreach',
        outreach_program_id:     selectedProgram.id,
        scheduled_start:         scheduledStart.toISOString(),
        scheduled_end:           scheduledEnd.toISOString(),
        reason_for_visit:        `Outreach – ${selectedProgram.title}`,
        special_instructions:    specialInstructions || null,
        appointment_status:      'pending',
        pet_gender_at_booking:   petGender,
        duration_minutes:        duration,
        is_aspin_puspin:         isAspinPuspin,
        payment_amount:          paymentAmount ?? 0,
        payment_status:          'unpaid',
        payment_method:          needsPayment ? (paymentMethod ?? null) : null,
        payment_reference:       needsPayment ? (paymentReference.trim() || null) : null,
        is_emergency:            false,
      };

      const createRes = await fetch('/api/client/appointments/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const createJson = await createRes.json().catch(() => null);
      if (!createRes.ok) {
        const errorToken = createJson?.error || '';
        const message = createJson?.message || 'Something went wrong. Please try again.';

        if (errorToken === 'program_full_or_closed') {
          setSubmitError('Sorry, this outreach program is now full or closed. Please check back for future programs.');
          setSubmitting(false);
          return;
        }

        if (errorToken === 'duplicate_booking') {
          setSubmitError('This pet is already registered for this outreach program.');
          setSubmitting(false);
          return;
        }

        setSubmitError(message);
        setSubmitting(false);
        return;
      }

      const appt = createJson as { id: string; appointment_number: string };

      // Update slot status — also syncs outreach_programs capacity internally
      await checkAndUpdateSlotStatus(selectedProgram.program_date, 'outreach');

      setAppointmentNumber(appt.appointment_number);

      // Notify CMS admins about new outreach appointment (fire-and-forget)
      sendAdminNotification({
        type: 'booked',
        label: appt.appointment_number,
        appointmentId: appt.id,
        clientUserId: userId ?? undefined,
      }).catch(console.error);
    } catch (e: any) {
      setSubmitError(e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Loading / error gate
  // ─────────────────────────────────────────────────────────────────────────

  if (loadingInit) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
          <p className="font-medium text-base">Loading programs…</p>
        </div>
      </main>
    );
  }

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

  // No open programs
  if (openPrograms.length === 0) {
    return (
      <main className="flex items-center justify-center min-h-screen p-6">
        <div className="bg-card border border-dashed border-border rounded-3xl p-14 text-center max-w-md w-full space-y-5 shadow-sm">
          <div className="text-7xl">🐾</div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">No Outreach Program Open</h2>
            <p className="text-muted-foreground">
              There's no outreach program currently accepting registrations. Check back soon!
            </p>
          </div>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={() => router.push('/client/appointments')}
          >
            Back to Appointments
          </Button>
        </div>
      </main>
    );
  }

  // No pets registered
  if (pets.length === 0) {
    return (
      <main className="flex items-center justify-center min-h-screen p-6">
        <div className="bg-card border border-dashed border-border rounded-3xl p-14 text-center max-w-md w-full space-y-5 shadow-sm">
          <div className="text-7xl">🐾</div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Register Your Pet First</h2>
            <p className="text-muted-foreground">
              You need at least one registered pet to join an outreach program.
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

  // ─────────────────────────────────────────────────────────────────────────
  // SUCCESS screen
  // ─────────────────────────────────────────────────────────────────────────

  if (appointmentNumber) {
    return (
      <main className="flex items-center justify-center min-h-screen p-6 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="bg-card border border-border rounded-3xl p-10 text-center max-w-lg w-full space-y-6 shadow-lg">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={44} className="text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Registration Received!</h2>
            <p className="text-muted-foreground">
              You're registered for the outreach program. We'll confirm shortly.
            </p>
          </div>

          <div className="bg-accent rounded-2xl p-5 space-y-3 text-sm text-left">
            <Row label="Appointment #" value={appointmentNumber} valueClass="font-mono" />
            <Row label="Program" value={selectedProgram?.title ?? ''} />
            <Row
              label="Date"
              value={selectedProgram ? formatDisplayDate(selectedProgram.program_date) : ''}
            />
            <Row label="Pet" value={selectedPet?.name ?? ''} />
            <Row
              label="Breed Type"
              value={isAspinPuspin ? 'Aspin / Puspin (Free)' : 'Pure Breed'}
            />
            <Row
              label="Amount"
              value={
                paymentAmount === 0
                  ? 'Free ✓'
                  : `₱${(paymentAmount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
              }
              valueClass={paymentAmount === 0 ? 'text-green-600 dark:text-green-400' : 'font-bold text-primary text-base'}
            />
          </div>

          {paymentAmount === 0 && (
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
              🎉 No payment required for Aspin / Puspin pets!
            </p>
          )}

          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:opacity-90 active:scale-95 w-full"
              onClick={() => router.push('/client/appointments')}
            >
              View My Appointments
            </Button>
            <Button size="lg" variant="outline" className="w-full" onClick={() => router.push('/client/appointments')}>
              Done
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Wizard
  // ─────────────────────────────────────────────────────────────────────────

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
              <Users size={26} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Outreach Registration</h1>
              <p className="text-muted-foreground mt-0.5">Register for a PAWS community outreach program</p>
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
                {step === 'program' && 'Choose an Outreach Program'}
                {step === 'info' && 'Pet & Owner Information'}
                {step === 'review' && 'Review & Confirm'}
              </h2>
            </div>
          </div>

          <div className="p-8 space-y-6">

            {/* ── STEP 1: Select Outreach Program ── */}
            {step === 'program' && (
              <section className="space-y-5 animate-in fade-in duration-300">
                <p className="text-muted-foreground">Select the outreach event you'd like to register for.</p>
                <div className="space-y-4">
                  {openPrograms.map((prog) => {
                    const isSelected = selectedProgram?.id === prog.id;
                    const remaining = slotsLeft(prog);
                    const almostFull = remaining <= 3 && remaining > 0;
                    return (
                      <button
                        key={prog.id}
                        onClick={() => setSelectedProgram(prog)}
                        className={[
                          'w-full text-left bg-background border-2 rounded-2xl p-6 transition-all duration-200 hover:shadow-lg active:scale-[0.98] group',
                          isSelected
                            ? 'border-primary ring-2 ring-primary/20 shadow-md'
                            : 'border-border hover:border-primary/40',
                        ].join(' ')}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 transition-colors ${isSelected ? 'bg-primary/10' : 'bg-accent group-hover:bg-primary/5'}`}>
                            🐾
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <p className="font-bold text-lg leading-tight">{prog.title}</p>
                              <span
                                className={[
                                  'text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0',
                                  almostFull
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                                ].join(' ')}
                              >
                                {remaining} slot{remaining !== 1 ? 's' : ''} left
                              </span>
                            </div>
                            <p className="text-sm text-primary flex items-center gap-1.5 font-medium mt-1.5">
                              <CalendarDays size={13} />
                              {formatDisplayDate(prog.program_date)}
                            </p>
                            {prog.description && (
                              <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                                {prog.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users size={12} />
                                {prog.current_bookings} / {prog.max_capacity} registered
                              </span>
                            </div>
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
                    disabled={!selectedProgram}
                    className="bg-primary text-primary-foreground hover:opacity-90 active:scale-95 min-w-[140px]"
                    onClick={nextStep}
                  >
                    Continue <ChevronRight size={18} className="ml-1" />
                  </Button>
                </div>
              </section>
            )}

            {/* ── STEP 2: Pet & Owner Info ── */}
            {step === 'info' && selectedProgram && (
              <section className="space-y-6 animate-in fade-in duration-300">

                {/* Selected program recap */}
                <div className="bg-accent/60 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center flex-shrink-0">
                    <CalendarDays size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{selectedProgram.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDisplayDate(selectedProgram.program_date)}
                    </p>
                  </div>
                </div>

                {/* Owner info (read-only) */}
                {profile && (
                  <div className="bg-accent/60 rounded-2xl p-5 space-y-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                      Your Information
                    </p>
                    <ReadOnlyField
                      icon={<PawPrint size={14} />}
                      label="Name"
                      value={`${profile.first_name} ${profile.last_name}`.trim()}
                    />
                    <ReadOnlyField
                      icon={<MapPin size={14} />}
                      label="Address"
                      value={profile.address_line1}
                    />
                    <ReadOnlyField
                      icon={<Phone size={14} />}
                      label="Phone"
                      value={profile.phone}
                    />
                  </div>
                )}

                {/* Pet selector */}
                <div className="space-y-2">
                  <Label htmlFor="pet-select" className="text-sm font-semibold">
                    Select Your Pet <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="pet-select"
                    value={selectedPetId}
                    onChange={(e) => setSelectedPetId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  >
                    <option value="">— Choose a pet —</option>
                    {pets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.species}{p.breed ? `, ${p.breed}` : ''})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Auto-filled pet info */}
                {selectedPet && (
                  <div className="grid sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-muted-foreground">
                        Species
                      </Label>
                      <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm capitalize text-foreground">
                        {selectedPet.species}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="breed-override" className="text-sm font-semibold">
                        Breed{' '}
                        <span className="text-muted-foreground font-normal">(editable)</span>
                      </Label>
                      <Input
                        id="breed-override"
                        value={petBreedOverride}
                        onChange={(e) => setPetBreedOverride(e.target.value)}
                        placeholder="e.g. Aspin, Shih Tzu…"
                        className="h-11 focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                )}

                {/* Aspin / Puspin toggle */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold">
                      Is this pet Aspin or Puspin?{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Aspin = mixed-breed dog · Puspin = mixed-breed cat
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setIsAspinPuspin(true)}
                      className={[
                        'rounded-2xl border-2 p-5 text-left transition-all duration-200 active:scale-95 space-y-1.5',
                        isAspinPuspin === true
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md'
                          : 'border-border bg-background hover:border-green-400 hover:shadow-sm',
                      ].join(' ')}
                    >
                      <p className="text-3xl">🐕</p>
                      <p className="font-bold text-sm">Yes, Aspin / Puspin</p>
                      <p className="text-xs text-green-600 dark:text-green-400 font-semibold">
                        Free of charge ✓
                      </p>
                      {isAspinPuspin === true && (
                        <CheckCircle2 size={16} className="text-green-500 mt-1" />
                      )}
                    </button>
                    <button
                      onClick={() => setIsAspinPuspin(false)}
                      className={[
                        'rounded-2xl border-2 p-5 text-left transition-all duration-200 active:scale-95 space-y-1.5',
                        isAspinPuspin === false
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border bg-background hover:border-primary/40 hover:shadow-sm',
                      ].join(' ')}
                    >
                      <p className="text-3xl">🏆</p>
                      <p className="font-bold text-sm">No, Pure Breed</p>
                      <p className="text-xs text-primary font-semibold">₱500.00 fee applies</p>
                      {isAspinPuspin === false && (
                        <CheckCircle2 size={16} className="text-primary mt-1" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="med-notes" className="text-sm font-semibold">
                    Medical History / Notes{' '}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    id="med-notes"
                    placeholder="Previous surgeries, allergies, current medications…"
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                    className="focus:ring-2 focus:ring-ring resize-none"
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="special" className="text-sm font-semibold">
                    Special Instructions{' '}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    id="special"
                    placeholder="Anything else the team should know…"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    className="focus:ring-2 focus:ring-ring resize-none"
                    rows={2}
                    maxLength={300}
                  />
                </div>

                <div className="flex gap-3 justify-between pt-2">
                  <Button size="lg" variant="outline" onClick={prevStep} className="min-w-[110px]">
                    <ChevronLeft size={18} className="mr-1" /> Back
                  </Button>
                  <Button
                    size="lg"
                    disabled={!selectedPetId || isAspinPuspin === null}
                    className="bg-primary text-primary-foreground hover:opacity-90 active:scale-95 min-w-[140px]"
                    onClick={nextStep}
                  >
                    Continue <ChevronRight size={18} className="ml-1" />
                  </Button>
                </div>
              </section>
            )}

            {/* ── STEP 3: Review & Confirm ── */}
            {step === 'review' && selectedProgram && selectedPet && (
              <section className="space-y-6 animate-in fade-in duration-300">

                {/* Summary */}
                <div className="bg-accent/60 rounded-2xl p-5 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    Booking Summary
                  </p>
                  <Row label="Program" value={selectedProgram.title} />
                  <Row
                    label="Date"
                    value={formatDisplayDate(selectedProgram.program_date)}
                  />
                  {profile && (
                    <Row
                      label="Owner"
                      value={`${profile.first_name} ${profile.last_name}`.trim()}
                    />
                  )}
                  <Row label="Pet" value={selectedPet.name} />
                  <Row
                    label="Species"
                    value={selectedPet.species.charAt(0).toUpperCase() + selectedPet.species.slice(1)}
                  />
                  <Row label="Breed" value={petBreedOverride || selectedPet.breed || 'Not specified'} />
                  <Row
                    label="Breed Type"
                    value={isAspinPuspin ? 'Aspin / Puspin' : 'Pure Breed'}
                  />
                  <div className="pt-2 mt-2 border-t border-border">
                    <Row
                      label="Amount Due"
                      value={
                        paymentAmount === 0
                          ? 'Free ✓'
                          : `₱${(paymentAmount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                      }
                      valueClass={
                        paymentAmount === 0
                          ? 'text-green-600 dark:text-green-400 font-bold'
                          : 'font-bold text-primary text-base'
                      }
                    />
                  </div>
                </div>

                {/* Free notice */}
                {paymentAmount === 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 text-sm text-green-700 dark:text-green-300 flex items-start gap-3">
                    <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
                    <span>
                      Great news! Aspin / Puspin pets are <strong>free of charge</strong> at PAWS outreach programs.
                    </span>
                  </div>
                )}

                {/* Payment section (only if fee applies) */}
                {needsPayment && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    {/* Amount banner */}
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-1">
                          Total Amount Due
                        </p>
                        <p className="text-4xl font-bold text-primary">
                          ₱{(paymentAmount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <CreditCard size={32} className="text-primary/60" />
                      </div>
                    </div>

                    {/* Payment method cards */}
                    <div className="space-y-3">
                      <p className="text-sm font-bold">Select Payment Method</p>
                      <div className="grid grid-cols-3 gap-3">
                        {([
                          { id: 'gcash', label: 'GCash', emoji: '💙', desc: 'Send to our GCash number' },
                          { id: 'maya', label: 'Maya', emoji: '💚', desc: 'Send to our Maya number' },
                          { id: 'cash', label: 'Cash', emoji: '💵', desc: 'Pay on program day' },
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
                            Total Amount: <span className="font-bold text-foreground">₱ {paymentAmount?.toFixed(2)}</span>
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

                    {paymentMethod === 'cash' && (
                      <div style={{ backgroundColor: '#fef08a', color: '#1a1a1a', borderColor: '#ca8a04' }} className="border rounded-xl p-4 text-sm animate-in fade-in duration-200 flex items-start gap-3">
                        <span className="text-xl flex-shrink-0">💡</span>
                        <span>
                          Please bring the exact amount of{' '}
                          <strong>₱{(paymentAmount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>{' '}
                          on the day of the outreach program.
                        </span>
                      </div>
                    )}
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
                      submitting ||
                      (needsPayment && !paymentMethod) ||
                      (needsPayment &&
                        (paymentMethod === 'gcash' || paymentMethod === 'maya') &&
                        !paymentReference.trim())
                    }
                    className="bg-primary text-primary-foreground hover:opacity-90 active:scale-95 flex-1 max-w-xs"
                    onClick={handleSubmit}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin mr-2" />
                        Registering…
                      </>
                    ) : (
                      'Register for Outreach'
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
// Small reusable sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground flex-shrink-0">{label}</span>
      <span className={`font-semibold text-right ${valueClass ?? ''}`}>{value}</span>
    </div>
  );
}

function ReadOnlyField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground flex-shrink-0">{icon}</span>
      <span className="text-muted-foreground w-16 flex-shrink-0">{label}</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}
