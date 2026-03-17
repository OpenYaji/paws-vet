'use client';

import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Aperture,
  ChartArea,
  SquareLibrary
 } from 'lucide-react';
import Link from 'next/link';
import { Fetcher } from '@/lib/fetcher';

interface DashboardData {
  firstName: string;
  lastName: string;
  todayAppointments: number;
  totalPatients: number;
  pendingAppointments: number;
}

export default function VeterinarianDashboardPage() {
  const { data, error, isLoading } = useSWR<DashboardData>('/api/veterinarian/vet-dashboard', Fetcher);

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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-red-500">
        Failed to load dashboard data.
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Hello, Dr. {data?.firstName} {data?.lastName}</h1>
        <p className="text-muted-foreground">Manage your appointments and patients</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{data?.todayAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">Scheduled today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.totalPatients}</div>
            <p className="text-xs text-muted-foreground mt-1">All pets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.pendingAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">To be completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <Button asChild className="h-auto flex-col py-6" size="lg">
            <Link href="/veterinarian/capture">
              <span className="text-2xl mb-2"><Aperture /></span>
              <span>Pet's Medical Capture</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto flex-col py-6 bg-transparent" size="lg">
            <Link href="/veterinarian/medical-records">
              <span className="text-2xl mb-2"><SquareLibrary /></span>
              <span>Pet Medical Records</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto flex-col py-6 bg-transparent" size="lg">
            <Link href="/veterinarian/reports">
              <span className="text-2xl mb-2"><ChartArea /></span>
              <span>Report's Generation</span>
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
            You have {data?.todayAppointments} appointments scheduled for today.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/veterinarian/appointments">View Full Schedule</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}