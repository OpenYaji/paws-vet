'use client';

import { ShoppingBag, ExternalLink, Star, Package, Truck, BadgeCheck } from 'lucide-react';

export default function ClientProductsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShoppingBag size={28} />
          Products
        </h1>
        <p>Shop premium pet products from our official Shopee store</p>
      </div>

      {/* Main Shopee CTA */}
      <div className="card" style={{ padding: 60, textAlign: 'center', background: 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>

          <div style={{
            width: 100,
            height: 100,
            margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #ee4d2d 0%, #ff6b3d 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(238,77,45,0.3)',
            animation: 'pulse 2s ease-in-out infinite',
          }}>
            <ShoppingBag size={50} color="white" strokeWidth={2.5} />
          </div>

          <h2 style={{
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 16,
            background: 'linear-gradient(135deg, #ee4d2d 0%, #ff6b3d 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px',
          }}>
            Visit Our Shopee Store
          </h2>

          <p style={{ color: '#64748b', fontSize: 16, marginBottom: 32, lineHeight: 1.6 }}>
            Browse our complete collection of vet-approved pet food, accessories,
            healthcare items, and more. Delivered straight to your door!
          </p>

          <a
            href="https://ph.shp.ee/5dyuZHF"
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '16px 40px',
              fontSize: 18,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #ee4d2d 0%, #ff6b3d 100%)',
              color: 'white',
              gap: 12,
              boxShadow: '0 4px 14px rgba(238,77,45,0.4)',
              transition: 'all 0.3s ease',
              border: 'none',
              borderRadius: 8,
              textDecoration: 'none',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(238,77,45,0.5)';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(238,77,45,0.4)';
            }}
          >
            <ShoppingBag size={24} />
            Shop Now on Shopee
            <ExternalLink size={20} />
          </a>

          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <ExternalLink size={12} />
            Opens in a new window · Secure Shopee checkout
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div style={{ marginTop: 40 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>
          Why Shop With Us?
        </h3>

        <div className="grid-3" style={{ gap: 24 }}>
          <div className="card feature-card" style={{ padding: 32, textAlign: 'center', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}>
            <div style={{
              width: 64, height: 64, margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
              borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BadgeCheck size={32} color="white" strokeWidth={2.5} />
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>Vet-Approved Products</h4>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              Every product is carefully selected and approved by our veterinarians for safety and quality
            </p>
          </div>

          <div className="card feature-card" style={{ padding: 32, textAlign: 'center', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}>
            <div style={{
              width: 64, height: 64, margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Truck size={32} color="white" strokeWidth={2.5} />
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>Fast & Reliable Delivery</h4>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              Quick shipping through Shopee with tracking available on every order
            </p>
          </div>

          <div className="card feature-card" style={{ padding: 32, textAlign: 'center', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}>
            <div style={{
              width: 64, height: 64, margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
              borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Star size={32} color="white" strokeWidth={2.5} />
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>Official PawsVet Store</h4>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              Authentic products backed by our clinic's guarantee and customer support
            </p>
          </div>
        </div>
      </div>

      {/* Categories Preview */}
      <div style={{ marginTop: 40 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>
          Popular Categories
        </h3>
        <div className="grid-4" style={{ gap: 16 }}>
          {[
            { icon: '🍖', name: 'Pet Food', desc: 'Premium nutrition' },
            { icon: '🏥', name: 'Healthcare', desc: 'Vitamins & supplements' },
            { icon: '🎾', name: 'Toys & Play', desc: 'Fun for all ages' },
            { icon: '🛁', name: 'Grooming', desc: 'Bath & care' },
          ].map((cat, i) => (
            <div key={i} className="card" style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>{cat.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{cat.name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{cat.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust Badges */}
      <div className="card" style={{ marginTop: 40, padding: 32, background: '#f8fafc', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
          {[
            { icon: <Package size={24} />, text: 'Secure Packaging' },
            { icon: <BadgeCheck size={24} />, text: '100% Authentic' },
            { icon: <Truck size={24} />, text: 'Free Shipping on Orders ₱500+' },
          ].map((badge, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748b' }}>
              {badge.icon}
              <span style={{ fontSize: 14, fontWeight: 600 }}>{badge.text}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
}