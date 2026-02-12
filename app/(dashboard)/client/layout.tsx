'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/auth-client';
import ClientSidebar from '@/components/client/client-sidebar';
import { Menu } from 'lucide-react';

export default function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null); // State for first/last name
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // Fetch profile details from the client_profiles table
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-center">
        <div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar Container */}
      <div className="hidden md:flex flex-shrink-0 border-r border-border bg-card h-full">
        <ClientSidebar
          profile={profile}
          collapsed={collapsed} 
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />
      </div>

      {/* Mobile Sidebar Container */}
      <div className="md:hidden">
         <ClientSidebar
            profile={profile}
            collapsed={collapsed} 
            setCollapsed={setCollapsed}
            mobileOpen={mobileOpen}
            setMobileOpen={setMobileOpen}
          />
      </div>
      
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="md:hidden border-b border-border bg-card px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <button onClick={() => setMobileOpen(true)} className="p-2 hover:bg-accent rounded-lg">
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