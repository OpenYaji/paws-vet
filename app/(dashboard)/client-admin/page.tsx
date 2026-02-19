'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/auth-client';
import Link from 'next/link';
import {
  Search, Plus, Edit, Archive, Eye, RefreshCw,
  MoreVertical, Users, PawPrint, Calendar,
  TrendingUp, AlertTriangle, CheckCircle, Clock
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

type ActiveTab = 'clients' | 'pets' | 'appointments' | 'dashboard';

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

  const [activeTab, setActiveTab] = useState<ActiveTab>(tabParam || 'clients');
  const [clients, setClients] = useState<ClientData[]>([]);
  const [pets, setPets] = useState<PetData[]>([]);
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  // BUG FIX: Added toast state to replace browser alert() calls
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [stats, setStats] = useState({
    totalClients: 0, activeClients: 0, totalPets: 0,
    totalAppointments: 0, pendingAppointments: 0, confirmedAppointments: 0,
  });

  // BUG FIX: tabParam sync
  useEffect(() => {
    if (tabParam) setActiveTab(tabParam);
  }, [tabParam]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

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
        // BUG FIX: was using c.users?.email but the API already joins; keep both paths
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
        // BUG FIX: store deleted_at for archive filtering (was missing from mapped object)
        deleted_at: c.users?.deleted_at || null,
      }));

      // BUG FIX: filter was checking c.users?.deleted_at which doesn't exist
      // after the map. Now checking mapped deleted_at.
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

  // BUG FIX: unified data loading — was calling setLoading(false) inside the
  // Promise.all callback which could leave loading=true if an individual fetch
  // threw; now handled in a single async function with finally.
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchClients(), fetchPets(), fetchAppointments()]);
    } finally {
      setLoading(false);
    }
  }, [fetchClients, fetchPets, fetchAppointments]);

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
    if (activeTab === 'dashboard') {
      loadAll();
    } else {
      loadTab();
    }
    // reset filters on tab change
    setSearchTerm('');
    setStatusFilter('all');
  }, [activeTab, showArchived]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      setStats({
        totalClients: clients.length,
        activeClients: clients.filter(c => c.account_status === 'active').length,
        totalPets: pets.length,
        totalAppointments: appointments.length,
        pendingAppointments: appointments.filter(a => a.status === 'pending').length,
        confirmedAppointments: appointments.filter(a => a.status === 'confirmed').length,
      });
    }
  }, [activeTab, clients, pets, appointments]);

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

  // ── Nav helper ────────────────────────────────────────────────────────────

  const goTab = (tab: ActiveTab) => {
    router.push(`/client-admin?tab=${tab}`);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const tabLabel: Record<ActiveTab, string> = {
    dashboard: 'Dashboard',
    clients: 'Client Management',
    pets: 'Pet Management',
    appointments: 'Appointment Management',
  };

  const tabDesc: Record<ActiveTab, string> = {
    dashboard: 'Overview of your veterinary clinic',
    clients: 'Manage client accounts, profiles, and records',
    pets: 'All registered pets across all clients',
    appointments: 'Track and manage all scheduled appointments',
  };

  const activeCount =
    activeTab === 'clients' ? filteredClients.length :
    activeTab === 'pets' ? filteredPets.length :
    activeTab === 'appointments' ? filteredAppointments.length : 0;

  const totalCount =
    activeTab === 'clients' ? clients.length :
    activeTab === 'pets' ? pets.length :
    activeTab === 'appointments' ? appointments.length : 0;

  return (
    <div className="page">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === 'success' ? '#059669' : '#dc2626',
          color: 'white', padding: '12px 20px',
          borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)',
          fontSize: 14, fontWeight: 600, maxWidth: 320,
          animation: 'fadeUp 0.2s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── DASHBOARD ─────────────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="animate-in">
          <div className="page-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1>Dashboard</h1>
                <p>Overview of your veterinary clinic management system</p>
              </div>
              <button className="btn btn-outline btn-sm" onClick={loadAll}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-state"><div className="spinner" /><span>Loading dashboard…</span></div>
          ) : (
            <>
              {/* Stats grid */}
              <div className="grid-3 animate-in" style={{ marginBottom: 24 }}>
                <div className="stat-card">
                  <div>
                    <p className="stat-label">Total Clients</p>
                    <p className="stat-value">{stats.totalClients}</p>
                    <p className="stat-sub" style={{ color: 'var(--green)' }}>{stats.activeClients} active</p>
                  </div>
                  <div className="stat-icon" style={{ background: 'var(--blue-pale)' }}>
                    <Users size={24} style={{ color: 'var(--blue)' }} />
                  </div>
                </div>
                <div className="stat-card">
                  <div>
                    <p className="stat-label">Total Pets</p>
                    <p className="stat-value">{stats.totalPets}</p>
                    <p className="stat-sub">
                      {stats.totalClients > 0 ? (stats.totalPets / stats.totalClients).toFixed(1) : '0'} avg/client
                    </p>
                  </div>
                  <div className="stat-icon" style={{ background: 'var(--green-pale)' }}>
                    <PawPrint size={24} style={{ color: 'var(--green)' }} />
                  </div>
                </div>
                <div className="stat-card">
                  <div>
                    <p className="stat-label">Total Appointments</p>
                    <p className="stat-value">{stats.totalAppointments}</p>
                    <p className="stat-sub">All time</p>
                  </div>
                  <div className="stat-icon" style={{ background: '#f3e8ff' }}>
                    <Calendar size={24} style={{ color: '#7c3aed' }} />
                  </div>
                </div>
                <div className="stat-card">
                  <div>
                    <p className="stat-label">Pending Appointments</p>
                    <p className="stat-value" style={{ color: 'var(--yellow)' }}>{stats.pendingAppointments}</p>
                    <p className="stat-sub">Awaiting confirmation</p>
                  </div>
                  <div className="stat-icon" style={{ background: 'var(--yellow-pale)' }}>
                    <Clock size={24} style={{ color: 'var(--yellow)' }} />
                  </div>
                </div>
                <div className="stat-card">
                  <div>
                    <p className="stat-label">Confirmed Appointments</p>
                    <p className="stat-value" style={{ color: 'var(--green)' }}>{stats.confirmedAppointments}</p>
                    <p className="stat-sub">Ready to go</p>
                  </div>
                  <div className="stat-icon" style={{ background: 'var(--green-pale)' }}>
                    <CheckCircle size={24} style={{ color: 'var(--green)' }} />
                  </div>
                </div>
                <div className="stat-card">
                  <div>
                    <p className="stat-label">Active Rate</p>
                    <p className="stat-value">
                      {stats.totalClients > 0
                        ? Math.round((stats.activeClients / stats.totalClients) * 100) + '%'
                        : '—'
                      }
                    </p>
                    <p className="stat-sub">Clients active</p>
                  </div>
                  <div className="stat-icon" style={{ background: 'var(--teal-pale)' }}>
                    <TrendingUp size={24} style={{ color: 'var(--teal)' }} />
                  </div>
                </div>
              </div>

              {/* Recent rows */}
              <div className="grid-2" style={{ marginBottom: 24 }}>
                <div className="card animate-in animate-in-delay-1">
                  <div className="card-header">
                    <h2 className="card-title">Recent Clients</h2>
                    <button className="btn btn-outline btn-sm" onClick={() => goTab('clients')}>
                      View all
                    </button>
                  </div>
                  <div className="card-body" style={{ padding: 0 }}>
                    {clients.slice(0, 5).map(c => (
                      <div key={c.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 20px', borderBottom: '1px solid var(--border)',
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{c.first_name} {c.last_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 2 }}>{c.email}</div>
                        </div>
                        <Link href={`/client-admin/clients/${c.id}`} className="btn btn-ghost btn-sm">
                          <Eye size={14} /> View
                        </Link>
                      </div>
                    ))}
                    {clients.length === 0 && (
                      <div className="empty-state" style={{ padding: 32 }}>No clients yet</div>
                    )}
                  </div>
                </div>

                <div className="card animate-in animate-in-delay-2">
                  <div className="card-header">
                    <h2 className="card-title">Recent Appointments</h2>
                    <button className="btn btn-outline btn-sm" onClick={() => goTab('appointments')}>
                      View all
                    </button>
                  </div>
                  <div className="card-body" style={{ padding: 0 }}>
                    {appointments.slice(0, 5).map(a => (
                      <div key={a.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 20px', borderBottom: '1px solid var(--border)',
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{a.client_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 2 }}>
                            {a.pet_name} · {formatDate(a.appointment_date)}
                          </div>
                        </div>
                        <span className={statusBadge(a.status)}>{a.status}</span>
                      </div>
                    ))}
                    {appointments.length === 0 && (
                      <div className="empty-state" style={{ padding: 32 }}>No appointments yet</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card animate-in animate-in-delay-3">
                <div className="card-header"><h2 className="card-title">Quick Actions</h2></div>
                <div className="card-body">
                  <div className="grid-4">
                    {[
                      { label: 'View Clients', icon: <Users size={22} />, tab: 'clients' as const },
                      { label: 'View Pets', icon: <PawPrint size={22} />, tab: 'pets' as const },
                      { label: 'View Appointments', icon: <Calendar size={22} />, tab: 'appointments' as const },
                      { label: 'Refresh Data', icon: <RefreshCw size={22} />, tab: null },
                    ].map(({ label, icon, tab }) => (
                      <button
                        key={label}
                        className="btn btn-outline"
                        style={{ flexDirection: 'column', height: 'auto', padding: '20px 12px', gap: 10 }}
                        onClick={() => tab ? goTab(tab) : loadAll()}
                      >
                        {icon}
                        <span style={{ fontSize: 13 }}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── OTHER TABS ────────────────────────────────────────────────────── */}
      {activeTab !== 'dashboard' && (
        <div className="animate-in">
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div className="page-header" style={{ margin: 0 }}>
              <h1>{tabLabel[activeTab]}</h1>
              <p>{tabDesc[activeTab]}</p>
            </div>
            {/* BUG FIX: "Add New" button was non-functional (no href). Routing to logical destinations. */}
            <Link
              href={
                activeTab === 'clients' ? '/client-admin/clients/new' :
                activeTab === 'pets' ? '/client-admin/pets/new' :
                '/client-admin/appointments/new'
              }
              className="btn btn-primary"
            >
              <Plus size={16} />
              New {activeTab === 'clients' ? 'Client' : activeTab === 'pets' ? 'Pet' : 'Appointment'}
            </Link>
          </div>

          {/* Filters */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ padding: '16px 20px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: '1 1 280px' }}>
                <Search
                  size={16}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-light)' }}
                />
                <input
                  className="form-input"
                  style={{ paddingLeft: 36 }}
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
                  className="form-input"
                  style={{ width: 'auto', minWidth: 160 }}
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
                  className={`btn ${showArchived ? 'btn-primary' : 'btn-outline'} btn-sm`}
                  onClick={() => setShowArchived(s => !s)}
                >
                  <Archive size={14} />
                  {showArchived ? 'Hide Archived' : 'Show Archived'}
                </button>
              )}

              <button className="btn btn-outline btn-sm" onClick={loadTab}>
                <RefreshCw size={14} /> Refresh
              </button>

              <span style={{ fontSize: 13, color: 'var(--slate)', marginLeft: 'auto' }}>
                {activeCount} of {totalCount} {activeTab}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="card">
            {loading ? (
              <div className="loading-state">
                <div className="spinner" />
                <span>Loading {activeTab}…</span>
              </div>
            ) : (
              <div className="table-wrap">

                {/* CLIENTS TABLE */}
                {activeTab === 'clients' && (
                  filteredClients.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon"><Users size={24} /></div>
                      <h3>No clients found</h3>
                      <p>Try adjusting your search or filters</p>
                    </div>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>Client</th>
                          <th>Contact</th>
                          <th>Location</th>
                          <th>Status</th>
                          <th>Pets</th>
                          <th>Apts</th>
                          <th>Last Login</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredClients.map(c => (
                          <tr key={c.id}>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--navy)' }}>
                                {c.first_name} {c.last_name}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--slate-light)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                                {c.id.slice(0, 8)}…
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: 14 }}>{c.email}</div>
                              <div style={{ fontSize: 12, color: 'var(--slate)' }}>{c.phone}</div>
                            </td>
                            <td style={{ color: 'var(--slate)' }}>{c.city}, {c.state}</td>
                            <td><span className={statusBadge(c.account_status)}>{c.account_status}</span></td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{c.pet_count ?? '—'}</td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{c.appointment_count ?? '—'}</td>
                            <td style={{ color: 'var(--slate)', fontSize: 13 }}>{formatDate(c.last_login_at)}</td>
                            <td>
                              <Dropdown items={[
                                { label: '👁  View Profile', href: `/client-admin/clients/${c.id}` },
                                { label: '✏️  Edit Profile', href: `/client-admin/clients/${c.id}/edit` },
                                ...(!showArchived ? [{ label: '🗄  Archive', danger: true, onClick: () => handleArchiveClient(c.user_id, `${c.first_name} ${c.last_name}`) }] : []),
                              ]}>
                                <MoreVertical size={16} />
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
                    <div className="empty-state">
                      <div className="empty-state-icon"><PawPrint size={24} /></div>
                      <h3>No pets found</h3>
                      <p>Try adjusting your search</p>
                    </div>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>Pet</th>
                          <th>Species</th>
                          <th>Breed</th>
                          <th>Age</th>
                          <th>Owner</th>
                          <th>Phone</th>
                          <th>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPets.map(p => (
                          <tr key={p.id}>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{p.name}</div>
                              {p.weight && <div style={{ fontSize: 12, color: 'var(--slate)' }}>{p.weight} kg</div>}
                            </td>
                            <td>{p.species}</td>
                            <td style={{ color: 'var(--slate)' }}>{p.breed}</td>
                            <td style={{ color: 'var(--slate)' }}>{calcAge(p.date_of_birth)}</td>
                            <td>
                              <Link href={`/client-admin/clients/${p.owner_id}`} className="link-blue">
                                {p.owner_name}
                              </Link>
                            </td>
                            <td style={{ color: 'var(--slate)' }}>{p.owner_phone || '—'}</td>
                            <td>
                              <span className={p.is_active ? 'badge badge-green' : 'badge badge-gray'}>
                                {p.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <Dropdown items={[
                                { label: '👁  View Pet', href: `/client-admin/pets/${p.id}` },
                                { label: '👤  View Owner', href: `/client-admin/clients/${p.owner_id}` },
                              ]}>
                                <MoreVertical size={16} />
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
                    <div className="empty-state">
                      <div className="empty-state-icon"><Calendar size={24} /></div>
                      <h3>No appointments found</h3>
                      <p>Try adjusting your search or filters</p>
                    </div>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>Date & Time</th>
                          <th>Client</th>
                          <th>Pet</th>
                          <th>Reason</th>
                          <th>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAppointments.map(a => (
                          <tr key={a.id}>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{formatDate(a.appointment_date)}</div>
                              <div style={{ fontSize: 12, color: 'var(--slate)' }}>{a.appointment_time}</div>
                            </td>
                            <td>
                              <Link href={`/client-admin/clients/${a.client_id}`} className="link-blue">
                                {a.client_name}
                              </Link>
                            </td>
                            <td>
                              <Link href={`/client-admin/pets/${a.pet_id}`} className="link-blue">
                                {a.pet_name}
                              </Link>
                            </td>
                            <td style={{ maxWidth: 200 }}>
                              <div style={{
                                overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap', color: 'var(--navy-700)', fontSize: 14,
                              }}>
                                {a.reason}
                              </div>
                            </td>
                            <td><span className={statusBadge(a.status)}>{a.status}</span></td>
                            <td>
                              <Dropdown items={[
                                { label: '👁  View Details', href: `/client-admin/appointments/${a.id}` },
                                { label: '👤  View Client', href: `/client-admin/clients/${a.client_id}` },
                              ]}>
                                <MoreVertical size={16} />
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
      )}
    </div>
  );
}

// BUG FIX: useSearchParams() requires a Suspense boundary in Next.js 13+
export default function ClientAdminPage() {
  return (
    <Suspense fallback={<div className="page"><div className="loading-state"><div className="spinner" /></div></div>}>
      <ClientAdminPageInner />
    </Suspense>
  );
}
