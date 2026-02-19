'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/auth-client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Edit, Archive, Mail, Phone, MapPin,
  Calendar, User, PawPrint, RefreshCw, AlertTriangle,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClientProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip_code: string;
  communication_preference: string;
  created_at: string;
  updated_at: string;
}

interface UserData {
  email: string;
  account_status: string;
  email_verified: boolean;
  last_login_at?: string;
  created_at: string;
  deleted_at?: string;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  date_of_birth?: string;
  gender?: string;
  weight?: number;
  is_active: boolean;
  created_at: string;
}

interface Appointment {
  id: string;
  scheduled_start: string;
  appointment_status: string;
  reason_for_visit: string;
  pet_id: string;
  pets?: { name: string; species: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcAge(d?: string): string {
  if (!d) return '—';
  const today = new Date(), b = new Date(d);
  const y = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (y === 0) return `${m}mo`;
  return m < 0 ? `${y - 1}y ${12 + m}mo` : `${y}y ${m}mo`;
}

function fmtDate(d?: string): string {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function statusBadge(s: string): string {
  const m: Record<string, string> = {
    active: 'badge badge-green',
    confirmed: 'badge badge-green',
    completed: 'badge badge-blue',
    pending: 'badge badge-yellow',
    cancelled: 'badge badge-red',
    inactive: 'badge badge-gray',
    suspended: 'badge badge-red',
    no_show: 'badge badge-gray',
  };
  return m[s] ?? 'badge badge-gray';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.id as string;

  const [client, setClient] = useState<ClientProfile | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'pets' | 'appointments'>('overview');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchClientDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: clientData, error: clientError } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError || !clientData) {
        setError('Client not found');
        return;
      }
      setClient(clientData);

      const { data: user } = await supabase
        .from('users')
        .select('email, account_status, email_verified, last_login_at, created_at, deleted_at')
        .eq('id', clientData.user_id)
        .single();
      if (user) setUserData(user);

      // Use admin API routes to bypass RLS
      const [petsRes, apptRes] = await Promise.all([
        fetch(`/api/client-admin/pets?owner_id=${clientId}`),
        fetch(`/api/client-admin/appointments?owner_id=${clientId}`),
      ]);

      if (petsRes.ok) setPets(await petsRes.json());
      if (apptRes.ok) setAppointments(await apptRes.json());

    } catch {
      setError('Failed to load client details');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (clientId) fetchClientDetails();
  }, [clientId, fetchClientDetails]);

  const handleArchiveClient = async () => {
    if (!client || !confirm(`Archive ${client.first_name} ${client.last_name}? They will lose access.`)) return;
    try {
      const { data: { user: cu } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('users')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: cu?.id,
          account_status: 'inactive',
        })
        .eq('id', client.user_id);
      if (error) { showToast('Failed to archive client', 'error'); return; }
      showToast('Client archived successfully');
      router.push('/client-admin');
    } catch {
      showToast('Failed to archive client', 'error');
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading-state"><div className="spinner" /><span>Loading client…</span></div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="page">
        <div className="alert alert-error" style={{ maxWidth: 480, margin: '60px auto' }}>
          <AlertTriangle size={18} />
          <div><strong>Error</strong><br />{error || 'Client not found'}</div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="btn btn-outline" onClick={() => router.back()}>
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </div>
    );
  }

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
            <h1 style={{ fontSize: 26, fontWeight: 750, margin: 0, letterSpacing: '-0.5px' }}>
              {client.first_name} {client.last_name}
            </h1>
            <span style={{ fontSize: 12, color: 'var(--slate)', fontFamily: 'var(--font-mono)' }}>
              {client.id}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={fetchClientDetails}>
            <RefreshCw size={14} /> Refresh
          </button>
          <Link href={`/client-admin/clients/${client.id}/edit`} className="btn btn-outline btn-sm">
            <Edit size={14} /> Edit
          </Link>
          {!userData?.deleted_at && (
            <button className="btn btn-danger btn-sm" onClick={handleArchiveClient}>
              <Archive size={14} /> Archive
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {([
          { key: 'overview', label: 'Overview', icon: <User size={15} />, count: null },
          { key: 'pets', label: 'Pets', icon: <PawPrint size={15} />, count: pets.length },
          { key: 'appointments', label: 'Appointments', icon: <Calendar size={15} />, count: appointments.length },
        ] as const).map(tab => (
          <button
            key={tab.key}
            className={`tab-item ${activeTab === tab.key ? 'tab-item--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== null && (
              <span className="tab-count">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div className="grid-2 animate-in">
          {/* Account Info */}
          <div className="card">
            <div className="card-header"><h2 className="card-title">Account Information</h2></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Mail size={18} style={{ color: 'var(--slate-light)', marginTop: 2, flexShrink: 0 }} />
                <div className="info-row">
                  <span className="info-label">Email</span>
                  <span className="info-value">{userData?.email || '—'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Phone size={18} style={{ color: 'var(--slate-light)', marginTop: 2, flexShrink: 0 }} />
                <div className="info-row">
                  <span className="info-label">Phone</span>
                  <span className="info-value">{client.phone}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <MapPin size={18} style={{ color: 'var(--slate-light)', marginTop: 2, flexShrink: 0 }} />
                <div className="info-row">
                  <span className="info-label">Address</span>
                  <span className="info-value">
                    {client.address_line1}
                    {client.address_line2 && `, ${client.address_line2}`}
                  </span>
                  <span className="info-value" style={{ color: 'var(--slate)' }}>
                    {client.city}, {client.state} {client.zip_code}
                  </span>
                </div>
              </div>
              <hr className="divider" style={{ margin: 0 }} />
              <div className="grid-2" style={{ gap: 16 }}>
                <div className="info-row">
                  <span className="info-label">Account Status</span>
                  <span className={statusBadge(userData?.account_status || 'unknown')} style={{ marginTop: 4 }}>
                    {userData?.account_status || '—'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Email Verified</span>
                  <span className="info-value" style={{ marginTop: 4 }}>
                    {userData?.email_verified ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
              </div>
              <div className="grid-2" style={{ gap: 16 }}>
                <div className="info-row">
                  <span className="info-label">Member Since</span>
                  <span className="info-value">{fmtDate(userData?.created_at)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Last Login</span>
                  <span className="info-value">{fmtDate(userData?.last_login_at)}</span>
                </div>
              </div>
              <div className="info-row">
                <span className="info-label">Communication Preference</span>
                <span className="info-value" style={{ textTransform: 'capitalize' }}>
                  {client.communication_preference}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="stat-card card">
              <div>
                <p className="stat-label">Total Pets</p>
                <p className="stat-value">{pets.length}</p>
                <p className="stat-sub">{pets.filter(p => p.is_active).length} active</p>
              </div>
              <div className="stat-icon" style={{ background: 'var(--green-pale)' }}>
                <PawPrint size={24} style={{ color: 'var(--green)' }} />
              </div>
            </div>
            <div className="stat-card card">
              <div>
                <p className="stat-label">Total Appointments</p>
                <p className="stat-value">{appointments.length}</p>
                <p className="stat-sub">
                  {appointments.filter(a => a.appointment_status === 'confirmed').length} upcoming
                </p>
              </div>
              <div className="stat-icon" style={{ background: 'var(--blue-pale)' }}>
                <Calendar size={24} style={{ color: 'var(--blue)' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Pets ── */}
      {activeTab === 'pets' && (
        <div className="card animate-in">
          {pets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><PawPrint size={24} /></div>
              <h3>No pets registered</h3>
              <p>This client has no pets on file</p>
            </div>
          ) : (
            <div>
              {pets.map(pet => (
                <div key={pet.id} style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span style={{ fontSize: 16, fontWeight: 700 }}>{pet.name}</span>
                        <span className={pet.is_active ? 'badge badge-green' : 'badge badge-gray'}>
                          {pet.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="grid-4" style={{ gap: 12 }}>
                        <div className="info-row">
                          <span className="info-label">Species</span>
                          <span className="info-value">{pet.species}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">Breed</span>
                          <span className="info-value">{pet.breed || '—'}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">Age</span>
                          <span className="info-value">{calcAge(pet.date_of_birth)}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">Weight</span>
                          <span className="info-value">{pet.weight ? `${pet.weight} kg` : '—'}</span>
                        </div>
                      </div>
                    </div>
                    <Link href={`/client-admin/pets/${pet.id}`} className="btn btn-outline btn-sm" style={{ marginLeft: 16 }}>
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Appointments ── */}
      {activeTab === 'appointments' && (
        <div className="card animate-in">
          {appointments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Calendar size={24} /></div>
              <h3>No appointments</h3>
              <p>This client has no appointment history</p>
            </div>
          ) : (
            <div>
              {appointments.map((apt: any) => (
                <div key={apt.id} style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        {/* BUG FIX: appointment_status vs status — the API returns appointment_status */}
                        <span className={statusBadge(apt.appointment_status || apt.status || 'pending')}>
                          {apt.appointment_status || apt.status}
                        </span>
                        {apt.pets?.name && (
                          <span style={{ fontSize: 13, color: 'var(--slate)' }}>
                            <PawPrint size={12} style={{ display: 'inline', marginRight: 4 }} />
                            {apt.pets.name} ({apt.pets.species})
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
                        {apt.reason_for_visit}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--slate)' }}>
                        <Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {apt.scheduled_start
                          ? new Date(apt.scheduled_start).toLocaleString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })
                          : 'N/A'}
                      </div>
                    </div>
                    <Link href={`/client-admin/appointments/${apt.id}`} className="btn btn-outline btn-sm" style={{ marginLeft: 16 }}>
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
