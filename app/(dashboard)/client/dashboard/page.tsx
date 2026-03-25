'use client';

import { useState } from 'react';
import { supabase } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { PawPrint, Calendar, ChevronRight, HeartPulse, Megaphone, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import useSWR from 'swr';

function withProtocol(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

const fetchDashboardData = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('client_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) return { myPets: 0, upcomingAppointments: 0 };

  const petsRes = await fetch(
    `/api/client/pets?client_id=${profile.id}`
  );
  const petsData = await petsRes.json();
  const pets = Array.isArray(petsData) ? petsData : [];
  const petIds = pets.map((pet: any) => pet.id);

  let upcomingCount = 0;
  if (petIds.length > 0) {
    const today = new Date().toISOString();
    const { count } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .in('pet_id', petIds)
      .gte('scheduled_start', today)
      .in('appointment_status', ['pending', 'confirmed']);
    upcomingCount = count || 0;
  }

  return { myPets: pets.length, upcomingAppointments: upcomingCount };
};

export default function ClientDashboardPage() {
  const [clinicDefaults] = useState({
    clinic_name: 'PAWS Veterinary',
    dashboard_about_text: "Welcome! Here you can manage all aspects of your pet's healthcare.",
    is_announcement_active: false,
    announcement_text: '',
    facebook_url: '',
    instagram_url: '',
  });

  const { data: stats, isLoading } = useSWR(
    'dashboard-stats',
    fetchDashboardData,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5 minutes cache
    }
  );

  const { data: clinicSettings } = useSWR(
    'clinic-settings',
    async () => {
      const { data } = await supabase
        .from('clinic_settings')
        .select('clinic_name, dashboard_about_text, is_announcement_active, announcement_text, facebook_url, instagram_url')
        .eq('id', 1)
        .single();
      return data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 600000, // 10 minutes cache
    }
  );

  const clinic = clinicSettings ?? clinicDefaults;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 lg:space-y-10">

      {/* Announcement Banner */}
      {clinic.is_announcement_active && clinic.announcement_text && (
        <div className="bg-primary/10 border border-primary/20 rounded-2xl px-5 py-3 flex items-center gap-3 text-sm font-medium text-primary">
          <Megaphone size={16} className="flex-shrink-0" />
          {clinic.announcement_text}
        </div>
      )}

      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 shadow-sm">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
        <div className="relative z-10">
          <p className="mb-1 text-sm font-semibold text-primary">Client Home</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            Welcome Back <span className="inline-block animate-in fade-in duration-500">👋</span>
          </h1>
          <p className="text-muted-foreground mt-2">Here&apos;s what&apos;s happening with your pets today</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Link href="/client/pets" className="group">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10 flex items-start justify-between mb-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
                <PawPrint size={22} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <ChevronRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200 mt-1" />
            </div>
            <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-2 relative z-10">My Pets</p>
            <div className="text-4xl font-bold text-foreground mb-1 relative z-10">{stats?.myPets ?? 0}</div>
            <p className="text-sm text-muted-foreground relative z-10">Registered in your account</p>
          </div>
        </Link>

        <Link href="/client/appointments" className="group">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10 flex items-start justify-between mb-5">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20">
                <Calendar size={22} className="text-blue-600 dark:text-blue-400" />
              </div>
              <ChevronRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200 mt-1" />
            </div>
            <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-2 relative z-10">Upcoming Appointments</p>
            <div className="text-4xl font-bold text-foreground mb-1 relative z-10">{stats?.upcomingAppointments ?? 0}</div>
            <p className="text-sm text-muted-foreground relative z-10">Scheduled visits</p>
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold mb-0.5">Quick Actions</h2>
          <p className="text-muted-foreground text-sm">Get started with these common tasks</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button asChild className="h-auto py-5 px-6 bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 group rounded-2xl">
            <Link href="/client/appointments" className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                  <Calendar size={20} />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-[15px]">Book Appointment</div>
                  <div className="text-xs opacity-80 mt-0.5">Schedule a vet visit</div>
                </div>
              </div>
              <ChevronRight size={18} className="opacity-50 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-5 px-6 border border-border hover:bg-accent hover:border-primary/20 active:scale-[0.98] transition-all duration-200 group rounded-2xl">
            <Link href="/client/pets" className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <PawPrint size={20} className="text-primary" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-[15px]">My Pets</div>
                  <div className="text-xs text-muted-foreground mt-0.5">View &amp; manage pets</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-muted-foreground opacity-50 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 ring-1 ring-primary/20">
            <HeartPulse size={22} className="text-primary" />
          </div>
          <div className="space-y-3 flex-1">
            <div>
              <h3 className="text-lg font-bold text-foreground">{clinic.clinic_name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                {clinic.dashboard_about_text}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="default" size="sm" asChild>
                <Link href="/client/faq">View FAQ</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/client/services">Our Services</Link>
              </Button>
              {clinic.facebook_url && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={withProtocol(clinic.facebook_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5"
                  >
                    Facebook <ExternalLink size={14} />
                  </a>
                </Button>
              )}
              {clinic.instagram_url && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={withProtocol(clinic.instagram_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5"
                  >
                    Instagram <ExternalLink size={14} />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
