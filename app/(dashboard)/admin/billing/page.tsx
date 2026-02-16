'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/auth-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
        .select(`
          *,
          client:client_profiles(first_name, last_name)
        `)
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

  // Calculate metrics
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading billing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Billing & Invoices</h1>
        <p className="text-muted-foreground">Manage your clinic's finances, invoices, and point of sale</p>
      </div>

      {/* Alert for low stock */}
      {lowStockProducts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/10">
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
                className="h-7 text-xs"
                onClick={() => router.push('/admin/inventory')}
              >
                View Products
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Action Cards - 3 Cards (Smaller) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Launch POS */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2"
          onClick={() => router.push('/admin/billing/pos')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-primary" />
              </div>
              <Badge variant="outline" className="text-xs">Quick Action</Badge>
            </div>
            <h3 className="text-xl font-bold mb-1">Launch POS</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Quick checkout for walk-ins
            </p>
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-0.5">Today's Sales</p>
              <p className="text-xl font-bold">₱{todaySales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Invoice Vault */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2"
          onClick={() => router.push('/admin/billing/invoices')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <Badge variant="outline" className="text-xs">History</Badge>
            </div>
            <h3 className="text-xl font-bold mb-1">Invoice Vault</h3>
            <p className="text-xs text-muted-foreground mb-3">
              View all transactions
            </p>
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-0.5">Generated Today</p>
              <p className="text-xl font-bold">{todayInvoices}</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Transaction History */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2"
          onClick={() => router.push('/admin/billing/payments')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Receipt className="w-6 h-6 text-primary" />
              </div>
              <Badge variant="outline" className="text-xs">History</Badge>
            </div>
            <h3 className="text-xl font-bold mb-1">Transaction History</h3>
            <p className="text-xs text-muted-foreground mb-3">
              View all payment records
            </p>
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-0.5">Total Transactions</p>
              <p className="text-xl font-bold">{recentTransactions}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Invoices</p>
                <p className="text-xl font-bold">{invoices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent rounded-lg">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Products</p>
                <p className="text-xl font-bold">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent rounded-lg">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payments</p>
                <p className="text-xl font-bold">{payments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push('/admin/inventory')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Low Stock</p>
                <p className="text-xl font-bold">{lowStockProducts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}