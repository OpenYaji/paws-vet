'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/auth-client';
import useSWR from 'swr';
import Link from 'next/link';
import {
  Search, Edit, Archive, Eye, RefreshCw,
  MoreVertical, Users, PawPrint, Calendar, Bell,
  AlertTriangle, Download, ClipboardList, MapPin, Filter,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CmsCard } from '@/components/client/cms-card';
import { CmsPageHeader } from '@/components/client/cms-page-header';
import { CmsEmptyState } from '@/components/client/cms-empty-state';
import { CmsStatusBadge } from '@/components/client/cms-status-badge';
import { CmsBreadcrumb } from '@/components/client/cms-breadcrumb';

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
  deleted_at?: string | null;
}

interface PetData {
  id: string;
  name: string;
  species: string;
  breed: string;
  photo_url?: string | null;
  allow_repeat_kapon_booking: boolean;
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

interface RegularAppointmentData {
  id: string;
  appointment_number?: string | null;
  scheduled_start: string;
  appointment_status: string;
  duration_minutes?: number | null;
  payment_status?: string | null;
  payment_method?: string | null;
  client_name: string;
  client_id: string;
  pet_name: string;
  pet_id: string;
  breed?: string | null;
  gender?: string | null;
}

interface OutreachAppointmentData {
  id: string;
  appointment_number?: string | null;
  scheduled_start: string;
  appointment_status: string;
  is_aspin_puspin: boolean;
  payment_amount?: number | null;
  payment_status?: string | null;
  outreach_program_id?: string | null;
  outreach_program_title?: string | null;
  client_name: string;
  client_id: string;
  pet_name: string;
  pet_id: string;
  breed?: string | null;
}

interface NotificationLogData {
  id: string;
  recipient_id: string;
  notification_type: string;
  subject: string | null;
  content: string;
  delivery_status: string;
  is_read: boolean;
  sent_at: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
}

// REMOVED: 'dashboard' from type — CMS only handles clients, pets, appointments
type ActiveTab = 'clients' | 'pets' | 'appointments' | 'regular_appointments' | 'outreach_appointments' | 'notifications';

const fetchClients = async (showArchived: boolean) => {
  const res = await fetch('/api/client-admin/clients');
  if (!res.ok) return [];
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
  return showArchived
    ? mapped.filter((c: any) => c.deleted_at)
    : mapped.filter((c: any) => !c.deleted_at);
};

const fetchPets = async () => {
  const res = await fetch('/api/client-admin/pets');
  if (!res.ok) return [];
  const data = await res.json();
  return (data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    species: p.species,
    breed: p.breed || 'Unknown',
    photo_url: p.photo_url || null,
    allow_repeat_kapon_booking: p.allow_repeat_kapon_booking ?? false,
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
};

const fetchAllAppointments = async () => {
  const res = await fetch('/api/client-admin/appointments');
  if (!res.ok) return [];
  return await res.json() || [];
};

const fetchNotificationLogs = async () => {
  const { data } = await supabase
    .from('notification_logs')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(200);

  return (data || []).map((n: any) => ({
    id: n.id,
    recipient_id: n.recipient_id,
    notification_type: n.notification_type,
    subject: n.subject,
    content: n.content,
    delivery_status: n.delivery_status,
    is_read: n.is_read ?? false,
    sent_at: n.sent_at,
    related_entity_type: n.related_entity_type,
    related_entity_id: n.related_entity_id,
  }));
};

// ── CSV helpers ────────────────────────────────────────────────────────────────

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportRegularCSV(data: RegularAppointmentData[]) {
  const rows = [
    ['Appt #', 'Date', 'Client', 'Pet', 'Breed', 'Gender', 'Duration (min)', 'Payment Method', 'Payment Status', 'Appointment Status'],
    ...data.map(r => [
      r.appointment_number ?? '',
      new Date(r.scheduled_start).toLocaleString(),
      r.client_name, r.pet_name, r.breed ?? '', r.gender ?? '',
      String(r.duration_minutes ?? ''),
      r.payment_method ?? '', r.payment_status ?? '', r.appointment_status,
    ]),
  ];
  downloadCSV(rows, `regular-appointments-${new Date().toISOString().slice(0,10)}.csv`);
}

function exportOutreachCSV(data: OutreachAppointmentData[]) {
  const rows = [
    ['Appt #', 'Date', 'Client', 'Pet', 'Breed', 'Aspin/Puspin', 'Program', 'Payment Amount', 'Payment Status', 'Appointment Status'],
    ...data.map(r => [
      r.appointment_number ?? '',
      new Date(r.scheduled_start).toLocaleString(),
      r.client_name, r.pet_name, r.breed ?? '',
      r.is_aspin_puspin ? 'Yes' : 'No',
      r.outreach_program_title ?? '',
      r.payment_amount != null ? String(r.payment_amount) : '',
      r.payment_status ?? '', r.appointment_status,
    ]),
  ];
  downloadCSV(rows, `outreach-appointments-${new Date().toISOString().slice(0,10)}.csv`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadge(status: string): string {
  const base = 'rounded-full px-2.5 py-0.5 text-xs font-semibold';
  const map: Record<string, string> = {
    active:    `${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300`,
    confirmed: `${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300`,
    completed: `${base} bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300`,
    pending:   `${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300`,
    cancelled: `${base} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300`,
    inactive:  `${base} bg-muted text-muted-foreground`,
    suspended: `${base} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300`,
    no_show:   `${base} bg-muted text-muted-foreground`,
  };
  return map[status] ?? `${base} bg-muted text-muted-foreground`;
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

// ── Actions Dropdown (Radix portal — escapes overflow containers) ─────────────

function ActionsDropdown({ items }: {
  items: { label: string; href?: string; onClick?: () => void; danger?: boolean }[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-150 outline-none"
          aria-label="Actions"
        >
          <MoreVertical size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {items.map((item, i) =>
          item.href ? (
            <DropdownMenuItem key={i} asChild variant={item.danger ? 'destructive' : 'default'}>
              <Link href={item.href}>{item.label}</Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              key={i}
              variant={item.danger ? 'destructive' : 'default'}
              onClick={item.onClick}
            >
              {item.label}
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

function ClientAdminPageInner() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as ActiveTab;

  // DEFAULT TO 'clients' instead of 'dashboard' — CMS has no dashboard
  const [activeTab, setActiveTab] = useState<ActiveTab>(tabParam || 'clients');
  const [petsView, setPetsView] = useState<'cards' | 'table'>('cards');
  const [updatingPetId, setUpdatingPetId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: 'danger' | 'primary';
    onConfirm: () => void;
  } | null>(null);

  // Tab sync
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) setActiveTab(tabParam);
  }, [tabParam, activeTab]);

  const {
    data: clients = [],
    isLoading: clientsLoading,
    mutate: mutateClients,
  } = useSWR(
    activeTab === 'clients'
      ? ['cms-clients', showArchived]
      : null,
    () => fetchClients(showArchived),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  const {
    data: pets = [],
    isLoading: petsLoading,
    mutate: mutatePets,
  } = useSWR(
    activeTab === 'pets' ? 'cms-pets' : null,
    fetchPets,
    {
      revalidateOnFocus: false,
      refreshInterval: activeTab === 'pets' ? 5000 : 0,
      dedupingInterval: 30000,
    }
  );

  const {
    data: appointments = [],
    isLoading: appointmentsLoading,
    mutate: mutateAppointments,
  } = useSWR(
    activeTab === 'appointments' ? 'cms-appointments' : null,
    fetchAllAppointments,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  const {
    data: regularAppointments = [],
    isLoading: regularLoading,
    mutate: mutateRegular,
  } = useSWR(
    activeTab === 'regular_appointments' ? 'cms-regular' : null,
    async () => {
      const { data } = await supabase
        .from('appointments')
        .select(`
          id, appointment_number, scheduled_start, appointment_status,
          duration_minutes, payment_status, payment_method,
          pets!appointments_pet_id_fkey (
            id, name, breed, gender,
            client_profiles!pets_owner_id_fkey (
              id, first_name, last_name
            )
          )
        `)
        .eq('appointment_type_detail', 'regular')
        .order('scheduled_start', { ascending: false });

      return (data || []).map((a: any) => ({
        id: a.id,
        appointment_number: a.appointment_number,
        scheduled_start: a.scheduled_start,
        appointment_status: a.appointment_status,
        duration_minutes: a.duration_minutes,
        payment_status: a.payment_status,
        payment_method: a.payment_method,
        pet_id: a.pets?.id ?? '',
        pet_name: a.pets?.name ?? '—',
        breed: a.pets?.breed ?? null,
        gender: a.pets?.gender ?? null,
        client_id: a.pets?.client_profiles?.id ?? '',
        client_name: a.pets?.client_profiles
          ? `${a.pets.client_profiles.first_name} ${a.pets.client_profiles.last_name}`
          : '—',
      }));
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  const {
    data: outreachAppointments = [],
    isLoading: outreachLoading,
    mutate: mutateOutreach,
  } = useSWR(
    activeTab === 'outreach_appointments' ? 'cms-outreach' : null,
    async () => {
      const { data } = await supabase
        .from('appointments')
        .select(`
          id, appointment_number, scheduled_start, appointment_status,
          is_aspin_puspin, payment_amount, payment_status,
          outreach_program_id,
          outreach_programs!appointments_outreach_program_id_fkey (title),
          pets!appointments_pet_id_fkey (
            id, name, breed,
            client_profiles!pets_owner_id_fkey (
              id, first_name, last_name
            )
          )
        `)
        .eq('appointment_type_detail', 'outreach')
        .order('scheduled_start', { ascending: false });

      return (data || []).map((a: any) => ({
        id: a.id,
        appointment_number: a.appointment_number,
        scheduled_start: a.scheduled_start,
        appointment_status: a.appointment_status,
        is_aspin_puspin: a.is_aspin_puspin ?? false,
        payment_amount: a.payment_amount,
        payment_status: a.payment_status,
        outreach_program_id: a.outreach_program_id,
        outreach_program_title: a.outreach_programs?.title ?? null,
        pet_id: a.pets?.id ?? '',
        pet_name: a.pets?.name ?? '—',
        breed: a.pets?.breed ?? null,
        client_id: a.pets?.client_profiles?.id ?? '',
        client_name: a.pets?.client_profiles
          ? `${a.pets.client_profiles.first_name} ${a.pets.client_profiles.last_name}`
          : '—',
      }));
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  const {
    data: notificationLogs = [],
    isLoading: notificationsLoading,
    mutate: mutateNotifications,
  } = useSWR(
    activeTab === 'notifications' ? 'cms-notifications' : null,
    fetchNotificationLogs,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  const loading =
    clientsLoading || petsLoading ||
    appointmentsLoading || regularLoading ||
    outreachLoading || notificationsLoading;

  useEffect(() => {
    setSearchTerm('');
    setStatusFilter('all');
  }, [activeTab, showArchived]);

  // ── Filtered data ─────────────────────────────────────────────────────────

  const filteredClients = clients.filter((c: ClientData) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q ||
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q);
    const matchesStatus = statusFilter === 'all' || c.account_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredPets = pets.filter((p: PetData) => {
    const q = searchTerm.toLowerCase();
    return !q ||
      p.name.toLowerCase().includes(q) ||
      p.species.toLowerCase().includes(q) ||
      p.owner_name.toLowerCase().includes(q);
  });

  const filteredAppointments = appointments.filter((a: AppointmentData) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q ||
      a.client_name.toLowerCase().includes(q) ||
      a.pet_name.toLowerCase().includes(q) ||
      a.reason.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredRegular = regularAppointments.filter(a => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q ||
      a.client_name.toLowerCase().includes(q) ||
      a.pet_name.toLowerCase().includes(q) ||
      (a.breed ?? '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || a.appointment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredOutreach = outreachAppointments.filter(a => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q ||
      a.client_name.toLowerCase().includes(q) ||
      a.pet_name.toLowerCase().includes(q) ||
      (a.outreach_program_title ?? '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || a.appointment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredNotifications = notificationLogs.filter(n => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q ||
      (n.subject ?? '').toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.notification_type.replace(/_/g, ' ').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || n.delivery_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleArchiveClient = async (
    userId: string,
    clientProfileId: string,
    name: string,
  ) => {
    setConfirmModal({
      title: 'Archive Client',
      message: `Archive ${name}? Their account will be set to inactive and flagged as archived.`,
      confirmLabel: 'Archive',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await fetch(
            `/api/client-admin/clients/${clientProfileId}/status`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ account_status: 'inactive', archived: true }),
            },
          );
          if (!res.ok) { showToast('Failed to archive client', 'error'); return; }
          showToast(`${name} archived successfully`);
          await mutateClients();
        } catch {
          showToast('Failed to archive client', 'error');
        }
      },
    });
  };

  const handleUnarchiveClient = async (
    clientProfileId: string,
    name: string,
  ) => {
    setConfirmModal({
      title: 'Unarchive Client',
      message: `Restore ${name}'s account? Their account will be set back to active and they will regain access.`,
      confirmLabel: 'Unarchive',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await fetch(
            `/api/client-admin/clients/${clientProfileId}/status`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ account_status: 'active', archived: false }),
            },
          );
          if (!res.ok) { showToast('Failed to unarchive client', 'error'); return; }
          showToast(`${name} has been restored successfully`);
          await mutateClients();
        } catch {
          showToast('Failed to unarchive client', 'error');
        }
      },
    });
  };

  const handleRefresh = () => {
    if (activeTab === 'clients') mutateClients();
    else if (activeTab === 'pets') mutatePets();
    else if (activeTab === 'appointments') mutateAppointments();
    else if (activeTab === 'regular_appointments') mutateRegular();
    else if (activeTab === 'outreach_appointments') mutateOutreach();
    else if (activeTab === 'notifications') mutateNotifications();
  };

  const handleToggleKaponAccess = async (pet: PetData, nextValue: boolean) => {
    setUpdatingPetId(pet.id);
    try {
      const res = await fetch(`/api/client-admin/pets?pet_id=${pet.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allow_repeat_kapon_booking: nextValue }),
      });

      if (!res.ok) {
        showToast('Failed to update pet booking access', 'error');
        return;
      }

      showToast(nextValue ? 'Repeat kapon booking enabled (one-time)' : 'Repeat kapon booking disabled');
      await mutatePets();
    } catch {
      showToast('Failed to update pet booking access', 'error');
    } finally {
      setUpdatingPetId(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const tabLabel: Record<ActiveTab, string> = {
    clients: 'Client Management',
    pets: 'Pet Management',
    appointments: 'All Appointments',
    regular_appointments: 'Regular Appointments',
    outreach_appointments: 'Outreach Appointments',
    notifications: 'Notification Logs',
  };

  const tabDesc: Record<ActiveTab, string> = {
    clients: 'Manage client accounts, profiles, and records',
    pets: 'All registered pets across all clients',
    appointments: 'Track and manage all scheduled appointments',
    regular_appointments: 'Clinic appointments booked through regular scheduling',
    outreach_appointments: 'Appointments booked through outreach programs',
    notifications: 'View all system notifications sent to clients',
  };

  const activeCount =
    activeTab === 'clients' ? filteredClients.length :
    activeTab === 'pets' ? filteredPets.length :
    activeTab === 'regular_appointments' ? filteredRegular.length :
    activeTab === 'outreach_appointments' ? filteredOutreach.length :
    activeTab === 'notifications' ? filteredNotifications.length :
    filteredAppointments.length;

  const totalCount =
    activeTab === 'clients' ? clients.length :
    activeTab === 'pets' ? pets.length :
    activeTab === 'regular_appointments' ? regularAppointments.length :
    activeTab === 'outreach_appointments' ? outreachAppointments.length :
    activeTab === 'notifications' ? notificationLogs.length :
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
        {/* Sticky tab bar */}
        <div className="sticky top-[64px] z-10 border-b border-border/70 bg-background/95 shadow-sm backdrop-blur-xl">
          <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 lg:px-8">
            {/* Page header — compact, above tabs */}
            <CmsBreadcrumb items={[{ label: 'CMS', href: '/client-admin?tab=clients' }, { label: tabLabel[activeTab] }]} />
            <CmsPageHeader
              className="mb-3"
              title={tabLabel[activeTab]}
              description={tabDesc[activeTab]}
              count={totalCount}
            />

          </div>
        </div>

        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">

        {/* Filters */}
        <CmsCard className="mb-6 border-l-4 border-l-primary/40 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] md:min-w-[280px]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200 text-sm placeholder:italic"
                placeholder={
                  activeTab === 'clients' ? 'Search by name, email, phone…' :
                  activeTab === 'pets' ? 'Search by pet name, species, owner…' :
                  activeTab === 'regular_appointments' ? 'Search by client, pet, breed…' :
                  activeTab === 'outreach_appointments' ? 'Search by client, pet, program…' :
                  activeTab === 'notifications' ? 'Search by subject, content, type…' :
                  'Search by client, pet, or reason…'
                }
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Status filter */}
            {(activeTab === 'clients' || activeTab === 'appointments' || activeTab === 'regular_appointments' || activeTab === 'outreach_appointments' || activeTab === 'notifications') && (
              <div className="relative">
                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <select
                  className="pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200 text-sm font-medium cursor-pointer"
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
                  ) : activeTab === 'notifications' ? (
                    <>
                      <option value="pending">Pending</option>
                      <option value="sent">Sent</option>
                      <option value="delivered">Delivered</option>
                      <option value="failed">Failed</option>
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
              </div>
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

            {activeTab === 'pets' && (
              <div className="inline-flex items-center rounded-lg border border-border bg-background p-1">
                <button
                  onClick={() => setPetsView('cards')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                    petsView === 'cards'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setPetsView('table')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                    petsView === 'table'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Table
                </button>
              </div>
            )}

            {/* Export CSV button for new tabs */}
            {(activeTab === 'regular_appointments' || activeTab === 'outreach_appointments') && (
              <button
                onClick={() => {
                  if (activeTab === 'regular_appointments') exportRegularCSV(filteredRegular);
                  else exportOutreachCSV(filteredOutreach);
                }}
                disabled={activeCount === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 font-semibold text-sm disabled:opacity-55"
              >
                <Download size={15} /> Export CSV
              </button>
            )}

            <button 
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 font-semibold text-sm"
            >
              <RefreshCw size={16} /> 
              Refresh
            </button>

            <div className="flex-1 md:flex-none text-right">
              <span className="rounded-full border border-border bg-accent px-3 py-1 text-xs font-bold text-foreground">
                {activeCount} of {totalCount}
              </span>
            </div>
          </div>
        </CmsCard>

        {/* Table */}
        <CmsCard className="overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 bg-gradient-to-br from-primary/5 to-transparent">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-pulse"></div>
                <div className="absolute inset-1 border-t-4 border-primary rounded-full animate-spin"></div>
              </div>
              <span className="text-muted-foreground font-medium">Loading {activeTab.replace(/_/g, ' ')}…</span>
            </div>
          ) : (
            <div className="overflow-x-auto">

              {/* CLIENTS TABLE */}
              {activeTab === 'clients' && (
                filteredClients.length === 0 ? (
                  <CmsEmptyState
                    icon={Users}
                    title="No clients found"
                    description="Try adjusting your search or filters"
                  />
                ) : (
                  <table className="w-full">
                    <thead className="bg-primary/5 border-t border-b border-border">
                      <tr>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Client</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Contact</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Location</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Status</th>
                        <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Pets</th>
                        <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Apts</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Last Login</th>
                        <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredClients.map((c: ClientData) => (
                        <tr key={c.id} className="hover:bg-primary/[0.08] transition-colors duration-150">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mr-3">
                                {c.first_name[0]}{c.last_name[0]}
                              </div>
                              <div>
                                <div className="font-semibold text-foreground">{c.first_name} {c.last_name}</div>
                                <div className="text-xs text-muted-foreground font-mono mt-1">{c.id.slice(0, 8)}…</div>
                                {showArchived && c.deleted_at && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 mt-0.5 inline-block">ARCHIVED</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-foreground">{c.email}</div>
                            <div className="text-xs text-muted-foreground">{c.phone}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{c.city}, {c.state}</td>
                          <td className="px-6 py-4"><CmsStatusBadge status={c.account_status} /></td>
                          <td className="px-6 py-4 text-center font-semibold text-foreground">{c.pet_count ?? '—'}</td>
                          <td className="px-6 py-4 text-center font-semibold text-foreground">{c.appointment_count ?? '—'}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(c.last_login_at)}</td>
                          <td className="px-6 py-4 text-right">
                            <ActionsDropdown items={
                              showArchived
                                ? [
                                    { label: 'View Profile', href: `/client-admin/clients/${c.id}` },
                                    { label: 'Edit Profile', href: `/client-admin/clients/${c.id}/edit` },
                                    { label: 'Unarchive', onClick: () => handleUnarchiveClient(c.id, `${c.first_name} ${c.last_name}`) },
                                  ]
                                : [
                                    { label: 'View Profile', href: `/client-admin/clients/${c.id}` },
                                    { label: 'Edit Profile', href: `/client-admin/clients/${c.id}/edit` },
                                    { label: 'Archive', danger: true, onClick: () => handleArchiveClient(c.user_id, c.id, `${c.first_name} ${c.last_name}`) },
                                  ]
                            } />
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
                  <CmsEmptyState
                    icon={PawPrint}
                    title="No pets found"
                    description="Try adjusting your search"
                  />
                ) : petsView === 'cards' ? (
                  <div className="p-6 md:p-7">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-7">
                      {filteredPets.map((p: PetData) => (
                        <div
                          key={p.id}
                          className="group rounded-2xl border border-border/80 bg-card/95 shadow-sm hover:shadow-xl hover:-translate-y-0.5 hover:border-primary/30 transition-all duration-200 overflow-hidden"
                        >
                          <div className="h-48 bg-gradient-to-br from-accent/30 via-accent/15 to-transparent border-b border-border/70 overflow-hidden">
                            {p.photo_url ? (
                              <img
                                src={p.photo_url}
                                alt={p.name}
                                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center ring-1 ring-primary/20">
                                  <PawPrint size={30} />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="p-5 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-bold text-foreground text-lg leading-tight tracking-tight">{p.name}</h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {p.species} • {p.breed}
                                </p>
                              </div>
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                p.is_active
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                  : 'bg-muted text-muted-foreground'
                              }`}>
                                {p.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2.5">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Age</p>
                                <p className="font-semibold text-foreground mt-0.5">{calcAge(p.date_of_birth)}</p>
                              </div>
                              <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2.5">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Weight</p>
                                <p className="font-semibold text-foreground mt-0.5">{p.weight ? `${p.weight} kg` : '—'}</p>
                              </div>
                            </div>

                            <div className="rounded-xl border border-border/70 bg-background/70 px-3.5 py-3">
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Owner</p>
                              <Link href={`/client-admin/clients/${p.owner_id}`} className="text-sm text-primary hover:underline font-semibold transition-colors">
                                {p.owner_name}
                              </Link>
                              <p className="text-xs text-muted-foreground mt-0.5">{p.owner_phone || '—'}</p>
                            </div>

                            <div className="rounded-xl border border-border/70 bg-background/70 px-3.5 py-3 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Repeat Kapon Booking</p>
                                <p className="text-xs font-semibold text-foreground mt-0.5">
                                  {p.allow_repeat_kapon_booking ? 'Allowed once' : 'Disabled'}
                                </p>
                              </div>
                              <button
                                disabled={updatingPetId === p.id}
                                onClick={() => handleToggleKaponAccess(p, !p.allow_repeat_kapon_booking)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 disabled:opacity-55 ${
                                  p.allow_repeat_kapon_booking
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                    : 'bg-muted text-muted-foreground hover:bg-accent'
                                }`}
                              >
                                {updatingPetId === p.id ? 'Saving...' : p.allow_repeat_kapon_booking ? 'Allow' : 'Disabled'}
                              </button>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <Link href={`/client-admin/pets/${p.id}`} className="p-2.5 rounded-xl border border-border/70 hover:border-primary/30 hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-150" title="View Pet">
                                <Eye size={16} />
                              </Link>
                              <Link href={`/client-admin/clients/${p.owner_id}`} className="p-2.5 rounded-xl border border-border/70 hover:border-primary/30 hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-150" title="View Owner">
                                <Users size={16} />
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-primary/5 border-t border-b border-border">
                      <tr>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Pet</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Species</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Breed</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Age</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Owner</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Phone</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Kapon</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Status</th>
                        <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredPets.map((p: PetData) => (
                        <tr key={p.id} className="hover:bg-primary/[0.08] transition-colors duration-150">
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
                            <button
                              disabled={updatingPetId === p.id}
                              onClick={() => handleToggleKaponAccess(p, !p.allow_repeat_kapon_booking)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-150 disabled:opacity-55 ${
                                p.allow_repeat_kapon_booking
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                  : 'bg-muted text-muted-foreground hover:bg-accent'
                              }`}
                            >
                              {updatingPetId === p.id ? 'Saving...' : p.allow_repeat_kapon_booking ? 'Allow' : 'Disabled'}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              p.is_active
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {p.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/client-admin/pets/${p.id}`} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-150" title="View Pet">
                                <Eye size={16} />
                              </Link>
                              <Link href={`/client-admin/clients/${p.owner_id}`} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-150" title="View Owner">
                                <Users size={16} />
                              </Link>
                            </div>
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
                  <CmsEmptyState
                    icon={Calendar}
                    title="No appointments found"
                    description="Try adjusting your search or filters"
                  />
                ) : (
                  <table className="w-full">
                    <thead className="bg-primary/5 border-t border-b border-border">
                      <tr>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Date & Time</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Client</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Pet</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Reason</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Status</th>
                        <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredAppointments.map((a: AppointmentData) => (
                        <tr key={a.id} className="hover:bg-primary/[0.08] transition-colors duration-150">
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
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                            }`}>{a.status}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/client-admin/appointments/${a.id}`} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-150" title="View Details">
                                <Eye size={16} />
                              </Link>
                              <Link href={`/client-admin/clients/${a.client_id}`} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-150" title="View Client">
                                <Users size={16} />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {/* REGULAR APPOINTMENTS TABLE */}
              {activeTab === 'regular_appointments' && (
                filteredRegular.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6 gap-4 text-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
                      <ClipboardList size={28} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-foreground mb-1">No regular appointments found</h3>
                      <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-primary/5 border-t border-b border-border">
                      <tr>
                        {['Date', 'Client', 'Pet', 'Breed', 'Gender', 'Duration', 'Payment', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredRegular.map(a => (
                        <tr key={a.id} className="hover:bg-primary/[0.08] transition-colors duration-150">
                          <td className="px-5 py-4">
                            <div className="text-sm font-semibold text-foreground whitespace-nowrap">
                              {formatDate(a.scheduled_start)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {new Date(a.scheduled_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <Link href={`/client-admin/clients/${a.client_id}`} className="text-sm text-primary hover:underline font-medium">
                              {a.client_name}
                            </Link>
                          </td>
                          <td className="px-5 py-4">
                            <Link href={`/client-admin/pets/${a.pet_id}`} className="text-sm text-primary hover:underline font-medium">
                              {a.pet_name}
                            </Link>
                          </td>
                          <td className="px-5 py-4 text-sm text-muted-foreground">{a.breed ?? '—'}</td>
                          <td className="px-5 py-4 text-sm text-muted-foreground capitalize">{a.gender ?? '—'}</td>
                          <td className="px-5 py-4 text-sm text-foreground">{a.duration_minutes ? `${a.duration_minutes}min` : '—'}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              a.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' :
                              a.payment_status === 'waived' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' :
                              'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                            }`}>
                              {a.payment_status ?? 'unpaid'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              a.appointment_status === 'confirmed' || a.appointment_status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                : a.appointment_status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300'
                                : a.appointment_status === 'no_show'
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                            }`}>{a.appointment_status}</span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/client-admin/appointments/${a.id}`} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-150" title="View Details">
                                <Eye size={16} />
                              </Link>
                              <Link href={`/client-admin/clients/${a.client_id}`} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-150" title="View Client">
                                <Users size={16} />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {/* OUTREACH APPOINTMENTS TABLE */}
              {activeTab === 'outreach_appointments' && (
                filteredOutreach.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6 gap-4 text-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
                      <MapPin size={28} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-foreground mb-1">No outreach appointments found</h3>
                      <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-primary/5 border-t border-b border-border">
                      <tr>
                        {['Date', 'Client', 'Pet', 'Breed', 'Aspin/Puspin', 'Program', 'Amount', 'Payment', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredOutreach.map(a => (
                        <tr key={a.id} className="hover:bg-primary/[0.08] transition-colors duration-150">
                          <td className="px-4 py-4">
                            <div className="text-sm font-semibold text-foreground whitespace-nowrap">
                              {formatDate(a.scheduled_start)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {new Date(a.scheduled_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Link href={`/client-admin/clients/${a.client_id}`} className="text-sm text-primary hover:underline font-medium">
                              {a.client_name}
                            </Link>
                          </td>
                          <td className="px-4 py-4">
                            <Link href={`/client-admin/pets/${a.pet_id}`} className="text-sm text-primary hover:underline font-medium">
                              {a.pet_name}
                            </Link>
                          </td>
                          <td className="px-4 py-4 text-sm text-muted-foreground">{a.breed ?? '—'}</td>
                          <td className="px-4 py-4">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${a.is_aspin_puspin ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                              {a.is_aspin_puspin ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {a.outreach_program_id ? (
                              <Link href={`/client-admin/outreach`} className="text-xs text-primary hover:underline font-medium max-w-[120px] truncate block">
                                {a.outreach_program_title ?? 'View Program'}
                              </Link>
                            ) : <span className="text-sm text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-4 text-sm font-medium text-foreground">
                            {a.payment_amount != null
                              ? a.payment_amount === 0 ? 'Free' : `₱${a.payment_amount.toLocaleString()}`
                              : '—'}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              a.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' :
                              a.payment_status === 'waived' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' :
                              'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                            }`}>
                              {a.payment_status ?? 'unpaid'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              a.appointment_status === 'confirmed' || a.appointment_status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                : a.appointment_status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300'
                                : a.appointment_status === 'no_show'
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                            }`}>{a.appointment_status}</span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/client-admin/appointments/${a.id}`} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-150" title="View Details">
                                <Eye size={16} />
                              </Link>
                              <Link href={`/client-admin/clients/${a.client_id}`} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-150" title="View Client">
                                <Users size={16} />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {/* NOTIFICATIONS TABLE */}
              {activeTab === 'notifications' && (
                filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6 gap-4 text-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
                      <Bell size={28} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-foreground mb-1">No notifications found</h3>
                      <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-primary/5 border-t border-b border-border">
                      <tr>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Sent</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Type</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Subject</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Content</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Delivery</th>
                        <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90">Read</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredNotifications.map(n => (
                        <tr key={n.id} className="hover:bg-primary/[0.08] transition-colors duration-150">
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-foreground whitespace-nowrap">{formatDate(n.sent_at)}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {new Date(n.sent_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              n.notification_type === 'appointment_confirmed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' :
                              n.notification_type === 'appointment_cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' :
                              n.notification_type === 'appointment_reminder' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' :
                              n.notification_type === 'payment_due' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' :
                              n.notification_type === 'test_results' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {n.notification_type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground font-medium max-w-[200px] truncate" title={n.subject ?? ''}>
                            {n.subject || '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate" title={n.content}>
                            {n.content}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              n.delivery_status === 'delivered' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' :
                              n.delivery_status === 'sent' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' :
                              n.delivery_status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' :
                              'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                            }`}>
                              {n.delivery_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              n.is_read
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {n.is_read ? 'Read' : 'Unread'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

            </div>
          )}
        </CmsCard>
        </div>{/* max-w container */}
      </div>
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

export default function ClientAdminPage() {
  return (
    <Suspense fallback={
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    }>
      <ClientAdminPageInner />
    </Suspense>
  );
}

