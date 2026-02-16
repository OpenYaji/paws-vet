'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/auth-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ShoppingCart, FileText, Package, Receipt, AlertCircle, 
  TrendingUp
} from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  payment_status: 'paid' | 'unpaid' | 'partial';
  client?: { first_name: string; last_name: string };
  walk_in_customer_name?: string;
}

interface Product {
  id: string;
  product_name: string;
  stock_quantity: number;
  low_stock_threshold: number;
}

interface Payment {
  id: string;
  payment_date: string;
  amount_paid: number;
}

export default function BillingDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select(`*, client:client_profiles(first_name, last_name)`)
        .order('created_at', { ascending: false });

      const { data: productsData } = await supabase
        .from('products')
        .select('id, product_name, stock_quantity, low_stock_threshold')
        .eq('is_active', true);

      const { data: paymentsData } = await supabase
        .from('payments')
        .select('id, payment_date, amount_paid')
        .order('created_at', { ascending: false });

      setInvoices(invoicesData || []);
      setProducts(productsData || []);
      setPayments(paymentsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const todaySales = payments
    .filter(p => new Date(p.payment_date) >= todayStart)
    .reduce((sum, p) => sum + p.amount_paid, 0);

  const todayInvoices = invoices
    .filter(inv => new Date(inv.issue_date) >= todayStart).length;

  const recentTransactions = payments.length;
  const lowStockProducts = products.filter(p => p.stock_quantity <= p.low_stock_threshold);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        {/* Alert Skeleton */}
        <Skeleton className="h-14 w-full rounded-xl" />

        {/* Main Action Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-2">
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="pt-3 border-t">
                   <Skeleton className="h-4 w-20 mb-2" />
                   <Skeleton className="h-7 w-28" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Stats Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-10" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ═══════════ BILLING & INVOICES HEADER ═══════════ */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
          <Receipt className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing & Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Manage payments, generate receipts, and track outstanding balances
          </p>
        </div>
      </div>

      {/* Alert for low stock */}
      {lowStockProducts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/10 shadow-none">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-destructive rounded-lg">
                <AlertCircle className="w-4 h-4 text-destructive-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-xs">Inventory Alert</p>
                <p className="text-xs text-muted-foreground">
                  {lowStockProducts.length} product{lowStockProducts.length !== 1 ? 's are' : ' is'} running low on stock
                </p>
              </div>
              <Button 
                variant="outline"
                size="sm"
                className="h-7 text-xs bg-background"
                onClick={() => router.push('/admin/inventory')}
              >
                View Products
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.01] border-2"
          onClick={() => router.push('/admin/billing/pos')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-primary" />
              </div>
              <Badge variant="secondary" className="text-[10px] uppercase font-bold">POS System</Badge>
            </div>
            <h3 className="text-xl font-bold mb-1">Launch POS</h3>
            <p className="text-xs text-muted-foreground mb-3">Quick checkout for walk-ins</p>
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-0.5">Today's Sales</p>
              <p className="text-xl font-bold">₱{todaySales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.01] border-2"
          onClick={() => router.push('/admin/billing/invoices')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <Badge variant="secondary" className="text-[10px] uppercase font-bold">Records</Badge>
            </div>
            <h3 className="text-xl font-bold mb-1">Invoice Vault</h3>
            <p className="text-xs text-muted-foreground mb-3">View all transactions</p>
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-0.5">Generated Today</p>
              <p className="text-xl font-bold">{todayInvoices}</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.01] border-2"
          onClick={() => router.push('/admin/billing/payments')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Receipt className="w-6 h-6 text-primary" />
              </div>
              <Badge variant="secondary" className="text-[10px] uppercase font-bold">History</Badge>
            </div>
            <h3 className="text-xl font-bold mb-1">Payments</h3>
            <p className="text-xs text-muted-foreground mb-3">View all payment records</p>
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-0.5">Total Records</p>
              <p className="text-xl font-bold">{recentTransactions}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: invoices.length, icon: TrendingUp, color: 'text-primary' },
          { label: 'Products', value: products.length, icon: Package, color: 'text-primary' },
          { label: 'Payments', value: payments.length, icon: Receipt, color: 'text-primary' },
          { label: 'Low Stock', value: lowStockProducts.length, icon: AlertCircle, color: 'text-destructive' },
        ].map((stat, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tight">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}