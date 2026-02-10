'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/auth-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function VeterinarianDashboardPage() {
  const [stats, setStats] = useState({
    todayAppointments: 0,
    totalPatients: 0,
    pendingAppointments: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    async function loadStats() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setUserId(user.id);
        setUserName(user.user_metadata.name || '');

        // Get today's appointments
        const today = new Date().toISOString().split('T')[0];
        const { count: todayCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('veterinarian_id', user.id)
          .eq('appointment_date', today);

        // Get total patients (pets)
        const { count: patientsCount } = await supabase
          .from('pets')
          .select('*', { count: 'exact', head: true });

        // Get pending appointments
        const { count: pendingCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('veterinarian_id', user.id)
          .eq('status', 'scheduled');

        setStats({
          todayAppointments: todayCount || 0,
          totalPatients: patientsCount || 0,
          pendingAppointments: pendingCount || 0,
        });
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
        <h1 className="text-3xl font-bold">Hello, {userName}</h1>
        <p className="text-muted-foreground">Manage your appointments and patients</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.todayAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">Scheduled today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalPatients}</div>
            <p className="text-xs text-muted-foreground mt-1">All pets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">To be completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <Button asChild className="h-auto flex-col py-6" size="lg">
            <Link href="/veterinarian/dashboard/appointments">
              <span className="text-2xl mb-2">📅</span>
              <span>View Appointments</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto flex-col py-6 bg-transparent" size="lg">
            <Link href="/veterinarian/pets">
              <span className="text-2xl mb-2">🐾</span>
              <span>Pet Records</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto flex-col py-6 bg-transparent" size="lg">
            <Link href="/veterinarian/pets/new-pets">
              <span className="text-2xl mb-2">📋</span>
              <span>Recently Added Pets</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            You have {stats.todayAppointments} appointments scheduled for today.
          </p>
          <Button variant="outline" size="sm">View Full Schedule</Button>
        </CardContent>
      </Card>
    </div>
  );
}
