'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Package, Users, PawPrint, Calendar, Stethoscope } from 'lucide-react';

interface DashboardStats {
  totalClients: number;
  totalPets: number;
  totalAppointments: number;
  totalVeterinarians: number;
  todayAppointments: number;
  upcomingAppointments: number;
  recentAppointments: any[];
  lowStockProducts: any[];
  revenueByCategory: Array<{ category: string; value: number; color: string }>;
  totalRevenue: number;
}

export default function AdminDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalPets: 0,
    totalAppointments: 0,
    totalVeterinarians: 0,
    todayAppointments: 0,
    upcomingAppointments: 0,
    recentAppointments: [],
    lowStockProducts: [],
    revenueByCategory: [],
    totalRevenue: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/dashboard');

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setStats(data);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      setError(error.message || 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-9 w-80 bg-gray-200 animate-pulse rounded"></div>
          <div className="h-5 w-96 bg-gray-200 animate-pulse rounded"></div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>
                <div className="h-4 w-4 bg-gray-200 animate-pulse rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mb-1"></div>
                <div className="h-3 w-20 bg-gray-200 animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Dashboard Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart Skeleton */}
          <Card className="bg-[#7FA650]/10">
            <CardHeader className="pb-4">
              <div className="h-5 w-32 bg-gray-200 animate-pulse rounded"></div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-center gap-6">
                {/* Pie chart circle */}
                <div className="w-36 h-36 rounded-full bg-gray-200 animate-pulse"></div>
                {/* Legend */}
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-200 animate-pulse"></div>
                      <div>
                        <div className="h-4 w-24 bg-gray-200 animate-pulse rounded mb-1"></div>
                        <div className="h-3 w-16 bg-gray-200 animate-pulse rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Alerts Skeleton */}
          <Card className="bg-[#D4C5A9]/10">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <div className="h-5 w-32 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-6 w-8 bg-gray-200 animate-pulse rounded-full"></div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-background rounded-lg border"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-5 h-5 rounded-full bg-gray-200 animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-4 w-32 bg-gray-200 animate-pulse rounded mb-1"></div>
                        <div className="h-3 w-20 bg-gray-200 animate-pulse rounded"></div>
                      </div>
                    </div>
                    <div className="h-6 w-16 bg-gray-200 animate-pulse rounded-full"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Appointments Skeleton */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-4">
              <div className="h-5 w-40 bg-gray-200 animate-pulse rounded"></div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-24 bg-gray-200 animate-pulse rounded"></div>
                        <div className="h-5 w-16 bg-gray-200 animate-pulse rounded-full"></div>
                      </div>
                      <div className="h-4 w-40 bg-gray-200 animate-pulse rounded"></div>
                      <div className="h-3 w-32 bg-gray-200 animate-pulse rounded"></div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="h-4 w-24 bg-gray-200 animate-pulse rounded ml-auto"></div>
                      <div className="h-6 w-20 bg-gray-200 animate-pulse rounded-full ml-auto"></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Status Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-gray-200 animate-pulse rounded"></div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-200 animate-pulse"></div>
              <div className="h-4 w-96 bg-gray-200 animate-pulse rounded"></div>
            </div>
            <div className="h-9 w-32 bg-gray-200 animate-pulse rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={loadDashboardData}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Veterinary Clinic Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of clinic operations and performance</p>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-muted-foreground">Pet owners</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pets</CardTitle>
            <PawPrint className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPets}</div>
            <p className="text-xs text-muted-foreground">Registered pets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.todayAppointments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.upcomingAppointments} upcoming this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Veterinarians</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVeterinarians}</div>
            <p className="text-xs text-muted-foreground">Active staff</p>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Category - Pie Chart */}
        <Card className="bg-[#7FA650]/10">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.totalRevenue > 0 ? (
              <div className="flex items-center justify-center gap-6">
                {/* Pie Chart Visualization */}
                <div className="relative w-36 h-36">
                  <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    {stats.revenueByCategory.map((item, index) => {
                      const total = stats.revenueByCategory.reduce((sum, i) => sum + i.value, 0);
                      const percentage = (item.value / total) * 100;
                      const offset = stats.revenueByCategory
                        .slice(0, index)
                        .reduce((sum, i) => sum + (i.value / total) * 100, 0);

                      return (
                        <circle
                          key={item.category}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={item.color}
                          strokeWidth="20"
                          strokeDasharray={`${percentage * 2.51} ${251 - percentage * 2.51}`}
                          strokeDashoffset={-offset * 2.51}
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-2">
                  {stats.revenueByCategory.map((item) => (
                    <div key={item.category} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="text-sm">
                        <div className="font-medium">{item.category}</div>
                        <div className="text-muted-foreground">{formatCurrency(item.value)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No revenue data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className="bg-[#D4C5A9]/10">
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Inventory Alerts</CardTitle>
            <Badge variant="destructive">{stats.lowStockProducts.length}</Badge>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {stats.lowStockProducts.length > 0 ? (
                stats.lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 bg-background rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle className={`w-5 h-5 flex-shrink-0 ${
                        product.stock_quantity === 0 ? 'text-red-500' : 
                        product.stock_quantity <= product.low_stock_threshold ? 'text-yellow-500' : 
                        'text-green-500'
                      }`} />
                      <div>
                        <p className="font-medium text-sm">{product.product_name}</p>
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                      </div>
                    </div>
                    <Badge
                      variant={product.stock_quantity === 0 ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      Stock: {product.stock_quantity}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  All products are well stocked
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Appointments */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Recent Appointments</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {stats.recentAppointments.length > 0 ? (
                stats.recentAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{appt.pet?.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {appt.pet?.species}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Owner: {appt.client?.first_name} {appt.client?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dr. {appt.veterinarian?.first_name} {appt.veterinarian?.last_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatDate(appt.scheduled_start)}</p>
                      <Badge 
                        className={
                          appt.appointment_status === 'completed' ? 'bg-green-100 text-green-800' :
                          appt.appointment_status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          appt.appointment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }
                      >
                        {appt.appointment_status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No recent appointments
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-muted-foreground">
              All systems operational. Last updated: {new Date().toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadDashboardData}>
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
