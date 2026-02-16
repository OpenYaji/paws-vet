import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();

    const [
      clientsRes,
      petsRes,
      appointmentsRes,
      vetsRes,
      productsRes,
      paymentsRes,
      invoicesRes,
    ] = await Promise.all([
      supabase.from('client_profiles').select('id', { count: 'exact' }),
      supabase.from('pets').select('id, species, breed, date_of_birth, owner_id', { count: 'exact' }),
      supabase.from('appointments').select('*, veterinarian:veterinarian_profiles(first_name, last_name)', { count: 'exact' }),
      supabase.from('veterinarian_profiles').select('id, first_name, last_name, specializations, employment_status', { count: 'exact' }),
      supabase.from('products').select('*').eq('is_active', true),
      supabase.from('payments').select('*').order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').order('created_at', { ascending: false }),
    ]);

    const clients = clientsRes.data || [];
    const pets = petsRes.data || [];
    const appointments = appointmentsRes.data || [];
    const vets = vetsRes.data || [];
    const products = productsRes.data || [];
    const payments = paymentsRes.data || [];
    const invoices = invoicesRes.data || [];

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayAppointments = appointments.filter(
      (a: any) => new Date(a.scheduled_start) >= todayStart
    );

    const upcomingAppointments = appointments.filter(
      (a: any) =>
        new Date(a.scheduled_start) >= now &&
        a.appointment_status !== 'cancelled'
    );

    const lowStockProducts = products.filter(
      (p: any) => p.stock_quantity <= p.low_stock_threshold
    );

    const totalRevenue = payments.reduce(
      (sum: number, p: any) => sum + (p.amount_paid || 0),
      0
    );

    const weeklyRevenue = payments
      .filter((p: any) => new Date(p.payment_date) >= weekStart)
      .reduce((sum: number, p: any) => sum + (p.amount_paid || 0), 0);

    const totalProducts = products.length;
    const outOfStock = products.filter((p: any) => p.stock_quantity === 0).length;
    const totalInventoryValue = products.reduce(
      (sum: number, p: any) => sum + (p.price || 0) * (p.stock_quantity || 0),
      0
    );
    const categoryCounts: Record<string, number> = {};
    products.forEach((p: any) => {
      const cat = p.category || 'Other';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const inventoryByCategory = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
    }));

    const todaySales = payments
      .filter((p: any) => new Date(p.payment_date) >= todayStart)
      .reduce((sum: number, p: any) => sum + (p.amount_paid || 0), 0);

    const monthlyRevenue = payments
      .filter((p: any) => new Date(p.payment_date) >= monthStart)
      .reduce((sum: number, p: any) => sum + (p.amount_paid || 0), 0);

    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter((i: any) => i.payment_status === 'paid').length;
    const unpaidInvoices = invoices.filter((i: any) => i.payment_status === 'unpaid').length;
    const partialInvoices = invoices.filter((i: any) => i.payment_status === 'partial').length;

    const outstandingBalance = invoices.reduce((sum: number, i: any) => {
      return sum + ((i.total_amount || 0) - (i.amount_paid || 0));
    }, 0);

    const dailyRevenue: Array<{ date: string; amount: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      const dayTotal = payments
        .filter((p: any) => {
          const pd = new Date(p.payment_date);
          return pd >= dayStart && pd <= dayEnd;
        })
        .reduce((sum: number, p: any) => sum + (p.amount_paid || 0), 0);
      dailyRevenue.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short' }),
        amount: dayTotal,
      });
    }

    const appointmentsByType: Record<string, number> = {};
    appointments.forEach((a: any) => {
      const t = a.appointment_type || 'other';
      appointmentsByType[t] = (appointmentsByType[t] || 0) + 1;
    });

    const appointmentsByStatus: Record<string, number> = {};
    appointments.forEach((a: any) => {
      const s = a.appointment_status || 'unknown';
      appointmentsByStatus[s] = (appointmentsByStatus[s] || 0) + 1;
    });

    const thisWeekAppointments = appointments.filter(
      (a: any) => new Date(a.scheduled_start) >= weekStart
    ).length;

    const completionRate = appointments.length > 0
      ? Math.round(
          (appointments.filter((a: any) => a.appointment_status === 'completed').length /
            appointments.length) *
            100
        )
      : 0;

    const cancelRate = appointments.length > 0
      ? Math.round(
          (appointments.filter((a: any) => a.appointment_status === 'cancelled').length /
            appointments.length) *
            100
        )
      : 0;

    const speciesCounts: Record<string, number> = {};
    pets.forEach((p: any) => {
      const s = (p.species || 'Unknown').toLowerCase();
      speciesCounts[s] = (speciesCounts[s] || 0) + 1;
    });

    const petsBySpecies = Object.entries(speciesCounts).map(([species, count]) => ({
      species: species.charAt(0).toUpperCase() + species.slice(1),
      count,
    }));

    const newPetsThisMonth = pets.filter((p: any) => {
      return true;
    }).length;

    const { data: adminStaff } = await supabase
      .from('admin_staff')
      .select('id, account_status');
    const { data: vetProfiles } = await supabase
      .from('veterinarian_profiles')
      .select('id, account_status, employment_status, specializations');

    const allEmployees = [
      ...(adminStaff || []).map((a: any) => ({ ...a, role: 'admin' })),
      ...(vetProfiles || []).map((v: any) => ({ ...v, role: 'veterinarian' })),
    ];

    const totalEmployees = allEmployees.length;
    const activeEmployees = allEmployees.filter((e: any) => e.account_status === 'active').length;
    const suspendedEmployees = allEmployees.filter((e: any) => e.account_status === 'suspended').length;
    const totalAdminStaff = allEmployees.filter((e: any) => e.role === 'admin').length;
    const totalVetStaff = allEmployees.filter((e: any) => e.role === 'veterinarian').length;

    const vetAppointments: Record<string, { name: string; count: number }> = {};
    appointments.forEach((a: any) => {
      if (a.veterinarian_id && a.veterinarian) {
        const name = `${a.veterinarian.first_name || ''} ${a.veterinarian.last_name || ''}`.trim();
        if (!vetAppointments[a.veterinarian_id]) {
          vetAppointments[a.veterinarian_id] = { name, count: 0 };
        }
        vetAppointments[a.veterinarian_id].count++;
      }
    });

    const vetPerformance = Object.values(vetAppointments)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((v, i, arr) => ({
        category: v.name.split(' ')[0] || `Vet ${i + 1}`,
        value: v.count,
        color: i === arr.length - 1 ? '#7FA650' : '#D4C5A9',
      }));

    if (vetPerformance.length === 0) {
      vetPerformance.push({ category: 'N/A', value: 0, color: '#D4C5A9' });
    }

    const revenueByCategory = lowStockProducts.slice(0, 4).map((p: any, i: number) => ({
      category: p.product_name,
      value: p.stock_quantity,
      color: ['#F56565', '#48BB78', '#3182CE', '#D69E2E'][i % 4],
    }));

    return NextResponse.json({
      totalClients: clientsRes.count || 0,
      totalPets: petsRes.count || 0,
      totalAppointments: appointmentsRes.count || 0,
      totalVeterinarians: vetsRes.count || 0,
      todayAppointments: todayAppointments.length,
      upcomingAppointments: upcomingAppointments.length,
      recentAppointments: appointments.slice(0, 5),
      lowStockProducts,
      revenueByCategory,
      totalRevenue,
      weeklyRevenue,
      vetPerformance,

      inventoryStats: {
        totalProducts,
        lowStockCount: lowStockProducts.length,
        outOfStock,
        totalInventoryValue,
        inventoryByCategory,
      },

      billingStats: {
        todaySales,
        weeklyRevenue,
        monthlyRevenue,
        totalRevenue,
        totalInvoices,
        paidInvoices,
        unpaidInvoices,
        partialInvoices,
        outstandingBalance,
        dailyRevenue,
      },

      appointmentStats: {
        todayCount: todayAppointments.length,
        thisWeekCount: thisWeekAppointments,
        totalCount: appointments.length,
        completionRate,
        cancelRate,
        byType: appointmentsByType,
        byStatus: appointmentsByStatus,
      },

      petStats: {
        totalPets: pets.length,
        petsBySpecies,
      },

      employeeStats: {
        totalEmployees,
        activeEmployees,
        suspendedEmployees,
        totalAdminStaff,
        totalVetStaff,
      },
    });
  } catch (error: any) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}
