'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/auth-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, ShoppingCart, FileText, Package, Receipt, AlertCircle, Trash2, Eye, Download, Printer } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Import billing components
import { CustomerSelection } from '@/components/billing/CustomerSelection';
import { CartItem } from '@/components/billing/CartItem';
import { CartSummary } from '@/components/billing/CartSummary';
import { ServiceSelectionModal } from '@/components/billing/ServiceSelectionModal';
import { ProductSelectionModal } from '@/components/billing/ProductSelectionModal';
import { PaymentSuccessModal } from '@/components/billing/PaymentSuccessModal';
import { InvoiceList } from '@/components/billing/InvoiceList';

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

interface Payment {
  id: string;
  payment_number: string;
  invoice_id: string;
  payment_date: string;
  amount_paid: number;
  payment_method: string;
  transaction_reference: string;
  notes?: string;
  invoice?: {
    invoice_number: string;
    client?: { first_name: string; last_name: string };
    walk_in_customer_name?: string;
  };
}

interface CartItem {
  type: 'service' | 'product';
  item: Service | Product;
  quantity: number;
  price: number;
}

export default function BillingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    invoiceNumber: string;
    paymentNumber: string;
    total: number;
    paymentMethod: string;
  } | null>(null);

  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);

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

      const { data: paymentsData } = await supabase
        .from('payments')
        .select(`
          *,
          invoice:invoices(
            invoice_number,
            walk_in_customer_name,
            client:client_profiles(first_name, last_name)
          )
        `)
        .order('created_at', { ascending: false });

      setInvoices(invoicesData || []);
      setServices(servicesData || []);
      setProducts(productsData || []);
      setClients(clientsData || []);
      setPets(petsData || []);
      setPayments(paymentsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function generateSKU(category: string) {
    const categoryCode = category.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${categoryCode}-${timestamp}-${randomNum}`;
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setProductForm({ ...productForm, image_url: publicUrl });
      setImagePreview(publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  }

  async function saveProduct() {
    try {
      if (!productForm.product_name || !productForm.category || productForm.price <= 0) {
        alert('Please fill in all required fields');
        return;
      }

      let sku = productForm.sku;
      if (!editingProduct && !sku) {
        sku = await generateSKU(productForm.category);
      }

      const productData = {
        ...productForm,
        sku: sku || productForm.sku,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        alert('Product updated successfully!');
      } else {
        const { error } = await supabase
          .from('products')
          .insert({ ...productData, is_active: true });

        if (error) throw error;
        alert('Product created successfully!');
      }

      setShowProductDialog(false);
      setEditingProduct(null);
      setImagePreview('');
      setProductForm({
        product_name: '',
        category: '',
        price: 0,
        stock_quantity: 0,
        low_stock_threshold: 5,
        description: '',
        sku: '',
        image_url: '',
      });
      loadData();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product');
    }
  }

  async function deleteProduct(productId: string) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', productId);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  }

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

  async function processPayment(paymentMethod: 'cash' | 'card' | 'online', cashTendered?: number) {
    if (cart.length === 0) {
      alert('Please add items to cart');
      return;
    }

    if (!isWalkIn && !selectedClient) {
      alert('Please select a client or mark as walk-in customer');
      return;
    }

    if (isWalkIn && !walkInName.trim()) {
      alert('Please enter walk-in customer name');
      return;
    }

    try {
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
        cashTendered: cashTendered || null,
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

      setSuccessData({
        invoiceNumber: invoiceResult.invoiceNumber,
        paymentNumber: paymentResult.paymentNumber,
        total,
        paymentMethod: paymentMethod.toUpperCase(),
      });
      setShowSuccessModal(true);

      setCart([]);
      setSelectedClient('');
      setIsWalkIn(false);
      setWalkInName('');
      setSelectedPet('');
      setNotes('');
      setDiscount(0);
      setTax(0);
      
      await loadData();
    } catch (error: any) {
      console.error('Error processing payment:', error);
      alert(`❌ Failed to process payment.\n\nError: ${error.message || 'Unknown error'}`);
    }
  }

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Billing & Invoices</h1>
          <p className="text-muted-foreground">Manage invoices and process payments</p>
        </div>
      </div>

      <Tabs defaultValue="pos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pos">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Point of Sale
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <FileText className="w-4 h-4 mr-2" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="w-4 h-4 mr-2" />
            Products
          </TabsTrigger>
          <TabsTrigger value="payments">
            <Receipt className="w-4 h-4 mr-2" />
            Payment History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pos" className="space-y-4">
          {lowStockProducts.length > 0 && (
            <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                  <AlertCircle className="w-5 h-5" />
                  <p className="font-medium">
                    {lowStockProducts.length} product(s) are low on stock!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>New Transaction</CardTitle>
                  <CardDescription>Select client and add services or products</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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

                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={() => setShowServiceModal(true)}
                      variant="outline"
                      className="h-20"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add Service
                    </Button>
                    <Button
                      onClick={() => setShowProductModal(true)}
                      variant="outline"
                      className="h-20"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add Product
                    </Button>
                  </div>

                  {cart.length > 0 && (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead className="w-24">Qty</TableHead>
                            <TableHead className="w-32">Price</TableHead>
                            <TableHead className="w-32">Total</TableHead>
                            <TableHead className="w-16"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cart.map((item, index) => (
                            <CartItem
                              key={`${item.type}-${item.item.id}-${index}`}
                              item={item}
                              onUpdateQuantity={(quantity) => updateQuantity(item.type, item.item.id, quantity)}
                              onRemove={() => removeFromCart(item.type, item.item.id)}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes for this transaction..."
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <CartSummary
                subtotal={subtotal}
                discount={discount}
                setDiscount={setDiscount}
                tax={tax}
                setTax={setTax}
                total={total}
                isDisabled={cart.length === 0 || (!isWalkIn && !selectedClient) || (isWalkIn && !walkInName.trim())}
                onPayCash={(cashTendered) => processPayment('cash', cashTendered)}
                onPayCard={() => processPayment('card')}
                onPayOnline={() => processPayment('online')}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <InvoiceList
            invoices={invoices}
            onViewInvoice={(invoice) => {
              setSelectedInvoice(invoice);
              setShowInvoiceDialog(true);
            }}
          />
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Product Management</CardTitle>
                  <CardDescription>Manage inventory and products for sale</CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingProduct(null);
                  setImagePreview('');
                  setProductForm({
                    product_name: '',
                    category: '',
                    price: 0,
                    stock_quantity: 0,
                    low_stock_threshold: 5,
                    description: '',
                    sku: '',
                    image_url: '',
                  });
                  setShowProductDialog(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No products found
                        </TableCell>
                      </TableRow>
                    ) : (
                      products.map(product => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.product_name}</TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell>{product.sku || '-'}</TableCell>
                          <TableCell>₱{product.price.toFixed(2)}</TableCell>
                          <TableCell>{product.stock_quantity}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                product.stock_quantity <= 0
                                  ? 'destructive'
                                  : product.stock_quantity <= product.low_stock_threshold
                                  ? 'secondary'
                                  : 'default'
                              }
                            >
                              {product.stock_quantity <= 0
                                ? 'Out of Stock'
                                : product.stock_quantity <= product.low_stock_threshold
                                ? 'Low Stock'
                                : 'In Stock'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingProduct(product);
                                setImagePreview(product.image_url || '');
                                setProductForm({
                                  product_name: product.product_name,
                                  category: product.category,
                                  price: product.price,
                                  stock_quantity: product.stock_quantity,
                                  low_stock_threshold: product.low_stock_threshold,
                                  description: product.description || '',
                                  sku: product.sku || '',
                                  image_url: product.image_url || '',
                                });
                                setShowProductDialog(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteProduct(product.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>View all payment transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment #</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No payment records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map(payment => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.payment_number}</TableCell>
                          <TableCell>{payment.invoice?.invoice_number || '-'}</TableCell>
                          <TableCell>
                            {payment.invoice?.walk_in_customer_name || 
                             (payment.invoice?.client 
                               ? `${payment.invoice.client.first_name} ${payment.invoice.client.last_name}`
                               : '-')}
                          </TableCell>
                          <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                          <TableCell>₱{payment.amount_paid.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {payment.payment_method.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {payment.transaction_reference}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ServiceSelectionModal
        open={showServiceModal}
        onOpenChange={setShowServiceModal}
        services={services}
        onSelectService={addServiceToCart}
      />

      <ProductSelectionModal
        open={showProductModal}
        onOpenChange={setShowProductModal}
        products={products}
        onSelectProduct={addProductToCart}
      />

      <PaymentSuccessModal
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        data={successData}
        onPrint={() => alert('Print functionality coming soon')}
      />

      <Dialog open={showProductDialog} onOpenChange={(open) => {
        setShowProductDialog(open);
        if (!open) {
          setImagePreview('');
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Update product information' : 'Enter product details'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Product Name *</Label>
              <Input
                value={productForm.product_name}
                onChange={(e) => setProductForm({ ...productForm, product_name: e.target.value })}
                placeholder="e.g., Dog Shampoo"
              />
            </div>
            <div>
              <Label>Category *</Label>
              <Input
                value={productForm.category}
                onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                placeholder="e.g., Pet Care"
              />
            </div>
            <div>
              <Label>SKU (Auto-generated)</Label>
              <Input
                value={productForm.sku}
                readOnly
                placeholder="Will be auto-generated"
                className="bg-muted"
              />
            </div>
            <div>
              <Label>Price *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={productForm.price}
                onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Stock Quantity *</Label>
              <Input
                type="number"
                min="0"
                value={productForm.stock_quantity}
                onChange={(e) => setProductForm({ ...productForm, stock_quantity: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Low Stock Threshold</Label>
              <Input
                type="number"
                min="0"
                value={productForm.low_stock_threshold}
                onChange={(e) => setProductForm({ ...productForm, low_stock_threshold: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="col-span-2">
              <Label>Product Image *</Label>
              <div className="space-y-3">
                {(imagePreview || productForm.image_url) && (
                  <div className="relative w-full h-48 border rounded-lg overflow-hidden bg-muted">
                    <img
                      src={imagePreview || productForm.image_url}
                      alt="Product preview"
                      className="w-full h-full object-contain"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setImagePreview('');
                        setProductForm({ ...productForm, image_url: '' });
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="flex-1"
                  />
                  {uploadingImage && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Uploading...
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload a product image (max 5MB, JPG, PNG, or GIF)
                </p>
              </div>
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Product description..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setShowProductDialog(false);
              setImagePreview('');
            }}>
              Cancel
            </Button>
            <Button onClick={saveProduct} disabled={uploadingImage || !productForm.image_url}>
              {editingProduct ? 'Update' : 'Create'} Product
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.invoice_number}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Client</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedInvoice.walk_in_customer_name ||
                     `${selectedInvoice.client?.first_name} ${selectedInvoice.client?.last_name}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Issue Date</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedInvoice.issue_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Total Amount</p>
                  <p className="text-sm text-muted-foreground">
                    ₱{selectedInvoice.total_amount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Payment Status</p>
                  <Badge variant={selectedInvoice.payment_status === 'paid' ? 'default' : 'destructive'}>
                    {selectedInvoice.payment_status}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
