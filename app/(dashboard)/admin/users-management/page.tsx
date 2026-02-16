'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Stethoscope, Users, ShieldCheck } from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  account_status?: string;
  email_verified?: boolean;
  last_login_at?: string;
  created_at: string;
  avatar_url?: string;
}

const COLORS = {
  primary: '#2D5016',
  accent: '#7FA650',
  muted: '#D4C5A9',
  textMuted: '#8C7A5B',
  bgLight: '#F5F0E8',
  border: '#E8E2D6',
  dark: '#1A1A1A',
  bg: '#FAFAF7',
  red: '#C0392B',
  green: '#48BB78',
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vetSearch, setVetSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    petOwners: 0,
    veterinarians: 0,
    admins: 0,
    active: 0,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/user');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }
      const usersData = await response.json();
      setUsers(usersData);

      const total = usersData.length;
      const petOwners = usersData.filter((u: User) => u.role === 'client').length;
      const veterinarians = usersData.filter((u: User) => u.role === 'veterinarian').length;
      const admins = usersData.filter((u: User) => u.role === 'admin').length;
      const active = usersData.filter((u: User) => u.account_status === 'active' || u.email_verified).length;
      setStats({ total, petOwners, veterinarians, admins, active });
    } catch (error: any) {
      console.error('Error loading users:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const vets = users.filter((u) => u.role === 'veterinarian');
  const clients = users.filter((u) => u.role === 'client');
  const admins = users.filter((u) => u.role === 'admin');

  const filterUsers = (list: User[], query: string) => {
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.first_name?.toLowerCase().includes(q) ||
        u.last_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    );
  };

  const filteredVets = filterUsers(vets, vetSearch);
  const filteredClients = filterUsers(clients, clientSearch);
  const filteredAdmins = filterUsers(admins, adminSearch);

  function getUserDisplayName(user: User) {
    if (user.full_name) return user.full_name;
    if (user.first_name || user.last_name)
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return user.email;
  }

  function getInitials(user: User) {
    const name = getUserDisplayName(user);
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.charAt(0).toUpperCase();
  }

  function isActive(user: User) {
    return user.account_status === 'active' || user.email_verified === true;
  }

  function handleViewUser(user: User) {
    const roleRouteMap: Record<string, string> = {
      client: 'client',
      veterinarian: 'vet',
      admin: 'admin',
    };
    const route = roleRouteMap[user.role] || 'client';
    router.push(`/admin/users-management/${route}/${user.id}`);
  }

  // Reusable user list panel
  function UserPanel({
    title,
    icon: Icon,
    iconBg,
    iconColor,
    borderColor,
    users: userList,
    search,
    setSearch,
    emptyLabel,
  }: {
    title: string;
    icon: any;
    iconBg: string;
    iconColor: string;
    borderColor: string;
    users: User[];
    search: string;
    setSearch: (s: string) => void;
    emptyLabel: string;
  }) {
    return (
      <div
        className="bg-white rounded-2xl border-2 shadow-sm flex flex-col"
        style={{ borderColor, minHeight: '420px' }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: iconBg }}
            >
              <Icon className="w-4 h-4" style={{ color: iconColor }} />
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: COLORS.dark }}>
                {title}
              </h2>
              <p className="text-[10px]" style={{ color: COLORS.textMuted }}>
                {userList.length} {userList.length === 1 ? 'user' : 'users'}
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 pb-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: COLORS.muted }}
            />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-xl"
              style={{
                borderColor: COLORS.border,
                backgroundColor: COLORS.bg,
              }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          <div className="space-y-1">
            {userList.length > 0 ? (
              userList.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors"
                  style={{ }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = COLORS.bgLight)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  onClick={() => handleViewUser(user)}
                >
                  <div className="relative flex-shrink-0">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={getUserDisplayName(user)}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: COLORS.bgLight }}
                      >
                        <span
                          className="text-sm font-semibold"
                          style={{ color: COLORS.textMuted }}
                        >
                          {getInitials(user)}
                        </span>
                      </div>
                    )}
                    <div
                      className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-white"
                      style={{
                        backgroundColor: isActive(user) ? COLORS.green : COLORS.red,
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[13px] font-medium truncate"
                      style={{ color: COLORS.dark }}
                    >
                      {getUserDisplayName(user)}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: COLORS.textMuted }}>
                      {user.email}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-md flex-shrink-0"
                    style={{
                      backgroundColor: isActive(user) ? COLORS.accent + '18' : COLORS.red + '18',
                      color: isActive(user) ? COLORS.accent : COLORS.red,
                    }}
                  >
                    {isActive(user) ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: COLORS.muted }}>
                  {emptyLabel}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="space-y-4 max-w-[1400px] mx-auto p-6"
        style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: COLORS.bg, minHeight: '100vh' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border p-5 shadow-sm"
              style={{ borderColor: COLORS.border }}
            >
              <div className="h-3 w-16 bg-gray-200 animate-pulse rounded mb-2"></div>
              <div className="h-7 w-10 bg-gray-200 animate-pulse rounded"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border-2 p-5 shadow-sm"
              style={{ borderColor: COLORS.border, minHeight: '400px' }}
            >
              <div className="h-5 w-28 bg-gray-200 animate-pulse rounded mb-4"></div>
              <div className="h-9 bg-gray-200 animate-pulse rounded mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                    <div>
                      <div className="h-4 w-32 bg-gray-200 animate-pulse rounded mb-1"></div>
                      <div className="h-3 w-24 bg-gray-200 animate-pulse rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="mb-4" style={{ color: COLORS.red }}>{error}</p>
          <Button onClick={loadUsers} className="text-white" style={{ backgroundColor: COLORS.primary }}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-5 max-w-[1400px] mx-auto p-6"
      style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: COLORS.bg, minHeight: '100vh' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: COLORS.primary }}
          >
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: COLORS.dark }}>
              Users Management
            </h1>
            <p className="text-sm" style={{ color: COLORS.textMuted }}>
              Manage all system users
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats.total, icon: Users, color: COLORS.primary },
          { label: 'Veterinarians', value: stats.veterinarians, icon: Stethoscope, color: COLORS.accent },
          { label: 'Clients', value: stats.petOwners, icon: Users, color: COLORS.textMuted },
          { label: 'Admins', value: stats.admins, icon: ShieldCheck, color: COLORS.primary },
        ].map((m, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border p-4 shadow-sm"
            style={{ borderColor: COLORS.border }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: m.color + '18' }}
              >
                <m.icon className="w-5 h-5" style={{ color: m.color }} />
              </div>
              <div>
                <p className="text-[11px] font-medium" style={{ color: COLORS.textMuted }}>
                  {m.label}
                </p>
                <p className="text-xl font-bold" style={{ color: COLORS.dark }}>
                  {m.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3-Panel Grid: Vets, Clients, Admins */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <UserPanel
          title="Veterinarians"
          icon={Stethoscope}
          iconBg={COLORS.accent + '20'}
          iconColor={COLORS.accent}
          borderColor={COLORS.accent}
          users={filteredVets}
          search={vetSearch}
          setSearch={setVetSearch}
          emptyLabel="No veterinarians found"
        />

        <UserPanel
          title="Clients"
          icon={Users}
          iconBg={COLORS.bgLight}
          iconColor={COLORS.textMuted}
          borderColor={COLORS.border}
          users={filteredClients}
          search={clientSearch}
          setSearch={setClientSearch}
          emptyLabel="No clients found"
        />

        <UserPanel
          title="Admins"
          icon={ShieldCheck}
          iconBg={COLORS.primary + '18'}
          iconColor={COLORS.primary}
          borderColor={COLORS.primary}
          users={filteredAdmins}
          search={adminSearch}
          setSearch={setAdminSearch}
          emptyLabel="No admins found"
        />
      </div>
    </div>
  );
}
