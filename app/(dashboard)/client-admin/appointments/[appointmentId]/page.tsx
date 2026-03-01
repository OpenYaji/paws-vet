'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/auth-client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Calendar, Clock, User, PawPrint,
  FileText, CheckCircle, XCircle, AlertCircle,
  Save, AlertTriangle, RefreshCw,
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

function statusClass(s: string) {
  const m: Record<string, string> = {
    confirmed: 'rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700',
    completed: 'rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700',
    pending: 'rounded-full px-2.5 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800',
    cancelled: 'rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-700',
    no_show: 'rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground',
  };
  return m[s] ?? 'rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground';
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
  const [error, setError] = useState<string | null>(null);

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
  const handleStatusUpdate = async () => {
  if (!appointment || selectedStatus === appointment.appointment_status) return;

  const trimmedReason = cancellationReason.trim();
  if (selectedStatus === 'cancelled' && !trimmedReason) {
    showToast('Please provide a cancellation reason before cancelling.', 'error');
    return;
  }

  if (['cancelled', 'no_show'].includes(selectedStatus)) {
    if (!confirm(`Change status to "${selectedStatus}"?`)) return;
  }

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

    showToast('Appointment status updated');
    setCancellationReason('');
    await fetchAppointmentData();
  } catch {
    showToast('Failed to update appointment', 'error');
  } finally {
    setUpdating(false);
  }
};

  const handleCancel = async () => {
    setSelectedStatus('cancelled');
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
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold mb-5">
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
                {new Date(appointment.scheduled_start).toLocaleString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric',
                  year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground font-medium">End Time</span>
              <span className="text-base font-bold">
                {new Date(appointment.scheduled_end).toLocaleString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric',
                  year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
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
                <span className="text-sm font-medium">{new Date(appointment.created_at).toLocaleString()}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-medium">Last Updated</span>
                <span className="text-sm font-medium">{new Date(appointment.updated_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Management */}
        <div className="bg-card rounded-2xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-[17px] font-bold">Manage Status</h2>
          </div>
          <div className="p-6 flex flex-col gap-4">
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-all duration-150 disabled:opacity-55"
                >
                  <XCircle size={14} /> Cancel Appointment
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
