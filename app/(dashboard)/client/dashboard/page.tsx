'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/auth-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ClientDashboardPage() {
  const [stats, setStats] = useState({
    myPets: 0,
    upcomingAppointments: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');

  useEffect(() => {
    async function loadStats() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('No user found');
          setIsLoading(false);
          return;
        }

        setUserId(user.id);
        console.log('User ID:', user.id);

        // Get client profile first
        const { data: profile, error: profileError } = await supabase
          .from('client_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setIsLoading(false);
          return;
        }

        if (!profile) {
          console.log('No client profile found for user');
          setIsLoading(false);
          return;
        }
        
        console.log('Client Profile ID:', profile.id);
        setClientId(profile.id);

        // Fetch pets using the API endpoint (bypasses RLS issues)
        try {
          const petsResponse = await fetch(`/api/client/pets?client_id=${profile.id}`);
          
          if (!petsResponse.ok) {
            console.error('Failed to fetch pets:', petsResponse.status);
          }

          const petsData = await petsResponse.json();
          const pets = Array.isArray(petsData) ? petsData : [];
          console.log('Fetched pets:', pets);

          const petsCount = pets.length;
          console.log('Pets count:', petsCount);

          // Get pet IDs for appointments query
          const petIds = pets.map((pet: any) => pet.id);
          console.log('Pet IDs:', petIds);

          // Get upcoming appointments count
          let upcomingCount = 0;
          if (petIds.length > 0) {
            const today = new Date().toISOString();
            
            const { count, error: appointmentsError } = await supabase
              .from('appointments')
              .select('*', { count: 'exact', head: true })
              .in('pet_id', petIds)
              .gte('scheduled_start', today)
              .in('appointment_status', ['pending', 'confirmed']);
            
            if (appointmentsError) {
              console.error('Error fetching appointments:', appointmentsError);
            } else {
              console.log('Upcoming appointments count:', count);
              upcomingCount = count || 0;
            }
          }

          setStats({
            myPets: petsCount,
            upcomingAppointments: upcomingCount,
          });
        } catch (fetchError) {
          console.error('Error fetching pets via API:', fetchError);
        }
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Welcome Section */}
      <div className="space-y-2 pt-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Welcome to your Pet Dashboard</h1>
        <p className="text-lg text-muted-foreground">Manage your pets and appointments in one place</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">My Pets</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-5xl font-bold text-primary mb-2">{stats.myPets}</div>
            <p className="text-sm text-muted-foreground">Registered pets in your account</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-5xl font-bold text-primary mb-2">{stats.upcomingAppointments}</div>
            <p className="text-sm text-muted-foreground">Scheduled visits</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Quick Actions</h2>
          <p className="text-muted-foreground text-sm">Get started with these common tasks</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button asChild className="h-auto flex items-center justify-between py-4 px-6 bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg transition-all duration-300 group">
            <Link href="/client/appointments" className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <span className="text-3xl group-hover:scale-110 transition-transform duration-300">📅</span>
                <div className="text-left">
                  <div className="font-semibold">Book Appointment</div>
                  <div className="text-xs opacity-90">Schedule a vet visit</div>
                </div>
              </div>
              <span className="text-xl opacity-60 group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto flex items-center justify-between py-4 px-6 border-2 hover:bg-accent transition-all duration-300 group">
            <Link href="/client/pets" className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <span className="text-3xl group-hover:scale-110 transition-transform duration-300">🐾</span>
                <div className="text-left">
                  <div className="font-semibold">My Pets</div>
                  <div className="text-xs text-muted-foreground">View & manage pets</div>
                </div>
              </div>
              <span className="text-xl opacity-60 group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">💡</span>
            <span>Welcome to PAWS Veterinary</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 relative z-10">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Welcome! Here you can manage all aspects of your pet's healthcare. Book appointments with our experienced veterinarians, track medical records, and keep your pets healthy and happy.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" size="sm" asChild>
              <Link href="/client/faq">View FAQ</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/client/services">Our Services</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}