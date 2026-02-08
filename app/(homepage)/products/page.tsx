'use client';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Product {
  id: string;
  product_name: string;
  category: string;
  price: number;
  stock_quantity: number;
  description?: string;
  image_url?: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const groupedProducts = categories
    .filter(cat => cat !== 'all')
    .map(category => ({
      category,
      items: products.filter(p => p.category === category)
    }))
    .filter(group => group.items.length > 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-grow">
        {/* Hero */}
        <section className="py-12 md:py-16 border-b border-border bg-secondary/20">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Pet Products & Supplies</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              High-quality pet foods, supplements, medications, and accessories to keep your pets healthy and happy.
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="py-8 border-b border-border sticky top-16 z-40 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap gap-3">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full font-medium transition-colors capitalize ${
                    category === selectedCategory
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Loading products...</p>
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No products available at the moment.</p>
              </div>
            ) : selectedCategory === 'all' ? (
              // Grouped by category view
              <div className="space-y-12">
                {groupedProducts.map(({ category, items }) => (
                  <div key={category}>
                    <h2 className="text-2xl font-bold mb-6 capitalize">{category}</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {items.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Single category view
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Info Section */}
        <section className="py-16 bg-secondary/20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">About Our Products</h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <span className="text-2xl">✓</span>
                  Vet-Approved
                </h3>
                <p className="text-muted-foreground">All products are carefully selected and approved by our veterinarians.</p>
              </div>
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <span className="text-2xl">⭐</span>
                  Premium Quality
                </h3>
                <p className="text-muted-foreground">We stock only premium brands and high-quality products for your pet.</p>
              </div>
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <span className="text-2xl">📦</span>
                  Ready to Order
                </h3>
                <p className="text-muted-foreground">Order online or visit our clinic to purchase products in person.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center space-y-6">
            <h2 className="text-3xl font-bold">Need Recommendations?</h2>
            <p className="text-lg opacity-95 max-w-2xl mx-auto">
              Our veterinarians can recommend the perfect products for your pet's specific needs and health conditions.
            </p>
            <Button asChild size="lg" variant="secondary">
              <Link href="/appointment">Book a Consultation</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const isOutOfStock = product.stock_quantity === 0;
  const displayImage = product.image_url || '📦';
  const isEmoji = displayImage.length <= 4;

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow">
      <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
        {isEmoji ? (
          <span className="text-6xl">{displayImage}</span>
        ) : (
          <img 
            src={displayImage} 
            alt={product.product_name}
            className="w-full h-full object-cover"
          />
        )}
        {isOutOfStock && (
          <Badge variant="destructive" className="absolute top-2 right-2">
            Out of Stock
          </Badge>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.product_name}</h3>
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {product.description || 'Quality product for your pet'}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary">₱{product.price.toFixed(2)}</span>
          <Button 
            asChild 
            size="sm" 
            variant={isOutOfStock ? "secondary" : "outline"}
            disabled={isOutOfStock}
          >
            <Link href={`/appointment?product=${product.id}`}>
              {isOutOfStock ? 'Notify Me' : 'Inquire'}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
