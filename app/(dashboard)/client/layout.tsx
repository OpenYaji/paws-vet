'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/auth-client';
import ClientSidebar from '@/components/client/client-sidebar';
import ClientTopbar from '@/components/client/client-topbar';
import ClientThemeProvider from '@/components/client/theme-provider';

interface NavSettings {
  show_dashboard: boolean;
  show_appointments: boolean;
  show_history: boolean;
  show_pets: boolean;
  show_products: boolean;
  show_services: boolean;
  show_transactions: boolean;
  show_faq: boolean;
  show_settings: boolean;
}

function ClientLayoutContent({ children, profile, collapsed, setCollapsed, mobileOpen, setMobileOpen, navSettings }: any) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50/80 transition-colors duration-200 dark:bg-background">
      <ClientTopbar
        profile={profile}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        setMobileOpen={setMobileOpen}
      />

      <ClientSidebar
        profile={profile}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        navSettings={navSettings}
      />

      <div className={`h-full w-full pt-16 transition-[padding-left] duration-300 ${collapsed ? 'md:pl-20' : 'md:pl-72'}`}>
        <div className="h-full overflow-y-auto overflow-x-hidden">
          <main className="mx-auto min-h-[calc(100vh-64px)] w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navSettings, setNavSettings] = useState<NavSettings>({
    show_dashboard: true,
    show_appointments: true,
    show_history: true,
    show_pets: true,
    show_products: true,
    show_services: true,
    show_transactions: true,
    show_faq: true,
    show_settings: true,
  });
  const router = useRouter();

  // Lock body/html scroll — only the content panel should scroll
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100%';
    return () => {
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, []);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('client_profiles')
        .select('first_name, last_name')
        .eq('user_id', session.user.id)
        .single();

      setUser(session.user);
      setProfile(profileData);
      setIsLoading(false);
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    supabase
      .from('nav_settings')
      .select('*')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data) setNavSettings(data);
      });
  }, []);

  if (isLoading) {
    return (
      <ClientThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-background text-center">
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading Profile...</p>
          </div>
        </div>
      </ClientThemeProvider>
    );
  }

  return (
    <ClientThemeProvider>
      <ClientLayoutContent
        profile={profile}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        navSettings={navSettings}
      >
        {children}
      </ClientLayoutContent>
    </ClientThemeProvider>
  );
}
