'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Users, PawPrint, Calendar, Stethoscope, Package, Receipt, TrendingUp, BarChart3, ShoppingCart, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { StackedAreaChart, BarChart, MultiLineChart } from '@/components/dashboard/charts';
import { DonutChart } from '@/components/dashboard/donut-chart';

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
  salesPerformance?: {
    labels: string[];
    series: Array<{ name: string; color: string; data: number[] }>;
  };
  vetPerformance?: Array<{ category: string; value: number; color: string }>;
  customerSatisfaction?: {
    labels: string[];
    series: Array<{ name: string; color: string; data: number[] }>;
  };
  weeklyRevenue?: number;
  inventoryStats?: {
    totalProducts: number;
    lowStockCount: number;
    outOfStock: number;
    totalInventoryValue: number;
    inventoryByCategory: Array<{ category: string; count: number }>;
  };
  billingStats?: {
    todaySales: number;
    weeklyRevenue: number;
    monthlyRevenue: number;
    totalRevenue: number;
    totalInvoices: number;
    paidInvoices: number;
    unpaidInvoices: number;
    partialInvoices: number;
    outstandingBalance: number;
    dailyRevenue: Array<{ date: string; amount: number }>;
  };
  appointmentStats?: {
    todayCount: number;
    thisWeekCount: number;
    totalCount: number;
    completionRate: number;
    cancelRate: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
  petStats?: {
    totalPets: number;
    petsBySpecies: Array<{ species: string; count: number }>;
  };
  employeeStats?: {
    totalEmployees: number;
    activeEmployees: number;
    suspendedEmployees: number;
    totalAdminStaff: number;
    totalVetStaff: number;
  };
}

// Updated color palette using theme variables
const COLORS = {
  primary: 'var(--primary)',
  accent: 'oklch(0.7 0.08 148)',
  muted: 'var(--muted)',
  textMuted: 'var(--muted-foreground)',
  bgLight: 'oklch(0.965 0.003 148)',
  border: 'var(--border)',
  dark: 'var(--foreground)',
  bg: 'var(--background)',
  red: 'var(--destructive)',
  amber: 'oklch(0.7 0.15 60)',
};

const SPECIES_COLORS: Record<string, string> = {
  Dog: 'var(--chart-1)',
  Cat: 'var(--chart-2)',
  Bird: 'var(--chart-3)',
  Rabbit: 'var(--chart-4)',
};

const APPT_TYPE_COLORS: Record<string, string> = {
  checkup: 'var(--chart-1)',
  consultation: 'var(--chart-2)',
  vaccination: 'var(--chart-3)',
  surgery: 'var(--destructive)',
  emergency: 'oklch(0.7 0.15 60)',
  dental: 'var(--chart-4)',
  grooming: 'var(--muted)',
  followup: 'var(--chart-5)',
};

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
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      const data = await response.json();
      setStats(data);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      setError(error.message || 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }

  const formatCurrency = (amount: number) =>
    `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;

  const salesSeries = stats.salesPerformance?.series || [
    { name: 'Vaccine Shot', color: 'var(--chart-1)', data: [15000, 22000, 18000, 28000, 25000, 35000, 30000] },
    { name: 'Consultation Fee', color: 'var(--chart-2)', data: [10000, 14000, 12000, 18000, 20000, 24000, 20000] },
    { name: 'Dewormer', color: 'var(--chart-3)', data: [6000, 8000, 7000, 10000, 11000, 14000, 12000] },
    { name: 'Anti-Rabies', color: 'var(--chart-4)', data: [3000, 4500, 4000, 6000, 7000, 8000, 6500] },
  ];
  const salesLabels = stats.salesPerformance?.labels || ['0', '1', '2', '3', '4', '5', '6', '7'];

  const vetPerfData = stats.vetPerformance || [
    { category: 'N/A', value: 0, color: COLORS.muted },
  ];

  const satisfactionSeries = stats.customerSatisfaction?.series || [
    { name: 'Overall', color: 'var(--primary)', data: [40, 45, 55, 50, 60, 70, 65] },
    { name: 'Service', color: 'var(--chart-2)', data: [35, 40, 48, 52, 55, 58, 62] },
    { name: 'Cleanliness', color: 'var(--muted)', data: [30, 38, 42, 40, 50, 55, 58] },
  ];
  const satisfactionLabels = stats.customerSatisfaction?.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const weeklyRevenue = stats.weeklyRevenue ?? stats.totalRevenue;

  const inventoryCategories = (stats.inventoryStats?.inventoryByCategory || []).map((c, i) => ({
    label: c.category,
    value: c.count,
    color: [`var(--chart-1)`, `var(--chart-2)`, `var(--chart-3)`, `var(--chart-4)`, `var(--chart-5)`, COLORS.amber, COLORS.red][i % 7],
  }));

  const petDemoSegments = (stats.petStats?.petsBySpecies || []).map((s) => ({
    label: s.species,
    value: s.count,
    color: SPECIES_COLORS[s.species] || 'var(--muted)',
  }));

  const apptTypeSegments = Object.entries(stats.appointmentStats?.byType || {}).map(([type, count]) => ({
    label: type.charAt(0).toUpperCase() + type.slice(1),
    value: count,
    color: APPT_TYPE_COLORS[type] || 'var(--muted)',
  }));

  const invoiceSegments = [
    { label: 'Paid', value: stats.billingStats?.paidInvoices || 0, color: 'var(--primary)' },
    { label: 'Unpaid', value: stats.billingStats?.unpaidInvoices || 0, color: 'var(--destructive)' },
    { label: 'Partial', value: stats.billingStats?.partialInvoices || 0, color: COLORS.amber },
  ].filter(s => s.value > 0);

  const dailyRevenueData = (stats.billingStats?.dailyRevenue || []).map((d, i, arr) => ({
    category: d.date,
    value: d.amount,
    color: i === arr.length - 1 ? 'var(--primary)' : 'var(--muted)',
  }));

  const employeeSegments = [
    { label: 'Admin', value: stats.employeeStats?.totalAdminStaff || 0, color: 'var(--chart-2)' },
    { label: 'Veterinarians', value: stats.employeeStats?.totalVetStaff || 0, color: 'var(--primary)' },
  ].filter(s => s.value > 0);

  const inventoryColors = [COLORS.red, 'var(--primary)', 'var(--chart-2)', COLORS.amber];

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-[1400px] mx-auto p-6" style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: COLORS.bg, minHeight: '100vh' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-2xl border p-5 shadow-sm" style={{ borderColor: COLORS.border }}>
              <div className="h-3 w-20 bg-muted animate-pulse rounded mb-3"></div>
              <div className="h-8 w-14 bg-muted animate-pulse rounded mb-2"></div>
              <div className="h-3 w-24 bg-muted animate-pulse rounded"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2 bg-card rounded-2xl border p-6 shadow-sm" style={{ borderColor: COLORS.border }}>
            <div className="h-4 w-36 bg-muted animate-pulse rounded mb-4"></div>
            <div className="h-[180px] bg-muted/50 animate-pulse rounded"></div>
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card rounded-2xl border p-5 shadow-sm" style={{ borderColor: COLORS.border }}>
              <div className="h-4 w-28 bg-muted animate-pulse rounded mb-2"></div>
              <div className="h-7 w-36 bg-muted animate-pulse rounded"></div>
            </div>
            <div className="bg-card rounded-2xl border p-5 shadow-sm" style={{ borderColor: COLORS.border }}>
              <div className="h-4 w-40 bg-muted animate-pulse rounded mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-muted animate-pulse"></div>
                      <div className="h-3 w-28 bg-muted animate-pulse rounded"></div>
                    </div>
                    <div className="h-3 w-14 bg-muted animate-pulse rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={loadDashboardData} className="text-primary-foreground bg-primary">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-4 max-w-[1400px] mx-auto"
      style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: COLORS.bg, minHeight: '100vh' }}
    >
      {/* ═══════════ HEADER SECTION ═══════════ */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your veterinary clinic's performance and analytics
          </p>
        </div>
      </div>

      {/* ═══════════ ROW 1: 4 Metric Cards ═══════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Clients', value: stats.totalClients, sub: 'Pet Owners', icon: Users, color: 'var(--primary)' },
          { label: 'Total Pets', value: stats.totalPets, sub: 'Registered Pets', icon: PawPrint, color: 'var(--chart-2)' },
          { label: 'Appointments', value: stats.totalAppointments, sub: 'All Appointments', icon: Calendar, color: 'var(--muted-foreground)' },
          { label: 'Veterinarians', value: stats.totalVeterinarians, sub: 'Active Staffs', icon: Stethoscope, color: 'var(--primary)' },
        ].map((m, i) => (
          <div key={i} className="bg-card rounded-2xl border p-5 shadow-sm" style={{ borderColor: COLORS.border }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `color-mix(in oklch, ${m.color}, transparent 85%)` }}>
                <m.icon className="w-5 h-5" style={{ color: m.color }} />
              </div>
              <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
            </div>
            <div className="text-[32px] font-bold leading-tight text-foreground">{m.value}</div>
            <p className="text-xs mt-1 text-muted-foreground">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* ═══════════ ROW 2: Sales Performance + Weekly Revenue & Inventory ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 bg-card rounded-2xl border p-5 shadow-sm" style={{ borderColor: COLORS.border }}>
          <h2 className="text-sm font-semibold mb-3 text-foreground">Sales Performance</h2>
          <div className="flex gap-4">
            <div className="flex-1 h-[180px]">
              <StackedAreaChart series={salesSeries} xLabels={salesLabels} yMax={90000} height={180} />
            </div>
            <div className="flex flex-col justify-center space-y-2 min-w-[130px]">
              {salesSeries.map((s) => {
                const total = salesSeries.reduce((sum, ser) => sum + ser.data.reduce((a, b) => a + b, 0), 0);
                const seriesTotal = s.data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((seriesTotal / total) * 100) : 0;
                return (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-[11px] flex-1 text-muted-foreground">{s.name}</span>
                    <span className="text-[11px] font-medium text-muted-foreground">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-card rounded-2xl border p-5 shadow-sm" style={{ borderColor: COLORS.border }}>
            <p className="text-xs font-medium mb-1 text-muted-foreground">Weekly Revenue</p>
            <div className="text-[28px] font-bold leading-tight text-foreground">
              {formatCurrency(weeklyRevenue)}
            </div>
          </div>
          <div className="bg-card rounded-2xl border p-5 shadow-sm flex-1" style={{ borderColor: COLORS.border }}>
            <h2 className="text-sm font-semibold mb-3 text-foreground">Inventory Notification</h2>
            <div className="space-y-2.5">
              {stats.lowStockProducts.length > 0 ? (
                stats.lowStockProducts.slice(0, 5).map((product: any, idx: number) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: inventoryColors[idx % inventoryColors.length] }} />
                      <span className="text-[12px] font-medium cursor-pointer hover:underline text-primary">{product.product_name}</span>
                    </div>
                    <span className="text-[12px] text-muted-foreground">Stock: {product.stock_quantity}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-center py-2 text-muted-foreground">All products well stocked</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ ROW 3: Vet Performance + Customer Satisfaction ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border p-5 shadow-sm" style={{ borderColor: COLORS.border }}>
          <h2 className="text-sm font-semibold text-foreground">Vet Performance</h2>
          <p className="text-[11px] mb-3 text-muted-foreground">Appointments Handled</p>
          <div className="h-[170px]">
            <BarChart data={vetPerfData} yMax={50} height={170} />
          </div>
        </div>
        <div className="bg-card rounded-2xl border p-5 shadow-sm" style={{ borderColor: COLORS.border }}>
          <h2 className="text-sm font-semibold mb-3 text-foreground">Customer Satisfaction Rate</h2>
          <div className="h-[170px]">
            <MultiLineChart series={satisfactionSeries} xLabels={satisfactionLabels} yMax={100} height={170} />
          </div>
        </div>
      </div>

      {/* ═══════════ ROW 4: BILLING ANALYTICS ═══════════ */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Receipt className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" />Billing & Sales Report
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Sales", value: formatCurrency(stats.billingStats?.todaySales || 0), icon: ShoppingCart, color: 'var(--chart-2)' },
          { label: 'Monthly Revenue', value: formatCurrency(stats.billingStats?.monthlyRevenue || 0), icon: TrendingUp, color: 'var(--primary)' },
          { label: 'Total Revenue', value: formatCurrency(stats.billingStats?.totalRevenue || 0), icon: BarChart3, color: 'var(--muted-foreground)' },
          { label: 'Outstanding', value: formatCurrency(stats.billingStats?.outstandingBalance || 0), icon: AlertCircle, color: 'var(--destructive)' },
        ].map((m, i) => (
          <div key={i} className="bg-card rounded-2xl border p-5 shadow-sm" style={{ borderColor: COLORS.border }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `color-mix(in oklch, ${m.color}, transparent 85%)` }}>
                <m.icon className="w-5 h-5" style={{ color: m.color }} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
                <p className="text-xl font-bold text-foreground">{m.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-2xl border p-5 shadow-sm" style={{ borderColor: COLORS.border }}>
          <h2 className="text-sm font-semibold mb-3 text-foreground">Daily Revenue (Last 7 Days)</h2>
          <div className="h-[180px]">
            {dailyRevenueData.length > 0 ? (
              <BarChart data={dailyRevenueData} yMax={Math.max(...dailyRevenueData.map(d => d.value), 1000)} height={180} />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground italic text-xs">No revenue data</div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-2xl border p-5 shadow-sm" style={{ borderColor: COLORS.border }}>
          <h2 className="text-sm font-semibold mb-3 text-foreground">Invoice Status</h2>
          {invoiceSegments.length > 0 ? (
            <div className="flex items-center gap-5">
              <DonutChart segments={invoiceSegments} size={100} />
              <div className="space-y-2">
                {invoiceSegments.map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-[11px] text-muted-foreground">{s.value} {s.label}</span>
                  </div>
                ))}
                <div className="pt-1 border-t border-border">
                  <span className="text-[11px] font-medium text-foreground">Total: {stats.billingStats?.totalInvoices || 0}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-center py-8 text-muted-foreground italic">No invoices yet</p>
          )}
        </div>
      </div>

      {/* ═══════════ ROW 5: APPOINTMENT ANALYTICS ═══════════ */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Calendar className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" />Appointment Analytics
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: 'Today', value: stats.appointmentStats?.todayCount || 0, icon: Clock, color: 'var(--muted-foreground)' },
          { label: 'This Week', value: stats.appointmentStats?.thisWeekCount || 0, icon: Calendar, color: 'var(--muted-foreground)' },
          { label: 'Total', value: stats.appointmentStats?.totalCount || 0, icon: FileText, color: 'var(--muted-foreground)' },
          { label: 'Completion', value: `${stats.appointmentStats?.completionRate || 0}%`, icon: CheckCircle, color: 'var(--primary)' },
          { label: 'Cancel Rate', value: `${stats.appointmentStats?.cancelRate || 0}%`, icon: XCircle, color: 'var(--destructive)' },
        ].map((m, i) => (
          <div key={i} className="bg-card rounded-2xl border p-4 shadow-sm" style={{ borderColor: COLORS.border }}>
            <div className="flex items-center gap-2 mb-1">
              <m.icon className="w-4 h-4" style={{ color: m.color }} />
              <p className="text-[11px] font-medium text-muted-foreground">{m.label}</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border p-5 shadow-sm" style={{ borderColor: COLORS.border }}>
          <h2 className="text-sm font-semibold mb-3 text-foreground">Appointments by Type</h2>
          {apptTypeSegments.length > 0 ? (
            <div className="flex items-center gap-6">
              <DonutChart segments={apptTypeSegments} size={120} />
              <div className="space-y-1.5 flex-1">
                {apptTypeSegments.map((s) => {
                  const total = apptTypeSegments.reduce((sum, seg) => sum + seg.value, 0);
                  const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
                  return (
                    <div key={s.label} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-[11px] flex-1 text-muted-foreground">{s.label}</span>
                      <span className="text-[11px] font-medium text-foreground">{s.value} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-center py-8 text-muted-foreground italic">No appointment data</p>
          )}
        </div>

        <div className="bg-card rounded-2xl border p-5 shadow-sm" style={{ borderColor: COLORS.border }}>
          <h2 className="text-sm font-semibold mb-3 text-foreground">Appointments by Status</h2>
          <div className="space-y-2.5">
            {Object.entries(stats.appointmentStats?.byStatus || {}).map(([status, count]) => {
              const total = stats.appointmentStats?.totalCount || 1;
              const pct = Math.round((count / total) * 100);
              const statusColor: Record<string, string> = {
                completed: 'var(--primary)',
                confirmed: 'var(--chart-2)',
                pending: 'oklch(0.7 0.15 60)',
                cancelled: 'var(--destructive)',
                in_progress: 'var(--chart-4)',
                no_show: 'var(--muted)',
              };
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-medium capitalize text-foreground">{status.replace('_', ' ')}</span>
                    <span className="text-[11px] text-muted-foreground">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: statusColor[status] || COLORS.muted }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(stats.appointmentStats?.byStatus || {}).length === 0 && (
              <p className="text-xs text-center py-6 text-muted-foreground italic">No data</p>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════ ROW 6: PET & INVENTORY ANALYTICS ═══════════ */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <PawPrint className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" />Pets & Inventory
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border p-5 shadow-sm" style={{ borderColor: COLORS.border }}>
          <h2 className="text-sm font-semibold mb-3 text-foreground">Pet Demographics</h2>
          {petDemoSegments.length > 0 ? (
            <div className="flex items-center gap-5">
              <DonutChart segments={petDemoSegments} size={100} />
              <div className="space-y-1.5">
                {petDemoSegments.map((s) => {
                  const total = petDemoSegments.reduce((sum, seg) => sum + seg.value, 0);
                  const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
                  return (
                    <div key={s.label} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-[11px] text-muted-foreground">{pct}% {s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-center py-8 text-muted-foreground italic">No pets registered</p>
          )}
        </div>

        <div className="bg-card rounded-2xl border p-5 shadow-sm" style={{ borderColor: COLORS.border }}>
          <h2 className="text-sm font-semibold mb-3 text-foreground">Inventory Overview</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Products', value: stats.inventoryStats?.totalProducts || 0, color: 'var(--primary)' },
              { label: 'Low Stock', value: stats.inventoryStats?.lowStockCount || 0, color: 'oklch(0.7 0.15 60)' },
              { label: 'Out of Stock', value: stats.inventoryStats?.outOfStock || 0, color: 'var(--destructive)' },
              { label: 'Total Value', value: formatCurrency(stats.inventoryStats?.totalInventoryValue || 0), color: 'var(--chart-2)' },
            ].map((item, i) => (
              <div key={i} className="rounded-xl p-3 bg-muted/50">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{item.label}</p>
                <p className="text-lg font-bold mt-0.5" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-2xl border p-5 shadow-sm" style={{ borderColor: COLORS.border }}>
          <h2 className="text-sm font-semibold mb-3 text-foreground">Inventory by Category</h2>
          {inventoryCategories.length > 0 ? (
            <div className="flex items-center gap-5">
              <DonutChart segments={inventoryCategories} size={100} />
              <div className="space-y-1.5">
                {inventoryCategories.map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-[11px] text-muted-foreground">{s.value} {s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-center py-8 text-muted-foreground italic">No inventory data</p>
          )}
        </div>
      </div>

      {/* ═══════════ ROW 7: EMPLOYEE ANALYTICS ═══════════ */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Users className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" />Employee Overview
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border p-5 shadow-sm" style={{ borderColor: COLORS.border }}>
          <h2 className="text-sm font-semibold mb-3 text-foreground">Team Composition</h2>
          {employeeSegments.length > 0 ? (
            <div className="flex flex-col items-center gap-3">
              <DonutChart segments={employeeSegments} size={90} />
              <div className="flex gap-4">
                {employeeSegments.map((s) => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-[11px] text-muted-foreground">{s.label} ({s.value})</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-center py-6 text-muted-foreground italic">No employees</p>
          )}
        </div>

        {[
          { label: 'Total Employees', value: stats.employeeStats?.totalEmployees || 0, icon: Users, color: 'var(--primary)' },
          { label: 'Active', value: stats.employeeStats?.activeEmployees || 0, icon: CheckCircle, color: 'var(--primary)' },
          { label: 'Suspended', value: stats.employeeStats?.suspendedEmployees || 0, icon: XCircle, color: 'var(--destructive)' },
        ].map((m, i) => (
          <div key={i} className="bg-card rounded-2xl border p-5 shadow-sm" style={{ borderColor: COLORS.border }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `color-mix(in oklch, ${m.color}, transparent 85%)` }}>
                <m.icon className="w-5 h-5" style={{ color: m.color }} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
                <p className="text-xl font-bold text-foreground">{m.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════ FOOTER ═══════════ */}
      <div className="flex items-center justify-between bg-card rounded-2xl border px-5 py-3 shadow-sm" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse bg-primary"></div>
          <p className="text-xs text-muted-foreground">
            All systems operational · Last updated: {new Date().toLocaleString()}
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          className="px-4 py-1.5 text-xs font-medium rounded-lg border border-border transition hover:bg-muted text-muted-foreground"
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
}