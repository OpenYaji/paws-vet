'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/auth-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalPets: 0,
    totalAppointments: 0,
    totalVeterinarians: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        // Get total clients - skip this query if profiles table doesn't have data
        const { count: clientsCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'pet_owner');

        // Get total pets
        const { count: petsCount } = await supabase
          .from('pets')
          .select('*', { count: 'exact', head: true });

        // Get total appointments
        const { count: appointmentsCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true });

        // Get total veterinarians - skip this query if profiles table doesn't have data
        const { count: vetsCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'veterinarian');

        setStats({
          totalClients: clientsCount || 0,
          totalPets: petsCount || 0,
          totalAppointments: appointmentsCount || 0,
          totalVeterinarians: vetsCount || 0,
        });
      } catch (error) {
        console.error('Error loading stats:', error);
        // Set default values if queries fail
        setStats({
          totalClients: 0,
          totalPets: 0,
          totalAppointments: 0,
          totalVeterinarians: 0,
        });
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
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage clinic operations and staff</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-muted-foreground mt-1">Pet owners</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Pets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalPets}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered pets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.totalAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">All appointments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Veterinarians</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalVeterinarians}</div>
            <p className="text-xs text-muted-foreground mt-1">Active staff</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Button asChild className="h-auto flex-col py-6" size="lg">
            <Link href="/admin/users">
              <span className="text-2xl mb-2">👥</span>
              <span>Manage Users</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto flex-col py-6 bg-transparent" size="lg">
            <Link href="/admin/appointments">
              <span className="text-2xl mb-2">📅</span>
              <span>Appointments</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto flex-col py-6 bg-transparent" size="lg">
            <Link href="/admin/pets">
              <span className="text-2xl mb-2">🐾</span>
              <span>All Pets</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto flex-col py-6 bg-transparent" size="lg">
            <Link href="/admin/settings">
              <span className="text-2xl mb-2">⚙️</span>
              <span>Settings</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            All systems operational. Clinic management running smoothly.
          </p>
          <Button variant="outline" size="sm">View Reports</Button>
        </CardContent>
      </Card>
    </div>
  );
}
