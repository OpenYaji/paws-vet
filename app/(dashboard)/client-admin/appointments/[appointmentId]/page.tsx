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
    confirmed: 'badge badge-green',
    completed: 'badge badge-blue',
    pending: 'badge badge-yellow',
    cancelled: 'badge badge-red',
    no_show: 'badge badge-gray',
  };
  return m[s] ?? 'badge badge-gray';
}

function StatusIcon({ status }: { status: string }) {
  const props = { size: 18 };
  if (status === 'confirmed' || status === 'completed')
    return <CheckCircle {...props} style={{ color: status === 'confirmed' ? 'var(--green)' : 'var(--blue)' }} />;
  if (status === 'cancelled')
    return <XCircle {...props} style={{ color: 'var(--red)' }} />;
  if (status === 'pending')
    return <AlertCircle {...props} style={{ color: 'var(--yellow)' }} />;
  return <Clock {...props} style={{ color: 'var(--slate)' }} />;
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

    if (selectedStatus === 'cancelled' && !cancellationReason.trim()) {
      showToast('Please provide a cancellation reason', 'error');
      return;
    }

    // Double-confirm destructive actions
    if (['cancelled', 'no_show'].includes(selectedStatus)) {
      if (!confirm(`Change status to "${selectedStatus}"?`)) return;
    }

    setUpdating(true);
    try {
      const res = await fetch(`/api/client-admin/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_status: selectedStatus,
          cancellation_reason: selectedStatus === 'cancelled' ? cancellationReason : undefined,
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
      <div className="page">
        <div className="loading-state">
          <div className="spinner" />
          <span>Loading appointment…</span>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="page">
        <div className="alert alert-error" style={{ maxWidth: 480, margin: '60px auto' }}>
          <AlertTriangle size={18} />
          <div>
            <strong>Error</strong><br />
            {error || 'Appointment not found'}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="btn btn-outline" onClick={() => router.back()}>
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const statusChanged = selectedStatus !== appointment.appointment_status;

  return (
    <div className="page">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === 'success' ? '#059669' : '#dc2626',
          color: 'white', padding: '12px 20px',
          borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)',
          fontSize: 14, fontWeight: 600,
          animation: 'fadeUp 0.2s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-outline btn-sm btn-icon" onClick={() => router.back()}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="page-header" style={{ margin: 0, marginBottom: 4 }}>
              Appointment Details
            </h1>
            {appointment.appointment_number && (
              <span className="tag">#{appointment.appointment_number}</span>
            )}
            <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--slate)', fontFamily: 'var(--font-mono)' }}>
              {appointment.id.slice(0, 8)}…
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={fetchAppointmentData}>
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
        <div className="emergency-alert" style={{ marginBottom: 20 }}>
          <AlertTriangle size={18} />
          🚨 Emergency Appointment — Priority handling required
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Date & Time */}
        <div className="card animate-in">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} style={{ color: 'var(--teal)' }} /> Schedule
            </h2>
          </div>
          <div className="card-body">
            <div className="grid-2">
              <div className="info-row">
                <span className="info-label">Start Time</span>
                <span className="info-value" style={{ fontSize: 16, fontWeight: 700 }}>
                  {new Date(appointment.scheduled_start).toLocaleString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric',
                    year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">End Time</span>
                <span className="info-value" style={{ fontSize: 16, fontWeight: 700 }}>
                  {new Date(appointment.scheduled_end).toLocaleString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric',
                    year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Client & Pet side by side */}
        <div className="grid-2">
          {/* Client */}
          <div className="card animate-in animate-in-delay-1">
            <div className="card-header">
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={18} style={{ color: 'var(--teal)' }} /> Client
              </h2>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {client ? (
                <>
                  <div className="info-row">
                    <span className="info-label">Name</span>
                    <span className="info-value">{client.first_name} {client.last_name}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Email</span>
                    <span className="info-value">{client.users?.email || '—'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Phone</span>
                    <span className="info-value">{client.phone}</span>
                  </div>
                  <Link href={`/client-admin/clients/${client.id}`} className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                    View Profile →
                  </Link>
                </>
              ) : (
                <span style={{ color: 'var(--slate)', fontSize: 14 }}>No client data available</span>
              )}
            </div>
          </div>

          {/* Pet */}
          <div className="card animate-in animate-in-delay-2">
            <div className="card-header">
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PawPrint size={18} style={{ color: 'var(--teal)' }} /> Pet
              </h2>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {pet ? (
                <>
                  <div className="grid-3" style={{ gap: 12 }}>
                    <div className="info-row">
                      <span className="info-label">Name</span>
                      <span className="info-value">{pet.name}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Species</span>
                      <span className="info-value">{pet.species}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Breed</span>
                      <span className="info-value">{pet.breed || '—'}</span>
                    </div>
                  </div>
                  <Link href={`/client-admin/pets/${appointment.pet_id}`} className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                    View Pet Profile →
                  </Link>
                </>
              ) : (
                <span style={{ color: 'var(--slate)', fontSize: 14 }}>No pet data available</span>
              )}
            </div>
          </div>
        </div>

        {/* Visit Details */}
        <div className="card animate-in animate-in-delay-2">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} style={{ color: 'var(--teal)' }} /> Visit Details
            </h2>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="info-row">
              <span className="info-label">Reason for Visit</span>
              <span className="info-value" style={{ fontSize: 15 }}>{appointment.reason_for_visit}</span>
            </div>
            {appointment.special_instructions && (
              <div className="info-row">
                <span className="info-label">Special Instructions</span>
                <span className="info-value">{appointment.special_instructions}</span>
              </div>
            )}
            <hr className="divider" style={{ margin: 0 }} />
            <div className="grid-2">
              <div className="info-row">
                <span className="info-label">Created</span>
                <span className="info-value">{new Date(appointment.created_at).toLocaleString()}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Last Updated</span>
                <span className="info-value">{new Date(appointment.updated_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Management */}
        <div className="card animate-in animate-in-delay-3">
          <div className="card-header">
            <h2 className="card-title">Manage Status</h2>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Change Status</label>
              <select
                className="form-input"
                style={{ maxWidth: 280 }}
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

            {/* BUG FIX: Show cancellation reason input when status is 'cancelled'
                because the DB has a NOT NULL-ish constraint via the API route */}
            {selectedStatus === 'cancelled' && (
              <div className="form-group">
                <label className="form-label">Cancellation Reason *</label>
                <input
                  className="form-input"
                  placeholder="Required for cancellation…"
                  value={cancellationReason}
                  onChange={e => setCancellationReason(e.target.value)}
                  disabled={updating}
                  style={{ maxWidth: 400 }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {statusChanged && (
                <button
                  className="btn btn-primary"
                  onClick={handleStatusUpdate}
                  disabled={updating}
                >
                  {updating ? (
                    <>
                      <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save size={15} /> Save Status
                    </>
                  )}
                </button>
              )}

              {/* Quick cancel shortcut */}
              {!['cancelled', 'completed'].includes(appointment.appointment_status) && (
                <button
                  className="btn btn-outline btn-sm"
                  style={{ color: 'var(--red)', borderColor: '#fca5a5' }}
                  onClick={() => setSelectedStatus('cancelled')}
                  disabled={updating}
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
