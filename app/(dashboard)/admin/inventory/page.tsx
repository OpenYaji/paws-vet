'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/lib/auth-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, Search, Trash2, AlertCircle, Package, Edit,
  LayoutGrid, List, ArrowUpRight, Loader2, CloudUpload,
  Eye, X, Boxes, Tag, CalendarClock, ShieldAlert,
  CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

/* ─── Constants ─────────────────────────────────────────────────────── */

const PRODUCT_CATEGORIES = [
  'Pet Food', 'Supplements', 'Medications', 'Accessories', 'Grooming', 'Toys', 'Other',
];

const EXPIRY_SOON_DAYS = 30;

/* ─── Expiry helpers ─────────────────────────────────────────────────── */

type ExpiryStatus = 'expired' | 'soon' | 'ok' | 'none';

function getExpiryStatus(dateStr?: string | null): ExpiryStatus {
  if (!dateStr) return 'none';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp   = new Date(dateStr);
  if (exp < today) return 'expired';
  const diff = Math.ceil((exp.getTime() - today.getTime()) / 86_400_000);
  return diff <= EXPIRY_SOON_DAYS ? 'soon' : 'ok';
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86_400_000);
}

function fmtDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Increments the trailing numeric part of a batch number.
 *  "BN-2025-001" → "BN-2025-002", "BATCH099" → "BATCH100" */
function incrementBatchNumber(batchNum: string): string {
  const match = batchNum.match(/^(.*?)(\d+)$/);
  if (!match) return batchNum;
  const [, prefix, numStr] = match;
  const next = String(parseInt(numStr, 10) + 1).padStart(numStr.length, '0');
  return prefix + next;
}

/** Auto-generates the next unique batch number for a product.
 *  Uses the latest batch's number as base; falls back to B001. */
function generateNextBatchNumber(batches: any[]): string {
  if (!batches.length) return 'B001';
  const sorted = [...batches].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const last = sorted[sorted.length - 1];
  if (!last.batch_number) return `B${String(batches.length + 1).padStart(3, '0')}`;
  return incrementBatchNumber(last.batch_number);
}

/* ─── ExpiryBadge ────────────────────────────────────────────────────── */

function ExpiryBadge({ dateStr, size = 'md' }: { dateStr?: string | null; size?: 'sm' | 'md' }) {
  const status = getExpiryStatus(dateStr);
  const sm = size === 'sm';
  const base = `inline-flex items-center gap-1 font-bold rounded-lg border ${sm ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-1'}`;

  if (status === 'none') return <span className={`${base} border-border bg-muted text-muted-foreground`}>No expiry</span>;

  if (status === 'expired') return (
    <span className={`${base} bg-red-600 text-white border-red-700 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800/50`}>
      <ShieldAlert className={sm ? 'w-2.5 h-2.5' : 'w-3 h-3'} /> EXPIRED
    </span>
  );

  if (status === 'soon') {
    const days = daysUntil(dateStr!);
    return (
      <span className={`${base} bg-orange-500 text-white border-orange-600 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-800/40`}>
        <Clock className={sm ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
        {sm ? `${days}d left` : `Exp. in ${days} day${days !== 1 ? 's' : ''}`}
      </span>
    );
  }

  if (sm) return null; // don't show "ok" badge in compact contexts

  return (
    <span className={`${base} bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40`}>
      <CheckCircle2 className="w-3 h-3" /> {fmtDate(dateStr)}
    </span>
  );
}

/* ─── StockBadge ─────────────────────────────────────────────────────── */

function StockBadge({ qty, threshold }: { qty: number; threshold: number }) {
  const isOos  = qty === 0;
  const isLow  = qty > 0 && qty <= threshold;
  const cls = isOos
    ? 'bg-red-700 text-white'
    : isLow
    ? 'bg-red-600 text-white'
    : 'bg-primary/10 text-primary';
  return <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${cls}`}>{qty}</span>;
}

/* ─── KPI card ───────────────────────────────────────────────────────── */

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

/* ─── Expiry preview callout (inside form) ───────────────────────────── */

function ExpiryPreview({ dateStr }: { dateStr: string }) {
  const status = getExpiryStatus(dateStr);
  if (!dateStr || status === 'none') return null;

  const stripe  = status === 'expired' ? 'bg-red-600' : status === 'soon' ? 'bg-orange-500' : 'bg-emerald-500';
  const iconCls = status === 'expired' ? 'text-red-600' : status === 'soon' ? 'text-orange-500' : 'text-emerald-500';
  const Icon    = status === 'expired' ? ShieldAlert : status === 'soon' ? Clock : CheckCircle2;
  const msg     = status === 'expired'
    ? `Expired on ${fmtDate(dateStr)}`
    : status === 'soon'
    ? `Expires in ${daysUntil(dateStr)} day${daysUntil(dateStr) !== 1 ? 's' : ''} — ${fmtDate(dateStr)}`
    : `Valid until ${fmtDate(dateStr)}`;

  return (
    <div className="relative flex items-center gap-2 rounded-xl pl-5 pr-3 py-2.5 text-xs font-medium border border-border bg-card overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1.25 ${stripe}`} />
      <Icon className={`w-3.5 h-3.5 shrink-0 ${iconCls}`} />
      <span className="text-foreground/80">{msg}</span>
    </div>
  );
}

/* ─── Expiry alert banner ────────────────────────────────────────────── */

function ExpiryAlertBanner({ products, effectiveExpiry }: { products: any[]; effectiveExpiry: Record<string, string | null> }) {
  const expired = products.filter(p => getExpiryStatus(effectiveExpiry[p.id]) === 'expired');
  const soon    = products.filter(p => getExpiryStatus(effectiveExpiry[p.id]) === 'soon');
  if (!expired.length && !soon.length) return null;

  const borderCls = expired.length > 0
    ? 'border-red-500 dark:border-red-900/50'
    : 'border-orange-500 dark:border-orange-900/50';

  return (
    <div className={`mx-6 mb-4 rounded-2xl border-2 ${borderCls} bg-card overflow-hidden`}>
      {expired.length > 0 && (
        <div className="relative flex items-start gap-3 pl-5 pr-4 py-3.5 border-b-2 border-red-500 dark:border-red-900/50">
          <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-red-600" />
          <ShieldAlert className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground mb-1.5">
              {expired.length} item{expired.length > 1 ? 's' : ''} EXPIRED — remove from sale immediately
            </p>
            <div className="flex flex-wrap gap-1.5">
              {expired.map(p => (
                <span key={p.id} className="text-[11px] font-bold bg-red-600 text-white px-2.5 py-0.5 rounded-md">
                  {p.product_name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      {soon.length > 0 && (
        <div className="relative flex items-start gap-3 pl-5 pr-4 py-3.5">
          <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-orange-500" />
          <Clock className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground mb-1.5">
              {soon.length} item{soon.length > 1 ? 's' : ''} expiring within {EXPIRY_SOON_DAYS} days
            </p>
            <div className="flex flex-wrap gap-1.5">
              {soon.map(p => {
                const exp = effectiveExpiry[p.id];
                return (
                  <span key={p.id} className="text-[11px] font-bold bg-orange-500 text-white px-2.5 py-0.5 rounded-md">
                    {p.product_name}{exp ? ` · ${daysUntil(exp)}d left` : ''}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────────────────── */

const EMPTY_FORM = {
  product_name: '', category: '', price: 0, stock_quantity: 0,
  low_stock_threshold: 5, description: '', sku: '',
  image_url: '', expiration_date: '', batch_number: '', manufacturing_date: '',
};

const EMPTY_ADD_STOCK = { qty: 1, batch_number: '', manufacturing_date: '', expiration_date: '' };

export default function InventoryPage() {
  const [viewMode, setViewMode]             = useState<'rows' | 'cards'>('cards');
  const [isLoading, setIsLoading]           = useState(true);
  const [isUploading, setIsUploading]       = useState(false);
  const [products, setProducts]             = useState<any[]>([]);
  const [searchTerm, setSearchTerm]         = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expiryFilter, setExpiryFilter]     = useState<'all' | 'expired' | 'soon' | 'ok'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showDialog, setShowDialog]         = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [form, setForm]                     = useState({ ...EMPTY_FORM });
  const [showAddStockPanel, setShowAddStockPanel] = useState(false);
  const [addStockData, setAddStockData]           = useState({ ...EMPTY_ADD_STOCK });
  const [productBatches, setProductBatches]       = useState<Record<string, any[]>>({});

  /* ── Confirm modal ── */
  const [confirmState, setConfirmState] = useState<{
    open: boolean; title: string; body: string;
    variant: 'danger' | 'warning' | 'default'; action: (() => Promise<void>) | null;
  }>({ open: false, title: '', body: '', variant: 'danger', action: null });

  function openConfirm(
    title: string, body: string,
    variant: 'danger' | 'warning' | 'default',
    action: () => Promise<void>,
  ) {
    setConfirmState({ open: true, title, body, variant, action });
  }

  async function runConfirm() {
    if (!confirmState.action) return;
    await confirmState.action();
    setConfirmState(s => ({ ...s, open: false, action: null }));
  }

  /* ── Success toast ── */
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' } | null>(null);

  function showToast(msg: string, type: 'success' | 'info' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    try {
      setIsLoading(true);
      const [{ data: prods, error }, { data: batchRows }] = await Promise.all([
        supabase.from('products').select('*').order('product_name'),
        supabase.from('product_batches').select('*').order('created_at'),
      ]);
      if (error) throw error;
      setProducts(prods || []);
      const map: Record<string, any[]> = {};
      for (const b of (batchRows || [])) {
        if (!map[b.product_id]) map[b.product_id] = [];
        map[b.product_id].push(b);
      }
      setProductBatches(map);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const path = `products/${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
      setForm(f => ({ ...f, image_url: publicUrl }));
    } catch (e: any) { alert('Upload failed: ' + e.message); }
    finally { setIsUploading(false); }
  }

  function openAdd() {
    setEditingProduct(null);
    setForm({ ...EMPTY_FORM });
    setShowAddStockPanel(false);
    setAddStockData({ ...EMPTY_ADD_STOCK });
    setShowDialog(true);
  }

  function openEdit(p: any) {
    setEditingProduct(p);
    setShowAddStockPanel(false);
    setAddStockData({ ...EMPTY_ADD_STOCK });
    // Always use product-level fields — batch data is managed in the Stock Batches section
    setForm({
      product_name:        p.product_name || '',
      category:            p.category || '',
      price:               p.price || 0,
      stock_quantity:      p.stock_quantity || 0,
      low_stock_threshold: p.low_stock_threshold || 5,
      description:         p.description || '',
      sku:                 p.sku || '',
      image_url:           p.image_url || '',
      expiration_date:     p.expiration_date    || '',
      batch_number:        p.batch_number       || '',
      manufacturing_date:  p.manufacturing_date || '',
    });
    setShowDialog(true);
  }

  async function saveProduct() {
    try {
      const payload = {
        ...form,
        expiration_date:    form.expiration_date    || null,
        manufacturing_date: form.manufacturing_date || null,
        batch_number:       form.batch_number       || null,
      };

      if (editingProduct) {
        await supabase.from('products').update(payload).eq('id', editingProduct.id);
        setShowDialog(false);
        loadProducts();
        showToast(`"${form.product_name}" updated successfully`);
      } else {
        // Capture values now (before dialog closes) then confirm before inserting
        const productName = form.product_name;
        const stockQty    = form.stock_quantity;
        setShowDialog(false);
        openConfirm(
          'Add Product?',
          `Add "${productName}" to inventory with ${stockQty} unit${stockQty !== 1 ? 's' : ''} in stock?`,
          'default',
          async () => {
            await supabase.from('products').insert({ ...payload, is_active: true });
            loadProducts();
            showToast(`"${productName}" added to inventory`);
          },
        );
      }
    } catch (e) { console.error(e); }
  }

  async function applyAddStock() {
    if (!editingProduct || addStockData.qty <= 0) return;
    const batches = productBatches[editingProduct.id] ?? [];
    const autoBatchNum = generateNextBatchNumber(batches);
    try {
      await supabase.from('product_batches').insert({
        product_id:         editingProduct.id,
        batch_number:       autoBatchNum,
        quantity:           addStockData.qty,
        manufacturing_date: addStockData.manufacturing_date || null,
        expiration_date:    addStockData.expiration_date    || null,
      });
      await supabase.from('products').update({
        stock_quantity: editingProduct.stock_quantity + addStockData.qty,
      }).eq('id', editingProduct.id);
      setShowDialog(false);
      loadProducts();
      showToast(`Batch ${autoBatchNum} added · +${addStockData.qty} units`);
    } catch (e) { console.error(e); }
  }

  function removeBatch(batch: any) {
    const label = batch.batch_number ? `Batch ${batch.batch_number}` : 'this batch';
    openConfirm(
      `Remove ${label}?`,
      `This will remove ${batch.quantity} unit${batch.quantity !== 1 ? 's' : ''} from stock. The expiry alert for this batch will disappear. This cannot be undone.`,
      'warning',
      async () => {
        await supabase.from('product_batches').delete().eq('id', batch.id);
        const newQty = Math.max(0, (editingProduct?.stock_quantity ?? 0) - batch.quantity);
        await supabase.from('products').update({ stock_quantity: newQty }).eq('id', editingProduct.id);
        setEditingProduct((p: any) => p ? { ...p, stock_quantity: newQty } : p);
        setForm(f => ({ ...f, stock_quantity: newQty }));
        loadProducts();
        showToast(`${label} removed · stock reduced by ${batch.quantity}`);
      },
    );
  }

  function deleteProduct(id: string) {
    const name = editingProduct?.product_name ?? 'this product';
    // Close product dialog FIRST — two stacked Radix Dialogs trap focus and
    // prevent the confirm modal from being interactable.
    setShowDialog(false);
    openConfirm(
      'Delete Product?',
      `"${name}" and all its batch records will be permanently deleted. This cannot be undone.`,
      'danger',
      async () => {
        const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          console.error('Delete failed:', body.error);
          showToast('Failed to delete product', 'info');
          return;
        }
        loadProducts();
        showToast(`"${name}" deleted`, 'info');
      },
    );
  }

  /* Derived */

  /** For each product, use the earliest (worst) expiry across all its tracked batches.
   *  Falls back to the product-level expiration_date if no batches exist. */
  const effectiveExpiry = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const p of products) {
      const batches = productBatches[p.id] ?? [];
      const dates   = batches.map((b: any) => b.expiration_date).filter(Boolean) as string[];
      map[p.id] = dates.length
        ? dates.reduce((min, d) => (d < min ? d : min))
        : (p.expiration_date ?? null);
    }
    return map;
  }, [products, productBatches]);

  const filtered = useMemo(() => products.filter(p => {
    const q      = searchTerm.toLowerCase();
    const matchQ = p.product_name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
    const matchC = categoryFilter === 'all' || p.category === categoryFilter;
    const es     = getExpiryStatus(effectiveExpiry[p.id]);
    const matchE = expiryFilter === 'all'
      || (expiryFilter === 'expired' && es === 'expired')
      || (expiryFilter === 'soon'    && es === 'soon')
      || (expiryFilter === 'ok'      && (es === 'ok' || es === 'none'));
    return matchQ && matchC && matchE;
  }), [products, effectiveExpiry, searchTerm, categoryFilter, expiryFilter]);

  const stats = useMemo(() => {
    const a = products.filter(p => p.is_active);
    return {
      total:        a.length,
      lowStock:     a.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold).length,
      oos:          a.filter(p => p.stock_quantity === 0).length,
      expiringSoon: a.filter(p => getExpiryStatus(effectiveExpiry[p.id]) === 'soon').length,
      expired:      a.filter(p => getExpiryStatus(effectiveExpiry[p.id]) === 'expired').length,
    };
  }, [products, effectiveExpiry]);

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <div className="space-y-6 p-6 animate-pulse">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  /* ── Main ── */
  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <Package className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground leading-tight">Inventory</h1>
            <p className="text-sm text-muted-foreground">Monitor stock levels, expiry dates, and supplies</p>
          </div>
        </div>
        <Button onClick={openAdd} className="gap-2 h-10 px-5 rounded-xl font-semibold shadow-sm">
          <Plus className="w-4 h-4" /> Add Item
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 px-6 pb-4 shrink-0">
        <KpiCard label="Total Items"    value={stats.total}        icon={Package}       color="bg-primary text-primary-foreground" />
        <KpiCard label="Low Stock"      value={stats.lowStock}     icon={AlertCircle}   color="bg-amber-500 text-white" />
        <KpiCard label="Out of Stock"   value={stats.oos}          icon={Boxes}         color="bg-red-600 text-white" />
        <KpiCard label="Expiring Soon"  value={stats.expiringSoon} icon={CalendarClock} color="bg-orange-500 text-white" />
        <KpiCard label="Expired"        value={stats.expired}      icon={ShieldAlert}   color="bg-rose-600 text-white" />
      </div>

      {/* Expiry alert banners */}
      <ExpiryAlertBanner products={products.filter(p => p.is_active)} effectiveExpiry={effectiveExpiry} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-6 pb-4 shrink-0">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search items or SKU…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 h-9 bg-muted/50 border-transparent focus:border-border focus:bg-card rounded-xl text-sm"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 w-[160px] rounded-xl text-sm">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {PRODUCT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Expiry filter */}
        <Select value={expiryFilter} onValueChange={v => setExpiryFilter(v as any)}>
          <SelectTrigger className="h-9 w-[160px] rounded-xl text-sm">
            <SelectValue placeholder="All Expiry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Expiry Status</SelectItem>
            <SelectItem value="expired">🔴 Expired</SelectItem>
            <SelectItem value="soon">🟡 Expiring Soon</SelectItem>
            <SelectItem value="ok">🟢 Still Valid</SelectItem>
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div className="flex items-center gap-1 border border-border rounded-xl p-0.5 bg-muted ml-auto">
          <button
            onClick={() => setViewMode('cards')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${viewMode === 'cards' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          ><LayoutGrid className="w-4 h-4" /></button>
          <button
            onClick={() => setViewMode('rows')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${viewMode === 'rows' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          ><List className="w-4 h-4" /></button>
        </div>

        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{filtered.length}</span> items
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-6 pb-6">

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">No items found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        )}

        {/* ── TABLE view ── */}
        {viewMode === 'rows' && filtered.length > 0 && (
          <div className="h-full rounded-2xl border border-border overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="px-5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Item</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Category</TableHead>
                  <TableHead className="text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Stock</TableHead>
                  <TableHead className="text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span className="flex items-center justify-center gap-1">
                      <CalendarClock className="w-3 h-3" /> Expiry
                    </span>
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Price</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => {
                  const es     = getExpiryStatus(effectiveExpiry[p.id]);
                  const tOos   = p.stock_quantity === 0;
                  const tLow   = p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold;
                  const tLeft  = (es === 'expired' || tOos) ? 'border-l-4 border-l-red-600'
                    : es === 'soon' ? 'border-l-4 border-l-orange-500'
                    : tLow         ? 'border-l-4 border-l-red-500'
                    : '';
                  return (
                    <TableRow
                      key={p.id}
                      onClick={() => openEdit(p)}
                      className="group cursor-pointer border-border transition-colors hover:bg-muted/50"
                    >
                      <TableCell className={`px-5 py-3 ${tLeft}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg border border-border bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                            {p.image_url
                              ? <img src={p.image_url} alt={p.product_name} className="w-full h-full object-cover" />
                              : <Package className="w-4 h-4 text-muted-foreground/40" />
                            }
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground leading-tight">{p.product_name}</p>
                            <div className="flex items-center gap-2">
                              {p.sku && <p className="text-[10px] font-mono text-muted-foreground uppercase">{p.sku}</p>}
                              {p.batch_number && <p className="text-[10px] font-mono text-muted-foreground">#{p.batch_number}</p>}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-semibold">{p.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <StockBadge qty={p.stock_quantity} threshold={p.low_stock_threshold} />
                      </TableCell>
                      <TableCell className="text-center">
                        <ExpiryBadge dateStr={effectiveExpiry[p.id]} />
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm">₱{p.price.toLocaleString()}</TableCell>
                      <TableCell>
                        <button
                          onClick={e => { e.stopPropagation(); openEdit(p); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
                        ><Edit className="w-3.5 h-3.5" /></button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ── CARD view ── */}
        {viewMode === 'cards' && filtered.length > 0 && (
          <div className="h-full overflow-y-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pb-4 pr-1">
            {filtered.map(p => {
              const es       = getExpiryStatus(effectiveExpiry[p.id]);
              const isExpired = es === 'expired';
              const isSoon    = es === 'soon';
              const isLow     = p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold;
              const isOos     = p.stock_quantity === 0;

              const cardRing = isExpired ? 'border-red-600 dark:border-red-700'
                : isSoon ? 'border-orange-500 dark:border-orange-700'
                : (isLow || isOos) ? 'border-red-500 dark:border-red-700'
                : 'border-border';

              const cardBg = 'bg-card';

              return (
                <div
                  key={p.id}
                  onClick={() => openEdit(p)}
                  className={`group relative ${cardBg} rounded-2xl border-2 ${cardRing} p-4 flex gap-3 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5`}
                >
                  {/* Image */}
                  <div className="relative w-[72px] h-[72px] rounded-xl border border-border bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                    {p.image_url
                      ? <img src={p.image_url} alt={p.product_name} className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-300" />
                      : <Package className="w-7 h-7 text-muted-foreground/25" />
                    }
                    <div className="absolute inset-0 bg-primary/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-bold text-foreground leading-tight line-clamp-1">{p.product_name}</p>
                        <span className="text-sm font-black text-foreground shrink-0">₱{p.price.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{p.category}</span>
                        </div>
                        {p.batch_number && (
                          <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            #{p.batch_number}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer: stock + expiry */}
                    <div className="mt-2.5 pt-2.5 border-t border-border flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Boxes className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Stock:</span>
                        <StockBadge qty={p.stock_quantity} threshold={p.low_stock_threshold} />
                      </div>
                      {effectiveExpiry[p.id] && <ExpiryBadge dateStr={effectiveExpiry[p.id]} size="sm" />}
                    </div>
                  </div>

                  {/* Expired overlay icon */}
                  {isExpired && (
                    <div className="absolute top-2.5 right-2.5">
                      <ShieldAlert className="w-4 h-4 text-red-500 dark:text-red-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════════ PRODUCT DIALOG ══════════ */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl rounded-2xl p-0 border-none shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                {editingProduct ? 'Update product details, stock, and expiry info.' : 'Add a new item to inventory with stock and expiry tracking.'}
              </DialogDescription>
            </div>
            <button
              onClick={() => setShowDialog(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            ><X className="w-4 h-4" /></button>
          </div>

          {/* Body */}
          <div className="grid grid-cols-1 md:grid-cols-12 overflow-y-auto max-h-[65vh]">

            {/* Left: form */}
            <div className="md:col-span-7 p-6 space-y-4 border-r border-border">

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Product Name *</Label>
                <Input
                  value={form.product_name}
                  onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))}
                  placeholder="e.g. Royal Canin Adult"
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Category *</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {PRODUCT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">SKU</Label>
                  <Input
                    value={form.sku}
                    onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                    placeholder="e.g. RC-001"
                    className="h-10 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Price (₱) *</Label>
                  <Input
                    type="number" min={0}
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {editingProduct ? 'Current Stock' : 'Stock Qty *'}
                  </Label>
                  {editingProduct ? (
                    <div className="h-10 rounded-xl border border-border bg-muted/40 flex items-center justify-between px-3">
                      <span className="text-sm font-black text-foreground">{form.stock_quantity} units</span>
                      <button
                        type="button"
                        onClick={() => setShowAddStockPanel(v => !v)}
                        className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add Stock
                      </button>
                    </div>
                  ) : (
                    <Input
                      type="number" min={0}
                      value={form.stock_quantity}
                      onChange={e => setForm(f => ({ ...f, stock_quantity: parseInt(e.target.value) || 0 }))}
                      className="h-10 rounded-xl"
                    />
                  )}
                </div>
              </div>

              {/* ── Stock Batches (FIFO) ── */}
              {editingProduct && (productBatches[editingProduct.id]?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Stock Batches</p>
                    <span className="text-[9px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      FIFO · oldest first
                    </span>
                  </div>
                  {[...productBatches[editingProduct.id]]
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                    .map((b, i) => {
                      const bExp = getExpiryStatus(b.expiration_date);
                      const isExpiredBatch = bExp === 'expired';
                      const isSoonBatch    = bExp === 'soon';
                      const stripe = isExpiredBatch ? 'bg-red-600' : isSoonBatch ? 'bg-orange-500' : 'bg-emerald-500';
                      const ringCls = isExpiredBatch
                        ? 'border-red-500'
                        : isSoonBatch
                        ? 'border-orange-400'
                        : 'border-border';
                      return (
                        <div key={b.id} className={`relative flex items-center gap-3 rounded-xl border overflow-hidden bg-card pl-4 pr-3 py-2.5 ${ringCls}`}>
                          {/* stripe */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${stripe}`} />

                          {/* index badge — #1 = next to use */}
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            #{i + 1}
                          </span>

                          {/* info grid */}
                          <div className="flex-1 min-w-0 grid grid-cols-3 gap-x-2">
                            <div>
                              <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Batch No.</p>
                              <p className="text-[11px] font-mono font-semibold text-foreground truncate">{b.batch_number || '—'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Qty</p>
                              <p className="text-[11px] font-bold text-foreground">{b.quantity} units</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Expiry</p>
                              <p className={`text-[11px] font-bold ${isExpiredBatch ? 'text-red-600' : isSoonBatch ? 'text-orange-500' : 'text-foreground/70'}`}>
                                {b.expiration_date ? fmtDate(b.expiration_date) : '—'}
                              </p>
                            </div>
                          </div>

                          {/* remove button — prominent red pill when expired */}
                          {isExpiredBatch ? (
                            <button
                              type="button"
                              onClick={() => removeBatch(b)}
                              className="shrink-0 flex items-center gap-1 text-[10px] font-bold bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3 h-3" /> Remove
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => removeBatch(b)}
                              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}

              {/* ── Add Stock Panel ── */}
              {showAddStockPanel && editingProduct && (
                <div className="rounded-xl border-2 border-primary/25 bg-primary/5 p-4 space-y-3">
                  {/* Header: title + auto batch number badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center shrink-0">
                        <Plus className="w-3 h-3 text-primary-foreground" />
                      </div>
                      <p className="text-xs font-bold text-foreground uppercase tracking-wide">Add New Stock Batch</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Batch No.</span>
                      <span className="text-[11px] font-black font-mono bg-primary text-primary-foreground px-2 py-0.5 rounded-lg">
                        {generateNextBatchNumber(productBatches[editingProduct.id] ?? [])}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Qty to Add *</Label>
                    <Input
                      type="number" min={1}
                      value={addStockData.qty}
                      onChange={e => setAddStockData(d => ({ ...d, qty: parseInt(e.target.value) || 0 }))}
                      className="h-10 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <CalendarClock className="w-3 h-3" /> Mfg. Date
                      </Label>
                      <Input
                        type="date"
                        value={addStockData.manufacturing_date}
                        onChange={e => setAddStockData(d => ({ ...d, manufacturing_date: e.target.value }))}
                        className="h-10 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <CalendarClock className="w-3 h-3 text-red-500" /> New Expiry
                      </Label>
                      <Input
                        type="date"
                        value={addStockData.expiration_date}
                        onChange={e => setAddStockData(d => ({ ...d, expiration_date: e.target.value }))}
                        className="h-10 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{form.stock_quantity}</span>
                      {' + '}
                      <span className="font-semibold text-primary">{addStockData.qty}</span>
                      {' = '}
                      <span className="font-black text-primary">{form.stock_quantity + addStockData.qty} units total</span>
                    </p>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setShowAddStockPanel(false)} className="text-muted-foreground">
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={applyAddStock}
                        disabled={addStockData.qty <= 0}
                        className="rounded-lg px-4 font-semibold"
                      >
                        Confirm
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Low Stock Alert At</Label>
                <Input
                  type="number" min={0}
                  value={form.low_stock_threshold}
                  onChange={e => setForm(f => ({ ...f, low_stock_threshold: parseInt(e.target.value) || 0 }))}
                  className="h-10 rounded-xl"
                />
              </div>

              {/* Batch / expiry fields — only shown when no tracked batches exist */}
              {!(editingProduct && (productBatches[editingProduct.id]?.length ?? 0) > 0) && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Batch No.</Label>
                      <Input
                        value={form.batch_number}
                        onChange={e => setForm(f => ({ ...f, batch_number: e.target.value }))}
                        placeholder="e.g. BN-2024-001"
                        className="h-10 rounded-xl font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
                        Mfg. Date
                      </Label>
                      <Input
                        type="date"
                        value={form.manufacturing_date}
                        onChange={e => setForm(f => ({ ...f, manufacturing_date: e.target.value }))}
                        className="h-10 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <CalendarClock className="w-3.5 h-3.5 text-red-500" />
                      Expiry Date
                    </Label>
                    <Input
                      type="date"
                      value={form.expiration_date}
                      onChange={e => setForm(f => ({ ...f, expiration_date: e.target.value }))}
                      className="h-10 rounded-xl"
                    />
                  </div>

                  {/* Live expiry preview */}
                  {form.expiration_date && <ExpiryPreview dateStr={form.expiration_date} />}
                </>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional notes about this product…"
                  className="rounded-xl resize-none min-h-[80px] text-sm"
                />
              </div>
            </div>

            {/* Right: image upload */}
            <div className="md:col-span-5 p-6 flex flex-col gap-3 bg-muted/20">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Product Image</Label>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex-1 min-h-[200px] border-2 border-dashed rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer transition-colors border-border bg-muted/40 ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:border-primary hover:bg-primary/[0.02]'}`}
              >
                {form.image_url ? (
                  <>
                    <img src={form.image_url} className="w-full h-full object-contain p-4" alt="" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl">
                      <p className="text-white text-xs font-bold">Change Image</p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center px-4">
                    <CloudUpload className="w-10 h-10 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground font-medium">Click to upload</p>
                    <p className="text-[10px] text-muted-foreground/60">PNG, JPG, WEBP</p>
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-2xl">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                )}
              </div>
              {form.image_url && (
                <button
                  onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                  className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                >
                  Remove image
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
            {editingProduct ? (
              <button
                onClick={() => deleteProduct(editingProduct.id)}
                className="flex items-center gap-1.5 text-xs font-semibold text-destructive hover:text-destructive/80 px-3 py-2 rounded-lg hover:bg-destructive/10 transition-colors"
              ><Trash2 className="w-3.5 h-3.5" /> Delete Product</button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowDialog(false)} className="text-muted-foreground">Cancel</Button>
              <Button
                onClick={saveProduct}
                disabled={isUploading || !form.product_name || !form.category}
                className="px-6 rounded-xl font-semibold"
              >
                {isUploading
                  ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Uploading…</>
                  : editingProduct ? 'Save Changes' : 'Add Product'
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════ CONFIRM MODAL ══════════ */}
      <Dialog open={confirmState.open} onOpenChange={open => !open && setConfirmState(s => ({ ...s, open: false }))}>
        <DialogContent className="max-w-sm rounded-2xl p-0 border-none shadow-2xl overflow-hidden">
          <div className="p-6 space-y-4">
            {/* Icon */}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
              confirmState.variant === 'danger'  ? 'bg-red-100'
            : confirmState.variant === 'warning' ? 'bg-orange-100'
            : 'bg-primary/10'
            }`}>
              {confirmState.variant === 'danger'  ? <Trash2        className="w-6 h-6 text-red-600"    />
             : confirmState.variant === 'warning' ? <AlertTriangle className="w-6 h-6 text-orange-500" />
             :                                      <Package       className="w-6 h-6 text-primary"    />
              }
            </div>
            {/* Text */}
            <div className="text-center space-y-1.5">
              <DialogTitle className="text-base font-bold text-foreground">{confirmState.title}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">{confirmState.body}</DialogDescription>
            </div>
            {/* Buttons */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="ghost"
                className="flex-1 rounded-xl font-semibold"
                onClick={() => setConfirmState(s => ({ ...s, open: false }))}
              >
                Cancel
              </Button>
              <Button
                className={`flex-1 rounded-xl font-semibold ${
                  confirmState.variant === 'danger'  ? 'bg-red-600 hover:bg-red-700 text-white'
                : confirmState.variant === 'warning' ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : ''
                }`}
                onClick={runConfirm}
              >
                {confirmState.variant === 'danger'  ? 'Delete'
               : confirmState.variant === 'warning' ? 'Remove'
               :                                      'Add Product'
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════ SUCCESS TOAST ══════════ */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-xl border transition-all animate-in slide-in-from-bottom-4 fade-in duration-300 ${
          toast.type === 'success'
            ? 'bg-emerald-600 border-emerald-700 text-white'
            : 'bg-foreground border-border text-background'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />
          }
          <p className="text-sm font-semibold">{toast.msg}</p>
        </div>
      )}
    </div>
  );
}