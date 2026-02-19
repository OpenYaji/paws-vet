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
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Welcome to Your Pet Dashboard</h1>
        <p className="text-muted-foreground">Manage your pets and appointments</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">My Pets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.myPets}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered pets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.upcomingAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">Scheduled visits</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button asChild className="h-auto flex-col py-6" size="lg">
            <Link href="/client/appointments">
              <span className="text-2xl mb-2">📅</span>
              <span>Book Appointment</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto flex-col py-6 bg-transparent" size="lg">
            <Link href="/client/pets">
              <span className="text-2xl mb-2">🐾</span>
              <span>My Pets</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Contact our clinic for any questions about your pet's health or appointments.
          </p>
          <Button variant="outline" size="sm">Contact Clinic</Button>
        </CardContent>
      </Card>
    </div>
  );
}