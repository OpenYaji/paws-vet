'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/auth-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Package, TrendingUp, Users, PawPrint, Calendar, Stethoscope } from 'lucide-react';

interface DashboardStats {
  totalClients: number;
  totalPets: number;
  totalAppointments: number;
  totalVeterinarians: number;
  salesRevenue: Array<{ category: string; value: number; color: string }>;
  inventoryStatus: Array<{ name: string; stock: number; status: 'critical' | 'low' | 'normal' }>;
  productInventory: Array<{ category: string; percentage: number; color: string }>;
  vetPerformance: {
    appointments: Array<{ vet: string; count: number; color: string }>;
    ratings: Array<{ vet: string; rating: number; color: string }>;
  };
}

export default function AdminDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalPets: 0,
    totalAppointments: 0,
    totalVeterinarians: 0,
    salesRevenue: [
      { category: 'Medicine', value: 10564, color: '#2D5016' },
      { category: 'Vaccine Shots', value: 3654, color: '#1A1A1A' },
      { category: 'Lab Service', value: 5852, color: '#D4C5A9' },
      { category: 'Consultation Fee', value: 15454, color: '#7FA650' },
    ],
    inventoryStatus: [
      { name: 'Anti-biotics', stock: 1, status: 'critical' },
      { name: 'Vitamins', stock: 3, status: 'critical' },
      { name: 'Anti-rabies Vaccine', stock: 4, status: 'low' },
      { name: 'Dewormer', stock: 10, status: 'normal' },
    ],
    productInventory: [
      { category: 'Anti-biotics', percentage: 25, color: '#2D5016' },
      { category: 'Vitamins', percentage: 25, color: '#1A1A1A' },
      { category: 'Anti-rabies Vaccine', percentage: 25, color: '#D4C5A9' },
      { category: 'Dewormer', percentage: 25, color: '#7FA650' },
    ],
    vetPerformance: {
      appointments: [
        { vet: 'Ramos, VMD', count: 35, color: '#D4C5A9' },
        { vet: 'Moris, VMD', count: 45, color: '#7FA650' },
      ],
      ratings: [
        { vet: 'Ramos, VMD', rating: 4.5, color: '#D4C5A9' },
        { vet: 'Moris, VMD', rating: 4.8, color: '#7FA650' },
      ],
    },
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setIsLoading(true);
      
      // Get total clients
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

      // Get total veterinarians
      const { count: vetsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'veterinarian');

      setStats(prevStats => ({
        ...prevStats,
        totalClients: clientsCount || 0,
        totalPets: petsCount || 0,
        totalAppointments: appointmentsCount || 0,
        totalVeterinarians: vetsCount || 0,
      }));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const totalRevenue = stats.salesRevenue.reduce((sum, item) => sum + item.value, 0);
  const maxAppointments = Math.max(...stats.vetPerformance.appointments.map(v => v.count));

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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Veterinary Clinic Dashboard</h1>
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
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalAppointments}</div>
            <p className="text-xs text-muted-foreground">All appointments</p>
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
        {/* Sales Revenue - Pie Chart */}
        <Card className="bg-[#7FA650]/10">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Sales Revenue</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-center gap-6">
              {/* Pie Chart Visualization */}
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                  {stats.salesRevenue.map((item, index) => {
                    const total = stats.salesRevenue.reduce((sum, i) => sum + i.value, 0);
                    const percentage = (item.value / total) * 100;
                    const offset = stats.salesRevenue
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
                    <div className="text-xl font-bold">₱{(totalRevenue / 1000).toFixed(1)}K</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2">
                {stats.salesRevenue.map((item) => (
                  <div key={item.category} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="text-sm">
                      <div className="font-medium">{item.category}</div>
                      <div className="text-muted-foreground">₱{item.value.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Status */}
        <Card className="bg-[#D4C5A9]/10">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Inventory Status</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {stats.inventoryStatus.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-3 bg-background rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {item.status === 'critical' ? (
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    ) : item.status === 'low' ? (
                      <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                    ) : (
                      <Package className="w-5 h-5 text-green-500 flex-shrink-0" />
                    )}
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>
                  <Badge
                    variant={item.status === 'critical' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    Stock: {item.stock}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Product Inventory - Pie Chart */}
        <Card className="bg-[#7FA650]/10">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Product Inventory</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-center gap-6">
              {/* Pie Chart */}
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                  {stats.productInventory.map((item, index) => {
                    const offset = stats.productInventory
                      .slice(0, index)
                      .reduce((sum, i) => sum + i.percentage, 0);
                    
                    return (
                      <circle
                        key={item.category}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={item.color}
                        strokeWidth="20"
                        strokeDasharray={`${item.percentage * 2.51} ${251 - item.percentage * 2.51}`}
                        strokeDashoffset={-offset * 2.51}
                      />
                    );
                  })}
                </svg>
              </div>

              {/* Legend */}
              <div className="space-y-2">
                {stats.productInventory.map((item) => (
                  <div key={item.category} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="text-sm">
                      <div className="font-medium">{item.category}</div>
                      <div className="text-muted-foreground">{item.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vet Performance */}
        <Card className="bg-[#D4C5A9]/10">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Vet Performance</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {/* Appointments Bar Chart */}
            <div>
              <h4 className="text-sm font-medium mb-3">Appointments</h4>
              <div className="space-y-2">
                {stats.vetPerformance.appointments.map((vet) => (
                  <div key={vet.vet} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{vet.vet}</span>
                      <span className="font-medium">{vet.count}</span>
                    </div>
                    <div className="h-7 bg-muted rounded-lg overflow-hidden">
                      <div
                        className="h-full rounded-lg transition-all"
                        style={{
                          width: `${(vet.count / maxAppointments) * 100}%`,
                          backgroundColor: vet.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Rating Line Chart */}
            <div>
              <h4 className="text-sm font-medium mb-3">Customer Rating</h4>
              <div className="space-y-2">
                {stats.vetPerformance.ratings.map((vet) => (
                  <div key={vet.vet} className="flex items-center justify-between p-2.5 bg-background rounded-lg border">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: vet.color }}
                      />
                      <span className="text-sm font-medium">{vet.vet}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="font-bold text-sm">{vet.rating}</span>
                      <span className="text-xs text-muted-foreground">/ 5.0</span>
                    </div>
                  </div>
                ))}
              </div>
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
              All systems operational. Clinic management running smoothly.
            </p>
          </div>
          <Button variant="outline" size="sm">View Reports</Button>
        </CardContent>
      </Card>
    </div>
  );
}
