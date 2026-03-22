'use client';

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/auth-client';
import useSWR from 'swr';
import Link from 'next/link';
import {
  Calendar, Clock, PawPrint, FileText, Download,
  Search, ChevronLeft, ChevronRight, AlertCircle,
  History, RefreshCw, ArrowLeft,
} from 'lucide-react';

interface Appointment {
  id: string;
  appointment_number: string;
  scheduled_start: string;
  scheduled_end: string;
  appointment_status: string;
  reason_for_visit: string;
  special_instructions?: string;
  cancellation_reason?: string;
  is_emergency: boolean;
  created_at: string;
  pets?: { name: string; species: string; breed: string } | {
    name: string;
    species: string;
    breed: string;
  }[] | null;
}

const fetchHistory = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('client_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) return [];

  const { data: petsData } = await supabase
    .from('pets')
    .select('id')
    .eq('owner_id', profile.id);

  const petIds = (petsData ?? []).map((p: any) => p.id);
  if (petIds.length === 0) return [];

  const { data } = await supabase
    .from('appointments')
    .select(`
      id, appointment_number, appointment_type_detail,
      scheduled_start, scheduled_end,
      appointment_status, reason_for_visit,
      cancellation_reason, payment_status,
      payment_amount,
      pets!appointments_pet_id_fkey (
        name, species, breed
      )
    `)
    .in('pet_id', petIds)
    .in('appointment_status', ['completed', 'cancelled', 'no_show'])
    .order('scheduled_start', { ascending: false });

  return data ?? [];
};

export default function AppointmentHistoryPage() {
  const { data: history, isLoading, mutate, error: swrError } = useSWR(
    'client-history',
    fetchHistory,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  );

  const appointments = (history ?? []) as Appointment[];
  const loading = isLoading;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const error = swrError?.message ?? null;

  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((apt: any) =>
        apt.appointment_number?.toLowerCase().includes(q) ||
        apt.reason_for_visit?.toLowerCase().includes(q) ||
        (Array.isArray(apt.pets)
          ? apt.pets[0]?.name?.toLowerCase().includes(q)
          : apt.pets?.name?.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(
        (apt: any) => apt.appointment_status === statusFilter
      );
    }

    return filtered;
  }, [searchTerm, statusFilter, appointments]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Pet', 'Reason', 'Status', 'Appointment #'];
    const rows = filteredAppointments.map(apt => [
      new Date(apt.scheduled_start).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }),
      new Date(apt.scheduled_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' }),
      (apt.pets ? (Array.isArray(apt.pets) ? apt.pets[0]?.name : apt.pets.name) : null) || 'Unknown',
      apt.reason_for_visit,
      apt.appointment_status,
      apt.appointment_number,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointment-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-muted-foreground font-medium">Loading appointment history…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="max-w-md mx-auto mt-16 flex items-start gap-3 bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-2xl">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div><strong>Error</strong><br />{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pt-2">
        <div>
          <Link
            href="/client/appointments"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 group"
          >
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Appointments
          </Link>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
              <History size={20} className="text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold">Appointment History</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-[52px]">Your completed, cancelled and no-show visits</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => mutate()}
            className="p-2 rounded-lg border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-150"
            aria-label="Refresh history"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {filteredAppointments.length > 0 && (
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-accent text-sm font-semibold transition-all duration-150 active:scale-95"
            >
              <Download size={14} /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-border shadow-sm border-l-4 border-l-primary p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-150">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-1">Total</p>
          <p className="text-4xl font-bold text-primary">{appointments.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Past appointments</p>
        </div>
        <div className="bg-card rounded-2xl border border-border shadow-sm border-l-4 border-l-blue-500 p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-150">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-1">Completed</p>
          <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{appointments.filter(a => a.appointment_status === 'completed').length}</p>
          <p className="text-xs text-muted-foreground mt-1">Successfully done</p>
        </div>
        <div className="bg-card rounded-2xl border border-border shadow-sm border-l-4 border-l-red-500 p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-150">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-1">Cancelled</p>
          <p className="text-4xl font-bold text-red-600 dark:text-red-400">{appointments.filter(a => a.appointment_status === 'cancelled').length}</p>
          <p className="text-xs text-muted-foreground mt-1">Cancelled visits</p>
        </div>
        <div className="bg-card rounded-2xl border border-border shadow-sm border-l-4 border-l-muted p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-150">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-1">No Show</p>
          <p className="text-4xl font-bold text-muted-foreground">{appointments.filter(a => a.appointment_status === 'no_show').length}</p>
          <p className="text-xs text-muted-foreground mt-1">Missed visits</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-accent/30 rounded-xl p-4 border border-border">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs font-bold tracking-widest uppercase text-muted-foreground block mb-1.5">Search</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150"
                placeholder="Pet name, reason, or #…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="min-w-[180px]">
            <label className="text-xs font-bold tracking-widest uppercase text-muted-foreground block mb-1.5">Status</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150 cursor-pointer"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
          {(searchTerm || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
              className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent text-sm font-semibold transition-all duration-150 active:scale-95 self-end"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
            <History size={28} className="text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">No appointments found</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filters to find appointments'
              : 'No past appointments yet. Completed or cancelled appointments will appear here.'}
          </p>
        </div>
      ) : (
        <>
          {/* Appointments Grid */}
          <div className="space-y-3">
            {paginatedAppointments.map((apt) => {
              const statusConfig: Record<string, { cardCls: string; badgeCls: string; label: string }> = {
                completed: { cardCls: 'border-l-blue-500 bg-blue-50/40 dark:bg-blue-900/10', badgeCls: 'bg-blue-700 text-white dark:bg-blue-500 dark:text-white', label: 'Completed' },
                confirmed: { cardCls: 'border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-900/10', badgeCls: 'bg-emerald-700 text-white dark:bg-emerald-500 dark:text-white', label: 'Confirmed' },
                pending: { cardCls: 'border-l-yellow-500 bg-yellow-50/40 dark:bg-yellow-900/10', badgeCls: 'bg-amber-700 text-white dark:bg-amber-500 dark:text-white', label: 'Pending' },
                cancelled: { cardCls: 'border-l-red-500 bg-red-50/40 dark:bg-red-900/10', badgeCls: 'bg-red-700 text-white dark:bg-red-500 dark:text-white', label: 'Cancelled' },
                no_show: { cardCls: 'border-l-border bg-muted/30', badgeCls: 'bg-slate-700 text-white dark:bg-slate-500 dark:text-white', label: 'No Show' },
              };
              const cfg = statusConfig[apt.appointment_status] || statusConfig.pending;
              const isOutreach = apt.reason_for_visit?.startsWith('Outreach');
              const typeBadgeCls = isOutreach
                ? 'bg-violet-700 text-white dark:bg-violet-500 dark:text-white'
                : 'bg-blue-700 text-white dark:bg-blue-500 dark:text-white';
              const typeLabel = isOutreach ? 'Outreach' : 'Regular';
              const pet = apt.pets ? (Array.isArray(apt.pets) ? apt.pets[0] : apt.pets) : null;

              return (
                <div
                  key={apt.id}
                  className={`rounded-2xl border border-border border-l-4 ${cfg.cardCls} p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-150`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-start">
                    {/* Left Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-background/70 border border-border flex items-center justify-center flex-shrink-0">
                          <Calendar size={18} className="text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {new Date(apt.scheduled_start).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' })}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock size={11} />
                            {new Date(apt.scheduled_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })}
                            {' – '}
                            {new Date(apt.scheduled_end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })}
                          </p>
                        </div>
                      </div>

                      <p className="font-bold text-foreground">{apt.reason_for_visit}</p>

                      {apt.appointment_status === 'cancelled' && apt.cancellation_reason && (
                        <p className="text-xs text-destructive/70 italic">Reason: {apt.cancellation_reason}</p>
                      )}

                      {pet && (
                        <div className="inline-flex items-center gap-2 bg-background/70 border border-border rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground">
                          <PawPrint size={12} className="text-primary" />
                          <span className="font-bold text-sm text-foreground">
                            {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
                            {' '}{pet.name}
                          </span>
                          {pet.breed && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span>{pet.breed}</span>
                            </>
                          )}
                        </div>
                      )}

                      {apt.special_instructions && (
                        <div className="flex items-start gap-2 bg-background/80 border-l-2 border-yellow-400 rounded-r-lg px-3 py-2 text-xs text-muted-foreground">
                          <FileText size={13} className="flex-shrink-0 mt-0.5" />
                          <span>{apt.special_instructions}</span>
                        </div>
                      )}
                    </div>

                    {/* Right Section */}
                    <div className="flex flex-row sm:flex-col items-start sm:items-end gap-3">
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${typeBadgeCls}`}>
                          {typeLabel}
                        </span>
                        <span className={`rounded-full px-3 py-0.5 text-xs font-semibold capitalize ${cfg.badgeCls}`}>
                          {cfg.label}
                        </span>
                        {apt.is_emergency && (
                          <span className="rounded-full px-3 py-0.5 text-xs font-semibold bg-red-100 text-red-700">
                            🚨 Emergency
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-0.5">Appt #</p>
                        <p className="text-sm font-bold font-mono text-foreground">{apt.appointment_number}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-border">
              <span className="text-sm text-muted-foreground font-medium">
                Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredAppointments.length)} of {filteredAppointments.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}