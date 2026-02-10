'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    return pathname === href ? 'text-white font-semibold bg-primary rounded-md px-3 py-1' : 'text-foreground hover:text-primary px-3 py-1';
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-4 z-50 w-full">
      <div className="container mx-auto px-4">
        <div className="rounded-2xl border border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg">
          <div className="px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/images/image.png"
                alt="PAWS Logo"
                width={50}
                height={50}
                className="rounded-full"
              />
              <span className="text-xl font-bold text-primary">VETERINARY CLINIC</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <Link href="/" className={`text-base transition-colors ${isActive('/')}`}>
                Home
              </Link>
              <Link href="/services" className={`text-base transition-colors ${isActive('/services')}`}>
                Services
              </Link>
              <Link href="/products" className={`text-base transition-colors ${isActive('/products')}`}>
                Products
              </Link>
              <Link href="/about" className={`text-base transition-colors ${isActive('/about')}`}>
                About
              </Link>
              <Link href="/faq" className={`text-base transition-colors ${isActive('/faq')}`}>
                FAQ
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <Button
                asChild
                variant="outline"
                className="hidden sm:inline-flex bg-transparent"
              >
                <Link href="/login">Sign In</Link>
              </Button>
              <Button
                asChild
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Link href="/appointment">Book Now</Link>
              </Button>
              
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-border">
              <nav className="px-4 py-4 flex flex-col gap-4">
                <Link
                  href="/"
                  className={`text-base transition-colors ${isActive('/')}`}
                  onClick={closeMobileMenu}
                >
                  Home
                </Link>
                <Link
                  href="/services"
                  className={`text-base transition-colors ${isActive('/services')}`}
                  onClick={closeMobileMenu}
                >
                  Services
                </Link>
                <Link
                  href="/products"
                  className={`text-base transition-colors ${isActive('/products')}`}
                  onClick={closeMobileMenu}
                >
                  Products
                </Link>
                <Link
                  href="/about"
                  className={`text-base transition-colors ${isActive('/about')}`}
                  onClick={closeMobileMenu}
                >
                  About
                </Link>
                <Link
                  href="/faq"
                  className={`text-base transition-colors ${isActive('/faq')}`}
                  onClick={closeMobileMenu}
                >
                  FAQ
                </Link>
                <div className="pt-2 border-t border-border sm:hidden">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full bg-transparent mb-2"
                    onClick={closeMobileMenu}
                  >
                    <Link href="/login">Sign In</Link>
                  </Button>
                </div>
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
