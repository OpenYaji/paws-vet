'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/auth-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, ShoppingCart, Package, ArrowLeft, Search, Grid3x3, List
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

// Import billing components
import { CustomerSelection } from '@/components/billing/CustomerSelection';
import { CartItem } from '@/components/billing/CartItem';
import { CartSummary } from '@/components/billing/CartSummary';
import { PaymentSuccessModal } from '@/components/billing/PaymentSuccessModal';
import { CashPaymentModal } from '@/components/billing/CashPaymentModal';
import { GcashPaymentModal } from '@/components/billing/GcashPaymentModal';

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

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

interface Pet {
  id: string;
  name: string;
  owner_id: string;
}

interface CartItem {
  type: 'service' | 'product';
  item: Service | Product;
  quantity: number;
  price: number;
}

export default function POSPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    invoiceNumber: string;
    paymentNumber: string;
    total: number;
    paymentMethod: string;
  } | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(12);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [itemViewMode, setItemViewMode] = useState<'grid' | 'list'>('grid');

  const [showCashModal, setShowCashModal] = useState(false);
  const [showGcashModal, setShowGcashModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);

      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('service_name');

      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('product_name');

      const { data: clientsData } = await supabase
        .from('client_profiles')
        .select('id, first_name, last_name')
        .order('last_name');

      const { data: petsData } = await supabase
        .from('pets')
        .select('id, name, owner_id')
        .eq('is_active', true);

      setServices(servicesData || []);
      setProducts(productsData || []);
      setClients(clientsData || []);
      setPets(petsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // Get all unique categories
  const serviceCategories = ['all', ...new Set(services.map(s => s.service_category))];
  const productCategories = ['all', ...new Set(products.map(p => p.category))];
  const allCategories = ['all', 'Services', 'Products', ...new Set([...serviceCategories.slice(1), ...productCategories.slice(1)])];

  // Filter items based on search and category
  const filteredServices = services.filter(service => {
    const matchesSearch = service.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           selectedCategory === 'Services' ||
                           service.service_category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           selectedCategory === 'Products' ||
                           product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  function addServiceToCart(service: Service) {
    const existingItem = cart.find(item => item.type === 'service' && item.item.id === service.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.type === 'service' && item.item.id === service.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { type: 'service', item: service, quantity: 1, price: service.base_price }]);
    }
  }

  function addProductToCart(product: Product) {
    if (product.stock_quantity <= 0) {
      alert('Product is out of stock!');
      return;
    }

    const existingItem = cart.find(item => item.type === 'product' && item.item.id === product.id);
    const currentQuantity = existingItem ? existingItem.quantity : 0;

    if (currentQuantity + 1 > product.stock_quantity) {
      alert(`Only ${product.stock_quantity} units available in stock!`);
      return;
    }

    if (existingItem) {
      setCart(cart.map(item =>
        item.type === 'product' && item.item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { type: 'product', item: product, quantity: 1, price: product.price }]);
    }
  }

  function updateQuantity(type: 'service' | 'product', itemId: string, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(type, itemId);
      return;
    }

    if (type === 'product') {
      const product = products.find(p => p.id === itemId);
      if (product && quantity > product.stock_quantity) {
        alert(`Only ${product.stock_quantity} units available in stock!`);
        return;
      }
    }

    setCart(cart.map(item =>
      item.type === type && item.item.id === itemId ? { ...item, quantity } : item
    ));
  }

  function removeFromCart(type: 'service' | 'product', itemId: string) {
    setCart(cart.filter(item => !(item.type === type && item.item.id === itemId)));
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = subtotal * (discount / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (tax / 100);
  const total = afterDiscount + taxAmount;

  function validateBeforePayment(): boolean {
    if (cart.length === 0) {
      alert('Please add items to cart');
      return false;
    }
    if (!isWalkIn && !selectedClient) {
      alert('Please select a client or mark as walk-in customer');
      return false;
    }
    if (isWalkIn && !walkInName.trim()) {
      alert('Please enter walk-in customer name');
      return false;
    }
    return true;
  }

  async function processPayment(paymentMethod: 'cash' | 'card' | 'online', cashTendered?: number, referenceNumber?: string) {
    if (cart.length === 0) return;

    try {
      setIsProcessing(true);

      const invoicePayload = {
        invoice: {
          subtotal,
          taxAmount,
          discountAmount,
          total,
          notes: notes || '',
          clientId: selectedClient,
          walkInName: walkInName,
        },
        lineItems: cart.map(item => ({
          type: item.type,
          itemId: item.item.id,
          description: item.type === 'service' 
            ? (item.item as Service).service_name 
            : (item.item as Product).product_name,
          quantity: item.quantity,
          unitPrice: item.price,
          lineTotal: item.price * item.quantity,
        })),
        isWalkIn,
      };

      const invoiceResponse = await fetch('/api/billing/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoicePayload),
      });

      const invoiceResult = await invoiceResponse.json();

      if (!invoiceResult.success) {
        throw new Error(invoiceResult.error || 'Failed to create invoice');
      }

      const productUpdates = cart
        .filter(item => item.type === 'product')
        .map(item => ({
          productId: item.item.id,
          quantity: item.quantity,
        }));

      if (productUpdates.length > 0) {
        const inventoryResponse = await fetch('/api/billing/inventory', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: productUpdates }),
        });

        const inventoryResult = await inventoryResponse.json();

        if (!inventoryResult.success) {
          throw new Error(inventoryResult.error || 'Failed to update inventory');
        }
      }

      const paymentPayload = {
        invoiceId: invoiceResult.invoice.id,
        paymentMethod,
        amountPaid: total,
        cashTendered: cashTendered !== undefined ? cashTendered : null,
        referenceNumber: referenceNumber !== undefined ? referenceNumber : null,
        isWalkIn,
      };

      const paymentResponse = await fetch('/api/billing/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentPayload),
      });

      const paymentResult = await paymentResponse.json();

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Failed to create payment');
      }

      setShowCashModal(false);
      setShowGcashModal(false);

      setSuccessData({
        invoiceNumber: invoiceResult.invoiceNumber,
        paymentNumber: paymentResult.paymentNumber,
        total,
        paymentMethod: paymentMethod === 'online' ? 'GCASH' : paymentMethod.toUpperCase(),
      });
      setShowSuccessModal(true);

      setCart([]);
      setSelectedClient('');
      setIsWalkIn(false);
      setWalkInName('');
      setSelectedPet('');
      setNotes('');
      setDiscount(0);
      setTax(12);
      
      await loadData();
    } catch (error: any) {
      console.error('Error processing payment:', error);
      alert(`❌ Failed to process payment.\n\nError: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading POS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-card border-b p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                router.push('/admin/billing');
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-xl font-bold">Point of Sale</h1>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            {cart.length} Items in Cart
          </Badge>
        </div>
      </div>

      {/* Main POS Interface - Split Screen */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Selection Area (60%) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search services or products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>

                {/* Category Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {allCategories.map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="whitespace-nowrap text-xs h-8"
                    >
                      {category}
                    </Button>
                  ))}
                </div>

                {/* View Toggle */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {filteredServices.length + filteredProducts.length} items
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant={itemViewMode === 'grid' ? 'default' : 'ghost'}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setItemViewMode('grid')}
                    >
                      <Grid3x3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant={itemViewMode === 'list' ? 'default' : 'ghost'}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setItemViewMode('list')}
                    >
                      <List className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Grid/List - SMALLER CARDS */}
          <div className={itemViewMode === 'grid' ? 'grid grid-cols-3 xl:grid-cols-4 gap-3' : 'space-y-2'}>
            {/* Services */}
            {filteredServices.map((service) => (
              <Card
                key={`service-${service.id}`}
                className={`cursor-pointer transition-all hover:shadow-md hover:border-primary ${
                  itemViewMode === 'list' ? 'flex-row' : ''
                }`}
                onClick={() => addServiceToCart(service)}
              >
                <CardContent className={`p-3 ${itemViewMode === 'list' ? 'flex items-center gap-3 w-full' : ''}`}>
                  {service.image_url && (
                    <div className={`${itemViewMode === 'grid' ? 'mb-2' : 'flex-shrink-0'}`}>
                      <img
                        src={service.image_url}
                        alt={service.service_name}
                        className={`${itemViewMode === 'grid' ? 'w-full h-20' : 'w-16 h-16'} object-cover rounded-md`}
                      />
                    </div>
                  )}
                  <div className={itemViewMode === 'list' ? 'flex-1' : ''}>
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-xs line-clamp-1">{service.service_name}</h3>
                      <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">Service</Badge>
                    </div>
                    {service.description && itemViewMode === 'list' && (
                      <p className="text-[10px] text-muted-foreground mb-1 line-clamp-1">
                        {service.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold">₱{service.base_price.toFixed(2)}</p>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Products */}
            {filteredProducts.map((product) => (
              <Card
                key={`product-${product.id}`}
                className={`cursor-pointer transition-all hover:shadow-md hover:border-primary ${
                  product.stock_quantity <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                } ${itemViewMode === 'list' ? 'flex-row' : ''}`}
                onClick={() => product.stock_quantity > 0 && addProductToCart(product)}
              >
                <CardContent className={`p-3 ${itemViewMode === 'list' ? 'flex items-center gap-3 w-full' : ''}`}>
                  {product.image_url && (
                    <div className={`${itemViewMode === 'grid' ? 'mb-2' : 'flex-shrink-0'} relative`}>
                      <img
                        src={product.image_url}
                        alt={product.product_name}
                        className={`${itemViewMode === 'grid' ? 'w-full h-20' : 'w-16 h-16'} object-cover rounded-md`}
                      />
                      {product.stock_quantity <= product.low_stock_threshold && product.stock_quantity > 0 && (
                        <Badge variant="destructive" className="absolute top-0.5 right-0.5 text-[9px] px-1 py-0">
                          Low
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className={itemViewMode === 'list' ? 'flex-1' : ''}>
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-xs line-clamp-1">{product.product_name}</h3>
                      <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0">Product</Badge>
                    </div>
                    {product.description && itemViewMode === 'list' && (
                      <p className="text-[10px] text-muted-foreground mb-1 line-clamp-1">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold">₱{product.price.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">Stock: {product.stock_quantity}</p>
                      </div>
                      {product.stock_quantity > 0 && (
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                          <Plus className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredServices.length === 0 && filteredProducts.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No items found</p>
              </CardContent>
            </Card>
          )}
        </div>

{/* Right Side: High-Density POS Sidebar */}
{/* Removed justify-between to let items stack naturally */}
<div className="w-[380px] bg-white border-l flex flex-col h-full overflow-hidden">
  
  {/* 1. Customer Section - Fixed */}
  <div className="flex-none p-2 border-b bg-slate-50/50">
    <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Customer</p>
    <CustomerSelection
      isWalkIn={isWalkIn}
      setIsWalkIn={setIsWalkIn}
      walkInName={walkInName}
      setWalkInName={setWalkInName}
      selectedClient={selectedClient}
      setSelectedClient={setSelectedClient}
      selectedPet={selectedPet}
      setSelectedPet={setSelectedPet}
      clients={clients}
      pets={pets}
    />
  </div>

  {/* 2. Current Order Area - Adaptive height */}
  {/* max-h-[400px] ensures it grows with items but caps before getting too long */}
  <div className="flex-none overflow-y-auto p-2 space-y-1 bg-white max-h-[400px]">
    <div className="flex justify-between items-center mb-1 px-1 sticky top-0 bg-white z-10 pb-1">
      <span className="text-[11px] font-bold uppercase text-slate-600">Current Order</span>
      <Badge variant="secondary" className="text-[9px] h-4">{cart.length} items</Badge>
    </div>

    {cart.length === 0 ? (
      <div className="h-20 flex flex-col items-center justify-center border border-dashed rounded m-2 opacity-30">
        <Package className="w-5 h-5 mb-1" />
        <p className="text-[10px]">Empty Cart</p>
      </div>
    ) : (
      <div className="space-y-0.5">
        {cart.map((item, index) => (
          <div key={index} className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded group border-b border-slate-50">
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-[11px] font-semibold truncate leading-none">
                {item.type === 'service' ? (item.item as Service).service_name : (item.item as Product).product_name}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">₱{item.price.toFixed(2)}</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded bg-white h-6">
                <button onClick={() => updateQuantity(item.type, item.item.id, item.quantity - 1)} className="px-1.5 text-xs hover:bg-slate-100">-</button>
                <span className="px-1.5 text-[10px] font-bold min-w-[18px] text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.type, item.item.id, item.quantity + 1)} className="px-1.5 text-xs hover:bg-slate-100">+</button>
              </div>
              <div className="text-right min-w-[65px]">
                <p className="text-[11px] font-bold">₱{(item.price * item.quantity).toFixed(2)}</p>
              </div>
              <button onClick={() => removeFromCart(item.type, item.item.id)} className="text-slate-300 hover:text-red-500 ml-1">
                <Plus className="w-3 h-3 rotate-45" />
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>

  {/* 3. Payment Footer - Now sits directly under the cart */}
  <div className="flex-none border-t bg-slate-50 p-3 shadow-sm">
    <div className="space-y-1.5 mb-3">
      <div className="flex justify-between text-[11px] text-slate-500">
        <span>Subtotal</span>
        <span>₱{subtotal.toFixed(2)}</span>
      </div>

      <div className="flex items-center justify-between py-1 border-y border-slate-200/50">
        <div className="flex gap-2">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-bold text-slate-400">Disc%</span>
            <Input 
              type="number" 
              className="h-6 w-10 text-[10px] px-1" 
              value={discount} 
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-bold text-slate-400">Tax%</span>
            <Input 
              type="number" 
              className="h-6 w-10 text-[10px] px-1" 
              value={tax} 
              onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-green-600">-₱{discountAmount.toFixed(2)}</div>
          <div className="text-[10px] text-slate-400">+₱{taxAmount.toFixed(2)} Tax</div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-1">
        <span className="text-xs font-bold uppercase text-slate-600">Total</span>
        <span className="text-xl font-black text-green-600">₱{total.toFixed(2)}</span>
      </div>
    </div>

    {/* Transaction Buttons */}
    <div className="space-y-1.5">
      <Button 
        className="w-full h-10 bg-green-600 hover:bg-green-700 text-xs font-bold uppercase"
        disabled={cart.length === 0}
        onClick={() => {
          if (validateBeforePayment()) {
            setShowCashModal(true);
          }
        }}
      >
        Cash Payment
      </Button>
      <div className="grid grid-cols-2 gap-1.5">
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-[10px]" 
          disabled={cart.length === 0}
          onClick={() => {
            if (validateBeforePayment()) {
              processPayment('card');
            }
          }}
        >
          CARD
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-[10px]" 
          disabled={cart.length === 0}
          onClick={() => {
            if (validateBeforePayment()) {
              setShowGcashModal(true);
            }
          }}
        >
          GCASH
        </Button>
      </div>
    </div>
  </div>

  {/* Optional: Add a light background to the remaining empty area at the very bottom */}
  <div className="flex-1 bg-slate-50/20" />
</div>
      </div>

      <CashPaymentModal
        open={showCashModal}
        onOpenChange={setShowCashModal}
        total={total}
        isProcessing={isProcessing}
        onConfirm={(cashTendered) => {
          processPayment('cash', cashTendered);
        }}
      />

      <GcashPaymentModal
        open={showGcashModal}
        onOpenChange={setShowGcashModal}
        total={total}
        isProcessing={isProcessing}
        onConfirm={(referenceNumber) => {
          processPayment('online', undefined, referenceNumber);
        }}
      />

      <PaymentSuccessModal
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        data={successData}
        onPrint={() => alert('Print functionality coming soon')}
      />
    </div>
  );
}