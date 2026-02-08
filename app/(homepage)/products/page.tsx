'use client';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState } from 'react';

const products = [
  {
    category: 'Pet Food',
    items: [
      { id: 1, name: 'Premium Dry Dog Food', price: '$45', desc: 'High-quality nutrition for healthy coat and vitality', image: '🥩' },
      { id: 2, name: 'Grain-Free Cat Food', price: '$38', desc: 'Specially formulated for sensitive digestion', image: '🐟' },
      { id: 3, name: 'Puppy Growth Formula', price: '$52', desc: 'Essential nutrients for growing puppies', image: '🦴' },
      { id: 4, name: 'Senior Pet Diet', price: '$48', desc: 'Joint support for aging pets', image: '🥕' },
    ],
  },
  {
    category: 'Supplements',
    items: [
      { id: 5, name: 'Omega-3 Fish Oil', price: '$25', desc: 'Supports skin, coat, and heart health', image: '💊' },
      { id: 6, name: 'Joint Care Supplement', price: '$35', desc: 'Glucosamine and chondroitin formula', image: '🧴' },
      { id: 7, name: 'Probiotic Powder', price: '$20', desc: 'Improves digestive health', image: '✨' },
      { id: 8, name: 'Multivitamin Tablets', price: '$22', desc: 'Complete vitamin and mineral support', image: '💉' },
    ],
  },
  {
    category: 'Medications',
    items: [
      { id: 9, name: 'Flea & Tick Prevention', price: '$65', desc: 'Monthly topical treatment', image: '🛡️' },
      { id: 10, name: 'Anti-Inflammatory Tablets', price: '$30', desc: 'Relief from pain and inflammation', image: '⚕️' },
      { id: 11, name: 'Allergy Relief', price: '$28', desc: 'Reduces allergic reactions and itching', image: '🌿' },
      { id: 12, name: 'Antibiotics (Prescribed)', price: '$40', desc: 'Infection treatment (requires prescription)', image: '🩹' },
    ],
  },
  {
    category: 'Accessories',
    items: [
      { id: 13, name: 'Orthopedic Dog Bed', price: '$89', desc: 'Memory foam for joint support', image: '🛏️' },
      { id: 14, name: 'Pet Grooming Kit', price: '$45', desc: 'Complete set with brushes and clippers', image: '✂️' },
      { id: 15, name: 'Interactive Toy Set', price: '$35', desc: 'Mental stimulation and enrichment', image: '🎾' },
      { id: 16, name: 'Travel Carrier Bag', price: '$55', desc: 'Comfortable and secure transport', image: '👜' },
    ],
  },
];

export default function Products() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredProducts = selectedCategory
    ? products.find(cat => cat.category === selectedCategory)?.items || []
    : products.flatMap(cat => cat.items);

  const categories = ['All', ...products.map(cat => cat.category)];

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
                  onClick={() => setSelectedCategory(category === 'All' ? null : category)}
                  className={`px-4 py-2 rounded-full font-medium transition-colors ${
                    (category === 'All' && !selectedCategory) || category === selectedCategory
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
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {filteredProducts.map((product) => (
                <div key={product.id} className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-6xl">
                    {product.image}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.name}</h3>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{product.desc}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">{product.price}</span>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/appointment?product=${product.id}`}>Inquire</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No products found in this category.</p>
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
