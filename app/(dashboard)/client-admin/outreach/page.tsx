'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/auth-client';
import Link from 'next/link';
import {
  ArrowLeft, Calendar, Users, Plus, RefreshCw,
  CheckCircle, XCircle, Eye, Download, AlertTriangle,
  MoreVertical, Loader2, ToggleLeft, ToggleRight,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OutreachProgram {
  id: string;
  title: string;
  description?: string | null;
  program_date: string;
  registration_start?: string | null;
  registration_end?: string | null;
  max_capacity: number;
  current_bookings: number;
  is_open: boolean;
  is_full: boolean;
  created_by?: string | null;
  created_at: string;
}

interface Registration {
  id: string;
  appointment_number?: string | null;
  appointment_status: string;
  is_aspin_puspin: boolean;
  payment_status?: string | null;
  payment_amount?: number | null;
  pets?: {
    name: string;
    breed?: string | null;
    gender?: string | null;
    client_profiles?: {
      first_name: string;
      last_name: string;
      phone?: string | null;
    } | null;
  } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function programStatusBadge(p: OutreachProgram) {
  if (p.is_full)
    return (
      <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
        Full
      </span>
    );
  if (p.is_open)
    return (
      <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
        Open
      </span>
    );
  return (
    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">
      Closed
    </span>
  );
}

function payBadge(status?: string | null) {
  const base = 'rounded-full px-2 py-0.5 text-xs font-semibold';
  if (status === 'paid') return <span className={`${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300`}>Paid</span>;
  if (status === 'waived') return <span className={`${base} bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300`}>Waived</span>;
  return <span className={`${base} bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300`}>{status ?? 'Unpaid'}</span>;
}

function apptBadge(status: string) {
  const base = 'rounded-full px-2 py-0.5 text-xs font-semibold';
  if (status === 'confirmed' || status === 'completed') return <span className={`${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300`}>{status}</span>;
  if (status === 'pending') return <span className={`${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300`}>pending</span>;
  if (status === 'cancelled') return <span className={`${base} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300`}>cancelled</span>;
  return <span className={`${base} bg-muted text-muted-foreground`}>{status}</span>;
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDatetime(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function exportRegistrationsCSV(regs: Registration[], programTitle: string) {
  const headers = ['Appointment #', 'Client Name', 'Pet Name', 'Breed', 'Gender', 'Aspin/Puspin', 'Payment Status', 'Payment Amount', 'Appointment Status'];
  const rows = regs.map(r => [
    r.appointment_number ?? '',
    r.pets?.client_profiles ? `${r.pets.client_profiles.first_name} ${r.pets.client_profiles.last_name}` : '',
    r.pets?.name ?? '',
    r.pets?.breed ?? '',
    r.pets?.gender ?? '',
    r.is_aspin_puspin ? 'Yes' : 'No',
    r.payment_status ?? '',
    r.payment_amount != null ? String(r.payment_amount) : '',
    r.appointment_status,
  ]);
  const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `outreach-${programTitle.replace(/\s+/g, '-').toLowerCase()}-registrations.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OutreachManagementPage() {
  const [programs, setPrograms] = useState<OutreachProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: 'danger' | 'primary';
    onConfirm: () => void;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    program_date: '',
    registration_start: '',
    registration_end: '',
    max_capacity: 16,
    is_open: false,
  });

  // Registrations modal
  const [viewProgram, setViewProgram] = useState<OutreachProgram | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [regsLoading, setRegsLoading] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('outreach_programs')
      .select('*')
      .order('program_date', { ascending: false });
    if (!error && data) setPrograms(data as OutreachProgram[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  const fetchRegistrations = async (programId: string) => {
    setRegsLoading(true);
    const { data } = await supabase
      .from('appointments')
      .select(`
        id, appointment_number, appointment_status,
        is_aspin_puspin, payment_status, payment_amount,
        pets!appointments_pet_id_fkey (
          name, breed, gender,
          client_profiles!pets_owner_id_fkey (
            first_name, last_name, phone
          )
        )
      `)
      .eq('outreach_program_id', programId)
      .order('created_at', { ascending: false });
    setRegistrations((data ?? []) as unknown as Registration[]);
    setRegsLoading(false);
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const performToggle = async (program: OutreachProgram, openValue: boolean) => {
    setActionLoading(program.id);
    const { error } = await supabase
      .from('outreach_programs')
      .update({ is_open: openValue })
      .eq('id', program.id);
    if (error) { showToast('Failed to update program status', 'error'); }
    else { showToast(openValue ? 'Program opened for bookings' : 'Program closed'); }
    setActionLoading(null);
    fetchPrograms();
  };

  const handleToggle = (program: OutreachProgram, openValue: boolean) => {
    if (program.is_full && openValue) { showToast('Cannot reopen a full program', 'error'); return; }
    if (!openValue) {
      setConfirmModal({
        title: 'Close Program',
        message: `Close "${program.title}"? Clients will no longer be able to book this program.`,
        confirmLabel: 'Close Program',
        confirmVariant: 'danger',
        onConfirm: () => performToggle(program, false),
      });
      return;
    }
    performToggle(program, openValue);
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.program_date) {
      showToast('Title and Program Date are required', 'error'); return;
    }
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('outreach_programs')
      .insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        program_date: form.program_date,
        registration_start: form.registration_start || null,
        registration_end: form.registration_end || null,
        max_capacity: form.max_capacity,
        current_bookings: 0,
        is_open: form.is_open,
        is_full: false,
        created_by: user?.id ?? null,
      });
    setCreating(false);
    if (error) { showToast(error.message || 'Failed to create program', 'error'); return; }
    showToast('Outreach program created');
    setShowCreate(false);
    setForm({ title: '', description: '', program_date: '', registration_start: '', registration_end: '', max_capacity: 16, is_open: false });
    fetchPrograms();
  };

  const handleViewRegistrations = async (program: OutreachProgram) => {
    setViewProgram(program);
    await fetchRegistrations(program.id);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-destructive'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-7 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/client-admin" className="p-2 rounded-lg border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-150">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Outreach Programs</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage PAWS outreach events and registrations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchPrograms} className="p-2 rounded-lg border border-border bg-card hover:bg-accent text-muted-foreground transition-all duration-150">
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all duration-150"
          >
            <Plus size={15} /> New Program
          </button>
        </div>
      </div>

      {/* Programs table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 size={28} className="animate-spin" />
            <span className="text-sm">Loading programs…</span>
          </div>
        ) : programs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar size={26} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">No outreach programs yet</h3>
              <p className="text-sm text-muted-foreground">Create a program to start accepting bookings</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all duration-150"
            >
              <Plus size={15} /> Create Program
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {['Program', 'Date', 'Status', 'Registrations', 'Registration Window', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {programs.map(p => (
                  <tr key={p.id} className="hover:bg-primary/5 transition-colors duration-150">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-foreground">{p.title}</div>
                      {p.description && <div className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">{p.description}</div>}
                    </td>
                    <td className="px-5 py-4 text-sm text-foreground whitespace-nowrap">{fmtDate(p.program_date)}</td>
                    <td className="px-5 py-4">{programStatusBadge(p)}</td>
                    <td className="px-5 py-4">
                      <div className="text-sm font-semibold text-foreground">{p.current_bookings} / {p.max_capacity}</div>
                      <div className="mt-1 w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(100, (p.current_bookings / p.max_capacity) * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      <div>Start: {fmtDatetime(p.registration_start)}</div>
                      <div>End: {fmtDatetime(p.registration_end)}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 justify-end">
                        {/* View Registrations */}
                        <button
                          onClick={() => handleViewRegistrations(p)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-accent text-foreground transition-all duration-150"
                        >
                          <Eye size={12} /> Registrations
                        </button>

                        {/* Open/Close toggle */}
                        {!p.is_full && (
                          <button
                            onClick={() => handleToggle(p, !p.is_open)}
                            disabled={actionLoading === p.id}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 disabled:opacity-55 ${
                              p.is_open
                                ? 'border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                : 'border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                            }`}
                          >
                            {actionLoading === p.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : p.is_open ? (
                              <><ToggleRight size={12} /> Close</>
                            ) : (
                              <><ToggleLeft size={12} /> Open</>
                            )}
                          </button>
                        )}

                        {p.is_full && (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                            Full
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Program Modal ─────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => !creating && setShowCreate(false)} />
          <div className="relative z-10 bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold">New Outreach Program</h2>
              <button onClick={() => !creating && setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-all duration-150">
                <XCircle size={16} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Title <span className="text-destructive">*</span></label>
                <input
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  placeholder="e.g. Barangay Outreach — Pasay City"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Description</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-vertical"
                  placeholder="Optional program description…"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              {/* Program Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Program Date <span className="text-destructive">*</span></label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  value={form.program_date}
                  onChange={e => setForm(f => ({ ...f, program_date: e.target.value }))}
                />
              </div>
              {/* Registration window */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold">Registration Start</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    value={form.registration_start}
                    onChange={e => setForm(f => ({ ...f, registration_start: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold">Registration End</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    value={form.registration_end}
                    onChange={e => setForm(f => ({ ...f, registration_end: e.target.value }))}
                  />
                </div>
              </div>
              {/* Max Capacity */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Max Capacity</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  value={form.max_capacity}
                  onChange={e => setForm(f => ({ ...f, max_capacity: Number(e.target.value) }))}
                />
              </div>
              {/* Is Open toggle */}
              <div className="flex items-center gap-3 py-2">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, is_open: !f.is_open }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${form.is_open ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${form.is_open ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm font-semibold">Open for booking immediately</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                disabled={creating}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-accent text-foreground transition-all duration-150 disabled:opacity-55"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-55"
              >
                {creating ? <><Loader2 size={14} className="animate-spin" />Creating…</> : <><CheckCircle size={14} />Create Program</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Registrations Modal ──────────────────────────────────────────── */}
      {viewProgram && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setViewProgram(null)} />
          <div className="relative z-10 bg-card rounded-2xl border border-border shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-4 flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold">{viewProgram.title}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {fmtDate(viewProgram.program_date)} &middot; {viewProgram.current_bookings}/{viewProgram.max_capacity} registered
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportRegistrationsCSV(registrations, viewProgram.title)}
                  disabled={regsLoading || registrations.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-accent text-foreground transition-all duration-150 disabled:opacity-55"
                >
                  <Download size={13} /> Export CSV
                </button>
                <button
                  onClick={() => setViewProgram(null)}
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-all duration-150"
                >
                  <XCircle size={16} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1">
              {regsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <Loader2 size={24} className="animate-spin" />
                  <span className="text-sm">Loading registrations…</span>
                </div>
              ) : registrations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
                  <AlertTriangle size={28} className="text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">No registrations yet</h3>
                    <p className="text-sm text-muted-foreground">Bookings for this program will appear here</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b border-border sticky top-0">
                      <tr>
                        {['Appt #', 'Client', 'Pet', 'Breed', 'Gender', 'Aspin/Puspin', 'Payment', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {registrations.map(r => (
                        <tr key={r.id} className="hover:bg-primary/5 transition-colors duration-150">
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                            {r.appointment_number ?? r.id.slice(0, 8)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-foreground">
                            {r.pets?.client_profiles
                              ? `${r.pets.client_profiles.first_name} ${r.pets.client_profiles.last_name}`
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-foreground">{r.pets?.name ?? '—'}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{r.pets?.breed ?? '—'}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{r.pets?.gender ?? '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.is_aspin_puspin ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                              {r.is_aspin_puspin ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-4 py-3">{payBadge(r.payment_status)}</td>
                          <td className="px-4 py-3">{apptBadge(r.appointment_status)}</td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/client-admin/appointments/${r.id}`}
                              className="text-xs font-semibold text-primary hover:underline transition-colors"
                            >
                              View →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
