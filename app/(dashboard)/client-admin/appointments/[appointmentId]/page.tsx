'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/auth-client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { sendAppointmentNotification } from '@/lib/notifications';
import { checkAndUpdateSlotStatus, toManilaDateString } from '@/lib/booking-engine';
import {
  ArrowLeft, Calendar, Clock, User, PawPrint,
  FileText, CheckCircle, XCircle, AlertCircle,
  Save, AlertTriangle, RefreshCw, CreditCard, BadgeDollarSign,
  ShieldCheck,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Appointment {
  id: string;
  pet_id: string;
  appointment_number?: string;
  scheduled_start: string;
  scheduled_end: string;
  appointment_status: string;
  reason_for_visit: string;
  special_instructions?: string;
  is_emergency: boolean;
  created_at: string;
  updated_at: string;
  // BUG FIX: Added fields used by the PATCH API route
  cancellation_reason?: string;
  cancelled_at?: string;
  actual_end?: string;
  // Payment fields
  appointment_type_detail?: string;
  outreach_program_id?: string | null;
  payment_amount?: number | null;
  payment_status?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  paid_at?: string | null;
  is_aspin_puspin?: boolean;
  payment_sender_name?: string | null;
  payment_verified_by?: string | null;
  payment_verified_at?: string | null;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  user_id: string;
  users?: { email: string };
}

interface Pet {
  name: string;
  species: string;
  breed: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDisplayTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  });
}

function formatDisplayDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  });
}
function statusClass(s: string) {
  const base = 'rounded-full px-2.5 py-0.5 text-xs font-semibold';
  const m: Record<string, string> = {
    confirmed: `${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300`,
    completed: `${base} bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300`,
    pending:   `${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300`,
    cancelled: `${base} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300`,
    no_show:   `${base} bg-muted text-muted-foreground`,
  };
  return m[s] ?? `${base} bg-muted text-muted-foreground`;
}

function StatusIcon({ status }: { status: string }) {
  const props = { size: 18 };
  if (status === 'confirmed') return <CheckCircle {...props} className="text-emerald-600" />;
  if (status === 'completed') return <CheckCircle {...props} className="text-blue-600" />;
  if (status === 'cancelled') return <XCircle {...props} className="text-destructive" />;
  if (status === 'pending') return <AlertCircle {...props} className="text-yellow-600" />;
  return <Clock {...props} className="text-muted-foreground" />;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params?.appointmentId as string;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  // BUG FIX: cancellation_reason is required by DB when status = 'cancelled'
  const [cancellationReason, setCancellationReason] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: 'danger' | 'primary';
    onConfirm: () => void;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [verifierName, setVerifierName] = useState<string | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleStart, setRescheduleStart] = useState('');
  const [rescheduleEnd, setRescheduleEnd] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // BUG FIX: Use the API route instead of Supabase client directly so the
  // admin service-role key is used (bypasses RLS).
  const fetchAppointmentData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/client-admin/appointments/${appointmentId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Appointment not found');
        return;
      }
      const data = await res.json();

      setAppointment(data);
      setSelectedStatus(data.appointment_status);
      setClient(data.pets?.client_profiles ?? null);
      setPet(data.pets ?? null);

      if (data.payment_verified_by) {
        const { data: verifier } = await supabase
          .from('users')
          .select('email')
          .eq('id', data.payment_verified_by)
          .maybeSingle();
        const { data: adminProfile } = await supabase
          .from('admin_profiles')
          .select('first_name, last_name')
          .eq('user_id', data.payment_verified_by)
          .maybeSingle();
        if (adminProfile) {
          setVerifierName(`${adminProfile.first_name} ${adminProfile.last_name}`);
        } else {
          // Try veterinarian_profiles
          const { data: vetProfile } = await supabase
            .from('veterinarian_profiles')
            .select('first_name, last_name')
            .eq('user_id', data.payment_verified_by)
            .maybeSingle();

          if (vetProfile) {
            setVerifierName(
              `${vetProfile.first_name} ${vetProfile.last_name}`
            );
          } else {
            // Try client_profiles as final fallback
            const { data: clientProfile } = await supabase
              .from('client_profiles')
              .select('first_name, last_name')
              .eq('user_id', data.payment_verified_by)
              .maybeSingle();

            if (clientProfile) {
              setVerifierName(
                `${clientProfile.first_name} ${clientProfile.last_name}`
              );
            } else {
              // Last resort: email
              setVerifierName(verifier?.email ?? null);
            }
          }
        }
      } else {
        setVerifierName(null);
      }
    } catch {
      setError('Failed to load appointment');
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    if (appointmentId) fetchAppointmentData();
  }, [appointmentId, fetchAppointmentData]);

  // BUG FIX: Status update now uses the PATCH API route, which correctly
  // handles cancellation_reason, cancelled_at, and actual_end fields that
  // the DB constraints require. The old code sent a bare Supabase update
  // that skipped these fields, causing DB errors for 'cancelled' status.
  const performStatusUpdate = async () => {
    const trimmedReason = cancellationReason.trim();
    setUpdating(true);
    try {
      // Get the current admin user to pass as cancelled_by
      const { data: { user } } = await supabase.auth.getUser();

      const res = await fetch(`/api/client-admin/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_status: selectedStatus,
          cancellation_reason: selectedStatus === 'cancelled' ? trimmedReason : '',
          // FIX: Send the logged-in admin's user id as cancelled_by
          cancelled_by: user?.id ?? null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast(body.error || 'Failed to update status', 'error');
        return;
      }

      // Re-open slot / outreach program when appointment is cancelled
      if (selectedStatus === 'cancelled') {
        const dateStr = toManilaDateString(appointment!.scheduled_start);
        const apptType = appointment!.appointment_type_detail ?? 'regular';
        if (apptType === 'outreach' && appointment!.outreach_program_id) {
          const { count } = await supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('outreach_program_id', appointment!.outreach_program_id)
            .neq('appointment_status', 'cancelled');
          await supabase
            .from('outreach_programs')
            .update({ current_bookings: count ?? 0, is_full: false, is_open: true })
            .eq('id', appointment!.outreach_program_id);
        }
        await checkAndUpdateSlotStatus(dateStr, apptType);
      }

      // Send notification to client for confirmed / cancelled
      if (client?.user_id && appointment!.appointment_number) {
        if (selectedStatus === 'confirmed') {
          sendAppointmentNotification({
            clientUserId: client.user_id,
            appointmentId,
            appointmentNumber: appointment!.appointment_number,
            type: 'confirmed',
          }).catch(console.error);
        } else if (selectedStatus === 'cancelled') {
          sendAppointmentNotification({
            clientUserId: client.user_id,
            appointmentId,
            appointmentNumber: appointment!.appointment_number,
            type: 'cancelled',
          }).catch(console.error);
        }
      }

      showToast('Appointment status updated');
      setCancellationReason('');
      await fetchAppointmentData();
    } catch {
      showToast('Failed to update appointment', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!appointment || selectedStatus === appointment.appointment_status) return;

    const trimmedReason = cancellationReason.trim();
    if (selectedStatus === 'cancelled' && !trimmedReason) {
      showToast('Please provide a cancellation reason before cancelling.', 'error');
      return;
    }

    if (['cancelled', 'no_show'].includes(selectedStatus)) {
      setConfirmModal({
        title: 'Update Appointment Status',
        message: `Change status to "${selectedStatus}"?`,
        confirmLabel: 'Yes, update',
        confirmVariant: selectedStatus === 'cancelled' ? 'danger' : 'primary',
        onConfirm: performStatusUpdate,
      });
      return;
    }

    await performStatusUpdate();
  };

  const handleCancel = async () => {
    setSelectedStatus('cancelled');
  };

  const handleQuickConfirm = async () => {
    if (!appointment || appointment.appointment_status === 'confirmed') return;
    setSelectedStatus('confirmed');
    // Directly call PATCH without waiting for dropdown save
    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch(`/api/client-admin/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_status: 'confirmed', cancelled_by: user?.id ?? null }),
      });
      if (!res.ok) { showToast('Failed to confirm appointment', 'error'); return; }
      if (client?.user_id && appointment.appointment_number) {
        sendAppointmentNotification({
          clientUserId: client.user_id,
          appointmentId,
          appointmentNumber: appointment.appointment_number,
          type: 'confirmed',
        }).catch(console.error);
      }
      showToast('Appointment confirmed — client notified');
      await fetchAppointmentData();
    } catch { showToast('Failed to confirm appointment', 'error'); }
    finally { setUpdating(false); }
  };

  const handleReschedule = async () => {
    if (!appointment || !rescheduleStart || !rescheduleEnd) {
      showToast('Please select both start and end times', 'error'); return;
    }
    const start = new Date(rescheduleStart);
    const end = new Date(rescheduleEnd);
    if (end <= start) { showToast('End time must be after start time', 'error'); return; }
    setRescheduling(true);
    try {
      const res = await fetch(`/api/client-admin/appointments/${appointmentId}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_scheduled_start: start.toISOString(), new_scheduled_end: end.toISOString() }),
      });
      const json = await res.json();
      if (!res.ok) { showToast(json.error || 'Failed to reschedule', 'error'); return; }
      // Update slot statuses for old and new dates (fire-and-forget)
      const oldDateStr = appointment.scheduled_start.slice(0, 10);
      const newDateStr = rescheduleStart.slice(0, 10);
      const apptType = (appointment as any).appointment_type_detail ?? 'regular';
      if (oldDateStr !== newDateStr) {
        checkAndUpdateSlotStatus(oldDateStr, apptType).catch(console.error);
      }
      checkAndUpdateSlotStatus(newDateStr, apptType).catch(console.error);
      // Notify client
      if (client?.user_id && appointment.appointment_number) {
        sendAppointmentNotification({
          clientUserId: client.user_id,
          appointmentId,
          appointmentNumber: appointment.appointment_number,
          type: 'rescheduled',
        }).catch(console.error);
      }
      showToast('Appointment rescheduled — client notified');
      setShowReschedule(false);
      await fetchAppointmentData();
    } catch { showToast('Failed to reschedule appointment', 'error'); }
    finally { setRescheduling(false); }
  };

  const handlePaymentAction = async (action: 'verify' | 'waive' | 'refund') => {
    if (!appointment) return;
    const label = action === 'verify' ? 'verify this payment' : action === 'waive' ? 'waive this payment' : 'mark this as refunded';
    setConfirmModal({
      title: 'Confirm Payment Action',
      message: `Are you sure you want to ${label}?`,
      confirmLabel: 'Yes, proceed',
      confirmVariant: action === 'refund' ? 'danger' : 'primary',
      onConfirm: async () => {
        setPaymentLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const res = await fetch(`/api/client-admin/appointments/${appointmentId}/payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, admin_user_id: user?.id }),
          });
          const json = await res.json();
          if (!res.ok) {
            showToast(json.error || 'Payment action failed', 'error');
            return;
          }
          showToast(
            action === 'verify' ? 'Payment verified — client notified' :
            action === 'waive'  ? 'Payment waived — client notified' :
            'Refund recorded — client notified'
          );
          await fetchAppointmentData();
        } catch {
          showToast('Failed to process payment action', 'error');
        } finally {
          setPaymentLoading(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <span>Loading appointment…</span>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-xl p-4 flex items-start gap-3 max-w-md mx-auto mt-16">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
          <div><strong>Error</strong><br />{error || 'Appointment not found'}</div>
        </div>
        <div className="text-center mt-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-accent transition-all duration-150"
          >
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const statusChanged = selectedStatus !== appointment.appointment_status;

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-destructive'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-7">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-150"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">Appointment Details</h1>
            <div className="flex items-center gap-2">
              {appointment.appointment_number && (
                <span className="inline-block px-2 py-0.5 bg-accent text-primary rounded text-xs font-semibold">
                  #{appointment.appointment_number}
                </span>
              )}
              <span className="text-xs text-muted-foreground font-mono">{appointment.id.slice(0, 8)}…</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAppointmentData}
            className="p-2 rounded-lg border border-transparent hover:bg-accent text-muted-foreground transition-all duration-150"
          >
            <RefreshCw size={14} />
          </button>
          <StatusIcon status={appointment.appointment_status} />
          <span className={statusClass(appointment.appointment_status)}>
            {appointment.appointment_status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Emergency banner */}
      {appointment.is_emergency && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm font-semibold mb-5">
          <AlertTriangle size={16} />
          🚨 Emergency Appointment — Priority handling required
        </div>
      )}

      <div className="flex flex-col gap-5">
        {/* Date & Time */}
        <div className="bg-card rounded-2xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            <h2 className="text-[17px] font-bold">Schedule</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground font-medium">Start Time</span>
              <span className="text-base font-bold">
                {formatDisplayDateTime(appointment.scheduled_start)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground font-medium">End Time</span>
              <span className="text-base font-bold">
                {formatDisplayDateTime(appointment.scheduled_end)}
              </span>
            </div>
          </div>
        </div>

        {/* Client & Pet */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Client */}
          <div className="bg-card rounded-2xl border border-border shadow-sm">
            <div className="px-6 py-4 border-b border-border flex items-center gap-2">
              <User size={18} className="text-primary" />
              <h2 className="text-[17px] font-bold">Client</h2>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {client ? (
                <>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-medium">Name</span>
                    <span className="text-sm font-medium">{client.first_name} {client.last_name}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-medium">Email</span>
                    <span className="text-sm font-medium">{client.users?.email || '—'}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-medium">Phone</span>
                    <span className="text-sm font-medium">{client.phone}</span>
                  </div>
                  <Link
                    href={`/client-admin/clients/${client.id}`}
                    className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-accent text-foreground transition-all duration-150 mt-1"
                  >
                    View Profile →
                  </Link>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">No client data available</span>
              )}
            </div>
          </div>

          {/* Pet */}
          <div className="bg-card rounded-2xl border border-border shadow-sm">
            <div className="px-6 py-4 border-b border-border flex items-center gap-2">
              <PawPrint size={18} className="text-primary" />
              <h2 className="text-[17px] font-bold">Pet</h2>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {pet ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Name', value: pet.name },
                      { label: 'Species', value: pet.species },
                      { label: 'Breed', value: pet.breed || '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground font-medium">{label}</span>
                        <span className="text-sm font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                  <Link
                    href={`/client-admin/pets/${appointment.pet_id}`}
                    className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-accent text-foreground transition-all duration-150 mt-1"
                  >
                    View Pet Profile →
                  </Link>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">No pet data available</span>
              )}
            </div>
          </div>
        </div>

        {/* Visit Details */}
        <div className="bg-card rounded-2xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            <h2 className="text-[17px] font-bold">Visit Details</h2>
          </div>
          <div className="p-6 flex flex-col gap-5">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground font-medium">Reason for Visit</span>
              <span className="text-[15px] font-medium">{appointment.reason_for_visit}</span>
            </div>
            {appointment.special_instructions && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-medium">Special Instructions</span>
                <span className="text-sm font-medium">{appointment.special_instructions}</span>
              </div>
            )}
            <hr className="border-t border-border" />
            <div className="grid grid-cols-2 gap-5">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-medium">Created</span>
                <span className="text-sm font-medium">{new Date(appointment.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-medium">Last Updated</span>
                <span className="text-sm font-medium">{new Date(appointment.updated_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment */}
        {(appointment.payment_amount != null || appointment.payment_method) && (
          <div className="bg-card rounded-2xl border border-border shadow-sm">
            <div className="px-6 py-4 border-b border-border flex items-center gap-2">
              <CreditCard size={18} className="text-primary" />
              <h2 className="text-[17px] font-bold">Payment</h2>
              {appointment.payment_status && (
                <span className={[
                  'ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  appointment.payment_status === 'paid'    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                  appointment.payment_status === 'waived'  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                  appointment.payment_status === 'refunded'? 'bg-muted text-muted-foreground' :
                  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
                ].join(' ')}>
                  {appointment.payment_status.replace('_', ' ')}
                </span>
              )}
            </div>
            <div className="p-6 flex flex-col gap-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground font-medium">Amount</span>
                  <span className="text-sm font-bold">
                    {appointment.payment_amount != null
                      ? appointment.payment_amount === 0 ? 'Free / ₱0' : `₱${appointment.payment_amount.toLocaleString()}`
                      : '—'}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground font-medium">Method</span>
                  <span className="text-sm font-medium capitalize">{appointment.payment_method ?? '—'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground font-medium">Reference</span>
                  <span className="text-sm font-mono font-medium">{appointment.payment_reference ?? '—'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground font-medium">Paid At</span>
                  <span className="text-sm font-medium">
                    {appointment.paid_at ? new Date(appointment.paid_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : '—'}
                  </span>
                </div>

                {appointment.payment_sender_name && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-medium">Sender Name</span>
                    <span className="text-sm font-medium">
                      {appointment.payment_sender_name}
                    </span>
                  </div>
                )}

                {verifierName && (
                  <div className="flex flex-col gap-0.5 col-span-2 sm:col-span-1">
                    <span className="text-xs text-muted-foreground font-medium">Verified By</span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">
                        {verifierName}
                      </span>
                      {appointment.payment_verified_at && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(appointment.payment_verified_at).toLocaleString('en-PH', {
                            timeZone: 'Asia/Manila',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Pending reference notice */}
              {appointment.payment_status !== 'paid' &&
               appointment.payment_status !== 'waived' &&
               appointment.payment_reference &&
               ['gcash', 'maya'].includes(appointment.payment_method ?? '') && (
                <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-sm">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  <span>Client submitted reference <strong>{appointment.payment_reference}</strong> — awaiting verification.</span>
                </div>
              )}

              {/* Action buttons */}
              {!['waived', 'refunded'].includes(appointment.payment_status ?? '') && (
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {appointment.payment_status !== 'paid' && (
                    <button
                      onClick={() => handlePaymentAction('verify')}
                      disabled={paymentLoading}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-55 disabled:cursor-not-allowed"
                    >
                      {paymentLoading
                        ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />Processing…</>
                        : <><ShieldCheck size={15} />Verify Payment</>}
                    </button>
                  )}
                  {appointment.payment_amount !== 0 && appointment.payment_status !== 'paid' && (
                    <button
                      onClick={() => handlePaymentAction('waive')}
                      disabled={paymentLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-accent text-foreground transition-all duration-150 disabled:opacity-55"
                    >
                      <BadgeDollarSign size={15} /> Waive Payment
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Management */}
        <div className="bg-card rounded-2xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-[17px] font-bold">Manage Status</h2>
          </div>
          <div className="p-6 flex flex-col gap-4">
            {/* Quick actions */}
            {!['cancelled', 'completed'].includes(appointment.appointment_status) && (
              <div className="flex flex-wrap gap-2 pb-2 border-b border-border">
                <span className="text-xs font-semibold text-muted-foreground self-center mr-1">Quick actions:</span>
                {appointment.appointment_status !== 'confirmed' && (
                  <button
                    onClick={handleQuickConfirm}
                    disabled={updating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 transition-all duration-150 disabled:opacity-55"
                  >
                    <CheckCircle size={14} /> Confirm Appointment
                  </button>
                )}
                <button
                  onClick={() => {
                    setRescheduleStart(appointment.scheduled_start.slice(0, 16));
                    setRescheduleEnd(appointment.scheduled_end.slice(0, 16));
                    setShowReschedule(true);
                  }}
                  disabled={updating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-accent text-foreground transition-all duration-150 disabled:opacity-55"
                >
                  <Clock size={14} /> Reschedule
                </button>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">Change Status</label>
              <select
                className="w-full max-w-[280px] px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                disabled={updating}
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
            </div>

            {selectedStatus === 'cancelled' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">
                  Cancellation Reason <span className="text-destructive">*</span>
                </label>
                <textarea
                  className="w-full max-w-[480px] px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-vertical"
                  placeholder="Required — describe why this appointment is being cancelled…"
                  value={cancellationReason}
                  onChange={e => setCancellationReason(e.target.value)}
                  disabled={updating}
                  rows={3}
                />
                {cancellationReason.trim() === '' && (
                  <span className="text-xs text-destructive">This field is required to cancel an appointment.</span>
                )}
              </div>
            )}

            <div className="flex gap-3 items-center">
              {statusChanged && (
                <button
                  onClick={handleStatusUpdate}
                  disabled={updating}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-150 disabled:opacity-55 disabled:cursor-not-allowed active:scale-95"
                >
                  {updating ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <><Save size={15} /> Save Status</>
                  )}
                </button>
              )}

              {!['cancelled', 'completed'].includes(appointment.appointment_status) && (
                <button
                  onClick={() => setSelectedStatus('cancelled')}
                  disabled={updating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-150 disabled:opacity-55"
                >
                  <XCircle size={14} /> Cancel Appointment
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {showReschedule && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => !rescheduling && setShowReschedule(false)} />
          <div className="relative z-10 bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold">Reschedule Appointment</h2>
              <button onClick={() => setShowReschedule(false)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-all duration-150">
                <XCircle size={16} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">Select the new date and time for this appointment. The client will be notified automatically.</p>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">New Start Time <span className="text-destructive">*</span></label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  value={rescheduleStart}
                  onChange={e => setRescheduleStart(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">New End Time <span className="text-destructive">*</span></label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  value={rescheduleEnd}
                  onChange={e => setRescheduleEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => setShowReschedule(false)}
                disabled={rescheduling}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-accent text-foreground transition-all duration-150 disabled:opacity-55"
              >
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                disabled={rescheduling || !rescheduleStart || !rescheduleEnd}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-55"
              >
                {rescheduling
                  ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />Rescheduling…</>
                  : <><Calendar size={14} />Confirm Reschedule</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmModal(null)} />
          <div className="relative z-10 bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-accent text-foreground transition-all duration-150"
              >
                Cancel
              </button>
              <button
                onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-95 ${
                  confirmModal.confirmVariant === 'danger'
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-primary hover:opacity-90 text-primary-foreground'
                }`}
              >
                {confirmModal.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}