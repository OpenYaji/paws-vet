'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Stethoscope, Users, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';

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

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [vetSearch, setVetSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [adminSearch, setAdminSearch] = useState('');

  const [vetPage, setVetPage] = useState(1);
  const [clientPage, setClientPage] = useState(1);
  const [adminPage, setAdminPage] = useState(1);
  
  // Set to 7 as requested
  const ITEMS_PER_PAGE = 7;

  const [stats, setStats] = useState({
    total: 0,
    petOwners: 0,
    veterinarians: 0,
    admins: 0,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/user');
      if (!response.ok) throw new Error('Failed to fetch users');
      const usersData = await response.json();
      setUsers(usersData);

      setStats({
        total: usersData.length,
        petOwners: usersData.filter((u: User) => u.role === 'client').length,
        veterinarians: usersData.filter((u: User) => u.role === 'veterinarian').length,
        admins: usersData.filter((u: User) => u.role === 'admin').length,
      });
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const filterUsers = (list: User[], query: string) => {
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(u => 
      u.full_name?.toLowerCase().includes(q) || 
      u.email?.toLowerCase().includes(q)
    );
  };

  const paginatedList = (list: User[], page: number) => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return list.slice(start, start + ITEMS_PER_PAGE);
  };

  const vets = filterUsers(users.filter(u => u.role === 'veterinarian'), vetSearch);
  const clients = filterUsers(users.filter(u => u.role === 'client'), clientSearch);
  const admins = filterUsers(users.filter(u => u.role === 'admin'), adminSearch);

  function getUserDisplayName(user: User) {
    return user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
  }

  function getInitials(user: User) {
    const name = getUserDisplayName(user);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  function UserPanel({
    title,
    icon: Icon,
    users: userList,
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    emptyLabel,
  }: {
    title: string;
    icon: any;
    users: User[];
    search: string;
    setSearch: (s: string) => void;
    currentPage: number;
    setCurrentPage: (p: number) => void;
    emptyLabel: string;
  }) {
    const totalPages = Math.ceil(userList.length / ITEMS_PER_PAGE);
    const displayUsers = paginatedList(userList, currentPage);

    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm flex flex-col h-[620px]">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
              <p className="text-[10px] text-muted-foreground">{userList.length} total</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="pl-9 h-9 text-sm rounded-xl border-border bg-background"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          <div className="space-y-1">
            {displayUsers.length > 0 ? (
              displayUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors hover:bg-accent"
                  onClick={() => router.push(`/admin/users-management/${user.role === 'veterinarian' ? 'vet' : user.role}/${user.id}`)}
                >
                  <div className="relative flex-shrink-0">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-secondary text-[11px] font-bold text-secondary-foreground">
                        {getInitials(user)}
                      </div>
                    )}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${user.account_status === 'active' ? 'bg-green-500' : 'bg-destructive'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold truncate text-foreground">{getUserDisplayName(user)}</p>
                    <p className="text-[10px] truncate text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <p className="text-xs text-muted-foreground">{emptyLabel}</p>
              </div>
            )}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-border flex items-center justify-between bg-muted/20 rounded-b-2xl">
            <p className="text-[10px] text-muted-foreground">Page {currentPage} of {totalPages}</p>
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-7 w-7 rounded-lg" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-7 w-7 rounded-lg" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-[1400px] mx-auto p-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5"><Skeleton className="h-3 w-16 mb-2" /><Skeleton className="h-7 w-10" /></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 h-[620px]">
              <Skeleton className="h-5 w-28 mb-4" />
              <Skeleton className="h-9 w-full mb-6 rounded-xl" />
              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                  <div key={j} className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-full" />
                    <div className="space-y-1"><Skeleton className="h-3 w-32" /><Skeleton className="h-2 w-24" /></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto p-6 min-h-screen bg-background">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-primary">
          <Users className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users Management</h1>
          <p className="text-sm text-muted-foreground">Manage and monitor all system users</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats.total, icon: Users },
          { label: 'Veterinarians', value: stats.veterinarians, icon: Stethoscope },
          { label: 'Clients', value: stats.petOwners, icon: Users },
          { label: 'Admins', value: stats.admins, icon: ShieldCheck },
        ].map((m, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                <m.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase">{m.label}</p>
                <p className="text-xl font-bold text-foreground">{m.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <UserPanel
          title="Veterinarians"
          icon={Stethoscope}
          users={vets}
          search={vetSearch}
          setSearch={setVetSearch}
          currentPage={vetPage}
          setCurrentPage={setVetPage}
          emptyLabel="No veterinarians found"
        />
        <UserPanel
          title="Clients"
          icon={Users}
          users={clients}
          search={clientSearch}
          setSearch={setClientSearch}
          currentPage={clientPage}
          setCurrentPage={setClientPage}
          emptyLabel="No clients found"
        />
        <UserPanel
          title="Admins"
          icon={ShieldCheck}
          users={admins}
          search={adminSearch}
          setSearch={setAdminSearch}
          currentPage={adminPage}
          setCurrentPage={setAdminPage}
          emptyLabel="No admins found"
        />
      </div>
    </div>
  );
}