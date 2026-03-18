'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/auth-client';
import ClientSidebar from '@/components/client/client-sidebar';
import ClientThemeProvider from '@/components/client/theme-provider';
import { Menu } from 'lucide-react';

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
    <div className="flex h-screen w-screen overflow-hidden bg-background transition-colors duration-200">
      {/* Desktop Sidebar — completely fixed, never scrolls */}
      <div className="hidden md:flex flex-shrink-0 h-screen overflow-hidden">
        <ClientSidebar
          profile={profile}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          navSettings={navSettings}
        />
      </div>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <ClientSidebar
          profile={profile}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          navSettings={navSettings}
        />
      </div>

      {/* Main content — ONLY this scrolls */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto overflow-x-hidden">
        {/* Mobile header */}
        <header className="md:hidden border-b border-border bg-card px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <button onClick={() => setMobileOpen(true)} className="p-2 hover:bg-accent rounded-lg transition-colors duration-200">
            <Menu size={24} />
          </button>
          <span className="font-bold">PAWS Client</span>
          <div className="w-10"></div>
        </header>

        <main className="p-6">{children}</main>
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
