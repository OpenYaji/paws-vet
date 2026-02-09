'use client';

import React, { useState } from "react"
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/auth-client';
import VetSidebar from '@/components/veterinarian/vet-sidebar';
import  VetHeader from "@/components/veterinarian/vet-header";

export default function VeterinarianDashboardLayout({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/login');
        return;
      }

      setUser(data.session.user);
      setIsLoading(false);
    }

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <VetSidebar 
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden border-b border-border bg-card px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <button 
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 hover:bg-accent rounded-lg"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <span className="font-bold text-lg">PAWS Veterinarian</span>
          <div className="w-8"></div>
        </header>

        {/* --- DESKTOP HEADER (New!) --- */}
        {/* We hide this on mobile (hidden) and show it on medium screens up (md:block) */}
        <div className="hidden md:block sticky top-0 z-10">
           <VetHeader />
        </div>

        {/* Page Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}