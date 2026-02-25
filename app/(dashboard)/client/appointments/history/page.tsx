'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/auth-client';
import Link from 'next/link';
import {
  Calendar, Clock, PawPrint, FileText, Download,
  Search, ChevronLeft, ChevronRight, AlertCircle,
  History,
} from 'lucide-react';

interface Appointment {
  id: string;
  appointment_number: string;
  scheduled_start: string;
  scheduled_end: string;
  appointment_status: string;
  reason_for_visit: string;
  special_instructions?: string;
  is_emergency: boolean;
  created_at: string;
  pets?: {
    name: string;
    species: string;
    breed: string;
  }[] | null;
}

export default function AppointmentHistoryPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 10;

  const fetchAppointmentHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please sign in to view your appointment history');
        return;
      }

      const { data: profile } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        setError('Client profile not found');
        return;
      }

      const { data: pets } = await supabase
        .from('pets')
        .select('id')
        .eq('owner_id', profile.id);

      if (!pets || pets.length === 0) {
        setAppointments([]);
        setFilteredAppointments([]);
        return;
      }

      const petIds = pets.map(p => p.id);

      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_number,
          scheduled_start,
          scheduled_end,
          appointment_status,
          reason_for_visit,
          special_instructions,
          is_emergency,
          created_at,
          pets!appointments_pet_id_fkey (
            name,
            species,
            breed
          )
        `)
        .in('pet_id', petIds)
        .order('scheduled_start', { ascending: false });

      if (apptError) {
        setError(apptError.message);
        return;
      }

      setAppointments((appointments || []) as unknown as Appointment[]);
      setFilteredAppointments((appointments || []) as unknown as Appointment[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load appointment history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointmentHistory();
  }, [fetchAppointmentHistory]);

  useEffect(() => {
    let filtered = [...appointments];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(apt =>
        apt.reason_for_visit.toLowerCase().includes(q) ||
        apt.pets?.[0]?.name.toLowerCase().includes(q) ||
        apt.appointment_number.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(apt => apt.appointment_status === statusFilter);
    }

    setFilteredAppointments(filtered);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, appointments]);

  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Pet', 'Reason', 'Status', 'Appointment #'];
    const rows = filteredAppointments.map(apt => [
      new Date(apt.scheduled_start).toLocaleDateString(),
      new Date(apt.scheduled_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      apt.pets?.[0]?.name || 'Unknown',
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
      <div className="page">
        <div className="loading-state">
          <div className="spinner" />
          <span>Loading appointment history…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="alert alert-error" style={{ maxWidth: 500, margin: '60px auto' }}>
          <AlertCircle size={18} />
          <div><strong>Error</strong><br />{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
            <div style={{ 
              width: 48, 
              height: 48, 
              borderRadius: 12, 
              background: 'linear-gradient(135deg, #0d9488 0%, #06b6d4 100%)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <History size={24} color="white" />
            </div>
            Appointment History
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>Track and review all your pet's appointments</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20, textAlign: 'center', background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)', borderLeft: '4px solid #0d9488' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#0d9488' }}>{appointments.length}</div>
          <div style={{ fontSize: 12, color: '#0f766e', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Appointments</div>
        </div>
        <div className="card" style={{ padding: 20, textAlign: 'center', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#3b82f6' }}>{appointments.filter(a => a.appointment_status === 'completed').length}</div>
          <div style={{ fontSize: 12, color: '#1e40af', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completed</div>
        </div>
        <div className="card" style={{ padding: 20, textAlign: 'center', background: 'linear-gradient(135deg, #f5f9ff 0%, #e0f2fe 100%)', borderLeft: '4px solid #0d9488' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#0d9488' }}>{appointments.filter(a => a.appointment_status === 'confirmed').length}</div>
          <div style={{ fontSize: 12, color: '#0f766e', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confirmed</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 24, padding: 16, background: '#f8fafc' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Search</label>
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              />
              <input
                className="form-input"
                style={{ paddingLeft: 36 }}
                placeholder="Pet name, reason, or #…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</label>
            <select
              className="form-input"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {(searchTerm || statusFilter !== 'all') && (
              <button 
                className="btn btn-outline btn-sm" 
                onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
              >
                Clear Filters
              </button>
            )}
            {filteredAppointments.length > 0 && (
              <button className="btn btn-outline btn-sm" onClick={exportToCSV} style={{ gap: 6 }}>
                <Download size={14} /> Export
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: 16,
            background: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <History size={32} style={{ color: '#cbd5e1' }} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>No appointments found</h3>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filters to find appointments'
              : 'You have no appointment history yet. Your appointments will appear here once scheduled.'}
          </p>
        </div>
      ) : (
        <>
          {/* Appointments Grid */}
          <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
            {paginatedAppointments.map((apt, idx) => {
              const statusColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
                completed: { bg: '#f0f9ff', border: '#3b82f6', text: '#0c4a6e', badge: 'bg-blue-100 text-blue-700' },
                confirmed: { bg: '#f0fdf4', border: '#22c55e', text: '#14532d', badge: 'bg-green-100 text-green-700' },
                pending: { bg: '#fefce8', border: '#eab308', text: '#542e0c', badge: 'bg-yellow-100 text-yellow-700' },
                cancelled: { bg: '#fef2f2', border: '#ef4444', text: '#7c2d12', badge: 'bg-red-100 text-red-700' },
                no_show: { bg: '#f3f4f6', border: '#6b7280', text: '#1f2937', badge: 'bg-gray-100 text-gray-700' },
              };
              const colors = statusColors[apt.appointment_status] || statusColors.pending;

              return (
                <div
                  key={apt.id}
                  style={{
                    background: colors.bg,
                    borderLeft: `4px solid ${colors.border}`,
                    borderRadius: 12,
                    padding: 20,
                    transition: 'all 0.2s ease',
                  }}
                  className="appointment-card"
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
                    {/* Left Section - Main Info */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: colors.border + '20',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: colors.border,
                        }}>
                          <Calendar size={20} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>
                            {new Date(apt.scheduled_start).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                          <div style={{ fontSize: 13, color: colors.text, opacity: 0.8, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Clock size={12} />
                            {new Date(apt.scheduled_start).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {` - ${new Date(apt.scheduled_end).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}`}
                          </div>
                        </div>
                      </div>

                      {/* Reason */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                          {apt.reason_for_visit}
                        </div>
                      </div>

                      {/* Pet Info */}
                      {apt.pets?.[0] && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 13,
                          color: '#64748b',
                          background: 'rgba(255,255,255,0.6)',
                          padding: '8px 12px',
                          borderRadius: 8,
                          width: 'fit-content',
                          marginBottom: 10,
                        }}>
                          <PawPrint size={14} style={{ color: '#0d9488' }} />
                          <span style={{ fontWeight: 600 }}>{apt.pets[0].name}</span>
                          <span style={{ color: '#94a3b8' }}>•</span>
                          <span>{apt.pets[0].species}</span>
                          {apt.pets[0].breed && (
                            <>
                              <span style={{ color: '#94a3b8' }}>•</span>
                              <span>{apt.pets[0].breed}</span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Special Instructions */}
                      {apt.special_instructions && (
                        <div style={{
                          fontSize: 13,
                          color: '#64748b',
                          background: 'rgba(255,255,255,0.8)',
                          padding: '10px 12px',
                          borderRadius: 8,
                          borderLeft: '2px solid #f59e0b',
                          display: 'flex',
                          gap: 8,
                        }}>
                          <FileText size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                          <span>{apt.special_instructions}</span>
                        </div>
                      )}
                    </div>

                    {/* Right Section - Status & Number */}
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <span className={`badge ${colors.badge}`} style={{
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            textTransform: 'capitalize',
                          }}>
                            {apt.appointment_status === 'no_show' ? 'No Show' : apt.appointment_status}
                          </span>
                          {apt.is_emergency && (
                            <span className="badge bg-red-100 text-red-700" style={{
                              padding: '6px 12px',
                              fontSize: 12,
                              fontWeight: 600,
                            }}>
                              🚨 Emergency
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Appointment #</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, fontFamily: 'monospace', letterSpacing: '1px' }}>
                          {apt.appointment_number}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 0',
              borderTop: '1px solid #e2e8f0',
            }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAppointments.length)} of {filteredAppointments.length}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        .appointment-card {
          box-shadow: none;
        }
        .badge {
          display: inline-block;
          border-radius: 6px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}