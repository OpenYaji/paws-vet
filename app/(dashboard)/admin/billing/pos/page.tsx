'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus, ShoppingCart, Package, ArrowLeft, Search,
  Grid3x3, List, Trash2, X, Banknote,
  Smartphone, User, Tag, Minus,
} from 'lucide-react';

import { CustomerSelection }   from '@/components/billing/CustomerSelection';
import { PaymentSuccessModal } from '@/components/billing/PaymentSuccessModal';
import { CashPaymentModal }    from '@/components/billing/CashPaymentModal';
import { GcashPaymentModal }   from '@/components/billing/GcashPaymentModal';

/* ─── Types ─────────────────────────────────────────────────────────── */

interface Service {
  id: string;
  service_name: string;
  base_price: number;
  service_category: string;
  description?: string;
  image_url?: string;
}
interface Product {
  id: string;
  product_name: string;
  category: string;
  price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  description?: string;
  sku?: string;
  image_url?: string;
}
interface Client { id: string; first_name: string; last_name: string; }
interface Pet    { id: string; name: string; owner_id: string; }
interface CartItem {
  type: 'service' | 'product';
  item: Service | Product;
  quantity: number;
  price: number;
}

/* ─── Item Card ──────────────────────────────────────────────────────── */

function ItemCard({
  name, price, badge, badgeVariant, stock, lowStock, outOfStock, imageUrl, viewMode, onClick,
}: {
  name: string; price: number; badge: string;
  badgeVariant: 'secondary' | 'outline'; stock?: number;
  lowStock?: boolean; outOfStock?: boolean;
  imageUrl?: string; viewMode: 'grid' | 'list'; onClick: () => void;
}) {
  if (viewMode === 'list') {
    return (
      <button
        onClick={onClick}
        disabled={outOfStock}
        className={`
          w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card
          text-left transition-all duration-150 group
          ${outOfStock
            ? 'opacity-40 cursor-not-allowed'
            : 'hover:border-primary hover:shadow-sm hover:bg-primary/[0.02] cursor-pointer'
          }
        `}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-12 h-12 rounded-lg object-cover shrink-0 border border-border" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-muted-foreground/40" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant={badgeVariant} className="text-[9px] px-1.5 h-4">{badge}</Badge>
            {stock !== undefined && (
              <span className={`text-[10px] ${lowStock ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-muted-foreground'}`}>
                {outOfStock ? 'Out of stock' : `${stock} in stock`}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-foreground">₱{price.toFixed(2)}</p>
          {!outOfStock && (
            <div className="mt-1 w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center ml-auto group-hover:bg-primary transition-colors">
              <Plus className="w-3.5 h-3.5 text-primary group-hover:text-primary-foreground transition-colors" />
            </div>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={outOfStock}
      className={`
        relative w-full flex flex-col rounded-xl border border-border bg-card
        text-left transition-all duration-150 overflow-hidden group
        ${outOfStock
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:border-primary hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
        }
      `}
    >
      {/* image / placeholder */}
      {imageUrl ? (
        <div className="w-full h-24 overflow-hidden bg-muted">
          <img src={imageUrl} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className="w-full h-24 bg-muted/60 flex items-center justify-center">
          <Package className="w-8 h-8 text-muted-foreground/25" />
        </div>
      )}

      {/* low stock badge */}
      {lowStock && !outOfStock && (
        <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300 border border-red-200 dark:border-red-800/50">
          LOW
        </span>
      )}

      {/* content */}
      <div className="p-3 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-1 mb-2">
          <p className="text-[12px] font-semibold text-foreground leading-tight line-clamp-2 flex-1">{name}</p>
          <Badge variant={badgeVariant} className="text-[9px] px-1.5 h-4 shrink-0 mt-0.5">{badge}</Badge>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <p className="text-sm font-bold text-foreground">₱{price.toFixed(2)}</p>
          {!outOfStock && (
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
              <Plus className="w-3.5 h-3.5 text-primary group-hover:text-primary-foreground transition-colors" />
            </div>
          )}
        </div>
        {stock !== undefined && (
          <p className={`text-[10px] mt-1 ${lowStock ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-muted-foreground'}`}>
            {outOfStock ? 'Out of stock' : `${stock} left`}
          </p>
        )}
      </div>
    </button>
  );
}

/* ─── Cart Row ───────────────────────────────────────────────────────── */

function CartRow({
  item, onIncrease, onDecrease, onRemove,
}: {
  item: CartItem;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}) {
  const name = item.type === 'service'
    ? (item.item as Service).service_name
    : (item.item as Product).product_name;

  return (
    <div className="group flex items-center gap-2.5 py-2.5 px-3 rounded-xl hover:bg-muted/40 transition-colors">
      {/* type dot */}
      <div className={`shrink-0 w-1.5 h-8 rounded-full ${item.type === 'service' ? 'bg-primary/50' : 'bg-chart-2/50'}`} />

      {/* name + unit price */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-foreground truncate leading-tight">{name}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">₱{item.price.toFixed(2)} ea.</p>
      </div>

      {/* qty controls */}
      <div className="flex items-center border border-border rounded-lg overflow-hidden shrink-0 bg-card">
        <button
          onClick={onDecrease}
          className="w-7 h-7 flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="w-7 text-center text-[12px] font-bold text-foreground">{item.quantity}</span>
        <button
          onClick={onIncrease}
          className="w-7 h-7 flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* line total */}
      <p className="text-[12px] font-bold text-foreground w-16 text-right shrink-0">
        ₱{(item.price * item.quantity).toFixed(2)}
      </p>

      {/* remove */}
      <button
        onClick={onRemove}
        className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

/* ─── Category Pill ──────────────────────────────────────────────────── */

function CategoryPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`
        shrink-0 px-3 h-7 rounded-full text-[11px] font-semibold transition-all
        ${active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
        }
      `}
    >
      {label}
    </button>
  );
}

/* ─── Payment Button ─────────────────────────────────────────────────── */

function PayBtn({
  icon: Icon, label, variant, disabled, onClick,
}: {
  icon: React.ElementType;
  label: string;
  variant: 'cash' | 'gcash';
  disabled: boolean;
  onClick: () => void;
}) {
  const styles = {
    cash:  'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border-transparent shadow-sm',
    gcash: 'bg-blue-600   hover:bg-blue-700   active:bg-blue-800   text-white border-transparent shadow-sm',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex-1 flex flex-col items-center justify-center gap-2
        rounded-xl py-5 border font-black text-sm uppercase tracking-widest
        transition-all duration-150 disabled:opacity-35 disabled:cursor-not-allowed
        disabled:shadow-none
        ${styles[variant]}
      `}
    >
      <Icon className="w-6 h-6" />
      {label}
    </button>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────── */

export default function POSPage() {
  const router = useRouter();
  const [isLoading, setIsLoading]   = useState(true);
  const [services, setServices]     = useState<Service[]>([]);
  const [products, setProducts]     = useState<Product[]>([]);
  const [clients, setClients]       = useState<Client[]>([]);
  const [pets, setPets]             = useState<Pet[]>([]);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    invoiceNumber: string; paymentNumber: string; total: number; paymentMethod: string;
    cashTendered?: number; change?: number;
  } | null>(null);

  const [cart, setCart]                   = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [isWalkIn, setIsWalkIn]           = useState(false);
  const [walkInName, setWalkInName]       = useState('');
  const [selectedPet, setSelectedPet]     = useState('');
  const [notes, setNotes]                 = useState('');
  const [discount, setDiscount]           = useState(0);
  const [tax, setTax]                     = useState(0);

  const [searchQuery, setSearchQuery]           = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode]                 = useState<'grid' | 'list'>('grid');

  const [showCashModal, setShowCashModal]   = useState(false);
  const [showGcashModal, setShowGcashModal] = useState(false);
  const [isProcessing, setIsProcessing]     = useState(false);

  // Load data
  useState(() => { loadData(); });

  async function loadData() {
    try {
      setIsLoading(true);
      const [{ data: sv }, { data: pr }, { data: cl }, { data: pt }] = await Promise.all([
        supabase.from('services').select('*').eq('is_active', true).order('service_name'),
        supabase.from('products').select('*').eq('is_active', true).order('product_name'),
        supabase.from('client_profiles').select('id, first_name, last_name').order('last_name'),
        supabase.from('pets').select('id, name, owner_id').eq('is_active', true),
      ]);
      setServices(sv || []); setProducts(pr || []);
      setClients(cl || []);  setPets(pt || []);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }

  // Categories
  const allCats = [
    'all', 'Services', 'Products',
    ...new Set([...services.map(s => s.service_category), ...products.map(p => p.category)]),
  ];

  const filteredServices = services.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchQ = s.service_name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q);
    const matchC = selectedCategory === 'all' || selectedCategory === 'Services' || s.service_category === selectedCategory;
    return matchQ && matchC;
  });

  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchQ = p.product_name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
    const matchC = selectedCategory === 'all' || selectedCategory === 'Products' || p.category === selectedCategory;
    return matchQ && matchC;
  });

  // Cart ops
  function addService(service: Service) {
    setCart(prev => {
      const ex = prev.find(i => i.type === 'service' && i.item.id === service.id);
      return ex
        ? prev.map(i => i.type === 'service' && i.item.id === service.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { type: 'service', item: service, quantity: 1, price: service.base_price }];
    });
  }

  function addProduct(product: Product) {
    if (product.stock_quantity <= 0) { alert('Out of stock!'); return; }
    setCart(prev => {
      const ex = prev.find(i => i.type === 'product' && i.item.id === product.id);
      const cur = ex?.quantity ?? 0;
      if (cur + 1 > product.stock_quantity) { alert(`Only ${product.stock_quantity} available!`); return prev; }
      return ex
        ? prev.map(i => i.type === 'product' && i.item.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { type: 'product', item: product, quantity: 1, price: product.price }];
    });
  }

  function updateQty(type: 'service' | 'product', id: string, qty: number) {
    if (qty <= 0) { setCart(prev => prev.filter(i => !(i.type === type && i.item.id === id))); return; }
    if (type === 'product') {
      const p = products.find(p => p.id === id);
      if (p && qty > p.stock_quantity) { alert(`Only ${p.stock_quantity} available!`); return; }
    }
    setCart(prev => prev.map(i => i.type === type && i.item.id === id ? { ...i, quantity: qty } : i));
  }

  function removeItem(type: 'service' | 'product', id: string) {
    setCart(prev => prev.filter(i => !(i.type === type && i.item.id === id)));
  }

  // Totals
  const subtotal        = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmount  = subtotal * (discount / 100);
  const afterDiscount   = subtotal - discountAmount;
  const taxAmount       = afterDiscount * (tax / 100);
  const total           = afterDiscount + taxAmount;

  function validate() {
    if (!cart.length)              { alert('Cart is empty');                          return false; }
    if (!isWalkIn && !selectedClient) { alert('Select a client or use walk-in');     return false; }
    if (isWalkIn && !walkInName.trim()) { alert('Enter walk-in customer name');       return false; }
    return true;
  }

  async function processPayment(method: 'cash' | 'card' | 'online', cashTendered?: number, ref?: string) {
    try {
      setIsProcessing(true);
      const invoiceRes = await fetch('/api/billing/invoice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice: { subtotal, taxAmount, discountAmount, total, notes, clientId: selectedClient, walkInName },
          lineItems: cart.map(i => ({
            type: i.type, itemId: i.item.id,
            description: i.type === 'service' ? (i.item as Service).service_name : (i.item as Product).product_name,
            quantity: i.quantity, unitPrice: i.price, lineTotal: i.price * i.quantity,
          })),
          isWalkIn,
        }),
      });
      const invResult = await invoiceRes.json();
      if (!invResult.success) throw new Error(invResult.error || 'Invoice failed');

      const productUpdates = cart.filter(i => i.type === 'product').map(i => ({ productId: i.item.id, quantity: i.quantity }));
      if (productUpdates.length) {
        const invUpd = await fetch('/api/billing/inventory', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: productUpdates }),
        });
        const invUpdResult = await invUpd.json();
        if (!invUpdResult.success) throw new Error(invUpdResult.error || 'Inventory update failed');
      }

      const payRes = await fetch('/api/billing/payment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invResult.invoice.id, paymentMethod: method,
          amountPaid: total, cashTendered: cashTendered ?? null,
          referenceNumber: ref ?? null, isWalkIn,
        }),
      });
      const payResult = await payRes.json();
      if (!payResult.success) throw new Error(payResult.error || 'Payment failed');

      setShowCashModal(false); setShowGcashModal(false);
      setSuccessData({
        invoiceNumber: invResult.invoiceNumber, paymentNumber: payResult.paymentNumber,
        total, paymentMethod: method === 'online' ? 'GCASH' : method.toUpperCase(),
        cashTendered: cashTendered ?? undefined,
        change: cashTendered != null ? cashTendered - total : undefined,
      });
      setShowSuccessModal(true);
      setCart([]); setSelectedClient(''); setIsWalkIn(false); setWalkInName('');
      setSelectedPet(''); setNotes(''); setDiscount(0); setTax(0);
      await loadData();
    } catch (e: any) {
      alert(`Payment failed: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto animate-pulse">
            <ShoppingCart className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading POS…</p>
        </div>
      </div>
    );
  }

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">

      {/* ═══════ TOP HEADER ═══════ */}
      <header className="flex-none flex items-center justify-between h-14 px-4 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/billing')} className="gap-2 h-8 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <ShoppingCart className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <h1 className="text-sm font-bold text-foreground">Point of Sale</h1>
          </div>
        </div>

        {totalItems > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="font-semibold text-foreground">{totalItems}</span> item{totalItems !== 1 ? 's' : ''} in cart
          </div>
        )}
      </header>

      {/* ═══════ MAIN SPLIT ═══════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ──── LEFT: ITEM BROWSER ──── */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-border">

          {/* Search + filters toolbar */}
          <div className="flex-none px-4 py-3 bg-card border-b border-border space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search services & products…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-muted/50 border-transparent focus:border-border focus:bg-card text-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Categories + view toggle */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                {allCats.map(cat => (
                  <CategoryPill key={cat} label={cat === 'all' ? 'All' : cat} active={selectedCategory === cat} onClick={() => setSelectedCategory(cat)} />
                ))}
              </div>
              <div className="flex items-center gap-1 shrink-0 border border-border rounded-lg p-0.5 bg-muted">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Grid3x3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Result count */}
          <div className="flex-none px-4 py-2 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredServices.length + filteredProducts.length}</span> items
            </p>
          </div>

          {/* Items grid / list */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {filteredServices.length === 0 && filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Package className="w-7 h-7 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">No items found</p>
                <p className="text-xs text-muted-foreground">Try a different search or category</p>
              </div>
            ) : (
              <>
                {/* Services section */}
                {filteredServices.length > 0 && (
                  <div className="mb-5">
                    {selectedCategory === 'all' && (
                      <div className="flex items-center gap-2 mb-2.5">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Services</p>
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[10px] text-muted-foreground">{filteredServices.length}</span>
                      </div>
                    )}
                    <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 gap-2.5' : 'space-y-1.5'}>
                      {filteredServices.map(s => (
                        <ItemCard
                          key={s.id} name={s.service_name} price={s.base_price}
                          badge="Service" badgeVariant="secondary"
                          imageUrl={s.image_url} viewMode={viewMode}
                          onClick={() => addService(s)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Products section */}
                {filteredProducts.length > 0 && (
                  <div>
                    {selectedCategory === 'all' && (
                      <div className="flex items-center gap-2 mb-2.5">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Products</p>
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[10px] text-muted-foreground">{filteredProducts.length}</span>
                      </div>
                    )}
                    <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 gap-2.5' : 'space-y-1.5'}>
                      {filteredProducts.map(p => (
                        <ItemCard
                          key={p.id} name={p.product_name} price={p.price}
                          badge="Product" badgeVariant="outline"
                          stock={p.stock_quantity}
                          lowStock={p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0}
                          outOfStock={p.stock_quantity <= 0}
                          imageUrl={p.image_url} viewMode={viewMode}
                          onClick={() => addProduct(p)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ──── RIGHT: ORDER PANEL ──── */}
        <div className="w-[42%] flex-none flex flex-col bg-card overflow-hidden">

          {/* Customer */}
          <div className="flex-none px-4 pt-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2 mb-2.5">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Customer</p>
            </div>
            <CustomerSelection
              isWalkIn={isWalkIn} setIsWalkIn={setIsWalkIn}
              walkInName={walkInName} setWalkInName={setWalkInName}
              selectedClient={selectedClient} setSelectedClient={setSelectedClient}
              selectedPet={selectedPet} setSelectedPet={setSelectedPet}
              clients={clients} pets={pets}
            />
          </div>

          {/* Cart header */}
          <div className="flex-none flex items-center justify-between px-4 py-2.5 border-b border-border">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Order</p>
              {cart.length > 0 && (
                <span className="text-[9px] font-bold bg-primary text-primary-foreground w-4 h-4 rounded-full flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-lg hover:bg-destructive/10"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <ShoppingCart className="w-6 h-6 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">Cart is empty</p>
                <p className="text-xs text-muted-foreground">Click an item on the left to add it</p>
              </div>
            ) : (
              <div className="py-2 px-1">
                {cart.map((item, idx) => (
                  <CartRow
                    key={idx} item={item}
                    onIncrease={() => updateQty(item.type, item.item.id, item.quantity + 1)}
                    onDecrease={() => updateQty(item.type, item.item.id, item.quantity - 1)}
                    onRemove={() => removeItem(item.type, item.item.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Totals + payment */}
          <div className="flex-none border-t border-border bg-muted/30 px-4 pt-3 pb-4 space-y-3">

            {/* Discount + Tax inputs */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 flex items-center gap-1">
                  <Tag className="w-2.5 h-2.5" /> Discount %
                </p>
                <Input
                  type="number" min={0} max={100}
                  value={discount}
                  onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm text-center"
                />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Tax %</p>
                <Input
                  type="number" min={0} max={100}
                  value={tax}
                  onChange={e => setTax(parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm text-center"
                />
              </div>
            </div>

            {/* Line totals */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>₱{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-500">
                  <span>Discount ({discount}%)</span>
                  <span>−₱{discountAmount.toFixed(2)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({tax}%)</span>
                  <span>+₱{taxAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between py-4 px-4 rounded-xl bg-card border border-border">
              <span className="text-sm font-black uppercase tracking-widest text-muted-foreground">Total</span>
              <span className="text-4xl font-black text-foreground tracking-tight">
                ₱{total.toFixed(2)}
              </span>
            </div>

            {/* Payment buttons */}
            <div className="grid grid-cols-2 gap-2">
              <PayBtn
                icon={Banknote} label="Cash"
                variant="cash" disabled={cart.length === 0}
                onClick={() => { if (validate()) setShowCashModal(true); }}
              />
              <PayBtn
                icon={Smartphone} label="GCash"
                variant="gcash" disabled={cart.length === 0}
                onClick={() => { if (validate()) setShowGcashModal(true); }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ MODALS ═══════ */}
      <CashPaymentModal
        open={showCashModal} onOpenChange={setShowCashModal}
        total={total} isProcessing={isProcessing}
        onConfirm={cash => processPayment('cash', cash)}
      />
      <GcashPaymentModal
        open={showGcashModal} onOpenChange={setShowGcashModal}
        total={total} isProcessing={isProcessing}
        onConfirm={ref => processPayment('online', undefined, ref)}
      />
      <PaymentSuccessModal
        open={showSuccessModal} onOpenChange={setShowSuccessModal}
        data={successData} onPrint={() => alert('Print coming soon')}
      />
    </div>
  );
}