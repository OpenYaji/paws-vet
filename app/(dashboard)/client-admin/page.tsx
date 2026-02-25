'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/auth-client';
import Link from 'next/link';
import {
  Search, Plus, Edit, Archive, Eye, RefreshCw,
  MoreVertical, Users, PawPrint, Calendar,
  AlertTriangle,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface ClientData {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address_line1: string;
  city: string;
  state: string;
  zip_code: string;
  account_status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  last_login_at?: string;
  pet_count?: number;
  appointment_count?: number;
}

interface PetData {
  id: string;
  name: string;
  species: string;
  breed: string;
  owner_id: string;
  owner_name: string;
  owner_phone: string;
  date_of_birth?: string;
  weight?: number;
  is_active: boolean;
  created_at: string;
}

interface AppointmentData {
  id: string;
  client_id: string;
  client_name: string;
  pet_id: string;
  pet_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason: string;
  created_at: string;
}

// REMOVED: 'dashboard' from type — CMS only handles clients, pets, appointments
type ActiveTab = 'clients' | 'pets' | 'appointments';

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    active: 'badge badge-green',
    confirmed: 'badge badge-green',
    completed: 'badge badge-blue',
    pending: 'badge badge-yellow',
    cancelled: 'badge badge-red',
    inactive: 'badge badge-gray',
    suspended: 'badge badge-red',
    no_show: 'badge badge-gray',
  };
  return map[status] ?? 'badge badge-gray';
}

function formatDate(d?: string): string {
  if (!d) return 'Never';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function calcAge(birth?: string): string {
  if (!birth) return '—';
  const today = new Date();
  const b = new Date(birth);
  const y = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (y === 0) return `${m}mo`;
  return m < 0 ? `${y - 1}y ${12 + m}mo` : `${y}y ${m}mo`;
}

// ── Dropdown ─────────────────────────────────────────────────────────────────

function Dropdown({ children, items }: {
  children: React.ReactNode;
  items: { label: string; href?: string; onClick?: () => void; danger?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        className="btn btn-ghost btn-sm btn-icon"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        aria-label="Actions"
      >
        {children}
      </button>
      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'absolute', right: 0, top: '110%', zIndex: 50,
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)',
            minWidth: 160, overflow: 'hidden',
          }}>
            {items.map((item, i) =>
              item.href ? (
                <Link
                  key={i}
                  href={item.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px',
                    fontSize: 14,
                    color: item.danger ? 'var(--red)' : 'var(--navy-700)',
                    textDecoration: 'none',
                    transition: 'background 0.1s',
                  }}
                  className="dropdown-item"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  key={i}
                  onClick={() => { setOpen(false); item.onClick?.(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px',
                    fontSize: 14, width: '100%', textAlign: 'left',
                    color: item.danger ? 'var(--red)' : 'var(--navy-700)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font)',
                    transition: 'background 0.1s',
                  }}
                  className="dropdown-item"
                >
                  {item.label}
                </button>
              )
            )}
          </div>
          <style>{`.dropdown-item:hover { background: var(--off-white); }`}</style>
        </>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

function ClientAdminPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab') as ActiveTab;

  // DEFAULT TO 'clients' instead of 'dashboard' — CMS has no dashboard
  const [activeTab, setActiveTab] = useState<ActiveTab>(tabParam || 'clients');
  const [clients, setClients] = useState<ClientData[]>([]);
  const [pets, setPets] = useState<PetData[]>([]);
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Tab sync
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) setActiveTab(tabParam);
  }, [tabParam, activeTab]);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/client-admin/clients');
      if (!res.ok) return;
      const data = await res.json();

      const mapped = (data || []).map((c: any) => ({
        id: c.id,
        user_id: c.user_id,
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.users?.email || c.email || '',
        phone: c.phone,
        address_line1: c.address_line1,
        city: c.city,
        state: c.state,
        zip_code: c.zip_code,
        account_status: c.users?.account_status || c.account_status || 'active',
        created_at: c.created_at,
        last_login_at: c.users?.last_login_at || c.last_login_at,
        pet_count: c.pet_count || 0,
        appointment_count: c.appointment_count || 0,
        deleted_at: c.users?.deleted_at || null,
      }));

      const filtered = showArchived
        ? mapped.filter((c: any) => c.deleted_at)
        : mapped.filter((c: any) => !c.deleted_at);

      setClients(filtered);
    } catch (e) {
      console.error(e);
    }
  }, [showArchived]);

  const fetchPets = useCallback(async () => {
    try {
      const res = await fetch('/api/client-admin/pets');
      if (!res.ok) return;
      const data = await res.json();
      const mapped = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        species: p.species,
        breed: p.breed || 'Unknown',
        owner_id: p.owner_id,
        owner_name: p.client_profiles
          ? `${p.client_profiles.first_name} ${p.client_profiles.last_name}`
          : 'Unknown',
        owner_phone: p.client_profiles?.phone || '',
        date_of_birth: p.date_of_birth,
        weight: p.weight,
        is_active: p.is_active,
        created_at: p.created_at,
      }));
      setPets(mapped);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch('/api/client-admin/appointments');
      if (!res.ok) return;
      const data = await res.json();
      setAppointments(data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadTab = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'clients') await fetchClients();
      else if (activeTab === 'pets') await fetchPets();
      else if (activeTab === 'appointments') await fetchAppointments();
    } finally {
      setLoading(false);
    }
  }, [activeTab, fetchClients, fetchPets, fetchAppointments]);

  useEffect(() => {
    loadTab();
    setSearchTerm('');
    setStatusFilter('all');
  }, [activeTab, showArchived, loadTab]);

  // ── Filtered data ─────────────────────────────────────────────────────────

  const filteredClients = clients.filter(c => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q ||
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q);
    const matchesStatus = statusFilter === 'all' || c.account_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredPets = pets.filter(p => {
    const q = searchTerm.toLowerCase();
    return !q ||
      p.name.toLowerCase().includes(q) ||
      p.species.toLowerCase().includes(q) ||
      p.owner_name.toLowerCase().includes(q);
  });

  const filteredAppointments = appointments.filter(a => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q ||
      a.client_name.toLowerCase().includes(q) ||
      a.pet_name.toLowerCase().includes(q) ||
      a.reason.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleArchiveClient = async (userId: string, name: string) => {
    if (!confirm(`Archive ${name}? They will lose access.`)) return;
    try {
      const { data: { user: cu } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('users')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: cu?.id,
          account_status: 'inactive',
        })
        .eq('id', userId);
      if (error) { showToast('Failed to archive client', 'error'); return; }
      showToast(`${name} archived successfully`);
      await fetchClients();
    } catch {
      showToast('Failed to archive client', 'error');
    }
  };

  const goTab = (tab: ActiveTab) => {
    router.push(`/client-admin?tab=${tab}`);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const tabLabel: Record<ActiveTab, string> = {
    clients: 'Client Management',
    pets: 'Pet Management',
    appointments: 'Appointment Management',
  };

  const tabDesc: Record<ActiveTab, string> = {
    clients: 'Manage client accounts, profiles, and records',
    pets: 'All registered pets across all clients',
    appointments: 'Track and manage all scheduled appointments',
  };

  const activeCount =
    activeTab === 'clients' ? filteredClients.length :
    activeTab === 'pets' ? filteredPets.length :
    filteredAppointments.length;

  const totalCount =
    activeTab === 'clients' ? clients.length :
    activeTab === 'pets' ? pets.length :
    appointments.length;

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-3 rounded-lg text-white font-semibold text-sm animate-in fade-in slide-in-from-bottom-4 duration-200 shadow-lg ${
          toast.type === 'success' 
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
            : 'bg-gradient-to-r from-red-500 to-rose-500'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 p-6 md:p-8 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 rounded-xl border border-border/50">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
              {tabLabel[activeTab]}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">{tabDesc[activeTab]}</p>
          </div>
          <Link
            href={
              activeTab === 'clients' ? '/client-admin/clients/new' :
              activeTab === 'pets' ? '/client-admin/pets/new' :
              '/client-admin/appointments/new'
            }
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 hover:shadow-lg hover:scale-105 font-semibold text-sm whitespace-nowrap flex-shrink-0"
          >
            <Plus size={16} />
            New {activeTab === 'clients' ? 'Client' : activeTab === 'pets' ? 'Pet' : 'Appointment'}
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-6 p-6 rounded-xl border border-border bg-card shadow-sm transition-all duration-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] md:min-w-[280px]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200 text-sm"
                placeholder={
                  activeTab === 'clients' ? 'Search by name, email, phone…' :
                  activeTab === 'pets' ? 'Search by pet name, species, owner…' :
                  'Search by client, pet, or reason…'
                }
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Status filter */}
            {(activeTab === 'clients' || activeTab === 'appointments') && (
              <select
                className="px-4 py-2.5 rounded-lg border border-border bg-background hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200 text-sm font-medium cursor-pointer"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                {activeTab === 'clients' ? (
                  <>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </>
                ) : (
                  <>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No Show</option>
                  </>
                )}
              </select>
            )}

            {/* Archive toggle */}
            {activeTab === 'clients' && (
              <button
                onClick={() => setShowArchived(s => !s)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  showArchived
                    ? 'bg-primary text-primary-foreground shadow-md hover:shadow-lg'
                    : 'bg-background border border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                <Archive size={16} />
                {showArchived ? 'Hide Archived' : 'Show Archived'}
              </button>
            )}

            <button 
              onClick={loadTab}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 font-semibold text-sm"
            >
              <RefreshCw size={16} /> 
              Refresh
            </button>

            <div className="flex-1 md:flex-none text-right">
              <span className="text-xs md:text-sm text-muted-foreground font-medium">
                {activeCount} of {totalCount} {activeTab}
              </span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 bg-gradient-to-br from-primary/5 to-transparent">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-pulse"></div>
                <div className="absolute inset-1 border-t-4 border-primary rounded-full animate-spin"></div>
              </div>
              <span className="text-muted-foreground font-medium">Loading {activeTab}…</span>
            </div>
          ) : (
            <div className="overflow-x-auto">

              {/* CLIENTS TABLE */}
              {activeTab === 'clients' && (
                filteredClients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6 gap-4 text-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                      <Users size={28} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-foreground mb-1">No clients found</h3>
                      <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pets</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Apts</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Login</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredClients.map(c => (
                        <tr key={c.id} className="hover:bg-primary/5 transition-colors duration-150">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-foreground">{c.first_name} {c.last_name}</div>
                            <div className="text-xs text-muted-foreground font-mono mt-1">{c.id.slice(0, 8)}…</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-foreground">{c.email}</div>
                            <div className="text-xs text-muted-foreground">{c.phone}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{c.city}, {c.state}</td>
                          <td className="px-6 py-4"><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            c.account_status === 'active' 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                              : c.account_status === 'inactive'
                              ? 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                          }`}>{c.account_status}</span></td>
                          <td className="px-6 py-4 text-center font-semibold text-foreground">{c.pet_count ?? '—'}</td>
                          <td className="px-6 py-4 text-center font-semibold text-foreground">{c.appointment_count ?? '—'}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(c.last_login_at)}</td>
                          <td className="px-6 py-4 text-right">
                            <Dropdown items={[
                              { label: '👁  View Profile', href: `/client-admin/clients/${c.id}` },
                              { label: '✏️  Edit Profile', href: `/client-admin/clients/${c.id}/edit` },
                              ...(!showArchived ? [{ label: '🗄  Archive', danger: true, onClick: () => handleArchiveClient(c.user_id, `${c.first_name} ${c.last_name}`) }] : []),
                            ]}>
                              <MoreVertical size={16} className="text-muted-foreground hover:text-foreground transition-colors" />
                            </Dropdown>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {/* PETS TABLE */}
              {activeTab === 'pets' && (
                filteredPets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6 gap-4 text-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                      <PawPrint size={28} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-foreground mb-1">No pets found</h3>
                      <p className="text-muted-foreground text-sm">Try adjusting your search</p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pet</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Species</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Breed</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Age</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Owner</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredPets.map(p => (
                        <tr key={p.id} className="hover:bg-primary/5 transition-colors duration-150">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-foreground">{p.name}</div>
                            {p.weight && <div className="text-xs text-muted-foreground mt-1">{p.weight} kg</div>}
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground">{p.species}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{p.breed}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{calcAge(p.date_of_birth)}</td>
                          <td className="px-6 py-4">
                            <Link href={`/client-admin/clients/${p.owner_id}`} className="text-sm text-primary hover:underline font-medium transition-colors">
                              {p.owner_name}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{p.owner_phone || '—'}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              p.is_active
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300'
                            }`}>
                              {p.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Dropdown items={[
                              { label: '👁  View Pet', href: `/client-admin/pets/${p.id}` },
                              { label: '👤  View Owner', href: `/client-admin/clients/${p.owner_id}` },
                            ]}>
                              <MoreVertical size={16} className="text-muted-foreground hover:text-foreground transition-colors" />
                            </Dropdown>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {/* APPOINTMENTS TABLE */}
              {activeTab === 'appointments' && (
                filteredAppointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6 gap-4 text-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                      <Calendar size={28} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-foreground mb-1">No appointments found</h3>
                      <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date & Time</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pet</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reason</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredAppointments.map(a => (
                        <tr key={a.id} className="hover:bg-primary/5 transition-colors duration-150">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-foreground">{formatDate(a.appointment_date)}</div>
                            <div className="text-xs text-muted-foreground mt-1">{a.appointment_time}</div>
                          </td>
                          <td className="px-6 py-4">
                            <Link href={`/client-admin/clients/${a.client_id}`} className="text-sm text-primary hover:underline font-medium transition-colors">
                              {a.client_name}
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <Link href={`/client-admin/pets/${a.pet_id}`} className="text-sm text-primary hover:underline font-medium transition-colors">
                              {a.pet_name}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground max-w-xs truncate" title={a.reason}>
                            {a.reason}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              a.status === 'confirmed' || a.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                : a.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300'
                                : a.status === 'no_show'
                                ? 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                            }`}>{a.status}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Dropdown items={[
                              { label: '👁  View Details', href: `/client-admin/appointments/${a.id}` },
                              { label: '👤  View Client', href: `/client-admin/clients/${a.client_id}` },
                            ]}>
                              <MoreVertical size={16} className="text-muted-foreground hover:text-foreground transition-colors" />
                            </Dropdown>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClientAdminPage() {
  return (
    <Suspense fallback={<div className="page"><div className="loading-state"><div className="spinner" /></div></div>}>
      <ClientAdminPageInner />
    </Suspense>
  );
}
