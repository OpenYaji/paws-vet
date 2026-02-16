'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/lib/auth-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton'; // Ensure this is in your components/ui
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Trash2, 
  AlertCircle,
  Package,
  Edit,
  LayoutGrid,
  List,
  Activity,
  ArrowUpRight,
  Loader2,
  CloudUpload,
  Eye,
  X,
  Boxes,
  Tag
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const PRODUCT_CATEGORIES = [
  'Pet Food', 'Supplements', 'Medications', 'Accessories', 'Grooming', 'Toys', 'Other'
];

export default function InventoryPage() {
  const [viewMode, setViewMode] = useState<'rows' | 'cards'>('cards');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [productForm, setProductForm] = useState({
    product_name: '',
    category: '',
    price: 0,
    stock_quantity: 0,
    low_stock_threshold: 5,
    description: '',
    sku: '',
    image_url: '',
  });

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from('products').select('*').order('product_name');
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filePath);
      setProductForm({ ...productForm, image_url: publicUrl });
    } catch (error: any) {
      alert('Error uploading image: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenEdit = (product: any) => {
    setEditingProduct(product);
    setProductForm({ ...product });
    setShowProductDialog(true);
  };

  async function saveProduct() {
    try {
      const payload = { ...productForm };
      if (editingProduct) {
        await supabase.from('products').update(payload).eq('id', editingProduct.id);
      } else {
        await supabase.from('products').insert({ ...payload, is_active: true });
      }
      setShowProductDialog(false);
      loadProducts();
    } catch (error) { console.error(error); }
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete item?')) return;
    await supabase.from('products').delete().eq('id', id);
    loadProducts();
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const stats = useMemo(() => {
    const active = products.filter(p => p.is_active);
    return {
      totalActive: active.length,
      alerts: active.filter(p => p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0).length,
      oos: active.filter(p => p.stock_quantity === 0).length,
      value: active.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0)
    };
  }, [products]);

  // --- SKELETAL UI COMPONENT ---
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col overflow-hidden animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-center gap-3 p-6 pb-0">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
        </div>

        {/* KPI Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 pb-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Toolbar Skeleton */}
        <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto flex-1">
            <Skeleton className="h-11 flex-1 max-w-md rounded-xl" />
            <Skeleton className="h-11 w-[180px] rounded-xl" />
            <Skeleton className="h-11 w-24 rounded-xl" />
          </div>
          <Skeleton className="h-11 w-32 rounded-xl" />
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 px-6 pb-6 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border-2 h-32">
                <CardContent className="p-4 flex gap-4">
                  <Skeleton className="w-24 h-24 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-5 w-12" /></div>
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full pt-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ═══════════ INVENTORY HEADER ═══════════ */}
      <div className="flex items-center gap-3 p-6 pb-0 mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
          <Package className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground">Monitor stock levels, medical supplies, and equipment</p>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 pb-2">
        {[
          { label: 'Active Supplies', val: stats.totalActive, icon: Package, iconClass: '' },
          { label: 'Stock Alerts', val: stats.alerts, icon: AlertCircle, iconClass: 'text-amber-600' },
          { label: 'Out of Stock', val: stats.oos, icon: Activity, iconClass: 'text-destructive' },
          { label: 'Total Value', val: `₱${stats.value.toLocaleString()}`, icon: ArrowUpRight, iconClass: 'text-emerald-600' }
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${kpi.iconClass === 'text-destructive' ? 'bg-destructive/10' : kpi.iconClass === 'text-amber-600' ? 'bg-amber-100' : 'bg-accent'}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.iconClass || ''}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-bold">{kpi.val}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search catalog..." 
              className="pl-10 pr-4 h-11 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-[180px]">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-11 rounded-xl text-sm">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {PRODUCT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex border rounded-xl p-1">
            <Button variant="ghost" size="sm" className={`h-9 w-9 p-0 ${viewMode === 'rows' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`} onClick={() => setViewMode('rows')}><List size={18} /></Button>
            <Button variant="ghost" size="sm" className={`h-9 w-9 p-0 ${viewMode === 'cards' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`} onClick={() => setViewMode('cards')}><LayoutGrid size={18} /></Button>
          </div>
        </div>
        <Button className="h-11 px-8 rounded-xl" onClick={() => { setEditingProduct(null); setProductForm({ product_name: '', category: '', price: 0, stock_quantity: 0, low_stock_threshold: 5, description: '', sku: '', image_url: '' }); setShowProductDialog(true); }}><Plus className="w-5 h-5 mr-2" /> Add Item</Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden px-6 pb-6">
        {viewMode === 'rows' ? (
          <div className="h-full border rounded-2xl overflow-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="px-8 text-xs font-semibold uppercase text-muted-foreground">Item</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Category</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase text-muted-foreground">Price</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">Stock</TableHead>
                  <TableHead className="px-8 text-right text-xs font-semibold uppercase text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((p) => (
                  <TableRow key={p.id} className="group hover:bg-muted/50 cursor-pointer" onClick={() => handleOpenEdit(p)}>
                    <TableCell className="py-4 px-8">
                      <div className="flex items-center gap-4">
                        <img src={p.image_url || '/placeholder.png'} className="w-10 h-10 rounded-lg object-cover border" alt="" />
                        <div>
                          <p className="font-semibold text-sm">{p.product_name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">{p.sku || 'NO SKU'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px] font-bold uppercase">{p.category}</Badge></TableCell>
                    <TableCell className="text-right font-bold">₱{p.price.toLocaleString()}</TableCell>
                    <TableCell className="text-center"><span className={`px-2 py-1 rounded-md text-xs font-bold ${p.stock_quantity <= p.low_stock_threshold ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>{p.stock_quantity}</span></TableCell>
                    <TableCell className="text-right px-8"><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover:text-primary"><Edit size={14} /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="h-full overflow-y-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-10 pr-2">
            {filteredProducts.map((p) => (
              <Card 
                key={p.id} 
                className="hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer group border-2 flex flex-col"
                onClick={() => handleOpenEdit(p)}
              >
                <CardContent className="p-4 flex gap-4">
                  <div className="relative w-24 h-24 shrink-0 bg-muted rounded-lg border flex items-center justify-center overflow-hidden">
                    <img src={p.image_url || '/placeholder.png'} className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-300" alt={p.product_name} />
                    <div className="absolute inset-0 bg-primary/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <Eye className="text-primary-foreground w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-sm truncate">{p.product_name}</h3>
                        <Badge className="text-[10px] font-bold">₱{p.price.toLocaleString()}</Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Tag size={10} className="text-muted-foreground" />
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight">{p.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t">
                      <div className="flex items-center gap-1.5">
                        <Boxes size={12} className="text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground font-medium">Stock:</span>
                        <span className={`text-xs font-black ${p.stock_quantity <= p.low_stock_threshold ? 'text-destructive' : 'text-primary'}`}>{p.stock_quantity}</span>
                      </div>
                      {p.stock_quantity <= p.low_stock_threshold && <AlertCircle size={12} className="text-destructive" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Product Modal */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-4xl rounded-2xl p-0 border-none shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-8 pt-8 pb-4">
            <div>
              <DialogTitle className="text-2xl font-bold">{editingProduct ? `Product Details` : "Add New Item"}</DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1">Manage product specifications and stock inventory.</DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowProductDialog(false)} className="rounded-full"><X size={20} /></Button>
          </div>
          <div className="px-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
              <div className="md:col-span-7 space-y-6">
                <div className="grid grid-cols-1 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground ml-1">Product Name</Label>
                    <Input value={productForm.product_name} onChange={(e) => setProductForm({...productForm, product_name: e.target.value})} className="rounded-xl h-12" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground ml-1">Category</Label>
                      <Select value={productForm.category} onValueChange={(v) => setProductForm({...productForm, category: v})}>
                        <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                        <SelectContent>{PRODUCT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground ml-1">Price (₱)</Label>
                      <Input type="number" value={productForm.price} onChange={(e) => setProductForm({...productForm, price: parseFloat(e.target.value) || 0})} className="rounded-xl h-12" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground ml-1">Stock Quantity</Label>
                      <Input type="number" value={productForm.stock_quantity} onChange={(e) => setProductForm({...productForm, stock_quantity: parseInt(e.target.value) || 0})} className="rounded-xl h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground ml-1">Low Stock Limit</Label>
                      <Input type="number" value={productForm.low_stock_threshold} onChange={(e) => setProductForm({...productForm, low_stock_threshold: parseInt(e.target.value) || 0})} className="rounded-xl h-12" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground ml-1">Description</Label>
                    <Textarea value={productForm.description} onChange={(e) => setProductForm({...productForm, description: e.target.value})} className="rounded-xl min-h-[100px]" />
                  </div>
                </div>
              </div>
              <div className="md:col-span-5 flex flex-col gap-4">
                <Label className="text-xs font-bold text-muted-foreground">Product Image</Label>
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                <div 
                  className={`relative border-2 border-dashed rounded-2xl bg-muted h-[340px] flex items-center justify-center overflow-hidden cursor-pointer hover:bg-muted/80 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {productForm.image_url ? (
                    <>
                      <img src={productForm.image_url} className="w-full h-full object-contain p-4" alt="" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                         <p className="text-white text-xs font-bold">Change Image</p>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <CloudUpload className="text-muted-foreground/30 w-12 h-12" />
                      <p className="text-xs text-muted-foreground font-medium">Click to upload image</p>
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                      <Loader2 className="animate-spin h-8 w-8 text-primary" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="px-8 py-6 mt-4 bg-muted flex items-center justify-between border-t">
            {editingProduct ? (
              <Button variant="ghost" onClick={() => deleteProduct(editingProduct.id)} className="text-destructive font-bold text-xs uppercase"><Trash2 className="w-4 h-4 mr-2" /> Delete</Button>
            ) : <div />}
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setShowProductDialog(false)} className="font-bold text-xs uppercase text-muted-foreground">Cancel</Button>
              <Button onClick={saveProduct} disabled={isUploading} className="rounded-xl px-8 h-12 shadow-lg font-bold text-xs uppercase">
                {isUploading ? 'Uploading...' : 'Save Product'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}