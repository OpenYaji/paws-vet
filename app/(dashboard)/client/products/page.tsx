'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/auth-client';
import { ShoppingBag, ExternalLink, Star, Package, Truck, BadgeCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ClientProductsPage() {
  const [settings, setSettings] = useState({
    shopee_url: 'https://ph.shp.ee/5dyuZHF',
    products_page_title: 'Visit Our Shopee Store',
    products_page_description: 'Browse our complete collection of vet-approved pet food, accessories, healthcare items, and more.',
  });

  useEffect(() => {
    supabase
      .from('clinic_settings')
      .select('shopee_url, products_page_title, products_page_description')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data) setSettings(data);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-br from-primary/10 via-transparent to-primary/5 py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
              <ShoppingBag size={28} className="text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">Pet Products</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl">Shop premium pet products from our official Shopee store</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 space-y-16 md:space-y-24">
        {/* Main Shopee CTA */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-3xl blur-2xl"></div>
          <div className="relative bg-gradient-to-br from-card to-card/50 border-2 border-primary/20 rounded-3xl p-12 md:p-20 text-center space-y-8">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/50 rounded-full animate-pulse blur-xl opacity-70"></div>
                <div className="relative z-10 w-32 h-32 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center border-4 border-primary/30">
                  <ShoppingBag size={64} className="text-primary" strokeWidth={1.5} />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-4 max-w-2xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {settings.products_page_title}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {settings.products_page_description}
              </p>
            </div>

            {/* CTA Button */}
            <div className="flex flex-col items-center gap-4 pt-4">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold group h-14 px-8 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <a
                  href={settings.shopee_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3"
                >
                  <ShoppingBag size={24} className="group-hover:scale-110 transition-transform" />
                  <span>Shop Now on Shopee</span>
                  <ExternalLink size={20} className="group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Zap size={16} className="text-yellow-500" />
                Opens in a new window · Secure Shopee checkout
              </p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="space-y-8">
          <div className="text-center space-y-3">
            <h3 className="text-3xl md:text-4xl font-bold">Why Shop With Us?</h3>
            <p className="text-muted-foreground text-lg">Trusted by pet owners nationwide</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: BadgeCheck,
                color: 'from-emerald-500 to-teal-500',
                title: 'Vet-Approved Products',
                desc: 'Every product is carefully selected and approved by our veterinarians for safety and quality'
              },
              {
                icon: Truck,
                color: 'from-blue-500 to-indigo-500',
                title: 'Fast & Reliable Delivery',
                desc: 'Quick shipping through Shopee with tracking available on every order'
              },
              {
                icon: Star,
                color: 'from-amber-500 to-orange-500',
                title: 'Official PAWS Store',
                desc: "Authentic products backed by our clinic's guarantee and customer support"
              },
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="group relative bg-card border-2 border-border rounded-2xl p-8 hover:border-primary/50 hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                  <div className="relative z-10 space-y-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <Icon size={32} className="text-white" strokeWidth={2} />
                    </div>
                    <h4 className="text-xl font-bold group-hover:text-primary transition-colors">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Categories Preview */}
        <div className="space-y-8">
          <div className="text-center space-y-3">
            <h3 className="text-3xl md:text-4xl font-bold">Popular Categories</h3>
            <p className="text-muted-foreground text-lg">Find everything your pet needs</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { emoji: '🍖', name: 'Pet Food', desc: 'Premium nutrition' },
              { emoji: '🏥', name: 'Healthcare', desc: 'Vitamins & supplements' },
              { emoji: '🎾', name: 'Toys & Play', desc: 'Fun for all ages' },
              { emoji: '🛁', name: 'Grooming', desc: 'Bath & care' },
            ].map((cat, i) => (
              <button
                key={i}
                className="group bg-card border-2 border-border rounded-xl p-6 md:p-8 text-center hover:border-primary/50 hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <div className="text-5xl md:text-6xl mb-3 group-hover:scale-125 transition-transform duration-300 inline-block">{cat.emoji}</div>
                <div className="font-bold text-base md:text-lg group-hover:text-primary transition-colors mb-1">{cat.name}</div>
                <div className="text-xs md:text-sm text-muted-foreground">{cat.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Trust Badges */}
        <div className="bg-gradient-to-r from-primary/5 via-transparent to-primary/5 border-2 border-primary/20 rounded-2xl p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12">
            {[
              { Icon: Package, text: 'Secure Packaging' },
              { Icon: BadgeCheck, text: '100% Authentic' },
              { Icon: Truck, text: 'Free Shipping ₱500+' },
            ].map((badge, i) => (
              <div key={i} className="flex items-center justify-center md:justify-start gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <badge.Icon size={24} className="text-primary" />
                </div>
                <span className="font-semibold text-sm md:text-base text-foreground">{badge.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Secondary CTA */}
        <div className="text-center space-y-6 py-8 md:py-12">
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-bold">Can&apos;t Find What You Need?</h2>
            <p className="text-lg text-muted-foreground">Check out our services or book a consultation with our vets</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="outline" size="lg" className="border-2 h-12">
              <Link href="/client/services">View Services</Link>
            </Button>
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 h-12">
              <Link href="/client/appointments">Book Now</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
