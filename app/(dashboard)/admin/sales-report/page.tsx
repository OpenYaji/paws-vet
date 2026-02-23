'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  TrendingUp, ShoppingBag, Stethoscope, Receipt,
  Search, Download, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, Banknote, CreditCard, Smartphone,
  BarChart2, X, Users,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────────── */

interface LineItem {
  id: string;
  item_type: 'service' | 'product';
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface InvoicePayment {
  payment_method: string;
  amount_paid: number;
  payment_number: string;
  transaction_reference: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  total_amount: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  payment_status: string;
  walk_in_customer_name?: string;
  client?: { first_name: string; last_name: string } | null;
  line_items: LineItem[];
  payments: InvoicePayment[];
}

type DatePreset = 'today' | 'week' | 'month' | 'year' | 'custom';

/* ─── Helpers ────────────────────────────────────────────────────────── */

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

function fmtCurrency(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtCurrencyShort(n: number) {
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₱${(n / 1_000).toFixed(1)}k`;
  return `₱${n.toFixed(0)}`;
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function getCustomerName(inv: Invoice) {
  if (inv.walk_in_customer_name) return inv.walk_in_customer_name;
  if (inv.client) return `${inv.client.first_name} ${inv.client.last_name}`;
  return 'Unknown';
}

function getPaymentMethod(inv: Invoice): string {
  return inv.payments?.[0]?.payment_method ?? '';
}

const METHOD_COLOR: Record<string, string> = {
  cash:   '#22c55e',
  card:   '#3b82f6',
  online: '#a855f7',
};

const METHOD_LABEL: Record<string, string> = {
  cash:   'Cash',
  card:   'Card',
  online: 'GCash',
};

const ITEMS_PER_PAGE = 12;

/* ─── Main Page ──────────────────────────────────────────────────────── */

export default function SalesReportPage() {
  const [isLoading, setIsLoading]       = useState(true);
  const [invoices, setInvoices]         = useState<Invoice[]>([]);
  const [datePreset, setDatePreset]     = useState<DatePreset>('month');
  const [customFrom, setCustomFrom]     = useState('');
  const [customTo, setCustomTo]         = useState('');
  const [searchQuery, setSearchQuery]   = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage]   = useState(1);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id, invoice_number, issue_date, total_amount, subtotal,
          tax_amount, discount_amount, payment_status,
          walk_in_customer_name,
          client:client_profiles(first_name, last_name),
          line_items:invoice_line_items(id, item_type, description, quantity, unit_price, line_total),
          payments(payment_method, amount_paid, payment_number, transaction_reference)
        `)
        .eq('payment_status', 'paid')
        .order('issue_date', { ascending: false });
      if (error) throw error;
      setInvoices((data as any[]) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  /* ── Date range ─────────────────────────────────────────────────── */
  const { fromDate, toDate } = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (datePreset === 'today') return { fromDate: toDateStr(today), toDate: toDateStr(today) };
    if (datePreset === 'week') {
      const s = new Date(today); s.setDate(today.getDate() - 6);
      return { fromDate: toDateStr(s), toDate: toDateStr(today) };
    }
    if (datePreset === 'month') {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      return { fromDate: toDateStr(s), toDate: toDateStr(today) };
    }
    if (datePreset === 'year') {
      const s = new Date(today.getFullYear(), 0, 1);
      return { fromDate: toDateStr(s), toDate: toDateStr(today) };
    }
    return { fromDate: customFrom, toDate: customTo };
  }, [datePreset, customFrom, customTo]);

  /* ── Filtered invoices ──────────────────────────────────────────── */
  const filtered = useMemo(() => invoices.filter(inv => {
    if (fromDate && inv.issue_date < fromDate) return false;
    if (toDate   && inv.issue_date > toDate)   return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!inv.invoice_number.toLowerCase().includes(q) &&
          !getCustomerName(inv).toLowerCase().includes(q)) return false;
    }
    if (methodFilter !== 'all' && getPaymentMethod(inv) !== methodFilter) return false;
    return true;
  }), [invoices, fromDate, toDate, searchQuery, methodFilter]);

  /* ── KPIs ───────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const total      = filtered.reduce((s, inv) => s + inv.total_amount, 0);
    const productRev = filtered.reduce((s, inv) =>
      s + inv.line_items.filter(l => l.item_type === 'product').reduce((ss, l) => ss + l.line_total, 0), 0);
    const serviceRev = filtered.reduce((s, inv) =>
      s + inv.line_items.filter(l => l.item_type === 'service').reduce((ss, l) => ss + l.line_total, 0), 0);
    return {
      total,
      count:      filtered.length,
      avg:        filtered.length ? total / filtered.length : 0,
      productRev,
      serviceRev,
    };
  }, [filtered]);

  /* ── Revenue chart ──────────────────────────────────────────────── */
  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const inv of filtered) {
      map[inv.issue_date] = (map[inv.issue_date] || 0) + inv.total_amount;
    }
    const days = Object.keys(map).sort();
    if (days.length > 60) {
      const monthly: Record<string, number> = {};
      for (const d of days) {
        const label = new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short' });
        monthly[label] = (monthly[label] || 0) + map[d];
      }
      return Object.entries(monthly).map(([label, revenue]) => ({ label, revenue }));
    }
    return days.map(d => ({
      label:   new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
      revenue: map[d],
    }));
  }, [filtered]);

  /* ── Payment method breakdown ───────────────────────────────────── */
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const inv of filtered) {
      const m = getPaymentMethod(inv) || 'unknown';
      map[m] = (map[m] || 0) + inv.total_amount;
    }
    return Object.entries(map).map(([method, total]) => ({
      method: METHOD_LABEL[method] ?? method.charAt(0).toUpperCase() + method.slice(1),
      key:    method,
      total,
      color:  METHOD_COLOR[method] ?? '#94a3b8',
    }));
  }, [filtered]);

  /* ── Top items ──────────────────────────────────────────────────── */
  const { topProducts, topServices } = useMemo(() => {
    const products: Record<string, { revenue: number; qty: number }> = {};
    const services: Record<string, { revenue: number; qty: number }> = {};
    for (const inv of filtered) {
      for (const li of inv.line_items) {
        const t = li.item_type === 'product' ? products : services;
        if (!t[li.description]) t[li.description] = { revenue: 0, qty: 0 };
        t[li.description].revenue += li.line_total;
        t[li.description].qty     += li.quantity;
      }
    }
    const sort = (obj: typeof products) =>
      Object.entries(obj)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    return { topProducts: sort(products), topServices: sort(services) };
  }, [filtered]);

  /* ── Pagination ─────────────────────────────────────────────────── */
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  function toggleRow(id: string) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  /* ── Print / Export ─────────────────────────────────────────────── */
  function handlePrint() {
    const win = window.open('', '_blank');
    if (!win) return;
    const periodLabel = fromDate
      ? `${fmtDate(fromDate)} — ${fmtDate(toDate || toDateStr(new Date()))}`
      : 'All Time';
    win.document.write(`
      <!DOCTYPE html><html><head>
        <title>Sales Report — PAWS</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 28px; font-size: 13px; color: #111; }
          h1 { margin: 0 0 4px; font-size: 22px; } p { margin: 0 0 18px; color: #555; }
          .kpi { display: flex; gap: 16px; margin-bottom: 18px; }
          .kpi-card { flex: 1; border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px 16px; }
          .kpi-card .val { font-size: 18px; font-weight: 900; } .kpi-card .lbl { font-size: 10px; color: #888; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #f4f4f4; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
          td { padding: 8px 10px; border-bottom: 1px solid #eee; } .num { text-align: right; font-weight: 700; }
          .footer { margin-top: 28px; text-align: center; color: #aaa; font-size: 11px; }
        </style>
      </head><body>
        <h1>Sales Report</h1>
        <p>${periodLabel} &nbsp;·&nbsp; ${filtered.length} transactions</p>
        <div class="kpi">
          <div class="kpi-card"><div class="lbl">Total Revenue</div><div class="val">${fmtCurrency(stats.total)}</div></div>
          <div class="kpi-card"><div class="lbl">Transactions</div><div class="val">${stats.count}</div></div>
          <div class="kpi-card"><div class="lbl">Avg. Order</div><div class="val">${fmtCurrency(stats.avg)}</div></div>
          <div class="kpi-card"><div class="lbl">Products</div><div class="val">${fmtCurrency(stats.productRev)}</div></div>
          <div class="kpi-card"><div class="lbl">Services</div><div class="val">${fmtCurrency(stats.serviceRev)}</div></div>
        </div>
        <table>
          <thead><tr><th>Invoice #</th><th>Date</th><th>Customer</th><th>Method</th><th class="num">Total</th></tr></thead>
          <tbody>
            ${filtered.map(inv => `
              <tr>
                <td>${inv.invoice_number}</td>
                <td>${fmtDate(inv.issue_date)}</td>
                <td>${getCustomerName(inv)}</td>
                <td>${(METHOD_LABEL[getPaymentMethod(inv)] ?? getPaymentMethod(inv)).toUpperCase()}</td>
                <td class="num">${fmtCurrency(inv.total_amount)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div class="footer">PAWS Veterinary Clinic — Sales Report · Generated ${new Date().toLocaleString()}</div>
      </body></html>
    `);
    win.document.close();
    win.print();
  }

  /* ── Loading ─────────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-64 rounded-2xl col-span-2" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <BarChart2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground leading-tight">Sales Report</h1>
            <p className="text-sm text-muted-foreground">Revenue analytics and transaction history</p>
          </div>
        </div>
        <Button variant="outline" onClick={handlePrint} className="gap-2 h-10 px-5 rounded-xl font-semibold">
          <Download className="w-4 h-4" /> Export / Print
        </Button>
      </div>

      {/* Date range + search/filter toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-6 pb-4 shrink-0">
        {(['today', 'week', 'month', 'year'] as DatePreset[]).map(p => (
          <button
            key={p}
            onClick={() => { setDatePreset(p); setCurrentPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-colors ${
              datePreset === p
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {p === 'today' ? 'Today' : p === 'week' ? 'Last 7 Days' : p === 'month' ? 'This Month' : 'This Year'}
          </button>
        ))}
        <button
          onClick={() => { setDatePreset('custom'); setCurrentPage(1); }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-colors ${
            datePreset === 'custom'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          Custom
        </button>
        {datePreset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date" value={customFrom}
              onChange={e => { setCustomFrom(e.target.value); setCurrentPage(1); }}
              className="h-8 px-3 text-xs rounded-xl border border-border bg-card text-foreground"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date" value={customTo}
              onChange={e => { setCustomTo(e.target.value); setCurrentPage(1); }}
              className="h-8 px-3 text-xs rounded-xl border border-border bg-card text-foreground"
            />
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Invoice # or customer…"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-8 h-9 w-56 rounded-xl text-sm bg-muted/50 border-transparent focus:border-border focus:bg-card"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <Select value={methodFilter} onValueChange={v => { setMethodFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="h-9 w-40 rounded-xl text-sm">
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="online">GCash / Online</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard label="Total Revenue"  value={fmtCurrency(stats.total)}       icon={TrendingUp}   color="bg-primary text-primary-foreground" />
          <KpiCard label="Transactions"   value={stats.count}                     icon={Receipt}      color="bg-emerald-600 text-white" />
          <KpiCard label="Avg. Order"     value={fmtCurrency(stats.avg)}          icon={Users}        color="bg-blue-600 text-white" />
          <KpiCard label="Products Sales" value={fmtCurrency(stats.productRev)}   icon={ShoppingBag}  color="bg-orange-500 text-white" />
          <KpiCard label="Services Sales" value={fmtCurrency(stats.serviceRev)}   icon={Stethoscope}  color="bg-violet-600 text-white" />
        </div>

        {/* Revenue chart + payment method breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Bar chart */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Revenue Over Time</p>
            {chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                No transactions for the selected period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={chartData} margin={{ top: 0, right: 4, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false} tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={fmtCurrencyShort}
                  />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}
                    formatter={(v: number) => [fmtCurrency(v), 'Revenue']}
                    labelStyle={{ fontWeight: 700, color: '#111', marginBottom: 4 }}
                    cursor={{ fill: 'rgba(0,0,0,.04)' }}
                  />
                  <Bar dataKey="revenue" fill="#16a34a" radius={[5, 5, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie chart */}
          <div className="bg-card border border-border rounded-2xl p-5 flex flex-col">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4">By Payment Method</p>
            {paymentBreakdown.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">No data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={paymentBreakdown} cx="50%" cy="50%"
                      innerRadius={48} outerRadius={72}
                      dataKey="total" paddingAngle={3}
                    >
                      {paymentBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number) => [fmtCurrency(v)]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-2">
                  {paymentBreakdown.map((entry, i) => {
                    const pct = stats.total > 0 ? ((entry.total / stats.total) * 100).toFixed(1) : '0';
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
                        <span className="text-xs font-semibold text-foreground flex-1">{entry.method}</span>
                        <span className="text-[10px] text-muted-foreground">{pct}%</span>
                        <span className="text-xs font-black text-foreground">{fmtCurrency(entry.total)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Top products + top services */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TopTable title="Top Products" items={topProducts} barColor="#f97316" />
          <TopTable title="Top Services" items={topServices} barColor="#a855f7" />
        </div>

        {/* Transaction table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div>
              <p className="text-sm font-bold text-foreground">Transaction History</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{filtered.length}</span> paid transactions · click a row to expand
              </p>
            </div>
            <p className="text-xs font-bold text-foreground">
              Total: <span className="text-primary">{fmtCurrency(stats.total)}</span>
            </p>
          </div>

          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="w-8 px-4" />
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Invoice #</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Customer</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Date</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Method</TableHead>
                <TableHead className="text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Items</TableHead>
                <TableHead className="text-right text-[11px] font-bold uppercase tracking-widest text-muted-foreground pr-5">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-16">
                    No transactions found for the selected period
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map(inv => {
                  const expanded = expandedRows.has(inv.id);
                  const method   = getPaymentMethod(inv);
                  const mColor   = METHOD_COLOR[method] ?? '#94a3b8';
                  const mLabel   = METHOD_LABEL[method] ?? method.toUpperCase();
                  const MIcon    = method === 'cash' ? Banknote : method === 'card' ? CreditCard : Smartphone;
                  return (
                    <>
                      <TableRow
                        key={inv.id}
                        onClick={() => toggleRow(inv.id)}
                        className="cursor-pointer border-border hover:bg-muted/40 transition-colors"
                      >
                        <TableCell className="px-4 py-3">
                          {expanded
                            ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                            : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="py-3 font-mono text-xs font-bold text-foreground">{inv.invoice_number}</TableCell>
                        <TableCell className="py-3 text-sm font-medium text-foreground">{getCustomerName(inv)}</TableCell>
                        <TableCell className="py-3 text-xs text-muted-foreground">{fmtDate(inv.issue_date)}</TableCell>
                        <TableCell className="py-3">
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg"
                            style={{ background: `${mColor}22`, color: mColor }}
                          >
                            <MIcon className="w-3 h-3" /> {mLabel}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-center text-xs text-muted-foreground">
                          {inv.line_items.length}
                        </TableCell>
                        <TableCell className="py-3 text-right font-black text-sm text-foreground pr-5">
                          {fmtCurrency(inv.total_amount)}
                        </TableCell>
                      </TableRow>

                      {expanded && (
                        <TableRow key={`${inv.id}-detail`} className="bg-muted/20 hover:bg-muted/20 border-border">
                          <TableCell colSpan={7} className="px-10 pt-1 pb-4">
                            <div className="border border-border rounded-xl overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-muted/60">
                                    <th className="text-left px-4 py-2 font-bold text-muted-foreground uppercase tracking-wide">Item</th>
                                    <th className="text-center px-4 py-2 font-bold text-muted-foreground uppercase tracking-wide">Type</th>
                                    <th className="text-center px-4 py-2 font-bold text-muted-foreground uppercase tracking-wide">Qty</th>
                                    <th className="text-right px-4 py-2 font-bold text-muted-foreground uppercase tracking-wide">Unit Price</th>
                                    <th className="text-right px-4 py-2 font-bold text-muted-foreground uppercase tracking-wide">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {inv.line_items.map(li => (
                                    <tr key={li.id} className="border-t border-border">
                                      <td className="px-4 py-2 font-medium text-foreground">{li.description}</td>
                                      <td className="px-4 py-2 text-center">
                                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                                          li.item_type === 'product'
                                            ? 'bg-orange-500/15 text-orange-600'
                                            : 'bg-violet-500/15 text-violet-600'
                                        }`}>{li.item_type}</span>
                                      </td>
                                      <td className="px-4 py-2 text-center text-muted-foreground">{li.quantity}</td>
                                      <td className="px-4 py-2 text-right text-muted-foreground">{fmtCurrency(li.unit_price)}</td>
                                      <td className="px-4 py-2 text-right font-bold text-foreground">{fmtCurrency(li.line_total)}</td>
                                    </tr>
                                  ))}
                                  {/* Subtotals footer */}
                                  <tr className="border-t border-border bg-muted/40">
                                    <td colSpan={3} className="px-4 py-2 text-right text-muted-foreground">Subtotal</td>
                                    <td colSpan={2} className="px-4 py-2 text-right text-foreground">{fmtCurrency(inv.subtotal)}</td>
                                  </tr>
                                  {inv.discount_amount > 0 && (
                                    <tr className="bg-muted/20">
                                      <td colSpan={3} className="px-4 py-1.5 text-right text-emerald-600 font-semibold">Discount</td>
                                      <td colSpan={2} className="px-4 py-1.5 text-right text-emerald-600 font-semibold">− {fmtCurrency(inv.discount_amount)}</td>
                                    </tr>
                                  )}
                                  {inv.tax_amount > 0 && (
                                    <tr className="bg-muted/20">
                                      <td colSpan={3} className="px-4 py-1.5 text-right text-muted-foreground">Tax</td>
                                      <td colSpan={2} className="px-4 py-1.5 text-right text-muted-foreground">{fmtCurrency(inv.tax_amount)}</td>
                                    </tr>
                                  )}
                                  <tr className="border-t-2 border-border bg-muted/50">
                                    <td colSpan={3} className="px-4 py-2.5 text-right font-bold text-foreground text-sm">TOTAL</td>
                                    <td colSpan={2} className="px-4 py-2.5 text-right font-black text-foreground text-sm">{fmtCurrency(inv.total_amount)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Page <span className="font-bold text-foreground">{currentPage}</span> of {totalPages}
                {' '}· showing {Math.min(filtered.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-colors"
                ><ChevronLeft className="w-4 h-4" /></button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-colors"
                ><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

function KpiCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3 shadow-sm">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-foreground/60 font-semibold leading-tight uppercase tracking-wide truncate">{label}</p>
        <p className="text-lg font-black text-foreground leading-tight truncate">{value}</p>
      </div>
    </div>
  );
}

function TopTable({
  title, items, barColor,
}: {
  title: string;
  items: { name: string; revenue: number; qty: number }[];
  barColor: string;
}) {
  const max = items[0]?.revenue ?? 1;
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No data for selected period</p>
      ) : (
        <div className="space-y-3.5">
          {items.map((item, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground line-clamp-1 flex-1 min-w-0 pr-3">{item.name}</span>
                <span className="text-xs font-black text-foreground shrink-0">
                  {fmtCurrency(item.revenue)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(item.revenue / max) * 100}%`, background: barColor }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{item.qty} unit{item.qty !== 1 ? 's' : ''} sold</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
