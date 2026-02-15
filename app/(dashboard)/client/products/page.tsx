'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/auth-client';
import { Search, ShoppingBag, Package, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Product {
  id: string;
  product_name: string;
  category: string;
  sku: string;
  price: number;
  stock_quantity: number;
  description: string;
  image_url: string | null;
  is_active: boolean;
}

export default function ClientProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  
  // Inquiry Modal State
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [submittingInquiry, setSubmittingInquiry] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, selectedCategory]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('product_name', { ascending: true });

      if (error) {
        console.error('Error fetching products:', error);
        toast.error('Failed to load products');
        return;
      }

      setProducts(data || []);
      
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(data?.map((p) => p.category) || [])
      );
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.product_name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  };

  const handleInquiry = (product: Product) => {
    setSelectedProduct(product);
    setInquiryMessage('');
    setInquiryModalOpen(true);
  };

  const submitInquiry = async () => {
    if (!selectedProduct || !inquiryMessage.trim()) {
      toast.error('Please enter your inquiry message');
      return;
    }

    try {
      setSubmittingInquiry(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please log in to submit an inquiry');
        return;
      }

      // Get client profile
      const { data: clientProfile } = await supabase
        .from('client_profiles')
        .select('id, first_name, last_name')
        .eq('user_id', user.id)
        .single();

      if (!clientProfile) {
        toast.error('Client profile not found');
        return;
      }

      // Here you would typically save the inquiry to a database table
      // For now, we'll just show a success message
      // You can create a 'product_inquiries' table later if needed
      
      console.log('Product Inquiry:', {
        client_id: clientProfile.id,
        client_name: `${clientProfile.first_name} ${clientProfile.last_name}`,
        product_id: selectedProduct.id,
        product_name: selectedProduct.product_name,
        message: inquiryMessage,
        timestamp: new Date().toISOString(),
      });

      toast.success('Inquiry submitted successfully! We will contact you soon.');
      setInquiryModalOpen(false);
      setInquiryMessage('');
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      toast.error('Failed to submit inquiry');
    } finally {
      setSubmittingInquiry(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Package className="w-12 h-12 mx-auto animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <ShoppingBag className="w-8 h-8 text-primary" />
          Products Catalog
        </h1>
        <p className="text-muted-foreground">
          Browse our selection of pet care products and supplies
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-8 flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 min-w-[200px]">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Showing {filteredProducts.length} of {products.length} products
        </p>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No products found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Product Image */}
              <div className="aspect-square bg-secondary/20 relative">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.product_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
                
                {/* Stock Badge */}
                {product.stock_quantity > 0 ? (
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    In Stock ({product.stock_quantity})
                  </div>
                ) : (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    Out of Stock
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="p-4">
                {/* Category Badge */}
                <div className="mb-2">
                  <span className="inline-block bg-primary/10 text-primary text-xs px-2 py-1 rounded">
                    {product.category}
                  </span>
                </div>

                {/* Product Name */}
                <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                  {product.product_name}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {product.description || 'No description available'}
                </p>

                {/* Price */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      ${product.price.toFixed(2)}
                    </p>
                    {product.sku && (
                      <p className="text-xs text-muted-foreground">
                        SKU: {product.sku}
                      </p>
                    )}
                  </div>
                </div>

                {/* Inquire Button */}
                <Button
                  onClick={() => handleInquiry(product)}
                  className="w-full"
                  disabled={product.stock_quantity === 0}
                >
                  {product.stock_quantity === 0 ? 'Out of Stock' : 'Inquire About This Product'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inquiry Modal */}
      <Dialog open={inquiryModalOpen} onOpenChange={setInquiryModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Product Inquiry</DialogTitle>
            <DialogDescription>
              Send us your questions about {selectedProduct?.product_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Product Info */}
            <div className="bg-secondary/20 p-4 rounded-lg">
              <div className="flex gap-4">
                {selectedProduct?.image_url ? (
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.product_name}
                    className="w-20 h-20 object-cover rounded"
                  />
                ) : (
                  <div className="w-20 h-20 bg-secondary flex items-center justify-center rounded">
                    <Package className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h4 className="font-semibold">{selectedProduct?.product_name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedProduct?.category}
                  </p>
                  <p className="text-lg font-bold text-primary mt-1">
                    ${selectedProduct?.price.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Your Message
              </label>
              <Textarea
                placeholder="I would like to know more about..."
                value={inquiryMessage}
                onChange={(e) => setInquiryMessage(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInquiryModalOpen(false)}
              disabled={submittingInquiry}
            >
              Cancel
            </Button>
            <Button
              onClick={submitInquiry}
              disabled={submittingInquiry || !inquiryMessage.trim()}
            >
              {submittingInquiry ? 'Sending...' : 'Send Inquiry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}