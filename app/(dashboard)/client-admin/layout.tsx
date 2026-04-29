'use client';

import Link from 'next/link';
import { Suspense, useState, useEffect } from 'react';
import { supabase } from '@/lib/auth-client';
import ClientThemeProvider from '@/components/client/theme-provider';
import { Menu, PanelLeft, PawPrint } from 'lucide-react';
import { CmsNotificationBell } from '@/components/notifications/cms-notification-bell';
import ClientAdminSidebar from '@/components/client/client-admin-sidebar';

interface SidebarProfile {
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
}

function ClientAdminNav({
  onToggleSidebar,
  onOpenMobileSidebar,
}: {
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
}) {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/client-admin/notifications/unread-count');
        if (res.ok) {
          const { count } = await res.json();
          setUnreadCount(count ?? 0);
        }
      } catch {
        // silent fail — bell just shows no badge
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        // Try admin_profiles first, then veterinarian_profiles
        const { data: admin } = await supabase
          .from('admin_profiles')
          .select('first_name, last_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (admin) {
          setDisplayName(`${admin.first_name} ${admin.last_name}`);
          return;
        }

        const { data: vet } = await supabase
          .from('veterinarian_profiles')
          .select('first_name, last_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (vet) {
          setDisplayName(`${vet.first_name} ${vet.last_name}`);
          return;
        }

        // Try client_profiles as fallback
        const { data: clientProfile } = await supabase
          .from('client_profiles')
          .select('first_name, last_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (clientProfile) {
          setDisplayName(
            `${clientProfile.first_name} ${clientProfile.last_name}`
          );
          return;
        }

        // Final fallback to email
        setDisplayName(user.email ?? null);
      } catch {
        // silently fail — name is cosmetic
      }
    })();
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[64px] w-full max-w-[1500px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleSidebar}
              className="hidden h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-all duration-150 hover:border-primary/40 hover:bg-accent hover:text-foreground md:inline-flex"
              aria-label="Toggle sidebar"
            >
              <PanelLeft size={16} />
            </button>
            <button
              onClick={onOpenMobileSidebar}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-all duration-150 hover:border-primary/40 hover:bg-accent hover:text-foreground md:hidden"
              aria-label="Open navigation"
            >
              <Menu size={16} />
            </button>

          {/* Logo */}
          <Link href="/client-admin" className="group flex items-center gap-3 no-underline">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary transition-all duration-200 group-hover:scale-[1.03] group-hover:bg-primary/15">
              <PawPrint size={18} />
            </div>
            <div className="leading-tight">
              <span className="block text-[17px] font-bold tracking-tight text-foreground">PawsVet CMS</span>
              <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Client Admin</span>
            </div>
          </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Live status dot */}
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 sm:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Online</span>
            </div>

            {/* Admin name */}
            {displayName && (
              <span className="hidden max-w-[200px] truncate text-sm font-medium text-muted-foreground sm:block">
                {displayName}
              </span>
            )}

            {/* Notifications */}
            {userId && (
              <CmsNotificationBell
                userId={userId}
                className="text-muted-foreground hover:bg-accent hover:text-foreground"
                viewAllHref="/client-admin/notifications"
              />
            )}

          </div>
      </div>
    </header>
  );
}

export default function ClientAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<SidebarProfile | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data: admin } = await supabase
          .from('admin_profiles')
          .select('first_name,last_name,avatar_url')
          .eq('user_id', user.id)
          .maybeSingle();

        if (admin) {
          setProfile(admin);
          return;
        }

        const { data: vet } = await supabase
          .from('veterinarian_profiles')
          .select('first_name,last_name,avatar_url')
          .eq('user_id', user.id)
          .maybeSingle();

        if (vet) {
          setProfile(vet);
          return;
        }

        const { data: client } = await supabase
          .from('client_profiles')
          .select('first_name,last_name,avatar_url')
          .eq('user_id', user.id)
          .maybeSingle();

        if (client) setProfile(client);
      } catch {
        // Keep shell usable even if profile query fails.
      }
    })();
  }, []);

  return (
    <ClientThemeProvider>
      <>
      <div className="min-h-screen bg-background text-foreground">
        <Suspense fallback={
          <div className="flex h-[64px] items-center border-b border-border/70 bg-background px-6">
            <span className="text-[17px] font-bold tracking-tight text-foreground">PawsVet CMS</span>
          </div>
        }>
          <ClientAdminNav
            onToggleSidebar={() => setCollapsed(prev => !prev)}
            onOpenMobileSidebar={() => setMobileOpen(true)}
          />
        </Suspense>

        <div className="relative flex min-h-[calc(100vh-64px)] bg-gradient-to-b from-background via-background to-accent/10">
          <ClientAdminSidebar
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            mobileOpen={mobileOpen}
            setMobileOpen={setMobileOpen}
            profile={profile}
          />

          <main className={`min-w-0 flex-1 transition-[margin] duration-300 ${collapsed ? 'md:ml-20' : 'md:ml-72'}`}>
            {children}
          </main>
        </div>
      </div>
      </>
    </ClientThemeProvider>
  );
}
