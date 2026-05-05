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
  const base = 'rounded-full px-2.5 py-0.5 text-xs font-semibold';
  const m: Record<string, string> = {
    active:    `${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300`,
    confirmed: `${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300`,
    completed: `${base} bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300`,
    pending:   `${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300`,
    cancelled: `${base} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300`,
    inactive:  `${base} bg-muted text-muted-foreground`,
    suspended: `${base} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300`,
    no_show:   `${base} bg-muted text-muted-foreground`,
  };
  return m[s] ?? `${base} bg-muted text-muted-foreground`;
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
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: 'danger' | 'primary';
    onConfirm: () => void;
  } | null>(null);
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

  const handleArchiveClient = () => {
    if (!client) return;
    setConfirmModal({
      title: 'Archive Client',
      message: `Archive ${client.first_name} ${client.last_name}? They will lose access to the system.`,
      confirmLabel: 'Archive',
      confirmVariant: 'danger',
      onConfirm: async () => {
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
      },
    });
  };

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <span>Loading client…</span>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-xl p-4 flex items-start gap-3 max-w-md mx-auto mt-16">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
          <div><strong>Error</strong><br />{error || 'Client not found'}</div>
        </div>
        <div className="text-center mt-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-accent transition-all duration-150"
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </div>
    );
  }

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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xl font-bold flex items-center justify-center flex-shrink-0">
            {client.first_name[0]}{client.last_name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight">{client.first_name} {client.last_name}</h1>
              <span className={statusBadge(userData?.account_status || 'unknown')}>{userData?.account_status}</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">{client.id.slice(0, 12)}…</span>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={fetchClientDetails}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border border-transparent bg-transparent hover:bg-accent text-muted-foreground transition-all duration-150"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <Link
            href={`/client-admin/clients/${client.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-accent text-foreground transition-all duration-150"
          >
            <Edit size={14} /> Edit
          </Link>
          {!userData?.deleted_at && (
            <button
              onClick={handleArchiveClient}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-destructive hover:bg-destructive/90 text-white transition-all duration-150"
            >
              <Archive size={14} /> Archive
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-card rounded-2xl border border-border p-1 mb-6 gap-1">
        {([
          { key: 'overview', label: 'Overview', icon: <User size={15} />, count: null },
          { key: 'pets', label: 'Pets', icon: <PawPrint size={15} />, count: pets.length },
          { key: 'appointments', label: 'Appointments', icon: <Calendar size={15} />, count: appointments.length },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl transition-colors duration-150 ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== null && (
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full border ${
                activeTab === tab.key ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30' : 'bg-muted text-muted-foreground border-border'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Account Info */}
          <div className="rounded-2xl border border-border/80 bg-card/95 shadow-sm">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-[17px] font-bold">Account Information</h2>
            </div>
            <div className="p-6 flex flex-col gap-5">
              <div className="flex gap-3 items-start bg-accent/40 rounded-xl p-3">
                <Mail size={18} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground font-medium">Email</span>
                  <span className="text-sm font-medium">{userData?.email || '—'}</span>
                </div>
              </div>
              <div className="flex gap-3 items-start bg-accent/40 rounded-xl p-3">
                <Phone size={18} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground font-medium">Phone</span>
                  <span className="text-sm font-medium">{client.phone}</span>
                </div>
              </div>
              <div className="flex gap-3 items-start bg-accent/40 rounded-xl p-3">
                <MapPin size={18} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground font-medium">Address</span>
                  <span className="text-sm font-medium">{client.address_line1}{client.address_line2 && `, ${client.address_line2}`}</span>
                  <span className="text-sm text-muted-foreground">{client.city}, {client.state} {client.zip_code}</span>
                </div>
              </div>
              <hr className="border-t border-border" />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground font-medium">Account Status</span>
                  <span className={`${statusBadge(userData?.account_status || 'unknown')} mt-1`}>
                    {userData?.account_status || '—'}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground font-medium">Email Verified</span>
                  <span className="text-sm font-medium mt-1">{userData?.email_verified ? '✅ Yes' : '❌ No'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground font-medium">Member Since</span>
                  <span className="text-sm font-medium">{fmtDate(userData?.created_at)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground font-medium">Last Login</span>
                  <span className="text-sm font-medium">{fmtDate(userData?.last_login_at)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-medium">Communication Preference</span>
                <span className="text-sm font-medium capitalize">{client.communication_preference}</span>
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="flex flex-col gap-4">
            <div className="bg-card rounded-2xl border border-border border-l-4 border-l-primary shadow-sm p-6 flex items-center justify-between hover:-translate-y-0.5 hover:shadow-md transition-all duration-150">
              <div>
                <p className="text-sm text-muted-foreground mb-1.5">Total Pets</p>
                <p className="text-3xl font-bold">{pets.length}</p>
                <p className="text-xs text-muted-foreground mt-1">{pets.filter(p => p.is_active).length} active</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                <PawPrint size={24} className="text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="bg-card rounded-2xl border border-border border-l-4 border-l-primary shadow-sm p-6 flex items-center justify-between hover:-translate-y-0.5 hover:shadow-md transition-all duration-150">
              <div>
                <p className="text-sm text-muted-foreground mb-1.5">Total Appointments</p>
                <p className="text-3xl font-bold">{appointments.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {appointments.filter(a => a.appointment_status === 'confirmed').length} upcoming
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Calendar size={24} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Pets ── */}
      {activeTab === 'pets' && (
        <div className="rounded-2xl border border-border/80 bg-card/95 shadow-sm overflow-hidden">
          {pets.length === 0 ? (
            <div className="py-16 px-6 text-center text-muted-foreground">
              <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                <PawPrint size={24} className="text-primary" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1">No pets registered</h3>
              <p className="text-sm">This client has no pets on file</p>
            </div>
          ) : (
            <div>
              {pets.map((pet, i) => (
                <div key={pet.id} className={`p-6 hover:bg-accent/40 transition-colors ${i < pets.length - 1 ? 'border-b border-border' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5 mb-3">
                        <span className="text-xl">{pet.species?.toLowerCase() === 'dog' ? '🐕' : pet.species?.toLowerCase() === 'cat' ? '🐈' : '🐾'}</span>
                        <span className="text-base font-bold">{pet.name}</span>
                        <span className={pet.is_active
                          ? 'rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground'}>
                          {pet.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="bg-muted/30 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: 'Species', value: pet.species },
                          { label: 'Breed', value: pet.breed || '—' },
                          { label: 'Age', value: calcAge(pet.date_of_birth) },
                          { label: 'Weight', value: pet.weight ? `${pet.weight} kg` : '—' },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground font-medium">{label}</span>
                            <span className="text-sm font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Link
                      href={`/client-admin/pets/${pet.id}`}
                      className="ml-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-accent text-foreground transition-all duration-150"
                    >
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
        <div className="rounded-2xl border border-border/80 bg-card/95 shadow-sm overflow-hidden">
          {appointments.length === 0 ? (
            <div className="py-16 px-6 text-center text-muted-foreground">
              <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar size={24} className="text-primary" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1">No appointments</h3>
              <p className="text-sm">This client has no appointment history</p>
            </div>
          ) : (
            <div>
              {appointments.map((apt: any, i: number) => (
                <div key={apt.id} className={`p-5 hover:bg-accent/40 transition-colors ${i < appointments.length - 1 ? 'border-b border-border' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className={statusBadge(apt.appointment_status || apt.status || 'pending')}>
                          {apt.appointment_status || apt.status}
                        </span>
                        {apt.pets?.name && (
                          <span className="text-[13px] text-muted-foreground flex items-center gap-1">
                            <PawPrint size={12} />
                            {apt.pets.name} ({apt.pets.species})
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold mb-1">{apt.reason_for_visit}</p>
                      <p className="text-[13px] text-muted-foreground flex items-center gap-1">
                        <Calendar size={12} />
                        {apt.scheduled_start
                          ? new Date(apt.scheduled_start).toLocaleString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                              timeZone: 'Asia/Manila',
                            })
                          : 'N/A'}
                      </p>
                    </div>
                    <Link
                      href={`/client-admin/appointments/${apt.id}`}
                      className="ml-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-accent text-foreground transition-all duration-150"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
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

