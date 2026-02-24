"use client"

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Menu, Search, Sun, Moon, User, ArrowLeft, ArrowRight,
  ShieldAlert, Clock, AlertCircle, Boxes,
} from 'lucide-react';
import { supabase } from '@/lib/auth-client';
import { NotificationBell } from '@/components/notifications/notification-bell';

interface AdminHeaderProps {
  setMobileOpen: (open: boolean) => void;
  user: any;
}

interface SearchRoute {
  name: string;
  path: string;
  keywords: string[];
}

interface AlertCounts {
  expired: number;
  expiringSoon: number;
  lowStock: number;
  oos: number;
}

const Tooltip = ({ text }: { text: string }) => (
  <span className="
    absolute top-full left-1/2 -translate-x-1/2 mt-2
    bg-gray-900 text-white text-xs font-bold
    rounded-md px-2 py-1
    opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100
    transition-all duration-300 ease-in-out
    whitespace-nowrap z-50
  ">
    {text}
  </span>
);

export default function AdminHeader({ setMobileOpen, user }: AdminHeaderProps) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchRoute[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  /* ── Inventory alerts ── */
  const [alertCounts, setAlertCounts] = useState<AlertCounts>({ expired: 0, expiringSoon: 0, lowStock: 0, oos: 0 });

  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLDivElement>(null);

  const searchableRoutes: SearchRoute[] = [
    { name: 'Dashboard',       path: '/admin/dashboard',         keywords: ['home', 'main', 'overview'] },
    { name: 'Users',           path: '/admin/users-management',  keywords: ['users', 'accounts', 'staff', 'clients'] },
    { name: 'Appointments',    path: '/admin/appointments',      keywords: ['appointments', 'bookings', 'schedule'] },
    { name: 'Pets',            path: '/admin/pets',              keywords: ['pets', 'animals', 'patients'] },
    { name: 'Products',        path: '/admin/products',          keywords: ['products', 'inventory', 'items'] },
    { name: 'Billing & Invoice', path: '/admin/billing',         keywords: ['billing', 'invoice', 'payment'] },
    { name: 'Point Of Sale',   path: '/admin/billing/pos',       keywords: ['POS', 'Point', 'Sale'] },
    { name: 'Settings',        path: '/admin/settings',          keywords: ['settings', 'preferences', 'configuration'] },
    { name: 'Help & Support',  path: '/admin/help',              keywords: ['help', 'support', 'assistance'] },
  ];

  /* ── Clock ── */
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* ── Click outside ── */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown === 'profile' && profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  /* ── Search ── */
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setShowSearchResults(false); return; }
    const q = searchQuery.toLowerCase();
    const results = searchableRoutes.filter(r =>
      r.name.toLowerCase().includes(q) || r.keywords.some(k => k.includes(q))
    );
    setSearchResults(results);
    setShowSearchResults(results.length > 0);
  }, [searchQuery]);

  /* ── Inventory alerts — SSE real-time ── */
  useEffect(() => {
    const es = new EventSource('/api/admin/inventory/alerts');

    es.onmessage = (e) => {
      try {
        setAlertCounts(JSON.parse(e.data));
      } catch {
        // malformed frame — ignore
      }
    };

    es.onerror = () => {
      // Browser auto-reconnects on error; nothing extra needed
    };

    return () => { es.close(); };
  }, []);

  /* ── Helpers ── */
  const handleSearchSelect = (path: string) => {
    router.push(path);
    setSearchQuery('');
    setShowSearchResults(false);
    setIsMobileSearchOpen(false);
  };

  const toggleDropdown = (dropdown: string) => setOpenDropdown(openDropdown === dropdown ? null : dropdown);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const formattedDate = currentTime.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const formattedTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  const hasAlerts = alertCounts.expired + alertCounts.oos + alertCounts.expiringSoon + alertCounts.lowStock > 0;

  /* ── Loading skeleton ── */
  if (!user) {
    return (
      <header className="sticky top-0 z-30 w-full bg-card border-b py-4 flex items-center justify-between animate-pulse">
        <div className="h-8 bg-muted rounded w-1/4 ml-6" />
        <div className="h-10 bg-muted rounded w-1/4 mr-6" />
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 w-full bg-card border-b py-4 flex items-center">

      {/* ── Mobile search overlay ── */}
      {isMobileSearchOpen && (
        <div className="absolute inset-0 bg-card w-full flex items-center px-4 z-40 sm:hidden">
          <button onClick={() => setIsMobileSearchOpen(false)} className="mr-2 text-muted-foreground">
            <ArrowLeft size={24} />
          </button>
          <div className="relative flex-1" ref={searchRef}>
            <input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-popover rounded-lg shadow-xl border max-h-64 overflow-y-auto">
                {searchResults.map((r, i) => (
                  <button key={i} onClick={() => handleSearchSelect(r.path)} className="w-full text-left px-4 py-3 hover:bg-accent flex items-center justify-between group">
                    <span className="text-sm">{r.name}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ LEFT: menu + search ══ */}
      <div className="flex items-center flex-1 min-w-0">
        <div className="relative group pl-6 md:hidden">
          <button onClick={() => setMobileOpen(true)} className="text-muted-foreground" aria-label="Open sidebar">
            <Menu size={24} />
          </button>
          <Tooltip text="Open menu" />
        </div>

        <div className="hidden sm:block flex-1 max-w-xs md:pl-6">
          <div className="relative" ref={searchRef}>
            <input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-popover rounded-lg shadow-xl border max-h-64 overflow-y-auto z-50">
                {searchResults.map((r, i) => (
                  <button key={i} onClick={() => handleSearchSelect(r.path)} className="w-full text-left px-4 py-3 hover:bg-accent flex items-center justify-between group">
                    <span className="text-sm">{r.name}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ CENTER: Inventory Alert — only shown when there are alerts ══ */}
      {hasAlerts && (
        <div className="hidden md:flex justify-center px-4">
          <Link
            href="/admin/inventory"
            className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98] bg-transparent border-red-300 hover:bg-red-100 dark:border-red-900/60 dark:hover:bg-red-950/40"
          >
            {/* Pulsing dot */}
            <span className="w-2 h-2 rounded-full shrink-0 animate-pulse bg-red-500" />

            {/* Label */}
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-700 dark:text-red-400">
              Inventory
            </span>

            {/* Badges */}
            <div className="flex items-center gap-1">
              {alertCounts.expired > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded-md whitespace-nowrap">
                  <ShieldAlert className="w-2.5 h-2.5 shrink-0" /> {alertCounts.expired} Expired
                </span>
              )}
              {alertCounts.oos > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded-md whitespace-nowrap">
                  <Boxes className="w-2.5 h-2.5 shrink-0" /> {alertCounts.oos} OOS
                </span>
              )}
              {alertCounts.expiringSoon > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-md whitespace-nowrap">
                  <Clock className="w-2.5 h-2.5 shrink-0" /> {alertCounts.expiringSoon} Expiring
                </span>
              )}
              {alertCounts.lowStock > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-md whitespace-nowrap">
                  <AlertCircle className="w-2.5 h-2.5 shrink-0" /> {alertCounts.lowStock} Low Stock
                </span>
              )}
            </div>
          </Link>
        </div>
      )}

      {/* ══ RIGHT: date + actions ══ */}
      <div className="flex items-center gap-4 pr-6 flex-1 justify-end">
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <span>{formattedDate}</span>
          <span>-</span>
          <span>{formattedTime}</span>
        </div>

        {/* Mobile search icon */}
        <div className="relative group sm:hidden">
          <button onClick={() => setIsMobileSearchOpen(true)} className="p-2 hover:bg-accent rounded-full transition-colors">
            <Search className="w-5 h-5 text-muted-foreground" />
          </button>
          <Tooltip text="Search" />
        </div>

        {/* Theme toggle */}
        <div className="relative group">
          <button onClick={toggleTheme} className="p-2 hover:bg-accent rounded-full transition-colors">
            {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5" />}
          </button>
          <Tooltip text={theme === 'dark' ? 'Light Mode' : 'Dark Mode'} />
        </div>

        {/* Bell — dynamic notifications */}
        <NotificationBell userId={user.id} />

        {/* Profile */}
        <div className="relative group" ref={profileRef}>
          <button onClick={() => toggleDropdown('profile')} className="flex items-center gap-2 cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
              <Image src="/images/image.png" alt="Admin" width={40} height={40} className="w-full h-full object-cover" />
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold">{user.email?.split('@')[0]}</p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
          </button>
          {openDropdown !== 'profile' && <Tooltip text="My Account" />}
          {openDropdown === 'profile' && (
            <div className="absolute right-0 mt-2 w-48 bg-popover rounded-lg shadow-xl border animate-fade-in-down">
              <ul className="py-2">
                <li className="relative group/item">
                  <Link href="/admin/settings" onClick={() => setOpenDropdown(null)} className="w-full text-left px-4 py-2 hover:bg-accent cursor-pointer flex items-center gap-3">
                    <User size={16} className="text-muted-foreground" />
                    <span className="text-sm">My Account</span>
                  </Link>
                </li>
                <li className="relative group/item">
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 hover:bg-accent cursor-pointer flex items-center gap-3 text-destructive">
                    <ArrowLeft size={16} />
                    <span className="text-sm">Logout</span>
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
