'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/auth-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  DialogHeader,
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
  Eye
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

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
  is_active: boolean;
}

const PRODUCT_CATEGORIES = [
  'Pet Food',
  'Supplements',
  'Medications',
  'Accessories',
  'Grooming',
  'Toys',
  'Other'
];

export default function ProductsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
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

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('product_name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      alert('Failed to load products');
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
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product');
    }
  }

  async function toggleProductStatus(productId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !currentStatus })
        .eq('id', productId);

      if (error) throw error;
      loadProducts();
    } catch (error) {
      console.error('Error updating product status:', error);
      alert('Failed to update product status');
    }
  }

  async function deleteProduct(productId: string) {
    if (!confirm('Are you sure you want to permanently delete this product?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      alert('Product deleted successfully!');
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const lowStockProducts = products.filter(
    p => p.is_active && p.stock_quantity <= p.low_stock_threshold
  );
  const outOfStockProducts = products.filter(
    p => p.is_active && p.stock_quantity === 0
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Product Management</h1>
          <p className="text-muted-foreground">Manage inventory and products for sale</p>
        </div>
        <Button onClick={() => {
          setEditingProduct(null);
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.filter(p => p.is_active).length}</div>
            <p className="text-xs text-muted-foreground">Active products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lowStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">Need restocking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">Urgent attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Inventory value</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div className="space-y-2">
          {outOfStockProducts.length > 0 && (
            <Card className="border-red-500 bg-red-50 dark:bg-red-950">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                  <AlertCircle className="w-5 h-5" />
                  <p className="font-medium">
                    {outOfStockProducts.length} product(s) are out of stock!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
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
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>Browse and manage all products</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {PRODUCT_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Products Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No products found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map(product => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                alt={product.product_name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center text-xl">
                                📦
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{product.product_name}</div>
                              {product.description && (
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                  {product.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell>{product.sku || '-'}</TableCell>
                        <TableCell className="font-medium">₱{product.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              product.stock_quantity === 0
                                ? 'destructive'
                                : product.stock_quantity <= product.low_stock_threshold
                                ? 'secondary'
                                : 'default'
                            }
                          >
                            {product.stock_quantity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.is_active ? 'default' : 'outline'}>
                            {product.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingProduct(product);
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
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleProductStatus(product.id, product.is_active)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteProduct(product.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={(open) => {
        setShowProductDialog(open);
        if (!open) {
          setImagePreview('');
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Update product information' : 'Enter product details'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Product Name *</Label>
              <Input
                value={productForm.product_name}
                onChange={(e) => setProductForm({ ...productForm, product_name: e.target.value })}
                placeholder="e.g., Premium Dog Food"
              />
            </div>
            <div>
              <Label>Category *</Label>
              <Select
                value={productForm.category}
                onValueChange={(value) => setProductForm({ ...productForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label>Price (₱) *</Label>
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
                rows={3}
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
    </div>
  );
}
